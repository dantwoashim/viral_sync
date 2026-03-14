use anchor_lang::prelude::*;
use crate::state::{
    merchant_config::MerchantConfig,
    merchant_reputation::MerchantReputation,
    viral_oracle::ViralOracle,
};
use crate::errors::ViralSyncError;

#[derive(Accounts)]
pub struct InitializeViralOracle<'info> {
    #[account(
        init,
        payer = merchant,
        space = 8 + ViralOracle::LEN,
        seeds = [b"viral_oracle", merchant.key().as_ref()],
        bump
    )]
    pub viral_oracle: Account<'info, ViralOracle>,

    #[account(has_one = merchant)]
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_viral_oracle(ctx: Context<InitializeViralOracle>) -> Result<()> {
    let oracle = &mut ctx.accounts.viral_oracle;
    oracle.bump = ctx.bumps.viral_oracle;
    oracle.merchant = ctx.accounts.merchant.key();
    oracle.mint = ctx.accounts.merchant_config.mint;
    oracle.k_factor = 0;
    oracle.median_referrals_per_user = 0;
    oracle.p90_referrals_per_user = 0;
    oracle.p10_referrals_per_user = 0;
    oracle.referral_concentration_index = 0;
    oracle.share_rate = 0;
    oracle.claim_rate = 0;
    oracle.first_redeem_rate = 0;
    oracle.avg_time_share_to_claim_secs = 0;
    oracle.avg_time_claim_to_redeem_secs = 0;
    oracle.p50_time_share_to_claim_secs = 0;
    oracle.commission_per_new_customer_tokens = 0;
    oracle.vs_google_ads_efficiency_bps = 0;
    oracle.computed_at = 0;
    oracle.data_points = 0;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeMerchantReputation<'info> {
    #[account(
        init,
        payer = merchant,
        space = 8 + MerchantReputation::LEN,
        seeds = [b"merchant_reputation", merchant.key().as_ref()],
        bump
    )]
    pub reputation: Account<'info, MerchantReputation>,

    #[account(has_one = merchant)]
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_merchant_reputation(ctx: Context<InitializeMerchantReputation>) -> Result<()> {
    let reputation = &mut ctx.accounts.reputation;
    reputation.bump = ctx.bumps.reputation;
    reputation.merchant = ctx.accounts.merchant.key();
    reputation.reputation_score = 100;
    reputation.timeout_disputes = 0;
    reputation.pct_redeemers_aged_over_30_days = 0;
    reputation.unique_attestation_servers_used = 0;
    reputation.commission_concentration_bps = 0;
    reputation.pct_redemptions_in_business_hours = 0;
    reputation.avg_poi_score_top_referrers = 0;
    reputation.suspicion_score = 0;
    reputation.suspicion_computed_at = 0;
    Ok(())
}

#[derive(Accounts)]
pub struct ComputeViralOracle<'info> {
    #[account(mut)]
    pub viral_oracle: Account<'info, ViralOracle>,

    pub merchant: Signer<'info>,
    pub crank: Signer<'info>,
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
    require!(ctx.accounts.viral_oracle.merchant == ctx.accounts.merchant.key(), ViralSyncError::AccessDenied);
    require!(
        share_rate <= 100
            && claim_rate <= 100
            && first_redeem_rate <= 100
            && claim_rate <= share_rate
            && first_redeem_rate <= claim_rate
            && data_points > 0,
        ViralSyncError::InvalidMetricRange
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
    #[account(mut)]
    pub reputation: Account<'info, MerchantReputation>,

    pub merchant: Signer<'info>,
    pub crank: Signer<'info>,
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
    require!(ctx.accounts.reputation.merchant == ctx.accounts.merchant.key(), ViralSyncError::AccessDenied);
    require!(
        pct_redeemers_aged_over_30_days <= 100
            && pct_redemptions_in_business_hours <= 100
            && commission_concentration_bps <= 10_000
            && suspicion_score <= 10_000,
        ViralSyncError::InvalidMetricRange
    );

    let rep = &mut ctx.accounts.reputation;
    rep.pct_redeemers_aged_over_30_days = pct_redeemers_aged_over_30_days;
    rep.unique_attestation_servers_used = unique_attestation_servers_used;
    rep.commission_concentration_bps = commission_concentration_bps;
    rep.pct_redemptions_in_business_hours = pct_redemptions_in_business_hours;
    rep.avg_poi_score_top_referrers = avg_poi_score_top_referrers;
    rep.suspicion_score = suspicion_score;
    
    rep.suspicion_computed_at = Clock::get()?.unix_timestamp;
    
    let timeout_penalty = rep.timeout_disputes.saturating_mul(5);
    let normalized_suspicion = (suspicion_score / 100).min(100);
    let penalty = timeout_penalty.saturating_add(normalized_suspicion);
    rep.reputation_score = 100u32.saturating_sub(penalty.min(100));

    Ok(())
}
