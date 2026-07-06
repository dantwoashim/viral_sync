use anchor_lang::prelude::*;
use crate::state::causal_commerce::{CausalMerchantStatus, GrowthCampaignStatus, TerminalDeviceStatus};
use crate::state::conviction_signal::ConvictionChoice;
use crate::state::token_generation::GenSource;

#[event]
pub struct DexTransferDetected {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RedemptionDetected {
    pub redeemer: Pubkey,
    pub amount: u64,
    pub gen2_consumed: u64,
    pub slot: u64,
}

#[event]
pub struct TransferExecuted {
    pub from: Pubkey,
    pub to: Pubkey,
    pub effective_referrer: Pubkey,
    pub amount: u64,
    pub entry_type: GenSource,
    pub slot: u64,
}

#[event]
pub struct InboundBufferOverflow {
    pub recipient: Pubkey,
    pub amount: u64,
    pub sender: Pubkey,
}

#[event]
pub struct CommissionPaid {
    pub recipient: Pubkey,
    pub amount: u64,
    pub mint: Pubkey,
}

#[event]
pub struct MerchantRegistered {
    pub merchant_config: Pubkey,
    pub merchant_authority: Pubkey,
    pub org_id_hash: [u8; 32],
}

#[event]
pub struct TerminalDeviceEnrolled {
    pub merchant_config: Pubkey,
    pub merchant_authority: Pubkey,
    pub terminal_device: Pubkey,
    pub terminal_authority: Pubkey,
    pub label_hash: [u8; 32],
}

#[event]
pub struct ClaimPassIssued {
    pub claim_pass: Pubkey,
    pub growth_campaign: Pubkey,
    pub visitor_authority: Pubkey,
    pub claim_hash: [u8; 32],
    pub depth: u8,
}

#[event]
pub struct GrowthCampaignCreated {
    pub growth_campaign: Pubkey,
    pub merchant_config: Pubkey,
    pub merchant_authority: Pubkey,
    pub campaign_id_hash: [u8; 32],
    pub reward_mint: Pubkey,
    pub reward_per_verified_visit: u64,
    pub max_redemptions: u32,
    pub starts_at: i64,
    pub expires_at: i64,
}

#[event]
pub struct GrowthBountyFunded {
    pub growth_campaign: Pubkey,
    pub reward_escrow: Pubkey,
    pub amount: u64,
    pub total_funded: u64,
}

#[event]
pub struct GrowthBountyClosed {
    pub growth_campaign: Pubkey,
    pub reward_escrow: Pubkey,
    pub reward_vault: Pubkey,
    pub merchant_reward_account: Pubkey,
    pub reclaimed_amount: u64,
    pub closed_at: i64,
}

#[event]
pub struct CausalReceiptRecorded {
    pub causal_receipt: Pubkey,
    pub growth_campaign: Pubkey,
    pub receipt_id_hash: [u8; 32],
    pub claimer_nullifier_hash: [u8; 32],
    pub intent_manifest_hash: [u8; 32],
    pub reward_amount: u64,
    pub terminal_device: Pubkey,
    pub terminal_authority: Pubkey,
    pub visitor_authority: Pubkey,
    pub claim_pass: Pubkey,
}

#[event]
pub struct ReceiptRewardSettled {
    pub causal_receipt: Pubkey,
    pub growth_campaign: Pubkey,
    pub settlement_record: Pubkey,
    pub referrer_amount: u64,
    pub visitor_amount: u64,
    pub settled_amount: u64,
}

#[event]
pub struct CausalMerchantStatusUpdated {
    pub merchant_config: Pubkey,
    pub merchant_authority: Pubkey,
    pub status: CausalMerchantStatus,
    pub updated_at: i64,
}

#[event]
pub struct GrowthCampaignStatusUpdated {
    pub growth_campaign: Pubkey,
    pub merchant_authority: Pubkey,
    pub status: GrowthCampaignStatus,
    pub updated_at: i64,
}

#[event]
pub struct TerminalDeviceStatusUpdated {
    pub terminal_device: Pubkey,
    pub merchant_config: Pubkey,
    pub merchant_authority: Pubkey,
    pub terminal_authority: Pubkey,
    pub status: TerminalDeviceStatus,
    pub updated_at: i64,
}

#[event]
pub struct ConvictionSignalCommitted {
    pub conviction_signal: Pubkey,
    pub growth_campaign: Pubkey,
    pub participant_authority: Pubkey,
    pub signal_hash: [u8; 32],
    pub choice: ConvictionChoice,
    pub credits_committed: u16,
    pub confidence_bps: u16,
    pub non_transferable: bool,
    pub settlement_dependent: bool,
}
