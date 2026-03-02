use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, Burn, burn};
use crate::state::token_generation::TokenGeneration;
use crate::errors::ViralSyncError;

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub token_generation: Account<'info, TokenGeneration>,
    
    #[account(mut)]
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
    
    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.owner_ata.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    burn(cpi_ctx, amount)?;
    
    Ok(())
}
