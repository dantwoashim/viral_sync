use anchor_lang::prelude::*;

#[error_code]
pub enum ViralSyncError {
    #[msg("Transfer hook source owner does not match TokenAccount data")]
    InvalidSourceGeneration,
    
    #[msg("Transfer hook destination owner does not match TokenAccount data")]
    InvalidDestGeneration,
    
    #[msg("Token account data length is invalid")]
    InvalidTokenAccount,
    
    #[msg("Tokens have expired based on merchant config rules")]
    TokensExpired,
    
    #[msg("Must finalize inbound entries (clear buffer) before redeeming")]
    MustFinalizeBeforeRedeem,
    
    #[msg("Previous redemption is unprocessed (concurrent lock)")]
    PreviousRedemptionUnprocessed,
    
    #[msg("Tokens hold period not met before sharing")]
    HoldPeriodNotMet,
    
    #[msg("Transfer amount is below merchant minimum for referral")]
    BelowMinimum,
    
    #[msg("Transfer amount exceeds merchant maximum for referral")]
    ExceedsMaximum,
    
    #[msg("Daily share limit exceeded for this wallet")]
    DailyShareLimitExceeded,
    
    #[msg("Maximum referral depth reached (Gen2 transfer not allowed by merchant)")]
    MaxDepthReached,
    
    #[msg("Inbound buffer overflow (graceful degradation triggered)")]
    InboundBufferOverflow,
    
    #[msg("Math Overflow")]
    MathOverflow,
    
    #[msg("No redemption pending")]
    NoRedemptionPending,
    
    #[msg("Invalid referrer slot")]
    InvalidReferrerSlot,
    
    #[msg("Slot already settled")]
    SlotAlreadySettled,
    
    #[msg("Unsettled slots remain")]
    UnsettledSlotsRemain,
    
    #[msg("Commission frozen by dictated status")]
    CommissionFrozenDictated,
    
    #[msg("Nothing to claim")]
    NothingToClaim,
    
    #[msg("Insufficient balance")]
    InsufficientBalance,
    
    #[msg("Access Denied or Invalid Authority")]
    AccessDenied,
}
