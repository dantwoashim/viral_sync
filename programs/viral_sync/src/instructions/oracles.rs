use anchor_lang::prelude::*;
use crate::state::{
    merchant_config::MerchantConfig,
    viral_oracle::ViralOracle,
    merchant_reputation::MerchantReputation,
};
use crate::errors::ViralSyncError;

#[derive(Accounts)]
pub struct ComputeViralOracle<'info> {
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(
        mut,
        constraint = viral_oracle.merchant == merchant_config.merchant @ ViralSyncError::InvalidState,
        constraint = viral_oracle.mint == merchant_config.mint @ ViralSyncError::InvalidState
    )]
    pub viral_oracle: Account<'info, ViralOracle>,
    
    pub oracle_authority: Signer<'info>,
}

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
    require!(
        ctx.accounts.merchant_config.oracle_authority == ctx.accounts.oracle_authority.key(),
        ViralSyncError::UnauthorizedOracle
    );
    
    let oracle = &mut ctx.accounts.viral_oracle;
    oracle.k_factor = k_factor;
    oracle.median_referrals_per_user = median_referrals_per_user;
    oracle.p90_referrals_per_user = p90_referrals_per_user;
    oracle.p10_referrals_per_user = p10_referrals_per_user;
    oracle.referral_concentration_index = referral_concentration_index;
    oracle.share_rate = share_rate;
    oracle.claim_rate = claim_rate;
    oracle.first_redeem_rate = first_redeem_rate;
    oracle.avg_time_share_to_claim_secs = avg_time_share_to_claim_secs;
    oracle.avg_time_claim_to_redeem_secs = avg_time_claim_to_redeem_secs;
    oracle.p50_time_share_to_claim_secs = p50_time_share_to_claim_secs;
    oracle.commission_per_new_customer_tokens = commission_per_new_customer_tokens;
    oracle.vs_google_ads_efficiency_bps = vs_google_ads_efficiency_bps;
    
    oracle.computed_at = Clock::get()?.unix_timestamp;
    oracle.data_points = data_points;

    Ok(())
}

#[derive(Accounts)]
pub struct ComputeMerchantReputation<'info> {
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(
        mut,
        constraint = reputation.merchant == merchant_config.merchant @ ViralSyncError::InvalidState
    )]
    pub reputation: Account<'info, MerchantReputation>,
    
    pub oracle_authority: Signer<'info>,
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
    require!(
        ctx.accounts.merchant_config.oracle_authority == ctx.accounts.oracle_authority.key(),
        ViralSyncError::UnauthorizedOracle
    );
    
    let rep = &mut ctx.accounts.reputation;
    rep.pct_redeemers_aged_over_30_days = pct_redeemers_aged_over_30_days;
    rep.unique_attestation_servers_used = unique_attestation_servers_used;
    rep.commission_concentration_bps = commission_concentration_bps;
    rep.pct_redemptions_in_business_hours = pct_redemptions_in_business_hours;
    rep.avg_poi_score_top_referrers = avg_poi_score_top_referrers;
    rep.suspicion_score = suspicion_score;
    
    rep.suspicion_computed_at = Clock::get()?.unix_timestamp;
    
    // Base reputation calculation heavily penalizes timeout disputes and high suspicion
    let penalty = (rep.timeout_disputes * 500).saturating_add(suspicion_score / 10);
    rep.reputation_score = 10_000u32.saturating_sub(penalty);

    Ok(())
}
