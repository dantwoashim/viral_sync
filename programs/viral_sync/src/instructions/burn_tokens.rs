use anchor_lang::prelude::*;
use anchor_spl::token_interface::{burn, Burn, Mint, TokenAccount, TokenInterface};

use crate::errors::ViralSyncError;
use crate::state::{
    merchant_config::MerchantConfig,
    token_generation::TokenGeneration,
};

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(
        mut,
        constraint = token_generation.owner == owner.key() @ ViralSyncError::AccessDenied,
        constraint = token_generation.mint == mint.key() @ ViralSyncError::AccessDenied
    )]
    pub token_generation: Box<Account<'info, TokenGeneration>>,

    #[account(
        mut,
        constraint = owner_ata.owner == owner.key() @ ViralSyncError::AccessDenied,
        constraint = owner_ata.mint == mint.key() @ ViralSyncError::AccessDenied
    )]
    pub owner_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(has_one = mint)]
    pub merchant_config: Box<Account<'info, MerchantConfig>>,

    pub owner: Signer<'info>,

    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[inline(never)]
pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    let gen = &mut *ctx.accounts.token_generation;
    let total_balance = generation_total_balance(gen)?;
    require!(total_balance >= amount, ViralSyncError::InsufficientBalance);

    // Reverse FIFO: consume dead first, then gen2, then gen1.
    let from_dead = amount.min(gen.dead_balance);
    let remaining = amount.saturating_sub(from_dead);

    let from_gen2 = remaining.min(gen.gen2_balance);
    let remaining2 = remaining.saturating_sub(from_gen2);

    let from_gen1 = remaining2.min(gen.gen1_balance);

    require!(
        from_dead + from_gen2 + from_gen1 == amount,
        ViralSyncError::InsufficientBalance
    );

    gen.dead_balance = gen.dead_balance.saturating_sub(from_dead);
    gen.gen2_balance = gen.gen2_balance.saturating_sub(from_gen2);
    gen.gen1_balance = gen.gen1_balance.saturating_sub(from_gen1);

    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.owner_ata.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    burn(cpi_ctx, amount)?;

    Ok(())
}

fn generation_total_balance(gen: &TokenGeneration) -> Result<u64> {
    gen.gen1_balance
        .checked_add(gen.gen2_balance)
        .and_then(|value| value.checked_add(gen.dead_balance))
        .ok_or_else(|| error!(ViralSyncError::MathOverflow))
}
