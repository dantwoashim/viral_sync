use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use crate::errors::ViralSyncError;
use crate::state::{GeoAttestationNonce, GeoFence, MerchantConfig, VaultEntry};

pub const MAX_GEO_ATTESTATION_AGE_SECS: i64 = 120;

#[derive(Accounts)]
pub struct InitializeGeoFence<'info> {
    #[account(
        init,
        payer = merchant,
        space = 8 + GeoFence::LEN,
        seeds = [b"geo_fence", mint.key().as_ref(), vault.key().as_ref()],
        bump
    )]
    pub fence: Account<'info, GeoFence>,

    #[account(has_one = merchant, has_one = mint)]
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(
        constraint = vault_entry.merchant == merchant.key() @ ViralSyncError::AccessDenied,
        constraint = vault_entry.vault == vault.key() @ ViralSyncError::AccessDenied,
        constraint = vault_entry.is_active @ ViralSyncError::AccessDenied,
    )]
    pub vault_entry: Account<'info, VaultEntry>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    /// CHECK: Merchant-controlled destination token account.
    pub vault: UncheckedAccount<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
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
    require!(attestation_server_count > 0 && attestation_server_count <= 4, ViralSyncError::InvalidMetricRange);
    require!(radius_meters > 0, ViralSyncError::InvalidMetricRange);
    require!(non_geo_commission_penalty_bps <= 10_000, ViralSyncError::InvalidMetricRange);

    let fence = &mut ctx.accounts.fence;
    fence.bump = ctx.bumps.fence;
    fence.vault = ctx.accounts.vault.key();
    fence.merchant = ctx.accounts.merchant.key();
    fence.mint = ctx.accounts.mint.key();
    fence.lat_micro = lat_micro;
    fence.lng_micro = lng_micro;
    fence.radius_meters = radius_meters;
    fence.is_active = true;
    fence.attestation_server_count = attestation_server_count;
    fence.attestation_servers = attestation_servers;
    fence.allow_non_geo_redemption = allow_non_geo_redemption;
    fence.non_geo_commission_penalty_bps = non_geo_commission_penalty_bps;
    Ok(())
}

#[derive(Accounts)]
#[instruction(lat_micro: i32, lng_micro: i32, issued_at: i64, nonce: u64, bypass_geo: bool)]
pub struct RedeemWithGeo<'info> {
    pub fence: Account<'info, GeoFence>,
    pub redeemer: Signer<'info>,
    #[account(mut)]
    pub attestation_server: Signer<'info>,
    #[account(
        init_if_needed,
        payer = attestation_server,
        space = 8 + GeoAttestationNonce::LEN,
        seeds = [b"geo_nonce", fence.key().as_ref(), redeemer.key().as_ref()],
        bump,
    )]
    pub geo_nonce: Account<'info, GeoAttestationNonce>,
    pub system_program: Program<'info, System>,
}

pub fn redeem_with_geo(
    ctx: Context<RedeemWithGeo>,
    lat_micro: i32,
    lng_micro: i32,
    issued_at: i64,
    nonce: u64,
    bypass_geo: bool,
) -> Result<()> {
    let fence = &ctx.accounts.fence;
    require!(fence.is_active, ViralSyncError::GeoAttestationRequired);

    let attestation_allowed = fence.attestation_servers
        .iter()
        .take(fence.attestation_server_count.min(4) as usize)
        .any(|server| *server == ctx.accounts.attestation_server.key());
    require!(attestation_allowed, ViralSyncError::AccessDenied);

    let now = Clock::get()?.unix_timestamp;
    require!(issued_at <= now, ViralSyncError::GeoAttestationExpired);
    require!(
        now.saturating_sub(issued_at) <= MAX_GEO_ATTESTATION_AGE_SECS,
        ViralSyncError::GeoAttestationExpired
    );

    let geo_nonce = &mut ctx.accounts.geo_nonce;
    let active_unconsumed_nonce = geo_nonce.verified_at > 0
        && geo_nonce.consumed_at == 0
        && now.saturating_sub(geo_nonce.verified_at) <= MAX_GEO_ATTESTATION_AGE_SECS;
    require!(!active_unconsumed_nonce, ViralSyncError::GeoReplayDetected);

    geo_nonce.bump = ctx.bumps.geo_nonce;
    geo_nonce.fence = fence.key();
    geo_nonce.redeemer = ctx.accounts.redeemer.key();
    geo_nonce.nonce = nonce;
    geo_nonce.issued_at = issued_at;
    geo_nonce.verified_at = now;
    geo_nonce.consumed_at = 0;
    geo_nonce.bypass_geo = bypass_geo;

    if bypass_geo {
        require!(fence.allow_non_geo_redemption, ViralSyncError::GeoAttestationRequired);
        return Ok(());
    }

    let distance_meters = approximate_distance_meters(
        fence.lat_micro,
        fence.lng_micro,
        lat_micro,
        lng_micro,
    );
    require!(distance_meters <= fence.radius_meters as u64, ViralSyncError::GeoOutsideFence);

    Ok(())
}

pub fn geo_attestation_is_fresh(record: &GeoAttestationNonce, fence: Pubkey, redeemer: Pubkey, now: i64) -> bool {
    record.fence == fence
        && record.redeemer == redeemer
        && record.verified_at > 0
        && record.consumed_at == 0
        && now.saturating_sub(record.issued_at) <= MAX_GEO_ATTESTATION_AGE_SECS
        && now.saturating_sub(record.verified_at) <= MAX_GEO_ATTESTATION_AGE_SECS
}

fn approximate_distance_meters(
    fence_lat_micro: i32,
    fence_lng_micro: i32,
    lat_micro: i32,
    lng_micro: i32,
) -> u64 {
    let lat_delta_micro = (lat_micro as i64 - fence_lat_micro as i64).unsigned_abs();
    let lng_delta_micro = (lng_micro as i64 - fence_lng_micro as i64).unsigned_abs();

    // 1 microdegree is approximately 0.11132 meters. We intentionally
    // overestimate longitude movement to reject marginal redemptions safely.
    let lat_meters = lat_delta_micro.saturating_mul(11_132) / 100_000;
    let lng_meters = lng_delta_micro.saturating_mul(11_132) / 100_000;

    integer_sqrt(
        lat_meters.saturating_mul(lat_meters)
            .saturating_add(lng_meters.saturating_mul(lng_meters))
    )
}

fn integer_sqrt(value: u64) -> u64 {
    if value <= 1 {
        return value;
    }

    let mut x0 = value / 2;
    let mut x1 = (x0 + value / x0) / 2;
    while x1 < x0 {
        x0 = x1;
        x1 = (x0 + value / x0) / 2;
    }
    x0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zero_distance_stays_zero() {
        assert_eq!(approximate_distance_meters(27_717_200, 85_324_000, 27_717_200, 85_324_000), 0);
    }

    #[test]
    fn distance_grows_with_coordinate_delta() {
        let near = approximate_distance_meters(27_717_200, 85_324_000, 27_717_250, 85_324_050);
        let far = approximate_distance_meters(27_717_200, 85_324_000, 27_719_200, 85_326_000);
        assert!(far > near);
    }

    #[test]
    fn attestation_age_window_is_two_minutes() {
        assert_eq!(MAX_GEO_ATTESTATION_AGE_SECS, 120);
    }

    #[test]
    fn fresh_attestation_requires_matching_fence_and_redeemer() {
        let now = 1_700_000_100;
        let fence = Pubkey::new_unique();
        let redeemer = Pubkey::new_unique();
        let record = GeoAttestationNonce {
            bump: 1,
            fence,
            redeemer,
            nonce: 9,
            issued_at: now - 60,
            verified_at: now - 20,
            consumed_at: 0,
            bypass_geo: false,
        };

        assert!(geo_attestation_is_fresh(&record, fence, redeemer, now));
        assert!(!geo_attestation_is_fresh(&record, Pubkey::new_unique(), redeemer, now));
    }
}
