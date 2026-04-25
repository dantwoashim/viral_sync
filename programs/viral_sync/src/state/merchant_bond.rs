use anchor_lang::prelude::*;

#[account]
pub struct MerchantBond {
    pub bump: u8,
    pub merchant: Pubkey,
    pub bonded_lamports: u64,
    pub min_required_lamports: u64,
    pub is_locked: bool,
    pub unlock_requested_at: i64,
}
