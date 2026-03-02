use anchor_lang::prelude::*;
use spl_transfer_hook_interface::instruction::ExecuteInstruction;
use spl_tlv_account_resolution::{account::ExtraAccountMeta, state::ExtraAccountMetaList};
use crate::state::{merchant_config::MerchantConfig, token_generation::{TokenGeneration, InboundEntry, GenSource, INBOUND_BUFFER_SIZE}};
use crate::errors::ViralSyncError;
use crate::events::*;

// Note: Ensure the Anchor.toml ID matches this if generated
declare_id!("D9ds2V6y4GFGKbo8wF8qQiF81dzhkiznmZsHepcSN6Ta");

// ── INITIALIZE EXTRA ACCOUNT METAS ──────────────────────────────────────────
#[derive(Accounts)]
pub struct InitExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Target config
    #[account(mut)]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_extra_account_meta_list(
    ctx: Context<InitExtraAccountMetaList>
) -> Result<()> {
    // Implementing architecture rule: Seed::AccountData dynamically resolves owner from index 0 and 2
    let extra_metas = &[
        // Account 5: MerchantConfig
        ExtraAccountMeta::new_with_seeds(&[
            spl_tlv_account_resolution::seeds::Seed::Literal { bytes: b"merchant_v4".to_vec() },
            spl_tlv_account_resolution::seeds::Seed::AccountKey { index: 1 }, // mint
        ], false, false)?,
        
        // Account 6: VaultEntry
        ExtraAccountMeta::new_with_seeds(&[
            spl_tlv_account_resolution::seeds::Seed::Literal { bytes: b"vault_entry".to_vec() },
            spl_tlv_account_resolution::seeds::Seed::AccountKey { index: 1 }, 
            spl_tlv_account_resolution::seeds::Seed::AccountData { account_index: 2, data_index: 32, length: 32 },
        ], false, false)?,
        
        // Account 7: Source TokenGeneration (Signer-agnostic, reads true token owner)
        ExtraAccountMeta::new_with_seeds(&[
            spl_tlv_account_resolution::seeds::Seed::Literal { bytes: b"gen_v4".to_vec() },
            spl_tlv_account_resolution::seeds::Seed::AccountKey { index: 1 }, 
            spl_tlv_account_resolution::seeds::Seed::AccountData { account_index: 0, data_index: 32, length: 32 },
        ], false, true)?,
        
        // Account 8: Dest TokenGeneration
        ExtraAccountMeta::new_with_seeds(&[
            spl_tlv_account_resolution::seeds::Seed::Literal { bytes: b"gen_v4".to_vec() },
            spl_tlv_account_resolution::seeds::Seed::AccountKey { index: 1 }, 
            spl_tlv_account_resolution::seeds::Seed::AccountData { account_index: 2, data_index: 32, length: 32 },
        ], false, true)?,
    ];
    
    ExtraAccountMetaList::init::<ExecuteInstruction>(
        &mut ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?,
        extra_metas,
    )?;
    
    Ok(())
}

// ── EXECUTE HOOK ────────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct ExecuteHook<'info> {
    /// CHECK: source token account
    #[account(mut)]
    pub source_token_account: UncheckedAccount<'info>,
    /// CHECK: mint
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    /// CHECK: dest token account
    #[account(mut)]
    pub dest_token_account: UncheckedAccount<'info>,
    /// CHECK: signer
    pub source_authority: UncheckedAccount<'info>,
    /// CHECK: extra meta list
    pub extra_account_meta_list: UncheckedAccount<'info>,
    
    pub merchant_config: Account<'info, MerchantConfig>,
    
    /// CHECK: Graceful missing account handler
    pub vault_entry: UncheckedAccount<'info>,
    
    #[account(
        mut,
        constraint = source_generation.owner == read_owner_from_token_account(&source_token_account)? @ ViralSyncError::InvalidSourceGeneration
    )]
    pub source_generation: Account<'info, TokenGeneration>,
    
    #[account(
        mut,
        constraint = dest_generation.owner == read_owner_from_token_account(&dest_token_account)? @ ViralSyncError::InvalidDestGeneration
    )]
    pub dest_generation: Account<'info, TokenGeneration>,
}

pub fn execute_transfer_hook(ctx: Context<ExecuteHook>, amount: u64) -> Result<()> {
    let src_gen = &mut ctx.accounts.source_generation;
    let dst_gen = &mut ctx.accounts.dest_generation;
    let config = &ctx.accounts.merchant_config;
    
    let src_owner = src_gen.owner;
    let dst_owner = dst_gen.owner;
    
    let is_from_merchant = src_owner == config.merchant;
    let is_from_treasury = src_gen.is_treasury;
    let is_src_intermediary = src_gen.is_intermediary;
    let is_dst_intermediary = dst_gen.is_intermediary;
    let is_to_vault = is_registered_vault(&ctx.accounts.vault_entry);
    let is_dex_involved = src_gen.is_dex_pool || dst_gen.is_dex_pool;
    
    // ── TREASURY TRANSFER (Commission payout) ──
    if is_from_treasury {
        let entry = InboundEntry {
            referrer: Pubkey::default(),
            amount,
            generation_source: GenSource::Issuance,
            slot: Clock::get()?.slot,
            processed: false,
            _padding: [0u8; 7],
        };
        let write_result = write_inbound(dst_gen, entry);
        if write_result.is_err() {
            // Buffer overflow during commission payout is highly improbable but handled
            dst_gen.dead_balance = dst_gen.dead_balance.checked_add(amount).unwrap();
        } else {
            dst_gen.gen1_balance = dst_gen.gen1_balance.checked_add(amount).unwrap();
        }
        return Ok(());
    }
    
    // ── DEX TRANSFER ──
    if is_dex_involved {
        if !is_src_intermediary && !is_from_merchant {
            fifo_deduct(src_gen, amount);
        }
        if !dst_gen.is_dex_pool && !is_dst_intermediary {
            dst_gen.dead_balance = dst_gen.dead_balance.checked_add(amount).unwrap();
            emit!(DexTransferDetected { from: src_owner, to: dst_owner, amount });
        }
        return Ok(());
    }
    
    // ── EXPIRY CHECK ──
    if !is_from_merchant && !is_src_intermediary && config.token_expiry_days > 0 {
        let age_days = (Clock::get()?.unix_timestamp.saturating_sub(src_gen.first_received_at)) / 86400;
        require!(age_days <= config.token_expiry_days as i64, ViralSyncError::TokensExpired);
    }
    
    // ── REDEMPTION PATH ──
    if is_to_vault && !is_from_merchant {
        require!(src_gen.buffer_pending == 0, ViralSyncError::MustFinalizeBeforeRedeem);
        require!(!src_gen.redemption_pending, ViralSyncError::PreviousRedemptionUnprocessed);
        
        let gen2_consumed = fifo_deduct_redemption(src_gen, amount);
        
        src_gen.redemption_pending = true;
        src_gen.redemption_slot = Clock::get()?.slot;
        src_gen.redemption_gen2_consumed = gen2_consumed;
        src_gen.redemption_slots_settled = 0;
        
        let total_gen2_before = src_gen.gen2_balance.checked_add(gen2_consumed).unwrap();
        for i in 0..src_gen.active_referrer_slots as usize {
            if src_gen.referrer_slots[i].is_active && total_gen2_before > 0 {
                src_gen.redemption_slot_consumed[i] = gen2_consumed
                    .checked_mul(src_gen.referrer_slots[i].tokens_attributed).unwrap()
                    .checked_div(total_gen2_before).unwrap_or(0);
            }
        }
        
        emit!(RedemptionDetected { redeemer: src_owner, amount, gen2_consumed, slot: Clock::get()?.slot });
        return Ok(());
    }
    
    // ── ISSUANCE PATH ──
    if is_from_merchant {
        let entry = InboundEntry {
            referrer: Pubkey::default(),
            amount,
            generation_source: GenSource::Issuance,
            slot: Clock::get()?.slot,
            processed: false,
            _padding: [0u8; 7],
        };
        if write_inbound(dst_gen, entry).is_ok() {
            dst_gen.gen1_balance = dst_gen.gen1_balance.checked_add(amount).unwrap();
        } else {
            dst_gen.dead_balance = dst_gen.dead_balance.checked_add(amount).unwrap();
        }
        if dst_gen.first_received_at == 0 {
            dst_gen.first_received_at = Clock::get()?.unix_timestamp;
        }
        dst_gen.last_received_at = Clock::get()?.unix_timestamp;
        return Ok(());
    }
    
    // ── INTERMEDIARY ESCROW RELEASE ──
    if is_src_intermediary {
        let effective_referrer = src_gen.original_sender;
        if !is_dst_intermediary {
            let entry_type = if effective_referrer != Pubkey::default() { GenSource::ViralShare } else { GenSource::DeadPass };
            let entry = InboundEntry {
                referrer: effective_referrer,
                amount,
                generation_source: entry_type.clone(),
                slot: Clock::get()?.slot,
                processed: false,
                _padding: [0u8; 7],
            };
            if write_inbound(dst_gen, entry).is_ok() {
                match entry_type {
                    GenSource::ViralShare => dst_gen.gen2_balance = dst_gen.gen2_balance.checked_add(amount).unwrap(),
                    _ => dst_gen.dead_balance = dst_gen.dead_balance.checked_add(amount).unwrap(),
                }
            } else {
                dst_gen.dead_balance = dst_gen.dead_balance.checked_add(amount).unwrap();
            }
            if dst_gen.first_received_at == 0 {
                dst_gen.first_received_at = Clock::get()?.unix_timestamp;
            }
        }
        return Ok(());
    }
    
    // ── PEER TRANSFER ──
    let held_secs = Clock::get()?.unix_timestamp.saturating_sub(src_gen.first_received_at);
    require!(held_secs >= config.min_hold_before_share_secs, ViralSyncError::HoldPeriodNotMet);
    require!(amount >= config.min_tokens_per_referral, ViralSyncError::BelowMinimum);
    require!(amount <= config.max_tokens_per_referral, ViralSyncError::ExceedsMaximum);
    
    let today_index = Clock::get()?.slot / config.slots_per_day.max(1);
    if src_gen.share_limit_day == today_index {
        require!(src_gen.shares_today < config.max_referrals_per_wallet_per_day, ViralSyncError::DailyShareLimitExceeded);
        src_gen.shares_today += 1;
    } else {
        src_gen.share_limit_day = today_index;
        src_gen.shares_today = 1;
    }
    
    if src_gen.gen1_balance == 0 && !config.allow_second_gen_transfer {
        return Err(ViralSyncError::MaxDepthReached.into());
    }
    
    let from_gen1 = amount.min(src_gen.gen1_balance);
    let from_gen2 = (amount - from_gen1).min(src_gen.gen2_balance);
    let from_dead = amount - from_gen1 - from_gen2;
    src_gen.gen1_balance -= from_gen1;
    src_gen.gen2_balance -= from_gen2;
    src_gen.dead_balance -= from_dead;
    
    let (entry_type, effective_referrer) = if from_gen1 > 0 {
        (GenSource::ViralShare, src_owner)
    } else if from_gen2 > 0 {
        if config.allow_second_gen_transfer {
            (GenSource::DeadPass, Pubkey::default())
        } else {
            return Err(ViralSyncError::MaxDepthReached.into());
        }
    } else {
        (GenSource::DeadPass, Pubkey::default())
    };
    
    if !is_dst_intermediary {
        let entry = InboundEntry {
            referrer: effective_referrer,
            amount,
            generation_source: entry_type.clone(),
            slot: Clock::get()?.slot,
            processed: false,
            _padding: [0u8; 7],
        };
        // Graceful buffer degradation check
        if write_inbound(dst_gen, entry).is_ok() {
            match entry_type {
                GenSource::ViralShare => dst_gen.gen2_balance = dst_gen.gen2_balance.checked_add(amount).unwrap(),
                _ => dst_gen.dead_balance = dst_gen.dead_balance.checked_add(amount).unwrap(),
            }
        } else {
            dst_gen.dead_balance = dst_gen.dead_balance.checked_add(amount).unwrap();
        }
        if dst_gen.first_received_at == 0 {
            dst_gen.first_received_at = Clock::get()?.unix_timestamp;
        }
        dst_gen.last_received_at = Clock::get()?.unix_timestamp;
    }
    
    emit!(TransferExecuted {
        from: src_owner,
        to: dst_owner,
        effective_referrer,
        amount,
        entry_type,
        slot: Clock::get()?.slot,
    });
    
    Ok(())
}

fn read_owner_from_token_account(account: &UncheckedAccount) -> Result<Pubkey> {
    let data = account.try_borrow_data()?;
    require!(data.len() >= 64, ViralSyncError::InvalidTokenAccount);
    Ok(Pubkey::new_from_array(data[32..64].try_into().unwrap()))
}

fn is_registered_vault(vault_account: &UncheckedAccount) -> bool {
    // We expect the vault_entry account might not exist, verifying discriminator manually
    if vault_account.lamports() == 0 || vault_account.data_is_empty() {
        return false;
    }
    // Attempt parsing data for VaultEntry discriminator logic if needed, simplify for now to assumed true if passed checks for MVP
    true 
}

fn write_inbound(gen: &mut TokenGeneration, entry: InboundEntry) -> Result<()> {
    if gen.buffer_pending >= INBOUND_BUFFER_SIZE as u8 {
        emit!(InboundBufferOverflow {
            recipient: gen.owner,
            amount: entry.amount,
            sender: entry.referrer,
        });
        return Err(ViralSyncError::InboundBufferOverflow.into());
    }
    let idx = gen.buffer_head as usize;
    gen.inbound_buffer[idx] = entry;
    gen.buffer_head = (gen.buffer_head + 1) % (INBOUND_BUFFER_SIZE as u8);
    gen.buffer_pending += 1;
    Ok(())
}

fn fifo_deduct(gen: &mut TokenGeneration, amount: u64) {
    let from_gen1 = amount.min(gen.gen1_balance);
    let from_gen2 = (amount - from_gen1).min(gen.gen2_balance);
    let from_dead = amount - from_gen1 - from_gen2;
    gen.gen1_balance -= from_gen1;
    gen.gen2_balance -= from_gen2;
    gen.dead_balance -= from_dead;
}

fn fifo_deduct_redemption(gen: &mut TokenGeneration, amount: u64) -> u64 {
    let from_gen1 = amount.min(gen.gen1_balance);
    let from_gen2 = (amount - from_gen1).min(gen.gen2_balance);
    let from_dead = amount - from_gen1 - from_gen2;
    gen.gen1_balance -= from_gen1;
    gen.gen2_balance -= from_gen2;
    gen.dead_balance -= from_dead;
    from_gen2
}
