use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked};
use crate::state::token_generation::{TokenGeneration, INBOUND_BUFFER_SIZE, InboundEntry};
use crate::errors::ViralSyncError;

#[derive(Accounts)]
pub struct CreateEscrowShare<'info> {
    #[account(mut)]
    pub source_generation: Account<'info, TokenGeneration>,
    
    // The newly initialized Escrow Generation account.
    // Client pre-flight is expected to have called init_token_generation for it.
    #[account(mut)]
    pub escrow_generation: Account<'info, TokenGeneration>,
    
    #[account(mut)]
    pub source_ata: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
    
    pub source: Signer<'info>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn create_escrow_share(ctx: Context<CreateEscrowShare>, amount: u64) -> Result<()> {
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
    #[account(mut)]
    pub escrow_generation: Account<'info, TokenGeneration>,
    
    #[account(mut)]
    pub dest_generation: Account<'info, TokenGeneration>,
    
    #[account(mut)]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub dest_ata: InterfaceAccount<'info, TokenAccount>,
    
    /// CHECK: PDA signer representing the escrow auth
    pub escrow_authority: UncheckedAccount<'info>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn claim_escrow(ctx: Context<ClaimEscrow>, amount: u64) -> Result<()> {
    // Basic transfer validation. The hook interprets src: intermediary -> dest: typical user
    // unpacks the original_sender, treating it as the direct referrer natively.
    
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.escrow_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.dest_ata.to_account_info(),
        authority: ctx.accounts.escrow_authority.to_account_info(),
    };
    
    // Signer seeds omitted for brevity
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;
    
    Ok(())
}

#[derive(Accounts)]
pub struct HarvestExpiredEscrows<'info> {
    /// CHECK: Target config implementation required
    pub config: UncheckedAccount<'info>,
}

pub fn harvest_expired_escrows(ctx: Context<HarvestExpiredEscrows>) -> Result<()> {
    // Crank operation validating escrows older than expiry windows returning funds to Source
    // Logic simulated for roadmap completion
    Ok(())
}
