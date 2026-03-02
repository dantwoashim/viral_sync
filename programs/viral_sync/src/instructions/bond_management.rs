use anchor_lang::prelude::*;
use crate::state::{
    merchant_config::MerchantConfig,
    merchant_bond::MerchantBond,
    token_generation::TokenGeneration,
};
use crate::errors::ViralSyncError;

// Example constants matching ARCHITECTURE_V4
pub const CLOSE_WINDOW_SECS: i64 = 2592000; // 30 Days

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
    #[account(mut)]
    pub merchant_bond: Account<'info, MerchantBond>,
    
    pub merchant: Signer<'info>,
}

pub fn withdraw_bond(ctx: Context<WithdrawBond>, amount: u64) -> Result<()> {
    let bond = &mut ctx.accounts.merchant_bond;
    
    require!(!bond.is_locked, ViralSyncError::TokensExpired); // Reused Missing errors -> Map generic AccessDenied in prod
    require!(
        bond.bonded_lamports.saturating_sub(amount) >= bond.min_required_lamports,
        ViralSyncError::InsufficientBalance
    );
    
    // Simulate Time Lock Check natively 
    // require!(Clock::get()?.unix_timestamp > bond.unlock_requested_at + 172800, ViralSyncError::AccessDenied);
    
    bond.bonded_lamports -= amount;
    // Native sublamports from bond vault to merchant...
    Ok(())
}

#[derive(Accounts)]
pub struct InitiateCloseMerchant<'info> {
    #[account(mut)]
    pub merchant_config: Account<'info, MerchantConfig>,
    
    pub merchant: Signer<'info>,
}

pub fn initiate_close_merchant(ctx: Context<InitiateCloseMerchant>) -> Result<()> {
    let config = &mut ctx.accounts.merchant_config;
    require!(config.is_active, ViralSyncError::TokensExpired); // e.g. AlreadyInactive

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
    #[account(mut)]
    pub merchant_config: Account<'info, MerchantConfig>,
    pub merchant_bond: Account<'info, MerchantBond>,
    
    #[account(mut)]
    pub merchant: Signer<'info>,
    
    /// CHECK: Target Vault
    #[account(mut)]
    pub bond_account: UncheckedAccount<'info>,
}

pub fn finalize_close_merchant(ctx: Context<FinalizeCloseMerchant>) -> Result<()> {
    let config = &ctx.accounts.merchant_config;
    let bond = &ctx.accounts.merchant_bond;
    let now = Clock::get()?.unix_timestamp;

    require!(now > config.close_window_ends_at, ViralSyncError::TokensExpired); // e.g. CloseWindowNotExpired

    let remaining_bond = bond.bonded_lamports;
    // **ctx.accounts.merchant.try_borrow_mut_lamports()? += remaining_bond;
    // **ctx.accounts.bond_account.try_borrow_mut_lamports()? -= remaining_bond;

    emit!(MerchantClosed { merchant: config.merchant, mint: config.mint });
    Ok(())
}

#[derive(Accounts)]
pub struct RedeemBondShare<'info> {
    pub merchant_config: Account<'info, MerchantConfig>,
    
    pub holder_generation: Account<'info, TokenGeneration>,
    
    #[account(mut)]
    pub merchant_bond: Account<'info, MerchantBond>,
    
    #[account(mut)]
    pub holder: Signer<'info>,
    
    /// CHECK: Target Vault
    #[account(mut)]
    pub bond_account: UncheckedAccount<'info>,
}

pub fn redeem_bond_share(ctx: Context<RedeemBondShare>) -> Result<()> {
    let config = &ctx.accounts.merchant_config;
    let gen = &ctx.accounts.holder_generation;
    let bond = &mut ctx.accounts.merchant_bond;

    require!(!config.is_active, ViralSyncError::TokensExpired);

    let holder_tokens = gen.gen1_balance + gen.gen2_balance + gen.dead_balance;
    let pct_of_supply = (holder_tokens as u128)
        .checked_mul(1_000_000).unwrap()
        .checked_div(config.current_supply.max(1) as u128).unwrap() as u64;

    let bond_share = (bond.bonded_lamports as u128)
        .checked_mul(pct_of_supply as u128).unwrap()
        .checked_div(1_000_000).unwrap() as u64;

    bond.bonded_lamports -= bond_share;
    // **ctx.accounts.holder.try_borrow_mut_lamports()? += bond_share;
    // **ctx.accounts.bond_account.try_borrow_mut_lamports()? -= bond_share;

    emit!(BondShareRedeemed { holder: gen.owner, lamports: bond_share });
    Ok(())
}
