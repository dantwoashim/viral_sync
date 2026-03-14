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

    #[msg("Referral record account is missing or invalid")]
    InvalidReferralRecord,

    #[msg("No referrer slot is available for this wallet")]
    TooManyActiveReferrers,

    #[msg("Escrow authority PDA does not match the expected signer")]
    InvalidEscrowAuthority,

    #[msg("Oracle or reputation metrics are outside allowed bounds")]
    InvalidMetricRange,

    #[msg("Registered geo attestation is required for this redemption")]
    GeoAttestationRequired,

    #[msg("The redemption coordinates are outside the merchant geofence")]
    GeoOutsideFence,

    #[msg("The geo attestation timestamp is stale or invalid")]
    GeoAttestationExpired,

    #[msg("The geo attestation nonce has already been used")]
    GeoReplayDetected,

    #[msg("Merchant is inactive and user transfers are blocked")]
    MerchantInactive,

    #[msg("Transfer hook must be invoked during a live token transfer")]
    TransferHookNotTransferring,

    #[msg("Geo fence account is missing or invalid")]
    InvalidGeoFence,

    #[msg("Geo attestation account is missing or invalid")]
    InvalidGeoNonce,

    #[msg("A fresh geo attestation has not been staged for this redeemer")]
    GeoAttestationMissing,

    #[msg("Merchant closure snapshot is missing or not finalized")]
    MerchantClosureNotFinalized,

    #[msg("Merchant close window has not finished yet")]
    CloseWindowNotExpired,

    #[msg("Bond share has already been redeemed for this closure snapshot")]
    BondShareAlreadyRedeemed,
}
