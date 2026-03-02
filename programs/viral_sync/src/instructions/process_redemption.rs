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
    pub redeemer_generation: Account<'info, TokenGeneration>,
    
    #[account(mut)]
    pub referral_record: Account<'info, ReferralRecord>,
    
    #[account(mut)]
    pub commission_ledger: Account<'info, CommissionLedger>,
}

pub fn process_redemption_slot(ctx: Context<ProcessRedemptionSlot>, slot_idx: u8) -> Result<()> {
    let gen = &mut ctx.accounts.redeemer_generation;
    let referral = &mut ctx.accounts.referral_record;
    let ledger = &mut ctx.accounts.commission_ledger;
    
    require!(gen.redemption_pending, ViralSyncError::NoRedemptionPending);
    require!(slot_idx < gen.active_referrer_slots, ViralSyncError::InvalidReferrerSlot);
    
    let slot_mask = 1 << slot_idx;
    require!((gen.redemption_slots_settled & slot_mask) == 0, ViralSyncError::SlotAlreadySettled);
    
    let gen2_consumed = gen.redemption_slot_consumed[slot_idx as usize];
    
    if gen2_consumed > 0 && referral.is_active {
        // High precision commission calculation utilizing u128 to prevent overflow
        let commission_exact_u128 = (gen2_consumed as u128)
            .checked_mul(referral.committed_commission_bps as u128).unwrap();
            
        let commission_whole = (commission_exact_u128 / 10_000) as u64;
        let commission_dust_tenths = (commission_exact_u128 % 10_000) as u32; // dust in 10^-4 tokens
        
        ledger.claimable = ledger.claimable.checked_add(commission_whole).unwrap();
        ledger.dust_tenths_accumulated = ledger.dust_tenths_accumulated.checked_add(commission_dust_tenths).unwrap();
        
        // Overflow fractional dust into a whole token
        if ledger.dust_tenths_accumulated >= 10_000 {
            let bonus_whole = ledger.dust_tenths_accumulated / 10_000;
            ledger.claimable = ledger.claimable.checked_add(bonus_whole as u64).unwrap();
            ledger.dust_tenths_accumulated %= 10_000;
            ledger.total_earned = ledger.total_earned.checked_add(bonus_whole as u64).unwrap();
        }
        
        ledger.total_earned = ledger.total_earned.checked_add(commission_whole).unwrap();
        ledger.total_redemptions_driven = ledger.total_redemptions_driven.checked_add(1).unwrap();
        
        if commission_whole > ledger.highest_single_commission {
            ledger.highest_single_commission = commission_whole;
        }
        
        referral.commission_earned = referral.commission_earned.checked_add(commission_whole).unwrap();
    }
    
    // Mark slot as settled
    gen.redemption_slots_settled |= slot_mask;
    
    Ok(())
}

#[derive(Accounts)]
pub struct ClearRedemptionPending<'info> {
    #[account(mut)]
    pub redeemer: Signer<'info>,
    
    #[account(mut)]
    pub redeemer_generation: Account<'info, TokenGeneration>,
}

pub fn clear_redemption_pending(ctx: Context<ClearRedemptionPending>) -> Result<()> {
    let gen = &mut ctx.accounts.redeemer_generation;
    require!(gen.redemption_pending, ViralSyncError::NoRedemptionPending);
    
    // Check if ALL active bits in the mask are 1
    // Example: if 3 active slots, mask = (1 << 3) - 1 = binary 111 (7)
    let required_mask = (1 << gen.active_referrer_slots) - 1;
    require!(gen.redemption_slots_settled == required_mask, ViralSyncError::UnsettledSlotsRemain);
    
    gen.redemption_pending = false;
    gen.redemption_slot_consumed = [0; 4];
    gen.redemption_slots_settled = 0;
    
    Ok(())
}
