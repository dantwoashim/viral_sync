use anchor_lang::prelude::*;
use crate::errors::ViralSyncError;
use crate::state::token_generation::{TokenGeneration, GenSource, INBOUND_BUFFER_SIZE};

#[derive(Accounts)]
pub struct FinalizeInbound<'info> {
    #[account(mut)]
    pub dest_generation: Box<Account<'info, TokenGeneration>>,
    pub dest: Signer<'info>, // usually crank or the user themselves
}

pub fn handler(ctx: Context<FinalizeInbound>) -> Result<()> {
    let gen = &mut ctx.accounts.dest_generation;
    
    if gen.buffer_pending == 0 {
        return Ok(());
    }
    
    for i in 0..INBOUND_BUFFER_SIZE {
        let entry = gen.inbound_buffer[i];
        if !entry.processed && entry.amount > 0 {
            if entry.generation_source == GenSource::ViralShare {
                apply_referrer_slot(gen, entry.referrer, entry.amount)?;
            }

            gen.inbound_buffer[i].processed = true;
            gen.inbound_buffer[i].amount = 0;
        }
    }
    
    gen.buffer_pending = 0;
    
    Ok(())
}

fn apply_referrer_slot(gen: &mut TokenGeneration, referrer: Pubkey, amount: u64) -> Result<()> {
    if referrer == Pubkey::default() || amount == 0 {
        return Ok(());
    }

    if let Some(slot) = gen
        .referrer_slots
        .iter_mut()
        .find(|slot| slot.is_active && slot.referrer == referrer)
    {
        slot.tokens_attributed = slot
            .tokens_attributed
            .checked_add(amount)
            .ok_or(ViralSyncError::MathOverflow)?;
        return Ok(());
    }

    let max_referrer_slots = gen.referrer_slots.len() as u8;
    if let Some(slot) = gen.referrer_slots.iter_mut().find(|slot| !slot.is_active) {
        require!(gen.active_referrer_slots < max_referrer_slots, ViralSyncError::InvalidReferrerSlot);
        slot.referrer = referrer;
        slot.referral_record = Pubkey::default();
        slot.tokens_attributed = amount;
        slot.tokens_redeemed_so_far = 0;
        slot.is_active = true;
        gen.active_referrer_slots = gen
            .active_referrer_slots
            .checked_add(1)
            .ok_or(ViralSyncError::MathOverflow)?;
        return Ok(());
    }

    gen.gen2_balance = gen
        .gen2_balance
        .checked_sub(amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    gen.dead_balance = gen
        .dead_balance
        .checked_add(amount)
        .ok_or(ViralSyncError::MathOverflow)?;

    Ok(())
}
