use anchor_lang::prelude::*;

use crate::errors::ViralSyncError;
use crate::state::{
    bond_claim_marker::BondClaimMarker,
    merchant_bond::MerchantBond,
    merchant_closure_snapshot::MerchantClosureSnapshot,
    merchant_config::MerchantConfig,
    token_generation::TokenGeneration,
};

pub const CLOSE_WINDOW_SECS: i64 = 2_592_000; // 30 days

#[event]
pub struct MerchantCloseInitiated {
    pub merchant: Pubkey,
    pub mint: Pubkey,
    pub outstanding_tokens: u64,
    pub close_window_ends_at: i64,
}

#[event]
pub struct MerchantClosed {
    pub merchant: Pubkey,
    pub mint: Pubkey,
}

#[event]
pub struct BondShareRedeemed {
    pub holder: Pubkey,
    pub lamports: u64,
}

#[derive(Accounts)]
pub struct WithdrawBond<'info> {
    #[account(mut, has_one = merchant)]
    pub merchant_bond: Account<'info, MerchantBond>,

    #[account(mut)]
    pub merchant: Signer<'info>,
}

pub fn withdraw_bond(ctx: Context<WithdrawBond>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let bond_info = ctx.accounts.merchant_bond.to_account_info();
    let merchant_info = ctx.accounts.merchant.to_account_info();
    let bond = &mut ctx.accounts.merchant_bond;

    require!(!bond.is_locked, ViralSyncError::AccessDenied);
    if bond.unlock_requested_at > 0 {
        require!(now > bond.unlock_requested_at + 172_800, ViralSyncError::AccessDenied);
    }
    require!(
        bond.bonded_lamports.saturating_sub(amount) >= bond.min_required_lamports,
        ViralSyncError::InsufficientBalance
    );

    let rent_floor = Rent::get()?.minimum_balance(bond_info.data_len());
    let available_lamports = (**bond_info.lamports.borrow()).saturating_sub(rent_floor);
    require!(available_lamports >= amount, ViralSyncError::InsufficientBalance);

    bond.bonded_lamports = bond
        .bonded_lamports
        .checked_sub(amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    **bond_info.try_borrow_mut_lamports()? -= amount;
    **merchant_info.try_borrow_mut_lamports()? += amount;

    Ok(())
}

#[derive(Accounts)]
pub struct InitiateCloseMerchant<'info> {
    #[account(mut, has_one = merchant)]
    pub merchant_config: Account<'info, MerchantConfig>,

    pub merchant: Signer<'info>,
}

pub fn initiate_close_merchant(ctx: Context<InitiateCloseMerchant>) -> Result<()> {
    let config = &mut ctx.accounts.merchant_config;
    require!(config.is_active, ViralSyncError::MerchantInactive);

    config.is_active = false;
    config.close_initiated_at = Clock::get()?.unix_timestamp;
    config.close_window_ends_at = config.close_initiated_at + CLOSE_WINDOW_SECS;

    emit!(MerchantCloseInitiated {
        merchant: config.merchant,
        mint: config.mint,
        outstanding_tokens: config.current_supply,
        close_window_ends_at: config.close_window_ends_at,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct FinalizeCloseMerchant<'info> {
    #[account(mut, has_one = merchant)]
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(mut, has_one = merchant)]
    pub merchant_bond: Account<'info, MerchantBond>,

    #[account(
        init,
        payer = merchant,
        space = 8 + MerchantClosureSnapshot::LEN,
        seeds = [b"merchant_close_snapshot", merchant_config.key().as_ref()],
        bump
    )]
    pub closure_snapshot: Account<'info, MerchantClosureSnapshot>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn finalize_close_merchant(ctx: Context<FinalizeCloseMerchant>) -> Result<()> {
    let config = &ctx.accounts.merchant_config;
    let now = Clock::get()?.unix_timestamp;
    require!(!config.is_active, ViralSyncError::MerchantInactive);
    require!(config.close_window_ends_at > 0, ViralSyncError::MerchantClosureNotFinalized);
    require!(now > config.close_window_ends_at, ViralSyncError::CloseWindowNotExpired);

    let bond = &mut ctx.accounts.merchant_bond;
    bond.is_locked = true;

    let snapshot = &mut ctx.accounts.closure_snapshot;
    snapshot.bump = ctx.bumps.closure_snapshot;
    snapshot.merchant = config.merchant;
    snapshot.mint = config.mint;
    snapshot.close_initiated_at = config.close_initiated_at;
    snapshot.close_finalized_at = now;
    snapshot.total_supply_snapshot = config.current_supply;
    snapshot.bonded_lamports_snapshot = bond.bonded_lamports;
    snapshot.claims_processed = 0;

    emit!(MerchantClosed {
        merchant: config.merchant,
        mint: config.mint,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct RedeemBondShare<'info> {
    pub merchant_config: Box<Account<'info, MerchantConfig>>,

    #[account(
        mut,
        constraint = holder_generation.owner == holder.key() @ ViralSyncError::AccessDenied,
        constraint = holder_generation.mint == merchant_config.mint @ ViralSyncError::AccessDenied
    )]
    pub holder_generation: Box<Account<'info, TokenGeneration>>,

    #[account(mut)]
    pub merchant_bond: Box<Account<'info, MerchantBond>>,

    #[account(
        mut,
        seeds = [b"merchant_close_snapshot", merchant_config.key().as_ref()],
        bump = closure_snapshot.bump,
        constraint = closure_snapshot.merchant == merchant_config.merchant @ ViralSyncError::MerchantClosureNotFinalized,
        constraint = closure_snapshot.mint == merchant_config.mint @ ViralSyncError::MerchantClosureNotFinalized
    )]
    pub closure_snapshot: Box<Account<'info, MerchantClosureSnapshot>>,

    #[account(
        init_if_needed,
        payer = holder,
        space = 8 + BondClaimMarker::LEN,
        seeds = [b"bond_claim_v1", closure_snapshot.key().as_ref(), holder.key().as_ref()],
        bump
    )]
    pub bond_claim_marker: Box<Account<'info, BondClaimMarker>>,

    #[account(mut)]
    pub holder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn redeem_bond_share(ctx: Context<RedeemBondShare>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &ctx.accounts.merchant_config;
    let gen = &ctx.accounts.holder_generation;
    let bond = &mut ctx.accounts.merchant_bond;
    let snapshot = &mut ctx.accounts.closure_snapshot;
    let bond_info = bond.to_account_info();
    let holder_info = ctx.accounts.holder.to_account_info();
    let marker = &mut ctx.accounts.bond_claim_marker;

    require!(!config.is_active, ViralSyncError::MerchantInactive);
    require!(config.close_window_ends_at > 0, ViralSyncError::MerchantClosureNotFinalized);
    require!(now > config.close_window_ends_at, ViralSyncError::CloseWindowNotExpired);
    require!(bond.merchant == config.merchant, ViralSyncError::AccessDenied);
    require!(snapshot.close_finalized_at > 0, ViralSyncError::MerchantClosureNotFinalized);
    require!(marker.claimed_at == 0, ViralSyncError::BondShareAlreadyRedeemed);

    let holder_tokens = total_generation_balance(gen)?;
    require!(holder_tokens > 0, ViralSyncError::NothingToClaim);
    require!(snapshot.total_supply_snapshot > 0, ViralSyncError::MerchantClosureNotFinalized);

    let bond_share = (snapshot.bonded_lamports_snapshot as u128)
        .checked_mul(holder_tokens as u128)
        .ok_or(ViralSyncError::MathOverflow)?
        .checked_div(snapshot.total_supply_snapshot as u128)
        .ok_or(ViralSyncError::MathOverflow)? as u64;
    require!(bond_share > 0, ViralSyncError::NothingToClaim);

    let rent_floor = Rent::get()?.minimum_balance(bond_info.data_len());
    let available_lamports = (**bond_info.lamports.borrow()).saturating_sub(rent_floor);
    require!(available_lamports >= bond_share, ViralSyncError::InsufficientBalance);
    require!(bond.bonded_lamports >= bond_share, ViralSyncError::InsufficientBalance);

    bond.bonded_lamports = bond
        .bonded_lamports
        .checked_sub(bond_share)
        .ok_or(ViralSyncError::MathOverflow)?;
    snapshot.claims_processed = snapshot
        .claims_processed
        .checked_add(1)
        .ok_or(ViralSyncError::MathOverflow)?;

    marker.bump = ctx.bumps.bond_claim_marker;
    marker.snapshot = snapshot.key();
    marker.merchant = config.merchant;
    marker.holder = ctx.accounts.holder.key();
    marker.claimed_lamports = bond_share;
    marker.claimed_at = now;

    **bond_info.try_borrow_mut_lamports()? -= bond_share;
    **holder_info.try_borrow_mut_lamports()? += bond_share;

    emit!(BondShareRedeemed {
        holder: gen.owner,
        lamports: bond_share,
    });
    Ok(())
}

fn total_generation_balance(gen: &TokenGeneration) -> Result<u64> {
    gen.gen1_balance
        .checked_add(gen.gen2_balance)
        .and_then(|value| value.checked_add(gen.dead_balance))
        .ok_or_else(|| error!(ViralSyncError::MathOverflow))
}
