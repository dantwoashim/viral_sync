use anchor_lang::prelude::*;
use crate::state::referral_record::ReferralRecord;
use crate::errors::ViralSyncError;

#[event]
pub struct ExpiredReferralClosed {
    pub referrer: Pubkey,
    pub referred: Pubkey,
    pub rent_recovered: u64,
}

#[derive(Accounts)]
pub struct CloseExpiredReferral<'info> {
    #[account(
        mut,
        close = caller, // Send all rent back to the crank/caller
    )]
    pub referral_record: Account<'info, ReferralRecord>,
    
    #[account(mut)]
    pub caller: Signer<'info>, // Permissionless! Anyone can crank this
}

pub fn close_expired_referral(ctx: Context<CloseExpiredReferral>) -> Result<()> {
    let referral = &ctx.accounts.referral_record;
    let now = Clock::get()?.unix_timestamp;
    
    // Security guarantees to prevent premature closing
    require!(referral.is_expired(now), ViralSyncError::TokensExpired); 
    
    // We only allow closing if all commissions have been paid out properly to prevent griefing
    require!(
        referral.commission_earned == referral.commission_settled, 
        ViralSyncError::MathOverflow // (Map custom error for OutstandingCommissionUnsettled in full deployment)
    );
    
    let rent_lamports = referral.to_account_info().lamports();
    
    emit!(ExpiredReferralClosed {
        referrer: referral.referrer,
        referred: referral.referred,
        rent_recovered: rent_lamports,
    });
    
    // Anchor's `close` constraint handles the memory zeroing and lamport transfer
    Ok(())
}
