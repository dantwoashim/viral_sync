use anchor_lang::prelude::*;
use crate::state::{
    dispute_record::{DisputeRecord, DisputeStatus},
    commission_ledger::CommissionLedger,
    merchant_reputation::MerchantReputation,
};
use crate::errors::ViralSyncError;

pub const DISPUTE_MERCHANT_RESPONSE_SECS: i64 = 1209600; // 14 days

#[event]
pub struct DisputeAutoUpheld {
    pub merchant: Pubkey,
    pub referral: Pubkey,
    pub disputed_amount: u64,
    pub watchdog_reward: u64,
}

#[derive(Accounts)]
pub struct ResolveExpiredDispute<'info> {
    #[account(mut)]
    pub dispute_record: Account<'info, DisputeRecord>,
    
    #[account(mut)]
    pub commission_ledger: Account<'info, CommissionLedger>,
    
    #[account(mut)]
    pub merchant_reputation: Account<'info, MerchantReputation>,
    
    /// CHECK: Stake Escrow PDA return targets 
    #[account(mut)]
    pub dispute_escrow: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub watchdog: Signer<'info>, 
}

// Target Fix for Architecture documentation (D3) Auto Resolve
pub fn resolve_expired_dispute(ctx: Context<ResolveExpiredDispute>) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute_record;
    let now = Clock::get()?.unix_timestamp;
    
    require!(
        dispute.status == DisputeStatus::Pending,
        ViralSyncError::TokensExpired // Generic "InvalidState" map 
    );
    
    // Core Engine Rule: Negligent merchant loses instantly over 14 days
    require!(
        now > dispute.raised_at + DISPUTE_MERCHANT_RESPONSE_SECS,
        ViralSyncError::TokensExpired // e.g., DisputeStillWithinResponseWindow
    );
    
    dispute.status = DisputeStatus::UpheldByTimeout;
    
    let commission_ledger = &mut ctx.accounts.commission_ledger;
    let disputed_amount = commission_ledger.frozen_amount;
    let watchdog_share = disputed_amount / 2;
    
    commission_ledger.frozen = false;
    commission_ledger.claimable = commission_ledger.claimable.saturating_sub(disputed_amount);
    
    // Reputation execution logic natively lowering the scores massively for neglect
    let rep = &mut ctx.accounts.merchant_reputation;
    rep.timeout_disputes += 1;
    rep.reputation_score = rep.reputation_score.saturating_sub(500);
    
    // Returning the Watchdog's active stake 
    // **ctx.accounts.dispute_escrow.try_borrow_mut_lamports()? -= dispute.stake_lamports;
    // **ctx.accounts.watchdog.try_borrow_mut_lamports()? += dispute.stake_lamports;
    
    emit!(DisputeAutoUpheld {
        merchant: dispute.merchant,
        referral: dispute.referral,
        disputed_amount,
        watchdog_reward: watchdog_share,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct RaiseDispute<'info> {
    #[account(mut)]
    pub dispute_record: Account<'info, DisputeRecord>,
    
    #[account(mut)]
    pub commission_ledger: Account<'info, CommissionLedger>,
    
    #[account(mut)]
    pub watchdog: Signer<'info>,
}

pub fn raise_dispute(ctx: Context<RaiseDispute>, amount: u64) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute_record;
    dispute.status = DisputeStatus::Pending;
    dispute.raised_at = Clock::get()?.unix_timestamp;
    
    let ledger = &mut ctx.accounts.commission_ledger;
    ledger.frozen = true;
    ledger.frozen_amount = amount;
    
    Ok(())
}
