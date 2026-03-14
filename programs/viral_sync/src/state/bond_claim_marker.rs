use anchor_lang::prelude::*;

#[account]
pub struct BondClaimMarker {
    pub bump: u8,
    pub snapshot: Pubkey,
    pub merchant: Pubkey,
    pub holder: Pubkey,
    pub claimed_lamports: u64,
    pub claimed_at: i64,
}

impl BondClaimMarker {
    pub const LEN: usize = 1 + 32 + 32 + 32 + 8 + 8;
}
