use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::state::merchant_config::MerchantConfig;

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
    let config = &mut ctx.accounts.merchant_config;
    
    config.bump = ctx.bumps.merchant_config;
    config.merchant = ctx.accounts.merchant.key();
    config.mint = ctx.accounts.mint.key();
    config.is_active = true;
    
    config.commission_rate_bps = commission_rate_bps;
    config.transfer_fee_bps = transfer_fee_bps;
    config.min_hold_before_share_secs = min_hold_before_share_secs;
    
    config.first_issuance_done = false;
    config.current_supply = 0;
    config.tokens_issued = 0;
    
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
    
    // Emitting simulated issuance logic
    config.first_issuance_done = true;
    config.current_supply += amount;
    config.tokens_issued += amount;
    
    Ok(())
}
