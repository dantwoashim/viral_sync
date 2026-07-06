use anchor_lang::prelude::*;

use crate::errors::ViralSyncError;
use crate::events::ConvictionSignalCommitted;
use crate::state::{ConvictionChoice, ConvictionSignal, GrowthCampaign, GrowthCampaignStatus};

#[derive(Accounts)]
#[instruction(signal_hash: [u8; 32])]
pub struct CommitConvictionSignal<'info> {
    #[account(
        constraint = growth_campaign.status == GrowthCampaignStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub growth_campaign: Box<Account<'info, GrowthCampaign>>,

    #[account(mut)]
    pub participant_authority: Signer<'info>,

    #[account(
        init,
        payer = participant_authority,
        space = ConvictionSignal::SIZE,
        seeds = [
            ConvictionSignal::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            participant_authority.key().as_ref(),
            signal_hash.as_ref(),
        ],
        bump
    )]
    pub conviction_signal: Box<Account<'info, ConvictionSignal>>,

    pub system_program: Program<'info, System>,
}

pub fn commit_conviction_signal(
    ctx: Context<CommitConvictionSignal>,
    signal_hash: [u8; 32],
    participant_commitment: [u8; 32],
    choice: ConvictionChoice,
    credits_committed: u16,
    confidence_bps: u16,
) -> Result<()> {
    require!(signal_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(participant_commitment != [0; 32], ViralSyncError::InvalidConfig);
    require!(credits_committed > 0, ViralSyncError::InvalidConfig);
    require!(
        credits_committed <= ConvictionSignal::MAX_CREDITS_PER_SIGNAL,
        ViralSyncError::ConvictionCreditCapExceeded
    );
    require!(
        confidence_bps <= ConvictionSignal::MAX_CONFIDENCE_BPS,
        ViralSyncError::ConvictionConfidenceOutOfRange
    );

    let signal = &mut ctx.accounts.conviction_signal;
    signal.bump = ctx.bumps.conviction_signal;
    signal.growth_campaign = ctx.accounts.growth_campaign.key();
    signal.participant_authority = ctx.accounts.participant_authority.key();
    signal.signal_hash = signal_hash;
    signal.participant_commitment = participant_commitment;
    signal.choice = choice;
    signal.credits_committed = credits_committed;
    signal.confidence_bps = confidence_bps;
    signal.non_transferable = true;
    signal.settlement_dependent = false;
    signal.created_at = Clock::get()?.unix_timestamp;

    emit!(ConvictionSignalCommitted {
        conviction_signal: signal.key(),
        growth_campaign: signal.growth_campaign,
        participant_authority: signal.participant_authority,
        signal_hash,
        choice,
        credits_committed,
        confidence_bps,
        non_transferable: true,
        settlement_dependent: false,
    });

    Ok(())
}
