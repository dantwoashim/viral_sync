use anchor_lang::prelude::*;
use crate::state::merchant_config::GeoFence;
use crate::errors::ViralSyncError;

#[derive(Accounts)]
pub struct RedeemWithGeo<'info> {
    pub fence: Account<'info, GeoFence>,
    pub redeemer: Signer<'info>,
    pub attestation_server: Signer<'info>,
}

pub fn redeem_with_geo(
    ctx: Context<RedeemWithGeo>, 
    lat_micro: i32, 
    lng_micro: i32, 
    signature: Vec<u8>
) -> Result<()> {
    let fence = &ctx.accounts.fence;
    require!(fence.is_active, ViralSyncError::InvalidState);
    
    // Check if the user opted out with fallback permitted
    if signature.is_empty() {
        require!(fence.allow_non_geo_redemption, ViralSyncError::AccessDenied);
        // Proceeding invokes `non_geo_commission_penalty_bps` dilution on the redemption_slot processing down the line
        return Ok(());
    }

    require!(signature.len() == 64, ViralSyncError::AccessDenied);
    let attestation_server = ctx.accounts.attestation_server.key();
    let registered = fence.attestation_servers
        .iter()
        .take(fence.attestation_server_count as usize)
        .any(|registered| *registered == attestation_server);
    require!(registered, ViralSyncError::AccessDenied);

    let lat_delta = (lat_micro as i64).saturating_sub(fence.lat_micro as i64).abs() as u128;
    let lng_delta = (lng_micro as i64).saturating_sub(fence.lng_micro as i64).abs() as u128;
    let lat_meters = lat_delta
        .checked_mul(111_320).ok_or(ViralSyncError::MathOverflow)?
        .checked_div(1_000_000).ok_or(ViralSyncError::MathOverflow)?;
    let lng_meters = lng_delta
        .checked_mul(111_320).ok_or(ViralSyncError::MathOverflow)?
        .checked_div(1_000_000).ok_or(ViralSyncError::MathOverflow)?;
    let distance_squared = lat_meters
        .checked_mul(lat_meters).ok_or(ViralSyncError::MathOverflow)?
        .checked_add(lng_meters.checked_mul(lng_meters).ok_or(ViralSyncError::MathOverflow)?)
        .ok_or(ViralSyncError::MathOverflow)?;
    let radius_squared = (fence.radius_meters as u128)
        .checked_mul(fence.radius_meters as u128).ok_or(ViralSyncError::MathOverflow)?;
    require!(distance_squared <= radius_squared, ViralSyncError::AccessDenied);

    Ok(())
}
