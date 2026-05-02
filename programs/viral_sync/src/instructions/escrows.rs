use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked};
use crate::errors::ViralSyncError;
use crate::state::token_generation::TokenGeneration;

#[derive(Accounts)]
pub struct CreateEscrowShare<'info> {
    #[account(
        mut,
        constraint = source_generation.owner == source.key() @ ViralSyncError::InvalidState,
        constraint = source_generation.mint == mint.key() @ ViralSyncError::InvalidState
    )]
    pub source_generation: Box<Account<'info, TokenGeneration>>,
    
    #[account(
        mut,
        constraint = escrow_generation.owner == escrow_authority.key() @ ViralSyncError::AccessDenied,
        constraint = escrow_generation.mint == mint.key() @ ViralSyncError::InvalidState
    )]
    pub escrow_generation: Box<Account<'info, TokenGeneration>>,
    
    #[account(
        mut,
        constraint = source_ata.owner == source.key() @ ViralSyncError::InvalidTokenAccount,
        constraint = source_ata.mint == mint.key() @ ViralSyncError::InvalidTokenAccount
    )]
    pub source_ata: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = escrow_ata.owner == escrow_authority.key() @ ViralSyncError::InvalidTokenAccount,
        constraint = escrow_ata.mint == mint.key() @ ViralSyncError::InvalidTokenAccount
    )]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
    
    pub source: Signer<'info>,

    pub escrow_authority: Signer<'info>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn create_escrow_share(ctx: Context<CreateEscrowShare>, amount: u64) -> Result<()> {
    require!(amount > 0, ViralSyncError::InvalidConfig);

    let src_gen = &mut ctx.accounts.source_generation;
    let escrow_gen = &mut ctx.accounts.escrow_generation;
    
    // Escrow acts as an intentional intermediary.
    // Setting `is_intermediary` forces the transfer_hook to bypass strict hold checks on arrival,
    // preserving the true referrer logic when it is finally unpacked.
    escrow_gen.is_intermediary = true;
    escrow_gen.original_sender = src_gen.owner;
    
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.source_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.escrow_ata.to_account_info(),
        authority: ctx.accounts.source.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    
    // transfer_checked fires the hook. src_gen deductions happen there.
    // escrow_gen balances adjust inside the hook due to the is_intermediary flag setup.
    transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;
    
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimEscrow<'info> {
    #[account(
        mut,
        constraint = escrow_generation.owner == escrow_authority.key() @ ViralSyncError::AccessDenied,
        constraint = escrow_generation.mint == mint.key() @ ViralSyncError::InvalidState
    )]
    pub escrow_generation: Box<Account<'info, TokenGeneration>>,
    
    #[account(mut, constraint = dest_generation.mint == mint.key() @ ViralSyncError::InvalidState)]
    pub dest_generation: Box<Account<'info, TokenGeneration>>,
    
    #[account(
        mut,
        constraint = escrow_ata.owner == escrow_authority.key() @ ViralSyncError::InvalidTokenAccount,
        constraint = escrow_ata.mint == mint.key() @ ViralSyncError::InvalidTokenAccount
    )]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = dest_ata.owner == dest_generation.owner @ ViralSyncError::InvalidTokenAccount,
        constraint = dest_ata.mint == mint.key() @ ViralSyncError::InvalidTokenAccount
    )]
    pub dest_ata: InterfaceAccount<'info, TokenAccount>,
    
    pub escrow_authority: Signer<'info>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn claim_escrow(ctx: Context<ClaimEscrow>, amount: u64) -> Result<()> {
    require!(amount > 0, ViralSyncError::InvalidConfig);
    
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.escrow_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.dest_ata.to_account_info(),
        authority: ctx.accounts.escrow_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;
    
    Ok(())
}

#[derive(Accounts)]
pub struct HarvestExpiredEscrows<'info> {
    /// CHECK: Target config implementation required
    pub config: UncheckedAccount<'info>,
}

pub fn harvest_expired_escrows(_ctx: Context<HarvestExpiredEscrows>) -> Result<()> {
    Err(ViralSyncError::UnsupportedInstruction.into())
}
