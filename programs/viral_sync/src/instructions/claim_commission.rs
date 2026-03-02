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
    #[account(mut)]
    pub commission_ledger: Account<'info, CommissionLedger>,
    
    pub merchant_config: Account<'info, MerchantConfig>,
    
    // Note: PDA verifying treasury seeds omitted for brevity but required in real implementation
    #[account(mut)]
    pub treasury_generation: Account<'info, TokenGeneration>,
    
    /// CHECK: Treasury's ATA Vault handling commission reserves
    #[account(mut)]
    pub treasury_ata: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub referrer_ata: InterfaceAccount<'info, TokenAccount>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    /// CHECK: PDA Treasury Signer
    pub treasury_signer: UncheckedAccount<'info>,
    
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
    let gross_to_send = (gross_claimable as u128)
        .checked_mul(10_000).unwrap()
        .checked_div(10_000 - fee_bps as u128).unwrap() as u64;
        
    // Execute transfer. Because the treasury is sending, its hook flags (is_treasury = true) 
    // will tag the incoming tokens on the referrer side identically as Gen-1 tokens issuance.
    
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.treasury_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.referrer_ata.to_account_info(),
        authority: ctx.accounts.treasury_signer.to_account_info(),
    };
    
    // Needs PDA signer seeds here in full deployment
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, gross_to_send, ctx.accounts.mint.decimals)?;
    
    ledger.total_claimed = ledger.total_claimed.checked_add(gross_claimable).unwrap();
    ledger.claimable = 0;
    // We intentionally wipe fractional dust on claims explicitly so manual intervention ensures alignment.
    ledger.dust_tenths_accumulated = 0; 
    
    Ok(())
}
