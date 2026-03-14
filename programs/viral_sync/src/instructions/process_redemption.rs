use anchor_lang::prelude::*;
use crate::state::{
    commission_ledger::CommissionLedger,
    referral_record::ReferralRecord,
    token_generation::TokenGeneration,
};
use crate::errors::ViralSyncError;

#[derive(Accounts)]
pub struct ProcessRedemptionSlot<'info> {
    #[account(mut)]
    pub redeemer: Signer<'info>, // Often relay/crank executing it
    
    #[account(mut)]
    pub redeemer_generation: Box<Account<'info, TokenGeneration>>,
    
    #[account(mut)]
    pub referral_record: Box<Account<'info, ReferralRecord>>,
    
    #[account(mut)]
    pub commission_ledger: Box<Account<'info, CommissionLedger>>,
}

pub fn process_redemption_slot(ctx: Context<ProcessRedemptionSlot>, slot_idx: u8) -> Result<()> {
    let referral_key = ctx.accounts.referral_record.key();
    let referral_referred = ctx.accounts.referral_record.referred;
    let ledger_referrer = ctx.accounts.commission_ledger.referrer;
    let gen = &ctx.accounts.redeemer_generation;
    let now = Clock::get()?.unix_timestamp;

    require!(gen.redemption_pending, ViralSyncError::NoRedemptionPending);
    require!((gen.redemption_required_mask & (1 << slot_idx)) != 0, ViralSyncError::InvalidReferrerSlot);
    
    let slot_mask = 1 << slot_idx;
    require!((gen.redemption_slots_settled & slot_mask) == 0, ViralSyncError::SlotAlreadySettled);
    let slot = gen.referrer_slots[slot_idx as usize];
    require!(slot.is_active, ViralSyncError::InvalidReferrerSlot);
    require!(slot.referral_record == referral_key, ViralSyncError::InvalidReferralRecord);
    require!(slot.referrer == ledger_referrer, ViralSyncError::AccessDenied);
    require!(referral_referred == gen.owner, ViralSyncError::AccessDenied);
    
    let gen2_consumed = gen.redemption_slot_consumed[slot_idx as usize];
    let gen = &mut ctx.accounts.redeemer_generation;
    let referral = &mut ctx.accounts.referral_record;
    let ledger = &mut ctx.accounts.commission_ledger;
    
    if gen2_consumed > 0 && referral.is_active {
        // High precision commission calculation utilizing u128 to prevent overflow
        let commission_exact_u128 = (gen2_consumed as u128)
            .checked_mul(referral.committed_commission_bps as u128)
            .ok_or(ViralSyncError::MathOverflow)?;
            
        let commission_whole = (commission_exact_u128 / 10_000) as u64;
        let commission_dust_tenths = (commission_exact_u128 % 10_000) as u32; // dust in 10^-4 tokens
        
        ledger.claimable = ledger.claimable
            .checked_add(commission_whole)
            .ok_or(ViralSyncError::MathOverflow)?;
        ledger.dust_tenths_accumulated = ledger.dust_tenths_accumulated
            .checked_add(commission_dust_tenths)
            .ok_or(ViralSyncError::MathOverflow)?;
        
        // Overflow fractional dust into a whole token
        if ledger.dust_tenths_accumulated >= 10_000 {
            let bonus_whole = ledger.dust_tenths_accumulated / 10_000;
            ledger.claimable = ledger.claimable
                .checked_add(bonus_whole as u64)
                .ok_or(ViralSyncError::MathOverflow)?;
            ledger.dust_tenths_accumulated %= 10_000;
            ledger.total_earned = ledger.total_earned
                .checked_add(bonus_whole as u64)
                .ok_or(ViralSyncError::MathOverflow)?;
        }
        
        ledger.total_earned = ledger.total_earned
            .checked_add(commission_whole)
            .ok_or(ViralSyncError::MathOverflow)?;
        ledger.total_redemptions_driven = ledger.total_redemptions_driven
            .checked_add(1)
            .ok_or(ViralSyncError::MathOverflow)?;
        
        if commission_whole > ledger.highest_single_commission {
            ledger.highest_single_commission = commission_whole;
        }
        
        referral.commission_earned = referral.commission_earned
            .checked_add(commission_whole)
            .ok_or(ViralSyncError::MathOverflow)?;
    }

    if let Some(active_slot) = gen.referrer_slots.get_mut(slot_idx as usize) {
        active_slot.tokens_redeemed_so_far = active_slot.tokens_redeemed_so_far
            .checked_add(gen2_consumed)
            .ok_or(ViralSyncError::MathOverflow)?;
        if active_slot.tokens_redeemed_so_far >= active_slot.tokens_attributed
            || !referral.is_active
            || referral.is_expired(now)
        {
            active_slot.is_active = false;
        }
    }
    gen.active_referrer_slots = gen.referrer_slots.iter().filter(|slot| slot.is_active).count() as u8;
    
    // Mark slot as settled
    gen.redemption_slots_settled |= slot_mask;
    
    Ok(())
}

#[derive(Accounts)]
pub struct ClearRedemptionPending<'info> {
    #[account(mut)]
    pub redeemer: Signer<'info>,
    
    #[account(mut)]
    pub redeemer_generation: Box<Account<'info, TokenGeneration>>,
}

pub fn clear_redemption_pending(ctx: Context<ClearRedemptionPending>) -> Result<()> {
    let gen = &mut ctx.accounts.redeemer_generation;
    require!(gen.redemption_pending, ViralSyncError::NoRedemptionPending);
    
    require!(
        gen.redemption_slots_settled == gen.redemption_required_mask,
        ViralSyncError::UnsettledSlotsRemain
    );
    
    gen.redemption_pending = false;
    gen.redemption_slot_consumed = [0; 4];
    gen.redemption_slots_settled = 0;
    gen.redemption_required_mask = 0;
    gen.active_referrer_slots = gen.referrer_slots.iter().filter(|slot| slot.is_active).count() as u8;
    
    Ok(())
}
