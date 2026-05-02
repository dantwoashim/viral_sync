use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, Burn, burn};
use crate::state::{merchant_config::MerchantConfig, token_generation::TokenGeneration};
use crate::errors::ViralSyncError;

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(
        mut,
        constraint = token_generation.owner == owner.key() @ ViralSyncError::AccessDenied,
        constraint = token_generation.mint == mint.key() @ ViralSyncError::InvalidState
    )]
    pub token_generation: Box<Account<'info, TokenGeneration>>,

    #[account(
        mut,
        constraint = merchant_config.mint == mint.key() @ ViralSyncError::InvalidState
    )]
    pub merchant_config: Account<'info, MerchantConfig>,
    
    #[account(
        mut,
        constraint = owner_ata.owner == owner.key() @ ViralSyncError::InvalidTokenAccount,
        constraint = owner_ata.mint == mint.key() @ ViralSyncError::InvalidTokenAccount
    )]
    pub owner_ata: InterfaceAccount<'info, TokenAccount>,
    
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    let gen = &mut ctx.accounts.token_generation;
    
    // Reverse FIFO: consume dead first, then gen2, then gen1.
    // Maximizes user's referral and redemption attribution power by dropping useless tokens first.
    let from_dead = amount.min(gen.dead_balance);
    let remaining = amount.saturating_sub(from_dead);
    
    let from_gen2 = remaining.min(gen.gen2_balance);
    let remaining2 = remaining.saturating_sub(from_gen2);
    
    let from_gen1 = remaining2.min(gen.gen1_balance);
    
    require!(
        from_dead + from_gen2 + from_gen1 == amount,
        ViralSyncError::InsufficientBalance
    );
    
    gen.dead_balance -= from_dead;
    gen.gen2_balance -= from_gen2;
    gen.gen1_balance -= from_gen1;
    ctx.accounts.merchant_config.current_supply = ctx.accounts
        .merchant_config
        .current_supply
        .checked_sub(amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    
    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.owner_ata.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    burn(cpi_ctx, amount)?;
    
    Ok(())
}
