#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("D9ds2V6y4GFGKbo8wF8qQiF81dzhkiznmZsHepcSN6Ta");

#[program]
pub mod viral_sync {
    use super::*;

    // Phase 1
    pub fn init_token_generation(ctx: Context<InitTokenGeneration>) -> Result<()> {
        instructions::init_token_generation::init_token_generation(ctx)
    }

    pub fn init_treasury_token_generation(ctx: Context<InitTreasuryGen>) -> Result<()> {
        instructions::init_treasury_token_generation::init_treasury_generation(ctx)
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

    pub fn initialize_merchant_bond(
        ctx: Context<InitializeMerchantBond>,
        min_required_lamports: u64,
    ) -> Result<()> {
        instructions::merchant_init::initialize_merchant_bond(ctx, min_required_lamports)
    }

    pub fn initialize_vault_entry(ctx: Context<InitializeVaultEntry>, is_dex: bool) -> Result<()> {
        instructions::merchant_init::initialize_vault_entry(ctx, is_dex)
    }

    // Phase 2
    #[interface(spl_transfer_hook_interface::initialize_extra_account_meta_list)]
    pub fn initialize_extra_account_meta_list(ctx: Context<InitExtraAccountMetaList>) -> Result<()> {
        instructions::transfer_hook::initialize_extra_account_meta_list(ctx)
    }

    #[interface(spl_transfer_hook_interface::execute)]
    pub fn execute_transfer_hook(ctx: Context<ExecuteHook>, amount: u64) -> Result<()> {
        instructions::transfer_hook::execute_transfer_hook(ctx, amount)
    }

    pub fn finalize_inbound<'info>(
        ctx: Context<'_, '_, '_, 'info, FinalizeInbound<'info>>,
    ) -> Result<()> {
        instructions::finalize_inbound::finalize_inbound(ctx)
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

    pub fn initialize_viral_oracle(ctx: Context<InitializeViralOracle>) -> Result<()> {
        instructions::oracles::initialize_viral_oracle(ctx)
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

    pub fn initialize_merchant_reputation(ctx: Context<InitializeMerchantReputation>) -> Result<()> {
        instructions::oracles::initialize_merchant_reputation(ctx)
    }

    pub fn initialize_commission_ledger(ctx: Context<InitializeCommissionLedger>) -> Result<()> {
        instructions::claim_commission::initialize_commission_ledger(ctx)
    }

    pub fn initialize_geo_fence(
        ctx: Context<InitializeGeoFence>,
        lat_micro: i32,
        lng_micro: i32,
        radius_meters: u32,
        attestation_server_count: u8,
        attestation_servers: [Pubkey; 4],
        allow_non_geo_redemption: bool,
        non_geo_commission_penalty_bps: u16,
    ) -> Result<()> {
        instructions::geo_fencing::initialize_geo_fence(
            ctx,
            lat_micro,
            lng_micro,
            radius_meters,
            attestation_server_count,
            attestation_servers,
            allow_non_geo_redemption,
            non_geo_commission_penalty_bps,
        )
    }

    pub fn redeem_with_geo(
        ctx: Context<RedeemWithGeo>,
        lat_micro: i32,
        lng_micro: i32,
        issued_at: i64,
        nonce: u64,
        bypass_geo: bool,
    ) -> Result<()> {
        instructions::geo_fencing::redeem_with_geo(ctx, lat_micro, lng_micro, issued_at, nonce, bypass_geo)
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
}
