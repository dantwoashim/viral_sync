use anchor_lang::prelude::*;

#[account]
pub struct SessionKey {
    pub bump: u8,
    pub authority: Pubkey,       // User's main wallet
    pub target_generation: Pubkey, // The specific TokenGeneration this key acts on
    pub delegate: Pubkey,        // The ephemeral keypair stored locally
    pub expires_at: i64,         // Max TTL (e.g. 24 hours)
    pub max_tokens_per_session: u64, // Spend limit boundary
    pub tokens_spent: u64,       // Active consumption tracking
    pub is_active: bool,
}

impl SessionKey {
    pub fn is_valid(&self, now: i64) -> bool {
        self.is_active && self.expires_at > now
    }
}
