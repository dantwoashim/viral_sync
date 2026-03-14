use anchor_lang::prelude::*;

#[account]
pub struct MerchantClosureSnapshot {
    pub bump: u8,
    pub merchant: Pubkey,
    pub mint: Pubkey,
    pub close_initiated_at: i64,
    pub close_finalized_at: i64,
    pub total_supply_snapshot: u64,
    pub bonded_lamports_snapshot: u64,
    pub claims_processed: u32,
}

impl MerchantClosureSnapshot {
    pub const LEN: usize = 1 + 32 + 32 + 8 + 8 + 8 + 8 + 4;
}
