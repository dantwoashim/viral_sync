use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use crate::state::token_generation::{TokenGeneration, INBOUND_BUFFER_SIZE, InboundEntry};

#[derive(Accounts)]
pub struct InitTokenGeneration<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 1700, // Size mapped from ARCHITECTURE_V4
        seeds = [b"gen_v4", mint.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub token_generation: Account<'info, TokenGeneration>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: The user receiving the PDA, does not need to sign
    pub owner: UncheckedAccount<'info>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTokenGeneration>) -> Result<()> {
    let gen = &mut ctx.accounts.token_generation;
    
    gen.bump = ctx.bumps.token_generation;
    gen.version = 4;
    gen.mint = ctx.accounts.mint.key();
    gen.owner = ctx.accounts.owner.key();
    
    gen.gen1_balance = 0;
    gen.gen2_balance = 0;
    gen.dead_balance = 0;
    gen.total_lifetime = 0;
    
    gen.first_received_at = 0; // Intentional: verified in hold check securely
    gen.last_received_at = 0;
    
    gen.buffer_head = 0;
    gen.buffer_pending = 0;
    gen.inbound_buffer = [InboundEntry::default(); INBOUND_BUFFER_SIZE];
    
    gen.is_intermediary = false;
    gen.original_sender = Pubkey::default();
    
    gen.share_limit_day = 0;
    gen.shares_today = 0;
    
    gen.processing_nonce = 0;
    
    gen.redemption_pending = false;
    gen.redemption_gen2_consumed = 0;
    gen.redemption_slot = 0;
    
    gen.is_treasury = false;
    gen.is_dex_pool = false;
    
    gen.poi_score = 0;
    gen.poi_updated_at = 0;
    
    Ok(())
}
