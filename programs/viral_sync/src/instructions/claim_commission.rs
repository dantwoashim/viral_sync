use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked};
use crate::state::{
    merchant_config::MerchantConfig,
    commission_ledger::CommissionLedger, 
    token_generation::TokenGeneration
};
use crate::errors::ViralSyncError;

impl CommissionLedger {
    pub const LEN: usize = 1 + 32 + 32 + 32 + 8 + 4 + 1 + 8 + 8 + 8 + 8 + 8;
}

#[derive(Accounts)]
pub struct InitializeCommissionLedger<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + CommissionLedger::LEN,
        seeds = [b"commission_ledger", referrer.key().as_ref(), merchant_config.merchant.as_ref()],
        bump
    )]
    pub commission_ledger: Account<'info, CommissionLedger>,

    pub merchant_config: Box<Account<'info, MerchantConfig>>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Wallet that will receive commissions for this merchant.
    pub referrer: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_commission_ledger(ctx: Context<InitializeCommissionLedger>) -> Result<()> {
    let ledger = &mut ctx.accounts.commission_ledger;
    ledger.bump = ctx.bumps.commission_ledger;
    ledger.referrer = ctx.accounts.referrer.key();
    ledger.merchant = ctx.accounts.merchant_config.merchant;
    ledger.mint = ctx.accounts.merchant_config.mint;
    ledger.claimable = 0;
    ledger.dust_tenths_accumulated = 0;
    ledger.frozen = false;
    ledger.frozen_amount = 0;
    ledger.total_earned = 0;
    ledger.total_claimed = 0;
    ledger.total_redemptions_driven = 0;
    ledger.highest_single_commission = 0;
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimCommission<'info> {
    #[account(mut)]
    pub commission_ledger: Box<Account<'info, CommissionLedger>>,

    pub merchant_config: Box<Account<'info, MerchantConfig>>,

    #[account(mut)]
    pub treasury_generation: Box<Account<'info, TokenGeneration>>,

    #[account(mut)]
    pub treasury_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub referrer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,
    
    /// CHECK: PDA Treasury Signer
    #[account(
        seeds = [b"treasury_signer", merchant_config.key().as_ref()],
        bump
    )]
    pub treasury_signer: UncheckedAccount<'info>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

#[inline(never)]
pub fn claim_commission(ctx: Context<ClaimCommission>) -> Result<()> {
    let ledger = &mut *ctx.accounts.commission_ledger;
    let config = &ctx.accounts.merchant_config;

    require!(ledger.merchant == config.merchant, ViralSyncError::AccessDenied);
    require!(ledger.mint == ctx.accounts.mint.key(), ViralSyncError::AccessDenied);
    require!(ctx.accounts.treasury_generation.is_treasury, ViralSyncError::AccessDenied);
    require!(ctx.accounts.treasury_generation.mint == ctx.accounts.mint.key(), ViralSyncError::AccessDenied);
    require!(ctx.accounts.treasury_generation.owner == ctx.accounts.treasury_ata.key(), ViralSyncError::AccessDenied);
    require!(config.mint == ctx.accounts.mint.key(), ViralSyncError::AccessDenied);
    require!(ctx.accounts.treasury_ata.mint == ctx.accounts.mint.key(), ViralSyncError::AccessDenied);
    require!(ctx.accounts.treasury_ata.owner == ctx.accounts.treasury_signer.key(), ViralSyncError::AccessDenied);
    require!(ctx.accounts.referrer_ata.mint == ctx.accounts.mint.key(), ViralSyncError::AccessDenied);
    require!(ctx.accounts.referrer_ata.owner == ledger.referrer, ViralSyncError::AccessDenied);
    
    require!(!ledger.frozen, ViralSyncError::CommissionFrozenDictated);
    
    let gross_claimable = ledger.claimable;
    require!(gross_claimable > 0, ViralSyncError::NothingToClaim);
    
    // Adjust for Token-2022 transfer fees so real amount received exactly matches earned
    // gross_to_send = net_receive / (1 - fee_rate)
    let fee_bps = config.transfer_fee_bps as u64;
    require!(fee_bps < 10_000, ViralSyncError::InvalidMetricRange);
    let gross_to_send = (gross_claimable as u128)
        .checked_mul(10_000)
        .ok_or(ViralSyncError::MathOverflow)?
        .checked_div(10_000 - fee_bps as u128)
        .ok_or(ViralSyncError::MathOverflow)?
        .try_into()
        .map_err(|_| ViralSyncError::MathOverflow)?;
        
    // Execute transfer. Because the treasury is sending, its hook flags (is_treasury = true) 
    // will tag the incoming tokens on the referrer side identically as Gen-1 tokens issuance.
    
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.treasury_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.referrer_ata.to_account_info(),
        authority: ctx.accounts.treasury_signer.to_account_info(),
    };
    
    let signer_seeds: &[&[u8]] = &[
        b"treasury_signer",
        ctx.accounts.merchant_config.to_account_info().key.as_ref(),
        &[ctx.bumps.treasury_signer],
    ];
    let signer = [signer_seeds];
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        &signer,
    );
    transfer_checked(cpi_ctx, gross_to_send, ctx.accounts.mint.decimals)?;
    
    ledger.total_claimed = ledger.total_claimed
        .checked_add(gross_claimable)
        .ok_or(ViralSyncError::MathOverflow)?;
    ledger.claimable = 0;
    // We intentionally wipe fractional dust on claims explicitly so manual intervention ensures alignment.
    ledger.dust_tenths_accumulated = 0; 
    
    Ok(())
}
