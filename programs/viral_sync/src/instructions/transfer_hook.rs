use anchor_lang::{prelude::*, AccountDeserialize, AccountSerialize, Discriminator};
use anchor_spl::token_interface::Mint;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta,
    seeds::Seed,
    state::ExtraAccountMetaList,
};
use spl_token_2022::{
    extension::{transfer_hook::TransferHookAccount, BaseStateWithExtensions, StateWithExtensions},
    state::Account as Token2022Account,
};
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

use crate::errors::ViralSyncError;
use crate::events::*;
use crate::instructions::geo_fencing::geo_attestation_is_fresh;
use crate::state::{
    geo_attestation_nonce::GeoAttestationNonce,
    merchant_config::{GeoFence, MerchantConfig, VaultEntry},
    token_generation::{GenSource, InboundEntry, TokenGeneration, INBOUND_BUFFER_SIZE},
};

#[derive(Accounts)]
pub struct InitExtraAccountMetaList<'info> {
    #[account(mut)]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_extra_account_meta_list(ctx: Context<InitExtraAccountMetaList>) -> Result<()> {
    let extra_metas = &[
        ExtraAccountMeta::new_with_seeds(
            &[Seed::Literal { bytes: b"merchant_v4".to_vec() }, Seed::AccountKey { index: 1 }],
            false,
            false,
        )?,
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: b"vault_entry".to_vec() },
                Seed::AccountKey { index: 1 },
                Seed::AccountKey { index: 2 },
            ],
            false,
            false,
        )?,
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: b"geo_fence".to_vec() },
                Seed::AccountKey { index: 1 },
                Seed::AccountKey { index: 2 },
            ],
            false,
            false,
        )?,
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: b"gen_v4".to_vec() },
                Seed::AccountKey { index: 1 },
                Seed::AccountData {
                    account_index: 0,
                    data_index: 32,
                    length: 32,
                },
            ],
            false,
            true,
        )?,
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: b"gen_v4".to_vec() },
                Seed::AccountKey { index: 1 },
                Seed::AccountData {
                    account_index: 2,
                    data_index: 32,
                    length: 32,
                },
            ],
            false,
            true,
        )?,
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: b"geo_nonce".to_vec() },
                Seed::AccountKey { index: 7 },
                Seed::AccountData {
                    account_index: 0,
                    data_index: 32,
                    length: 32,
                },
            ],
            false,
            true,
        )?,
    ];

    ExtraAccountMetaList::init::<ExecuteInstruction>(
        &mut ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?,
        extra_metas,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct ExecuteHook<'info> {
    /// CHECK: Token-2022 source token account.
    pub source_token_account: UncheckedAccount<'info>,
    /// CHECK: Mint for the transfer hook invocation.
    pub mint: UncheckedAccount<'info>,
    /// CHECK: Token-2022 destination token account.
    pub dest_token_account: UncheckedAccount<'info>,
    /// CHECK: Source authority/delegate forwarded by Token-2022.
    pub source_authority: UncheckedAccount<'info>,
    /// CHECK: Validation account provided by the transfer hook interface.
    pub extra_account_meta_list: UncheckedAccount<'info>,

    pub merchant_config: Box<Account<'info, MerchantConfig>>,

    /// CHECK: Optional vault registration entry.
    pub vault_entry: UncheckedAccount<'info>,

    /// CHECK: Optional geofence for redemptions.
    pub geo_fence: UncheckedAccount<'info>,

    #[account(mut)]
    pub source_generation: Box<Account<'info, TokenGeneration>>,

    #[account(mut)]
    pub dest_generation: Box<Account<'info, TokenGeneration>>,

    /// CHECK: Geo attestation marker staged before redemption.
    #[account(mut)]
    pub geo_nonce: UncheckedAccount<'info>,
}

#[inline(never)]
pub fn execute_transfer_hook(ctx: Context<ExecuteHook>, amount: u64) -> Result<()> {
    assert_is_transferring(&ctx.accounts.source_token_account)?;

    let source_owner = read_owner_from_token_account(&ctx.accounts.source_token_account)?;
    let destination_owner = read_owner_from_token_account(&ctx.accounts.dest_token_account)?;
    let mint = ctx.accounts.mint.key();

    require!(
        ctx.accounts.source_generation.owner == source_owner,
        ViralSyncError::InvalidSourceGeneration
    );
    require!(
        ctx.accounts.dest_generation.owner == destination_owner,
        ViralSyncError::InvalidDestGeneration
    );
    require!(
        ctx.accounts.source_generation.mint == mint && ctx.accounts.dest_generation.mint == mint,
        ViralSyncError::AccessDenied
    );

    let config = &ctx.accounts.merchant_config;
    let registered_vault = load_registered_vault(
        &ctx.accounts.vault_entry,
        ctx.accounts.dest_token_account.key(),
    );

    let src_gen = &mut *ctx.accounts.source_generation;
    let dst_gen = &mut *ctx.accounts.dest_generation;

    let src_owner = src_gen.owner;
    let dst_owner = dst_gen.owner;

    let is_from_merchant = src_owner == config.merchant;
    let is_from_treasury = src_gen.is_treasury;
    let is_src_intermediary = src_gen.is_intermediary;
    let is_dst_intermediary = dst_gen.is_intermediary;
    let is_to_vault = registered_vault.as_ref().map(|entry| entry.is_active).unwrap_or(false);
    let is_dex_involved = src_gen.is_dex_pool
        || dst_gen.is_dex_pool
        || registered_vault.as_ref().map(|entry| entry.is_dex).unwrap_or(false);
    let now = Clock::get()?.unix_timestamp;

    if !config.is_active && !is_from_treasury && !is_to_vault {
        return Err(ViralSyncError::MerchantInactive.into());
    }

    if is_from_treasury {
        fifo_deduct(src_gen, amount)?;
        credit_inbound(dst_gen, amount, Pubkey::default(), GenSource::Issuance, now)?;
        return Ok(());
    }

    if is_dex_involved {
        if !is_src_intermediary && !is_from_merchant {
            fifo_deduct(src_gen, amount)?;
        }
        if !dst_gen.is_dex_pool && !is_dst_intermediary {
            dst_gen.dead_balance = checked_add(dst_gen.dead_balance, amount)?;
            emit!(DexTransferDetected {
                from: src_owner,
                to: dst_owner,
                amount,
            });
        }
        return Ok(());
    }

    if !is_from_merchant && !is_src_intermediary && config.token_expiry_days > 0 {
        let age_days = now.saturating_sub(src_gen.first_received_at) / 86_400;
        require!(age_days <= config.token_expiry_days as i64, ViralSyncError::TokensExpired);
    }

    if is_to_vault && !is_from_merchant {
        require!(src_gen.buffer_pending == 0, ViralSyncError::MustFinalizeBeforeRedeem);
        require!(!src_gen.redemption_pending, ViralSyncError::PreviousRedemptionUnprocessed);

        validate_geo_redemption(
            &ctx.accounts.geo_fence,
            &ctx.accounts.geo_nonce,
            config.merchant,
            mint,
            ctx.accounts.dest_token_account.key(),
            src_owner,
            now,
        )?;

        let gen2_consumed = fifo_deduct_redemption(src_gen, amount)?;
        src_gen.redemption_pending = true;
        src_gen.redemption_slot = Clock::get()?.slot;
        src_gen.redemption_gen2_consumed = gen2_consumed;
        src_gen.redemption_slots_settled = 0;
        src_gen.redemption_required_mask = active_referrer_mask(src_gen);

        let total_gen2_before = checked_add(src_gen.gen2_balance, gen2_consumed)?;
        for index in 0..src_gen.referrer_slots.len() {
            let slot = src_gen.referrer_slots[index];
            if slot.is_active && total_gen2_before > 0 {
                src_gen.redemption_slot_consumed[index] = gen2_consumed
                    .checked_mul(slot.tokens_attributed)
                    .ok_or(ViralSyncError::MathOverflow)?
                    .checked_div(total_gen2_before)
                    .unwrap_or(0);
            } else {
                src_gen.redemption_slot_consumed[index] = 0;
            }
        }

        emit!(RedemptionDetected {
            redeemer: src_owner,
            amount,
            gen2_consumed,
            slot: Clock::get()?.slot,
        });
        return Ok(());
    }

    if is_from_merchant {
        credit_inbound(dst_gen, amount, Pubkey::default(), GenSource::Issuance, now)?;
        return Ok(());
    }

    if is_src_intermediary {
        fifo_deduct(src_gen, amount)?;
        let effective_referrer = src_gen.original_sender;
        if !is_dst_intermediary {
            let entry_type = if effective_referrer != Pubkey::default() {
                GenSource::ViralShare
            } else {
                GenSource::DeadPass
            };
            credit_inbound(dst_gen, amount, effective_referrer, entry_type.clone(), now)?;
        }
        return Ok(());
    }

    let held_secs = now.saturating_sub(src_gen.first_received_at);
    require!(held_secs >= config.min_hold_before_share_secs, ViralSyncError::HoldPeriodNotMet);
    require!(amount >= config.min_tokens_per_referral, ViralSyncError::BelowMinimum);
    require!(amount <= config.max_tokens_per_referral, ViralSyncError::ExceedsMaximum);

    let today_index = Clock::get()?.slot / config.slots_per_day.max(1);
    if src_gen.share_limit_day == today_index {
        require!(
            src_gen.shares_today < config.max_referrals_per_wallet_per_day,
            ViralSyncError::DailyShareLimitExceeded
        );
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
    src_gen.gen1_balance = checked_sub(src_gen.gen1_balance, from_gen1)?;
    src_gen.gen2_balance = checked_sub(src_gen.gen2_balance, from_gen2)?;
    src_gen.dead_balance = checked_sub(src_gen.dead_balance, from_dead)?;

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
        credit_inbound(dst_gen, amount, effective_referrer, entry_type.clone(), now)?;
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

fn assert_is_transferring(token_account: &UncheckedAccount) -> Result<()> {
    let data = token_account.try_borrow_data()?;
    let account = StateWithExtensions::<Token2022Account>::unpack(&data)
        .map_err(|_| error!(ViralSyncError::InvalidTokenAccount))?;
    let extension = account
        .get_extension::<TransferHookAccount>()
        .map_err(|_| error!(ViralSyncError::TransferHookNotTransferring))?;

    require!(
        bool::from(extension.transferring),
        ViralSyncError::TransferHookNotTransferring
    );
    Ok(())
}

fn read_owner_from_token_account(account: &UncheckedAccount) -> Result<Pubkey> {
    let data = account.try_borrow_data()?;
    require!(data.len() >= 64, ViralSyncError::InvalidTokenAccount);
    Ok(Pubkey::new_from_array(data[32..64].try_into().unwrap()))
}

fn load_registered_vault(vault_account: &UncheckedAccount, expected_vault: Pubkey) -> Option<VaultEntry> {
    if vault_account.owner != &crate::id() || vault_account.lamports() == 0 || vault_account.data_is_empty() {
        return None;
    }

    let data = vault_account.try_borrow_data().ok()?;
    let mut slice: &[u8] = &data;
    let entry = VaultEntry::try_deserialize(&mut slice).ok()?;
    if entry.is_active && entry.vault == expected_vault {
        Some(entry)
    } else {
        None
    }
}

fn validate_geo_redemption(
    geo_fence_account: &UncheckedAccount,
    geo_nonce_account: &UncheckedAccount,
    merchant: Pubkey,
    mint: Pubkey,
    vault: Pubkey,
    redeemer: Pubkey,
    now: i64,
) -> Result<()> {
    let fence: GeoFence = load_anchor_account(geo_fence_account, ViralSyncError::InvalidGeoFence)?;
    require!(fence.is_active, ViralSyncError::GeoAttestationRequired);
    require!(fence.merchant == merchant, ViralSyncError::InvalidGeoFence);
    require!(fence.mint == mint, ViralSyncError::InvalidGeoFence);
    require!(fence.vault == vault, ViralSyncError::InvalidGeoFence);

    let mut nonce: GeoAttestationNonce =
        load_anchor_account(geo_nonce_account, ViralSyncError::InvalidGeoNonce)?;
    require!(
        geo_attestation_is_fresh(&nonce, geo_fence_account.key(), redeemer, now),
        ViralSyncError::GeoAttestationMissing
    );
    if nonce.bypass_geo {
        require!(fence.allow_non_geo_redemption, ViralSyncError::GeoAttestationRequired);
    }
    nonce.consumed_at = now;
    store_anchor_account(geo_nonce_account, &nonce)?;
    Ok(())
}

fn load_anchor_account<T: AccountDeserialize>(
    account: &UncheckedAccount,
    error_code: ViralSyncError,
) -> Result<T> {
    if account.owner != &crate::id() {
        return Err(error!(error_code));
    }
    if account.data_is_empty() {
        return Err(error!(error_code));
    }

    let data = account.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    T::try_deserialize(&mut slice).map_err(|_| error!(error_code))
}

fn store_anchor_account<T: AccountSerialize + Discriminator>(
    account: &UncheckedAccount,
    value: &T,
) -> Result<()> {
    let mut data = account.try_borrow_mut_data()?;
    require!(data.len() >= 8, ViralSyncError::InvalidGeoNonce);
    data[..8].copy_from_slice(&T::discriminator());
    let mut dst: &mut [u8] = &mut data[8..];
    value.try_serialize(&mut dst)?;
    Ok(())
}

fn credit_inbound(
    generation: &mut TokenGeneration,
    amount: u64,
    referrer: Pubkey,
    generation_source: GenSource,
    now: i64,
) -> Result<()> {
    let entry = InboundEntry {
        referrer,
        amount,
        generation_source: generation_source.clone(),
        slot: Clock::get()?.slot,
        processed: false,
        _padding: [0u8; 7],
    };

    if write_inbound(generation, entry).is_ok() {
        match generation_source {
            GenSource::Issuance => {
                generation.gen1_balance = checked_add(generation.gen1_balance, amount)?;
            }
            GenSource::ViralShare => {
                generation.gen2_balance = checked_add(generation.gen2_balance, amount)?;
            }
            GenSource::DeadPass => {
                generation.dead_balance = checked_add(generation.dead_balance, amount)?;
            }
        }
    } else {
        generation.dead_balance = checked_add(generation.dead_balance, amount)?;
    }

    generation.total_lifetime = checked_add(generation.total_lifetime, amount)?;
    if generation.first_received_at == 0 {
        generation.first_received_at = now;
    }
    generation.last_received_at = now;
    Ok(())
}

fn write_inbound(generation: &mut TokenGeneration, entry: InboundEntry) -> Result<()> {
    if generation.buffer_pending >= INBOUND_BUFFER_SIZE as u8 {
        emit!(InboundBufferOverflow {
            recipient: generation.owner,
            amount: entry.amount,
            sender: entry.referrer,
        });
        return Err(ViralSyncError::InboundBufferOverflow.into());
    }

    let index = generation.buffer_head as usize;
    generation.inbound_buffer[index] = entry;
    generation.buffer_head = (generation.buffer_head + 1) % (INBOUND_BUFFER_SIZE as u8);
    generation.buffer_pending += 1;
    Ok(())
}

fn fifo_deduct(generation: &mut TokenGeneration, amount: u64) -> Result<()> {
    let from_gen1 = amount.min(generation.gen1_balance);
    let from_gen2 = (amount - from_gen1).min(generation.gen2_balance);
    let from_dead = amount - from_gen1 - from_gen2;
    generation.gen1_balance = checked_sub(generation.gen1_balance, from_gen1)?;
    generation.gen2_balance = checked_sub(generation.gen2_balance, from_gen2)?;
    generation.dead_balance = checked_sub(generation.dead_balance, from_dead)?;
    Ok(())
}

fn fifo_deduct_redemption(generation: &mut TokenGeneration, amount: u64) -> Result<u64> {
    let from_gen1 = amount.min(generation.gen1_balance);
    let from_gen2 = (amount - from_gen1).min(generation.gen2_balance);
    let from_dead = amount - from_gen1 - from_gen2;
    generation.gen1_balance = checked_sub(generation.gen1_balance, from_gen1)?;
    generation.gen2_balance = checked_sub(generation.gen2_balance, from_gen2)?;
    generation.dead_balance = checked_sub(generation.dead_balance, from_dead)?;
    Ok(from_gen2)
}

fn checked_add(lhs: u64, rhs: u64) -> Result<u64> {
    lhs.checked_add(rhs).ok_or(ViralSyncError::MathOverflow.into())
}

fn checked_sub(lhs: u64, rhs: u64) -> Result<u64> {
    lhs.checked_sub(rhs).ok_or(ViralSyncError::InsufficientBalance.into())
}

fn active_referrer_mask(generation: &TokenGeneration) -> u8 {
    generation
        .referrer_slots
        .iter()
        .enumerate()
        .fold(0u8, |mask, (index, slot)| {
            if slot.is_active {
                mask | (1 << index)
            } else {
                mask
            }
        })
}
