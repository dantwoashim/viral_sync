use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use crate::state::token_generation::{TokenGeneration, INBOUND_BUFFER_SIZE, InboundEntry};

#[derive(Accounts)]
pub struct InitTreasuryGen<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 1700, 
        seeds = [b"gen_v4", mint.key().as_ref(), treasury_ata.key().as_ref()],
        bump
    )]
    pub treasury_generation: Account<'info, TokenGeneration>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Target ATA owner logic
    pub treasury_ata: UncheckedAccount<'info>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTreasuryGen>) -> Result<()> {
    let gen = &mut ctx.accounts.treasury_generation;
    
    gen.bump = ctx.bumps.treasury_generation;
    gen.version = 4;
    gen.mint = ctx.accounts.mint.key();
    gen.owner = ctx.accounts.treasury_ata.key(); // ATA address as owner
    
    // CRITICAL FLAG setting this up as a Treasury
    gen.is_treasury = true;       
    gen.is_intermediary = false;
    
    // Symbolic infinite balance logic
    gen.gen1_balance = u64::MAX;  
    gen.gen2_balance = 0;
    gen.dead_balance = 0;
    
    gen.first_received_at = 0;
    gen.last_received_at = 0;
    
    gen.buffer_head = 0;
    gen.buffer_pending = 0;
    gen.inbound_buffer = [InboundEntry::default(); INBOUND_BUFFER_SIZE];
    
    Ok(())
}
