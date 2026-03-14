use anchor_lang::prelude::*;

#[account]
pub struct GeoAttestationNonce {
    pub bump: u8,
    pub fence: Pubkey,
    pub redeemer: Pubkey,
    pub nonce: u64,
    pub issued_at: i64,
    pub verified_at: i64,
    pub consumed_at: i64,
    pub bypass_geo: bool,
}

impl GeoAttestationNonce {
    pub const LEN: usize = 1 + 32 + 32 + 8 + 8 + 8 + 8 + 1;
}
