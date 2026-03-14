use anchor_lang::{prelude::*, Discriminator};
use anchor_lang::system_program;
use crate::errors::ViralSyncError;
use crate::state::{
    merchant_config::MerchantConfig,
    referral_record::ReferralRecord,
    token_generation::{GenSource, ReferrerSlot, TokenGeneration, INBOUND_BUFFER_SIZE},
};

#[derive(Accounts)]
pub struct FinalizeInbound<'info> {
    #[account(
        mut,
        constraint = dest_generation.owner == dest.key() @ ViralSyncError::AccessDenied
    )]
    pub dest_generation: Box<Account<'info, TokenGeneration>>,

    /// CHECK: Destination wallet that owns the token generation PDA.
    pub dest: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub merchant_config: Box<Account<'info, MerchantConfig>>,

    pub system_program: Program<'info, System>,
}

pub fn finalize_inbound<'info>(
    ctx: Context<'_, '_, '_, 'info, FinalizeInbound<'info>>,
) -> Result<()> {
    let program_id = *ctx.program_id;
    let dest_key = ctx.accounts.dest.key();
    let payer_info = ctx.accounts.payer.to_account_info();
    let system_program_info = ctx.accounts.system_program.to_account_info();
    let config_merchant = ctx.accounts.merchant_config.merchant;
    let config_mint = ctx.accounts.merchant_config.mint;
    let token_expiry_days = ctx.accounts.merchant_config.token_expiry_days;
    let commission_rate_bps = ctx.accounts.merchant_config.commission_rate_bps;
    let gen = &mut ctx.accounts.dest_generation;

    require!(gen.mint == config_mint, ViralSyncError::AccessDenied);

    if gen.buffer_pending == 0 {
        return Ok(());
    }

    let now = Clock::get()?.unix_timestamp;
    let pending_entries = gen.buffer_pending;
    let start_index = (gen.buffer_head + INBOUND_BUFFER_SIZE as u8 - pending_entries) % INBOUND_BUFFER_SIZE as u8;
    let mut referral_accounts = ctx.remaining_accounts.iter();

    for offset in 0..pending_entries {
        let idx = ((start_index + offset) % INBOUND_BUFFER_SIZE as u8) as usize;
        let entry = gen.inbound_buffer[idx];

        if entry.processed || entry.amount == 0 {
            clear_entry(gen, idx);
            continue;
        }

        if entry.generation_source == GenSource::ViralShare && entry.referrer != Pubkey::default() {
            let referral_account = referral_accounts
                .next()
                .ok_or(ViralSyncError::InvalidReferralRecord)?;

            materialize_referral(
                &program_id,
                &payer_info,
                &system_program_info,
                gen,
                config_merchant,
                config_mint,
                token_expiry_days,
                commission_rate_bps,
                dest_key,
                now,
                entry.referrer,
                entry.amount,
                referral_account,
            )?;
        }

        clear_entry(gen, idx);
    }

    gen.buffer_pending = 0;
    Ok(())
}

fn materialize_referral<'info>(
    program_id: &Pubkey,
    payer_info: &AccountInfo<'info>,
    system_program_info: &AccountInfo<'info>,
    gen: &mut TokenGeneration,
    config_merchant: Pubkey,
    config_mint: Pubkey,
    token_expiry_days: u16,
    commission_rate_bps: u16,
    dest_key: Pubkey,
    now: i64,
    referrer: Pubkey,
    amount: u64,
    referral_account: &AccountInfo<'info>,
) -> Result<()> {
    let (expected_key, bump) = Pubkey::find_program_address(
        &[b"referral_v4", config_mint.as_ref(), referrer.as_ref(), dest_key.as_ref()],
        program_id,
    );

    require!(referral_account.key() == expected_key, ViralSyncError::InvalidReferralRecord);

    let needs_init = referral_account.owner == &system_program::ID && referral_account.data_is_empty();
    if needs_init {
        let rent = Rent::get()?;
        let signer_seeds: &[&[u8]] = &[
            b"referral_v4",
            config_mint.as_ref(),
            referrer.as_ref(),
            dest_key.as_ref(),
            &[bump],
        ];
        let signer = [signer_seeds];

        let cpi_accounts = system_program::CreateAccount {
            from: payer_info.clone(),
            to: referral_account.clone(),
        };

        system_program::create_account(
            CpiContext::new_with_signer(
                system_program_info.clone(),
                cpi_accounts,
                &signer,
            ),
            rent.minimum_balance(ReferralRecord::SPACE),
            ReferralRecord::SPACE as u64,
            program_id,
        )?;
    }

    require!(referral_account.owner == program_id, ViralSyncError::InvalidReferralRecord);

    apply_referrer_slot(gen, referrer, expected_key, amount)?;

    let mut record = if needs_init {
        ReferralRecord {
            bump,
            merchant: config_merchant,
            mint: config_mint,
            referrer,
            referred: dest_key,
            created_at: now,
            expires_at: expiry_timestamp(now, token_expiry_days),
            committed_commission_bps: commission_rate_bps,
            max_commission_cap: 0,
            commission_earned: 0,
            commission_settled: 0,
            is_active: true,
        }
    } else {
        let data = referral_account.try_borrow_data()?;
        let mut slice: &[u8] = &data[8..];
        ReferralRecord::try_deserialize_unchecked(&mut slice)?
    };

    record.bump = bump;
    record.merchant = config_merchant;
    record.mint = config_mint;
    record.referrer = referrer;
    record.referred = dest_key;
    record.committed_commission_bps = commission_rate_bps;
    record.max_commission_cap = record.max_commission_cap.checked_add(amount).ok_or(ViralSyncError::MathOverflow)?;
    record.is_active = true;
    if record.created_at == 0 {
        record.created_at = now;
    }
    let next_expiry = expiry_timestamp(now, token_expiry_days);
    if next_expiry > record.expires_at {
        record.expires_at = next_expiry;
    }

    let mut data = referral_account.try_borrow_mut_data()?;
    data[..8].copy_from_slice(&ReferralRecord::discriminator());
    let mut dst: &mut [u8] = &mut data[8..];
    record.try_serialize(&mut dst)?;

    Ok(())
}

fn apply_referrer_slot(
    gen: &mut TokenGeneration,
    referrer: Pubkey,
    referral_record: Pubkey,
    amount: u64,
) -> Result<()> {
    if let Some(slot) = gen.referrer_slots.iter_mut().find(|slot| {
        slot.is_active && slot.referrer == referrer && slot.referral_record == referral_record
    }) {
        slot.tokens_attributed = slot.tokens_attributed.checked_add(amount).ok_or(ViralSyncError::MathOverflow)?;
        return Ok(());
    }

    if let Some(slot) = gen.referrer_slots.iter_mut().find(|slot| !slot.is_active) {
        *slot = ReferrerSlot {
            referrer,
            referral_record,
            tokens_attributed: amount,
            tokens_redeemed_so_far: 0,
            is_active: true,
        };
        gen.active_referrer_slots = gen.referrer_slots.iter().filter(|slot| slot.is_active).count() as u8;
        return Ok(());
    }

    Err(ViralSyncError::TooManyActiveReferrers.into())
}

fn expiry_timestamp(now: i64, token_expiry_days: u16) -> i64 {
    if token_expiry_days == 0 {
        return 0;
    }
    now.saturating_add(token_expiry_days as i64 * 86_400)
}

fn clear_entry(gen: &mut TokenGeneration, index: usize) {
    gen.inbound_buffer[index].processed = true;
    gen.inbound_buffer[index].amount = 0;
    gen.inbound_buffer[index].referrer = Pubkey::default();
    gen.inbound_buffer[index].slot = 0;
}
