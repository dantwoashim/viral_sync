use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DisputeStatus {
    Pending,
    Dismissed,
    UpheldByTimeout,
    UpheldByVote,
}

#[account]
pub struct DisputeRecord {
    pub bump: u8,
    pub merchant: Pubkey,
    pub referral: Pubkey,
    pub watchdog: Pubkey,
    pub status: DisputeStatus,
    pub stake_lamports: u64,
    pub raised_at: i64,
    pub resolved_at: Option<i64>,
}
