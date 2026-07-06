use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ConvictionChoice {
    RepairLikely,
    RepairDelayed,
    Abstain,
}

impl ConvictionChoice {
    pub const SIZE: usize = 1;
}

#[account]
pub struct ConvictionSignal {
    pub bump: u8,
    pub growth_campaign: Pubkey,
    pub participant_authority: Pubkey,
    pub signal_hash: [u8; 32],
    pub participant_commitment: [u8; 32],
    pub choice: ConvictionChoice,
    pub credits_committed: u16,
    pub confidence_bps: u16,
    pub non_transferable: bool,
    pub settlement_dependent: bool,
    pub created_at: i64,
}

impl ConvictionSignal {
    pub const SEED_PREFIX: &'static [u8] = b"conviction_signal";
    pub const MAX_CREDITS_PER_SIGNAL: u16 = 100;
    pub const MAX_CONFIDENCE_BPS: u16 = 10_000;
    pub const SIZE: usize = 8 + 1 + 32 + 32 + 32 + 32 + ConvictionChoice::SIZE + 2 + 2 + 1 + 1 + 8;
}
