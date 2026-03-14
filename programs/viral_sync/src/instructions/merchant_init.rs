use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use crate::errors::ViralSyncError;
use crate::state::{
    merchant_bond::MerchantBond,
    merchant_config::{MerchantConfig, VaultEntry},
};

// Phase 1: create_mint_and_config
#[derive(Accounts)]
pub struct CreateMintAndConfig<'info> {
    #[account(
        init,
        payer = merchant,
        space = 8 + 200, 
        seeds = [b"merchant_v4", mint.key().as_ref()],
        bump
    )]
    pub merchant_config: Account<'info, MerchantConfig>,
    
    #[account(mut)]
    pub merchant: Signer<'info>,
    
    // Mint should be created with Token Extensions correctly here, but we pass it as pre-created for MVP structure 
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_mint_and_config(
    ctx: Context<CreateMintAndConfig>, 
    commission_rate_bps: u16,
    transfer_fee_bps: u16,
    min_hold_before_share_secs: i64,
) -> Result<()> {
    require!(commission_rate_bps <= 10_000, ViralSyncError::InvalidMetricRange);
    require!(transfer_fee_bps < 10_000, ViralSyncError::InvalidMetricRange);

    let config = &mut ctx.accounts.merchant_config;
    
    config.bump = ctx.bumps.merchant_config;
    config.merchant = ctx.accounts.merchant.key();
    config.mint = ctx.accounts.mint.key();
    config.is_active = true;
    
    config.commission_rate_bps = commission_rate_bps;
    config.transfer_fee_bps = transfer_fee_bps;
    config.min_hold_before_share_secs = min_hold_before_share_secs;
    config.min_tokens_per_referral = 1;
    config.max_tokens_per_referral = u64::MAX;
    config.max_referrals_per_wallet_per_day = 25;
    config.allow_second_gen_transfer = true;
    config.slots_per_day = 216_000;
    config.token_expiry_days = 30;
    
    config.first_issuance_done = false;
    config.current_supply = 0;
    config.tokens_issued = 0;
    config.close_initiated_at = 0;
    config.close_window_ends_at = 0;
    
    Ok(())
}

// Phase 2: fund_merchant_program (Simulated for roadmap structure)
// Depositing bootstrap SOL / Escrows

// Phase 3: issue_first_tokens_and_lock
#[derive(Accounts)]
pub struct IssueFirstTokensAndLock<'info> {
    #[account(mut, has_one = merchant, has_one = mint)]
    pub merchant_config: Account<'info, MerchantConfig>,
    pub merchant: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
}

pub fn issue_first_tokens_and_lock(ctx: Context<IssueFirstTokensAndLock>, amount: u64) -> Result<()> {
    let config = &mut ctx.accounts.merchant_config;
    require!(!config.first_issuance_done, ViralSyncError::AccessDenied);
    require!(amount > 0, ViralSyncError::NothingToClaim);
    
    config.first_issuance_done = true;
    config.current_supply = config.current_supply
        .checked_add(amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    config.tokens_issued = config.tokens_issued
        .checked_add(amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeMerchantBond<'info> {
    #[account(
        init,
        payer = merchant,
        space = 8 + MerchantBond::LEN,
        seeds = [b"merchant_bond", merchant.key().as_ref()],
        bump
    )]
    pub merchant_bond: Account<'info, MerchantBond>,

    #[account(has_one = merchant)]
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_merchant_bond(
    ctx: Context<InitializeMerchantBond>,
    min_required_lamports: u64,
) -> Result<()> {
    let bond = &mut ctx.accounts.merchant_bond;
    bond.bump = ctx.bumps.merchant_bond;
    bond.merchant = ctx.accounts.merchant.key();
    bond.bonded_lamports = 0;
    bond.min_required_lamports = min_required_lamports;
    bond.is_locked = false;
    bond.unlock_requested_at = 0;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeVaultEntry<'info> {
    #[account(
        init,
        payer = merchant,
        space = 8 + VaultEntry::LEN,
        seeds = [b"vault_entry", mint.key().as_ref(), vault.key().as_ref()],
        bump
    )]
    pub vault_entry: Account<'info, VaultEntry>,

    #[account(has_one = merchant, has_one = mint)]
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    /// CHECK: Merchant-controlled vault token account or treasury destination.
    pub vault: UncheckedAccount<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_vault_entry(
    ctx: Context<InitializeVaultEntry>,
    is_dex: bool,
) -> Result<()> {
    let entry = &mut ctx.accounts.vault_entry;
    entry.bump = ctx.bumps.vault_entry;
    entry.vault = ctx.accounts.vault.key();
    entry.merchant = ctx.accounts.merchant.key();
    entry.is_active = true;
    entry.is_dex = is_dex;
    Ok(())
}
