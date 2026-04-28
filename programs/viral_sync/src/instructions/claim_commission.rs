use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked};
use crate::state::{
    merchant_config::MerchantConfig,
    commission_ledger::CommissionLedger, 
    token_generation::TokenGeneration
};
use crate::errors::ViralSyncError;

#[derive(Accounts)]
pub struct ClaimCommission<'info> {
    #[account(
        mut,
        constraint = commission_ledger.merchant == merchant_config.merchant @ ViralSyncError::InvalidState,
        constraint = commission_ledger.mint == mint.key() @ ViralSyncError::InvalidState
    )]
    pub commission_ledger: Account<'info, CommissionLedger>,
    
    #[account(
        constraint = merchant_config.mint == mint.key() @ ViralSyncError::InvalidState
    )]
    pub merchant_config: Account<'info, MerchantConfig>,
    
    #[account(
        mut,
        constraint = treasury_generation.is_treasury @ ViralSyncError::InvalidState,
        constraint = treasury_generation.owner == treasury_signer.key() @ ViralSyncError::InvalidState,
        constraint = treasury_generation.mint == mint.key() @ ViralSyncError::InvalidState
    )]
    pub treasury_generation: Box<Account<'info, TokenGeneration>>,
    
    #[account(
        mut,
        constraint = treasury_ata.owner == treasury_signer.key() @ ViralSyncError::InvalidTokenAccount,
        constraint = treasury_ata.mint == mint.key() @ ViralSyncError::InvalidTokenAccount
    )]
    pub treasury_ata: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = referrer_ata.owner == commission_ledger.referrer @ ViralSyncError::InvalidTokenAccount,
        constraint = referrer_ata.mint == mint.key() @ ViralSyncError::InvalidTokenAccount
    )]
    pub referrer_ata: InterfaceAccount<'info, TokenAccount>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub treasury_signer: Signer<'info>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn claim_commission(ctx: Context<ClaimCommission>) -> Result<()> {
    let ledger = &mut ctx.accounts.commission_ledger;
    let config = &ctx.accounts.merchant_config;
    
    require!(!ledger.frozen, ViralSyncError::CommissionFrozenDictated);
    
    let gross_claimable = ledger.claimable;
    require!(gross_claimable > 0, ViralSyncError::NothingToClaim);
    
    // Adjust for Token-2022 transfer fees so real amount received exactly matches earned
    // gross_to_send = net_receive / (1 - fee_rate)
    let fee_bps = config.transfer_fee_bps as u64;
    require!(fee_bps < 10_000, ViralSyncError::InvalidConfig);
    let gross_to_send = (gross_claimable as u128)
        .checked_mul(10_000).ok_or(ViralSyncError::MathOverflow)?
        .checked_div(10_000 - fee_bps as u128).ok_or(ViralSyncError::MathOverflow)? as u64;
        
    // Execute transfer. Because the treasury is sending, its hook flags (is_treasury = true) 
    // will tag the incoming tokens on the referrer side identically as Gen-1 tokens issuance.
    
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.treasury_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.referrer_ata.to_account_info(),
        authority: ctx.accounts.treasury_signer.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, gross_to_send, ctx.accounts.mint.decimals)?;
    
    ledger.total_claimed = ledger.total_claimed.checked_add(gross_claimable).ok_or(ViralSyncError::MathOverflow)?;
    ledger.claimable = 0;
    // We intentionally wipe fractional dust on claims explicitly so manual intervention ensures alignment.
    ledger.dust_tenths_accumulated = 0; 
    
    Ok(())
}
