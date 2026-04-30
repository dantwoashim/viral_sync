use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::errors::ViralSyncError;
use crate::events::{
    CausalReceiptRecorded, GrowthBountyFunded, GrowthCampaignCreated, MerchantRegistered,
    ReceiptRewardSettled,
};
use crate::state::{
    CausalMerchantConfig, CausalMerchantStatus, CausalReceipt, CausalReceiptStatus,
    GrowthCampaign, GrowthCampaignStatus, NullifierRecord, RewardEscrow, SettlementRecord,
};

#[derive(Accounts)]
#[instruction(org_id_hash: [u8; 32])]
pub struct RegisterMerchant<'info> {
    #[account(
        init,
        payer = merchant_authority,
        space = CausalMerchantConfig::SIZE,
        seeds = [
            CausalMerchantConfig::SEED_PREFIX,
            merchant_authority.key().as_ref(),
            org_id_hash.as_ref(),
        ],
        bump
    )]
    pub merchant_config: Account<'info, CausalMerchantConfig>,

    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundGrowthBounty<'info> {
    #[account(
        mut,
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
        constraint = growth_campaign.status == GrowthCampaignStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub growth_campaign: Account<'info, GrowthCampaign>,

    #[account(
        init_if_needed,
        payer = merchant_authority,
        space = RewardEscrow::SIZE,
        seeds = [
            RewardEscrow::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            growth_campaign.reward_mint.as_ref(),
        ],
        bump
    )]
    pub reward_escrow: Account<'info, RewardEscrow>,

    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn fund_growth_bounty(ctx: Context<FundGrowthBounty>, amount: u64) -> Result<()> {
    require!(amount > 0, ViralSyncError::InvalidConfig);

    let campaign = &mut ctx.accounts.growth_campaign;
    let escrow = &mut ctx.accounts.reward_escrow;
    let now = Clock::get()?.unix_timestamp;
    let max_capacity = campaign
        .reward_per_verified_visit
        .checked_mul(campaign.max_redemptions as u64)
        .ok_or(ViralSyncError::MathOverflow)?;
    let next_total = campaign
        .total_funded
        .checked_add(amount)
        .ok_or(ViralSyncError::MathOverflow)?;

    require!(next_total <= max_capacity, ViralSyncError::InvalidConfig);

    if escrow.campaign == Pubkey::default() {
        escrow.bump = ctx.bumps.reward_escrow;
        escrow.campaign = campaign.key();
        escrow.reward_mint = campaign.reward_mint;
        escrow.total_funded = 0;
        escrow.total_reserved = 0;
        escrow.total_settled = 0;
        escrow.created_at = now;
    }

    escrow.total_funded = escrow
        .total_funded
        .checked_add(amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    escrow.updated_at = now;
    campaign.total_funded = next_total;
    campaign.updated_at = now;

    emit!(GrowthBountyFunded {
        growth_campaign: campaign.key(),
        reward_escrow: escrow.key(),
        amount,
        total_funded: campaign.total_funded,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(receipt_id_hash: [u8; 32], claimer_nullifier_hash: [u8; 32])]
pub struct RecordCausalReceipt<'info> {
    #[account(
        mut,
        constraint = growth_campaign.status == GrowthCampaignStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub growth_campaign: Account<'info, GrowthCampaign>,

    #[account(
        mut,
        seeds = [
            RewardEscrow::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            growth_campaign.reward_mint.as_ref(),
        ],
        bump = reward_escrow.bump,
    )]
    pub reward_escrow: Account<'info, RewardEscrow>,

    #[account(
        init,
        payer = receipt_authority,
        space = CausalReceipt::SIZE,
        seeds = [
            CausalReceipt::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            receipt_id_hash.as_ref(),
        ],
        bump
    )]
    pub causal_receipt: Account<'info, CausalReceipt>,

    #[account(
        init,
        payer = receipt_authority,
        space = NullifierRecord::SIZE,
        seeds = [
            NullifierRecord::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            claimer_nullifier_hash.as_ref(),
        ],
        bump
    )]
    pub nullifier_record: Account<'info, NullifierRecord>,

    #[account(mut)]
    pub receipt_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn record_causal_receipt(
    ctx: Context<RecordCausalReceipt>,
    receipt_id_hash: [u8; 32],
    parent_receipt_id_hash: [u8; 32],
    referrer_commitment: [u8; 32],
    claimer_nullifier_hash: [u8; 32],
    invite_hash: [u8; 32],
    visit_attestation_hash: [u8; 32],
    risk_score_commitment: [u8; 32],
) -> Result<()> {
    require!(receipt_id_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(claimer_nullifier_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(invite_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(visit_attestation_hash != [0; 32], ViralSyncError::InvalidConfig);

    let campaign = &ctx.accounts.growth_campaign;
    let escrow = &mut ctx.accounts.reward_escrow;
    let available = escrow
        .total_funded
        .checked_sub(escrow.total_reserved)
        .ok_or(ViralSyncError::MathOverflow)?;
    require!(available >= campaign.reward_per_verified_visit, ViralSyncError::InsufficientBalance);

    let now = Clock::get()?.unix_timestamp;
    let receipt = &mut ctx.accounts.causal_receipt;
    let nullifier = &mut ctx.accounts.nullifier_record;

    receipt.bump = ctx.bumps.causal_receipt;
    receipt.campaign = campaign.key();
    receipt.merchant_config = campaign.merchant_config;
    receipt.receipt_id_hash = receipt_id_hash;
    receipt.parent_receipt_id_hash = parent_receipt_id_hash;
    receipt.referrer_commitment = referrer_commitment;
    receipt.claimer_nullifier_hash = claimer_nullifier_hash;
    receipt.invite_hash = invite_hash;
    receipt.visit_attestation_hash = visit_attestation_hash;
    receipt.risk_score_commitment = risk_score_commitment;
    receipt.reward_amount = campaign.reward_per_verified_visit;
    receipt.settled_amount = 0;
    receipt.status = CausalReceiptStatus::Recorded;
    receipt.created_at = now;
    receipt.settled_at = 0;

    nullifier.bump = ctx.bumps.nullifier_record;
    nullifier.campaign = campaign.key();
    nullifier.nullifier_hash = claimer_nullifier_hash;
    nullifier.first_receipt = receipt.key();
    nullifier.created_at = now;

    escrow.total_reserved = escrow
        .total_reserved
        .checked_add(campaign.reward_per_verified_visit)
        .ok_or(ViralSyncError::MathOverflow)?;
    escrow.updated_at = now;

    emit!(CausalReceiptRecorded {
        causal_receipt: receipt.key(),
        growth_campaign: campaign.key(),
        receipt_id_hash,
        claimer_nullifier_hash,
        reward_amount: receipt.reward_amount,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct SettleReceiptReward<'info> {
    #[account(mut)]
    pub growth_campaign: Account<'info, GrowthCampaign>,

    #[account(
        mut,
        seeds = [
            RewardEscrow::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            growth_campaign.reward_mint.as_ref(),
        ],
        bump = reward_escrow.bump,
    )]
    pub reward_escrow: Account<'info, RewardEscrow>,

    #[account(
        mut,
        constraint = causal_receipt.campaign == growth_campaign.key() @ ViralSyncError::InvalidState,
        constraint = causal_receipt.status == CausalReceiptStatus::Recorded @ ViralSyncError::SlotAlreadySettled,
    )]
    pub causal_receipt: Account<'info, CausalReceipt>,

    #[account(
        init,
        payer = settlement_authority,
        space = SettlementRecord::SIZE,
        seeds = [
            SettlementRecord::SEED_PREFIX,
            causal_receipt.key().as_ref(),
        ],
        bump
    )]
    pub settlement_record: Account<'info, SettlementRecord>,

    #[account(mut)]
    pub settlement_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn settle_receipt_reward(ctx: Context<SettleReceiptReward>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let campaign = &mut ctx.accounts.growth_campaign;
    let escrow = &mut ctx.accounts.reward_escrow;
    let receipt = &mut ctx.accounts.causal_receipt;
    let settlement = &mut ctx.accounts.settlement_record;

    let referrer_amount = receipt
        .reward_amount
        .checked_mul(80)
        .ok_or(ViralSyncError::MathOverflow)?
        .checked_div(100)
        .ok_or(ViralSyncError::MathOverflow)?;
    let visitor_amount = receipt
        .reward_amount
        .checked_sub(referrer_amount)
        .ok_or(ViralSyncError::MathOverflow)?;

    escrow.total_reserved = escrow
        .total_reserved
        .checked_sub(receipt.reward_amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    escrow.total_settled = escrow
        .total_settled
        .checked_add(receipt.reward_amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    escrow.updated_at = now;

    campaign.total_settled = campaign
        .total_settled
        .checked_add(receipt.reward_amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    campaign.updated_at = now;

    receipt.status = CausalReceiptStatus::Settled;
    receipt.settled_amount = receipt.reward_amount;
    receipt.settled_at = now;

    settlement.bump = ctx.bumps.settlement_record;
    settlement.receipt = receipt.key();
    settlement.campaign = campaign.key();
    settlement.referrer_amount = referrer_amount;
    settlement.visitor_amount = visitor_amount;
    settlement.settled_at = now;

    emit!(ReceiptRewardSettled {
        causal_receipt: receipt.key(),
        growth_campaign: campaign.key(),
        settlement_record: settlement.key(),
        referrer_amount,
        visitor_amount,
        settled_amount: receipt.settled_amount,
    });

    Ok(())
}

pub fn register_merchant(ctx: Context<RegisterMerchant>, org_id_hash: [u8; 32]) -> Result<()> {
    require!(org_id_hash != [0; 32], ViralSyncError::InvalidConfig);

    let now = Clock::get()?.unix_timestamp;
    let config = &mut ctx.accounts.merchant_config;

    config.bump = ctx.bumps.merchant_config;
    config.merchant_authority = ctx.accounts.merchant_authority.key();
    config.org_id_hash = org_id_hash;
    config.allowed_staff_delegate_root = [0; 32];
    config.terminal_authority_root = [0; 32];
    config.status = CausalMerchantStatus::Active;
    config.created_at = now;
    config.updated_at = now;

    emit!(MerchantRegistered {
        merchant_config: config.key(),
        merchant_authority: config.merchant_authority,
        org_id_hash,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(campaign_id_hash: [u8; 32])]
pub struct CreateGrowthCampaign<'info> {
    #[account(
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
        constraint = merchant_config.status == CausalMerchantStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub merchant_config: Account<'info, CausalMerchantConfig>,

    #[account(
        init,
        payer = merchant_authority,
        space = GrowthCampaign::SIZE,
        seeds = [
            GrowthCampaign::SEED_PREFIX,
            merchant_config.key().as_ref(),
            campaign_id_hash.as_ref(),
        ],
        bump
    )]
    pub growth_campaign: Account<'info, GrowthCampaign>,

    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    pub reward_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn create_growth_campaign(
    ctx: Context<CreateGrowthCampaign>,
    campaign_id_hash: [u8; 32],
    reward_per_verified_visit: u64,
    max_redemptions: u32,
    max_depth: u8,
    split_rules_hash: [u8; 32],
    fraud_policy_hash: [u8; 32],
    starts_at: i64,
    expires_at: i64,
) -> Result<()> {
    require!(campaign_id_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(reward_per_verified_visit > 0, ViralSyncError::InvalidConfig);
    require!(max_redemptions > 0, ViralSyncError::InvalidConfig);
    require!(max_depth > 0, ViralSyncError::InvalidConfig);
    require!(split_rules_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(fraud_policy_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(expires_at > starts_at, ViralSyncError::InvalidConfig);

    let now = Clock::get()?.unix_timestamp;
    let campaign = &mut ctx.accounts.growth_campaign;

    campaign.bump = ctx.bumps.growth_campaign;
    campaign.merchant_config = ctx.accounts.merchant_config.key();
    campaign.merchant_authority = ctx.accounts.merchant_authority.key();
    campaign.campaign_id_hash = campaign_id_hash;
    campaign.reward_mint = ctx.accounts.reward_mint.key();
    campaign.reward_per_verified_visit = reward_per_verified_visit;
    campaign.max_redemptions = max_redemptions;
    campaign.max_depth = max_depth;
    campaign.split_rules_hash = split_rules_hash;
    campaign.fraud_policy_hash = fraud_policy_hash;
    campaign.starts_at = starts_at;
    campaign.expires_at = expires_at;
    campaign.total_funded = 0;
    campaign.total_settled = 0;
    campaign.status = GrowthCampaignStatus::Active;
    campaign.created_at = now;
    campaign.updated_at = now;

    emit!(GrowthCampaignCreated {
        growth_campaign: campaign.key(),
        merchant_config: campaign.merchant_config,
        merchant_authority: campaign.merchant_authority,
        campaign_id_hash,
        reward_mint: campaign.reward_mint,
        reward_per_verified_visit,
        max_redemptions,
        starts_at,
        expires_at,
    });

    Ok(())
}
