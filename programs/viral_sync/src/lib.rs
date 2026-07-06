#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
use state::{CausalMerchantStatus, ConvictionChoice, GrowthCampaignStatus, TerminalDeviceStatus};

declare_id!("AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46");

#[program]
pub mod viral_sync {
    use super::*;

    // Phase 1
    pub fn init_token_generation(ctx: Context<InitTokenGeneration>) -> Result<()> {
        instructions::init_token_generation::handler(ctx)
    }

    pub fn init_treasury_token_generation(ctx: Context<InitTreasuryGen>) -> Result<()> {
        instructions::init_treasury_token_generation::handler(ctx)
    }

    pub fn create_mint_and_config(
        ctx: Context<CreateMintAndConfig>,
        commission_rate_bps: u16,
        transfer_fee_bps: u16,
        min_hold_before_share_secs: i64,
    ) -> Result<()> {
        instructions::merchant_init::create_mint_and_config(ctx, commission_rate_bps, transfer_fee_bps, min_hold_before_share_secs)
    }

    pub fn issue_first_tokens_and_lock(ctx: Context<IssueFirstTokensAndLock>, amount: u64) -> Result<()> {
        instructions::merchant_init::issue_first_tokens_and_lock(ctx, amount)
    }

    // Phase 2
    pub fn initialize_extra_account_meta_list(ctx: Context<InitExtraAccountMetaList>) -> Result<()> {
        instructions::transfer_hook::initialize_extra_account_meta_list(ctx)
    }

    pub fn execute_transfer_hook(ctx: Context<ExecuteHook>, amount: u64) -> Result<()> {
        instructions::transfer_hook::execute_transfer_hook(ctx, amount)
    }

    pub fn finalize_inbound(ctx: Context<FinalizeInbound>) -> Result<()> {
        instructions::finalize_inbound::handler(ctx)
    }

    // Phase 3: Redemption & Commissions
    pub fn process_redemption_slot(ctx: Context<ProcessRedemptionSlot>, slot_idx: u8) -> Result<()> {
        instructions::process_redemption::process_redemption_slot(ctx, slot_idx)
    }

    pub fn clear_redemption_pending(ctx: Context<ClearRedemptionPending>) -> Result<()> {
        instructions::process_redemption::clear_redemption_pending(ctx)
    }

    pub fn claim_commission(ctx: Context<ClaimCommission>) -> Result<()> {
        instructions::claim_commission::claim_commission(ctx)
    }

    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        instructions::burn_tokens::burn_tokens(ctx, amount)
    }

    // Phase 4: Escrows & Link Generation
    pub fn create_escrow_share(ctx: Context<CreateEscrowShare>, amount: u64) -> Result<()> {
        instructions::escrows::create_escrow_share(ctx, amount)
    }

    pub fn claim_escrow(ctx: Context<ClaimEscrow>, amount: u64) -> Result<()> {
        instructions::escrows::claim_escrow(ctx, amount)
    }

    pub fn harvest_expired_escrows(ctx: Context<HarvestExpiredEscrows>) -> Result<()> {
        instructions::escrows::harvest_expired_escrows(ctx)
    }

    pub fn close_expired_referral(ctx: Context<CloseExpiredReferral>) -> Result<()> {
        instructions::referral_cleanup::close_expired_referral(ctx)
    }

    // Phase 5: Concurrency and Oracle Systems
    pub fn compute_viral_oracle(
        ctx: Context<ComputeViralOracle>,
        k_factor: u64,
        median_referrals_per_user: u32,
        p90_referrals_per_user: u32,
        p10_referrals_per_user: u32,
        referral_concentration_index: u32,
        share_rate: u32,
        claim_rate: u32,
        first_redeem_rate: u32,
        avg_time_share_to_claim_secs: u32,
        avg_time_claim_to_redeem_secs: u32,
        p50_time_share_to_claim_secs: u32,
        commission_per_new_customer_tokens: u64,
        vs_google_ads_efficiency_bps: u32,
        data_points: u32
    ) -> Result<()> {
        instructions::oracles::compute_viral_oracle(
            ctx, k_factor, median_referrals_per_user, p90_referrals_per_user, p10_referrals_per_user,
            referral_concentration_index, share_rate, claim_rate, first_redeem_rate, avg_time_share_to_claim_secs,
            avg_time_claim_to_redeem_secs, p50_time_share_to_claim_secs, commission_per_new_customer_tokens,
            vs_google_ads_efficiency_bps, data_points
        )
    }

    pub fn compute_merchant_reputation(
        ctx: Context<ComputeMerchantReputation>,
        pct_redeemers_aged_over_30_days: u16,
        unique_attestation_servers_used: u8,
        commission_concentration_bps: u16,
        pct_redemptions_in_business_hours: u16,
        avg_poi_score_top_referrers: u32,
        suspicion_score: u32,
    ) -> Result<()> {
        instructions::oracles::compute_merchant_reputation(
            ctx, pct_redeemers_aged_over_30_days, unique_attestation_servers_used, 
            commission_concentration_bps, pct_redemptions_in_business_hours, 
            avg_poi_score_top_referrers, suspicion_score
        )
    }

    pub fn redeem_with_geo(ctx: Context<RedeemWithGeo>, lat_micro: i32, lng_micro: i32, signature: Vec<u8>) -> Result<()> {
        instructions::geo_fencing::redeem_with_geo(ctx, lat_micro, lng_micro, signature)
    }

    pub fn withdraw_bond(ctx: Context<WithdrawBond>, amount: u64) -> Result<()> {
        instructions::bond_management::withdraw_bond(ctx, amount)
    }

    // Phase 6: Dispute Engineering & Cleanup Systems
    pub fn initiate_close_merchant(ctx: Context<InitiateCloseMerchant>) -> Result<()> {
        instructions::bond_management::initiate_close_merchant(ctx)
    }

    pub fn finalize_close_merchant(ctx: Context<FinalizeCloseMerchant>) -> Result<()> {
        instructions::bond_management::finalize_close_merchant(ctx)
    }

    pub fn redeem_bond_share(ctx: Context<RedeemBondShare>) -> Result<()> {
        instructions::bond_management::redeem_bond_share(ctx)
    }

    pub fn raise_dispute(ctx: Context<RaiseDispute>, amount: u64) -> Result<()> {
        instructions::disputes::raise_dispute(ctx, amount)
    }

    pub fn resolve_expired_dispute(ctx: Context<ResolveExpiredDispute>) -> Result<()> {
        instructions::disputes::resolve_expired_dispute(ctx)
    }

    // Phase 9: Seamless Client Architecture & Relayer (On-Chain)
    pub fn create_session_key(ctx: Context<CreateSessionKey>, expires_at: i64, max_tokens_per_session: u64) -> Result<()> {
        instructions::session_management::create_session_key(ctx, expires_at, max_tokens_per_session)
    }

    pub fn revoke_session_key(ctx: Context<RevokeSessionKey>) -> Result<()> {
        instructions::session_management::revoke_session_key(ctx)
    }

    // Causal Commerce path
    pub fn register_merchant(ctx: Context<RegisterMerchant>, org_id_hash: [u8; 32]) -> Result<()> {
        instructions::causal_commerce::register_merchant(ctx, org_id_hash)
    }

    pub fn enroll_terminal_device(
        ctx: Context<EnrollTerminalDevice>,
        label_hash: [u8; 32],
    ) -> Result<()> {
        instructions::causal_commerce::enroll_terminal_device(ctx, label_hash)
    }

    pub fn issue_claim_pass(
        ctx: Context<IssueClaimPass>,
        claim_hash: [u8; 32],
        depth: u8,
        lineage_proof_hash: [u8; 32],
        referrer_receipt: Pubkey,
    ) -> Result<()> {
        instructions::causal_commerce::issue_claim_pass(ctx, claim_hash, depth, lineage_proof_hash, referrer_receipt)
    }

    pub fn set_causal_merchant_status(
        ctx: Context<SetCausalMerchantStatus>,
        status: CausalMerchantStatus,
    ) -> Result<()> {
        instructions::causal_commerce::set_causal_merchant_status(ctx, status)
    }

    pub fn set_growth_campaign_status(
        ctx: Context<SetGrowthCampaignStatus>,
        status: GrowthCampaignStatus,
    ) -> Result<()> {
        instructions::causal_commerce::set_growth_campaign_status(ctx, status)
    }

    pub fn set_terminal_device_status(
        ctx: Context<SetTerminalDeviceStatus>,
        status: TerminalDeviceStatus,
    ) -> Result<()> {
        instructions::causal_commerce::set_terminal_device_status(ctx, status)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_growth_campaign(
        ctx: Context<CreateGrowthCampaign>,
        campaign_id_hash: [u8; 32],
        reward_per_verified_visit: u64,
        max_redemptions: u32,
        max_depth: u8,
        referrer_split_bps: u16,
        split_rules_hash: [u8; 32],
        fraud_policy_hash: [u8; 32],
        starts_at: i64,
        expires_at: i64,
    ) -> Result<()> {
        instructions::causal_commerce::create_growth_campaign(
            ctx,
            campaign_id_hash,
            reward_per_verified_visit,
            max_redemptions,
            max_depth,
            referrer_split_bps,
            split_rules_hash,
            fraud_policy_hash,
            starts_at,
            expires_at,
        )
    }

    pub fn fund_growth_bounty(ctx: Context<FundGrowthBounty>, amount: u64) -> Result<()> {
        instructions::causal_commerce::fund_growth_bounty(ctx, amount)
    }

    pub fn close_growth_bounty(ctx: Context<CloseGrowthBounty>) -> Result<()> {
        instructions::causal_commerce::close_growth_bounty(ctx)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn record_causal_receipt<'info>(
        ctx: Context<'_, '_, 'info, 'info, RecordCausalReceipt<'info>>,
        receipt_id_hash: [u8; 32],
        parent_receipt_id_hash: [u8; 32],
        referrer_commitment: [u8; 32],
        claimer_nullifier_hash: [u8; 32],
        invite_hash: [u8; 32],
        visit_attestation_hash: [u8; 32],
        intent_manifest_hash: [u8; 32],
        risk_score_commitment: [u8; 32],
        referrer_beneficiary: Pubkey,
        visitor_beneficiary: Pubkey,
    ) -> Result<()> {
        instructions::causal_commerce::record_causal_receipt(
            ctx,
            receipt_id_hash,
            parent_receipt_id_hash,
            referrer_commitment,
            claimer_nullifier_hash,
            invite_hash,
            visit_attestation_hash,
            intent_manifest_hash,
            risk_score_commitment,
            referrer_beneficiary,
            visitor_beneficiary,
        )
    }

    pub fn settle_receipt_reward(ctx: Context<SettleReceiptReward>) -> Result<()> {
        instructions::causal_commerce::settle_receipt_reward(ctx)
    }

    pub fn commit_conviction_signal(
        ctx: Context<CommitConvictionSignal>,
        signal_hash: [u8; 32],
        participant_commitment: [u8; 32],
        choice: ConvictionChoice,
        credits_committed: u16,
        confidence_bps: u16,
    ) -> Result<()> {
        instructions::conviction_signal::commit_conviction_signal(
            ctx,
            signal_hash,
            participant_commitment,
            choice,
            credits_committed,
            confidence_bps,
        )
    }
}
