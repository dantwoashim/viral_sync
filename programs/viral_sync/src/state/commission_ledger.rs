use anchor_lang::prelude::*;

#[account]
pub struct CommissionLedger {
    pub bump: u8,
    pub referrer: Pubkey,
    pub merchant: Pubkey,
    pub mint: Pubkey,
    
    pub claimable: u64,
    pub dust_tenths_accumulated: u32, // Accumulate fractional dust (units of 0.0001 tokens)
    
    pub frozen: bool,
    pub frozen_amount: u64, // Disputed amounts frozen
    
    pub total_earned: u64,
    pub total_claimed: u64,
    pub total_redemptions_driven: u64,
    pub highest_single_commission: u64,
}
