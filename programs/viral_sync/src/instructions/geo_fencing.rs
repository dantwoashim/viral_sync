use anchor_lang::prelude::*;
use crate::state::merchant_config::GeoFence;
use crate::errors::ViralSyncError;

#[derive(Accounts)]
pub struct RedeemWithGeo<'info> {
    pub fence: Account<'info, GeoFence>,
    pub redeemer: Signer<'info>,
    
    // In production, `attestation_server` would be verified against `fence.attestation_servers`
}

pub fn redeem_with_geo(
    ctx: Context<RedeemWithGeo>, 
    lat_micro: i32, 
    lng_micro: i32, 
    signature: Vec<u8>
) -> Result<()> {
    let fence = &ctx.accounts.fence;
    require!(fence.is_active, ViralSyncError::TokensExpired); // Re-using error for missing geo mapping here 
    
    // Check if the user opted out with fallback permitted
    if signature.is_empty() {
        require!(fence.allow_non_geo_redemption, ViralSyncError::TokensExpired); 
        // Proceeding invokes `non_geo_commission_penalty_bps` dilution on the redemption_slot processing down the line
        return Ok(());
    }
    
    // Real implementation requires deriving the Haversine distance bounds
    // to match `fence.radius_meters` mathematically verifying the `lat_micro`/`lng_micro` via ed25519 signature
    
    Ok(())
}
