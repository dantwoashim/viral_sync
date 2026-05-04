use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CausalMerchantStatus {
    Active,
    Paused,
}

impl CausalMerchantStatus {
    pub const SIZE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum GrowthCampaignStatus {
    Draft,
    Active,
    Paused,
    Closed,
}

impl GrowthCampaignStatus {
    pub const SIZE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TerminalDeviceStatus {
    Active,
    Paused,
    Revoked,
}

impl TerminalDeviceStatus {
    pub const SIZE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ReceiptAttestationModel {
    MerchantOnlyLegacy,
    MerchantTerminalVisitorSigned,
}

impl ReceiptAttestationModel {
    pub const SIZE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ClaimPassStatus {
    Active,
    Recorded,
    Revoked,
}

impl ClaimPassStatus {
    pub const SIZE: usize = 1;
}

#[account]
pub struct CausalMerchantConfig {
    pub bump: u8,
    pub merchant_authority: Pubkey,
    pub org_id_hash: [u8; 32],
    // Reserved for a future Merkle/proof authority model. Current production path is merchant-authorized.
    pub allowed_staff_delegate_root: [u8; 32],
    pub terminal_authority_root: [u8; 32],
    pub status: CausalMerchantStatus,
    pub created_at: i64,
    pub updated_at: i64,
}

impl CausalMerchantConfig {
    pub const SEED_PREFIX: &'static [u8] = b"causal_merchant";
    pub const SIZE: usize = 8 + 1 + 32 + 32 + 32 + 32 + CausalMerchantStatus::SIZE + 8 + 8;
}

#[account]
pub struct TerminalDevice {
    pub bump: u8,
    pub merchant_config: Pubkey,
    pub merchant_authority: Pubkey,
    pub terminal_authority: Pubkey,
    pub label_hash: [u8; 32],
    pub status: TerminalDeviceStatus,
    pub enrolled_at: i64,
    pub updated_at: i64,
}

impl TerminalDevice {
    pub const SEED_PREFIX: &'static [u8] = b"terminal_device";
    pub const SIZE: usize = 8 + 1 + 32 + 32 + 32 + 32 + TerminalDeviceStatus::SIZE + 8 + 8;
}

#[account]
pub struct GrowthCampaign {
    pub bump: u8,
    pub merchant_config: Pubkey,
    pub merchant_authority: Pubkey,
    pub campaign_id_hash: [u8; 32],
    pub reward_mint: Pubkey,
    pub claim_pass_mint: Pubkey,
    pub lineage_required: bool,
    pub reward_per_verified_visit: u64,
    pub max_redemptions: u32,
    // Maximum lineage depth. Root and child parent receipt consistency is enforced on-chain.
    pub max_depth: u8,
    pub referrer_split_bps: u16,
    // Policy commitments; split amount and lineage shape are enforced by the current program.
    pub split_rules_hash: [u8; 32],
    pub fraud_policy_hash: [u8; 32],
    pub starts_at: i64,
    pub expires_at: i64,
    pub total_funded: u64,
    pub total_settled: u64,
    pub total_recorded: u32,
    pub status: GrowthCampaignStatus,
    pub created_at: i64,
    pub updated_at: i64,
}

impl GrowthCampaign {
    pub const SEED_PREFIX: &'static [u8] = b"growth_campaign";
    pub const SIZE: usize = 8 + 1 + 32 + 32 + 32 + 32 + 32 + 1 + 8 + 4 + 1 + 2 + 32 + 32 + 8 + 8 + 8 + 8 + 4 + GrowthCampaignStatus::SIZE + 8 + 8;
}

#[account]
pub struct RewardEscrow {
    pub bump: u8,
    pub campaign: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_vault: Pubkey,
    pub total_funded: u64,
    pub total_reserved: u64,
    pub total_settled: u64,
    pub created_at: i64,
    pub updated_at: i64,
}

impl RewardEscrow {
    pub const SEED_PREFIX: &'static [u8] = b"reward_escrow";
    pub const SIZE: usize = 8 + 1 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CausalReceiptStatus {
    Recorded,
    Settled,
    Voided,
}

impl CausalReceiptStatus {
    pub const SIZE: usize = 1;
}

#[account]
pub struct ClaimPass {
    pub bump: u8,
    pub campaign: Pubkey,
    pub visitor_authority: Pubkey,
    pub referrer_receipt: Pubkey,
    pub claim_hash: [u8; 32],
    pub lineage_proof_hash: [u8; 32],
    pub depth: u8,
    pub status: ClaimPassStatus,
    pub first_receipt: Pubkey,
    pub created_at: i64,
    pub updated_at: i64,
}

impl ClaimPass {
    pub const SEED_PREFIX: &'static [u8] = b"claim_pass";
    pub const SIZE: usize = 8 + 1 + 32 + 32 + 32 + 32 + 32 + 1 + ClaimPassStatus::SIZE + 32 + 8 + 8;
}

#[account]
pub struct NullifierRecord {
    pub bump: u8,
    pub campaign: Pubkey,
    pub nullifier_hash: [u8; 32],
    pub first_receipt: Pubkey,
    pub created_at: i64,
}

impl NullifierRecord {
    pub const SEED_PREFIX: &'static [u8] = b"campaign_nullifier";
    pub const SIZE: usize = 8 + 1 + 32 + 32 + 32 + 8;
}

#[account]
pub struct CausalReceipt {
    pub bump: u8,
    pub campaign: Pubkey,
    pub merchant_config: Pubkey,
    pub referrer_beneficiary: Pubkey,
    pub visitor_beneficiary: Pubkey,
    pub reward_mint: Pubkey,
    pub referrer_split_bps: u16,
    pub terminal_device: Pubkey,
    pub terminal_authority: Pubkey,
    pub visitor_authority: Pubkey,
    pub attestation_model: ReceiptAttestationModel,
    pub claim_pass: Pubkey,
    pub claim_pass_mint: Pubkey,
    pub claim_pass_token_account: Pubkey,
    pub lineage_state: Pubkey,
    pub lineage_generation: u8,
    pub lineage_proof_hash: [u8; 32],
    pub receipt_id_hash: [u8; 32],
    pub parent_receipt_id_hash: [u8; 32],
    pub referrer_commitment: [u8; 32],
    pub claimer_nullifier_hash: [u8; 32],
    pub invite_hash: [u8; 32],
    pub visit_attestation_hash: [u8; 32],
    pub intent_manifest_hash: [u8; 32],
    pub risk_score_commitment: [u8; 32],
    pub reward_amount: u64,
    pub settled_amount: u64,
    pub status: CausalReceiptStatus,
    pub created_at: i64,
    pub settled_at: i64,
}

impl CausalReceipt {
    pub const SEED_PREFIX: &'static [u8] = b"causal_receipt";
    pub const SIZE: usize = 8 + 1 + 32 + 32 + 32 + 32 + 32 + 2 + 32 + 32 + 32 + ReceiptAttestationModel::SIZE + 32 + 32 + 32 + 32 + 1 + 32 + 32 + 32 + 32 + 32 + 32 + 32 + 32 + 32 + 8 + 8 + CausalReceiptStatus::SIZE + 8 + 8;
}

#[account]
pub struct SettlementRecord {
    pub bump: u8,
    pub receipt: Pubkey,
    pub campaign: Pubkey,
    pub referrer_amount: u64,
    pub visitor_amount: u64,
    pub protocol_fee: u64,
    pub settled_at: i64,
}

impl SettlementRecord {
    pub const SEED_PREFIX: &'static [u8] = b"settlement";
    pub const SIZE: usize = 8 + 1 + 32 + 32 + 8 + 8 + 8 + 8;
}
