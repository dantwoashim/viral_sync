use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
        TransferChecked,
    },
};

use crate::errors::ViralSyncError;
use crate::events::{
    CausalMerchantStatusUpdated, CausalReceiptRecorded, ClaimPassIssued, GrowthBountyClosed,
    GrowthBountyFunded, GrowthCampaignCreated, GrowthCampaignStatusUpdated, MerchantRegistered,
    ReceiptRewardSettled, TerminalDeviceEnrolled, TerminalDeviceStatusUpdated,
};
use crate::state::{
    CausalMerchantConfig, CausalMerchantStatus, CausalReceipt, CausalReceiptStatus,
    ClaimPass, ClaimPassStatus, GrowthCampaign, GrowthCampaignStatus, NullifierRecord,
    ReceiptAttestationModel, RewardEscrow, SettlementRecord, TerminalDevice, TerminalDeviceStatus,
};

const PROTOCOL_FEE_BPS: u64 = 100;
const PROTOCOL_TREASURY_SEED: &[u8] = b"protocol_treasury";

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
#[instruction(label_hash: [u8; 32])]
pub struct EnrollTerminalDevice<'info> {
    #[account(
        mut,
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
        constraint = merchant_config.status == CausalMerchantStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub merchant_config: Account<'info, CausalMerchantConfig>,

    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    pub terminal_authority: Signer<'info>,

    #[account(
        init,
        payer = merchant_authority,
        space = TerminalDevice::SIZE,
        seeds = [
            TerminalDevice::SEED_PREFIX,
            merchant_config.key().as_ref(),
            terminal_authority.key().as_ref(),
        ],
        bump
    )]
    pub terminal_device: Account<'info, TerminalDevice>,

    pub system_program: Program<'info, System>,
}

pub fn enroll_terminal_device(
    ctx: Context<EnrollTerminalDevice>,
    label_hash: [u8; 32],
) -> Result<()> {
    require!(label_hash != [0; 32], ViralSyncError::InvalidConfig);

    let now = Clock::get()?.unix_timestamp;
    let device = &mut ctx.accounts.terminal_device;
    device.bump = ctx.bumps.terminal_device;
    device.merchant_config = ctx.accounts.merchant_config.key();
    device.merchant_authority = ctx.accounts.merchant_authority.key();
    device.terminal_authority = ctx.accounts.terminal_authority.key();
    device.label_hash = label_hash;
    device.status = TerminalDeviceStatus::Active;
    device.enrolled_at = now;
    device.updated_at = now;

    emit!(TerminalDeviceEnrolled {
        merchant_config: device.merchant_config,
        merchant_authority: device.merchant_authority,
        terminal_device: device.key(),
        terminal_authority: device.terminal_authority,
        label_hash,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct SetTerminalDeviceStatus<'info> {
    #[account(
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
        constraint = merchant_config.status == CausalMerchantStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub merchant_config: Account<'info, CausalMerchantConfig>,

    #[account(
        mut,
        seeds = [
            TerminalDevice::SEED_PREFIX,
            merchant_config.key().as_ref(),
            terminal_device.terminal_authority.as_ref(),
        ],
        bump = terminal_device.bump,
        constraint = terminal_device.merchant_config == merchant_config.key() @ ViralSyncError::InvalidTerminalDevice,
        constraint = terminal_device.merchant_authority == merchant_authority.key() @ ViralSyncError::InvalidTerminalDevice,
    )]
    pub terminal_device: Account<'info, TerminalDevice>,

    pub merchant_authority: Signer<'info>,
}

pub fn set_terminal_device_status(
    ctx: Context<SetTerminalDeviceStatus>,
    status: TerminalDeviceStatus,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let device = &mut ctx.accounts.terminal_device;

    device.status = status;
    device.updated_at = now;

    emit!(TerminalDeviceStatusUpdated {
        terminal_device: device.key(),
        merchant_config: device.merchant_config,
        merchant_authority: ctx.accounts.merchant_authority.key(),
        terminal_authority: device.terminal_authority,
        status,
        updated_at: now,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(claim_hash: [u8; 32])]
pub struct IssueClaimPass<'info> {
    #[account(
        mut,
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
        constraint = growth_campaign.status == GrowthCampaignStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub growth_campaign: Box<Account<'info, GrowthCampaign>>,

    #[account(
        address = growth_campaign.merchant_config @ ViralSyncError::InvalidState,
        constraint = merchant_config.status == CausalMerchantStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub merchant_config: Box<Account<'info, CausalMerchantConfig>>,

    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    /// CHECK: The visitor must sign the later receipt; this instruction only binds the public key.
    pub visitor_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = merchant_authority,
        space = ClaimPass::SIZE,
        seeds = [
            ClaimPass::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            visitor_authority.key().as_ref(),
            claim_hash.as_ref(),
        ],
        bump
    )]
    pub claim_pass: Box<Account<'info, ClaimPass>>,

    pub system_program: Program<'info, System>,
}

pub fn issue_claim_pass(
    ctx: Context<IssueClaimPass>,
    claim_hash: [u8; 32],
    depth: u8,
    lineage_proof_hash: [u8; 32],
    referrer_receipt: Pubkey,
) -> Result<()> {
    require!(claim_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(lineage_proof_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(depth <= ctx.accounts.growth_campaign.max_depth, ViralSyncError::MaxDepthExceeded);

    let now = Clock::get()?.unix_timestamp;
    let claim_pass = &mut ctx.accounts.claim_pass;
    claim_pass.bump = ctx.bumps.claim_pass;
    claim_pass.campaign = ctx.accounts.growth_campaign.key();
    claim_pass.visitor_authority = ctx.accounts.visitor_authority.key();
    claim_pass.referrer_receipt = referrer_receipt;
    claim_pass.claim_hash = claim_hash;
    claim_pass.lineage_proof_hash = lineage_proof_hash;
    claim_pass.depth = depth;
    claim_pass.status = ClaimPassStatus::Active;
    claim_pass.first_receipt = Pubkey::default();
    claim_pass.created_at = now;
    claim_pass.updated_at = now;

    emit!(ClaimPassIssued {
        claim_pass: claim_pass.key(),
        growth_campaign: claim_pass.campaign,
        visitor_authority: claim_pass.visitor_authority,
        claim_hash,
        depth,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct FundGrowthBounty<'info> {
    #[account(
        mut,
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
        constraint = growth_campaign.status == GrowthCampaignStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub growth_campaign: Box<Account<'info, GrowthCampaign>>,

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
    pub reward_escrow: Box<Account<'info, RewardEscrow>>,

    #[account(
        mut,
        constraint = merchant_reward_account.mint == growth_campaign.reward_mint @ ViralSyncError::InvalidConfig,
        constraint = merchant_reward_account.owner == merchant_authority.key() @ ViralSyncError::AccessDenied,
    )]
    pub merchant_reward_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = reward_mint,
        token::authority = reward_escrow,
        token::token_program = token_program,
    )]
    pub reward_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn fund_growth_bounty(ctx: Context<FundGrowthBounty>, amount: u64) -> Result<()> {
    require!(amount > 0, ViralSyncError::InvalidConfig);
    require!(
        ctx.accounts.reward_mint.key() == ctx.accounts.growth_campaign.reward_mint,
        ViralSyncError::InvalidConfig
    );

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
        escrow.reward_vault = ctx.accounts.reward_vault.key();
        escrow.total_funded = 0;
        escrow.total_reserved = 0;
        escrow.total_settled = 0;
        escrow.created_at = now;
    } else {
        require!(
            escrow.reward_vault == ctx.accounts.reward_vault.key(),
            ViralSyncError::InvalidState
        );
    }

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.merchant_reward_account.to_account_info(),
        mint: ctx.accounts.reward_mint.to_account_info(),
        to: ctx.accounts.reward_vault.to_account_info(),
        authority: ctx.accounts.merchant_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, amount, ctx.accounts.reward_mint.decimals)?;

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
pub struct CloseGrowthBounty<'info> {
    #[account(
        mut,
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
        constraint = (
            growth_campaign.status == GrowthCampaignStatus::Active ||
            growth_campaign.status == GrowthCampaignStatus::Paused
        ) @ ViralSyncError::InvalidState,
    )]
    pub growth_campaign: Box<Account<'info, GrowthCampaign>>,

    #[account(
        mut,
        seeds = [
            RewardEscrow::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            growth_campaign.reward_mint.as_ref(),
        ],
        bump = reward_escrow.bump,
        constraint = reward_escrow.campaign == growth_campaign.key() @ ViralSyncError::InvalidState,
    )]
    pub reward_escrow: Box<Account<'info, RewardEscrow>>,

    #[account(
        mut,
        constraint = reward_vault.key() == reward_escrow.reward_vault @ ViralSyncError::InvalidState,
        constraint = reward_vault.mint == growth_campaign.reward_mint @ ViralSyncError::InvalidConfig,
        constraint = reward_vault.owner == reward_escrow.key() @ ViralSyncError::AccessDenied,
    )]
    pub reward_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = merchant_reward_account.mint == growth_campaign.reward_mint @ ViralSyncError::InvalidConfig,
        constraint = merchant_reward_account.owner == merchant_authority.key() @ ViralSyncError::AccessDenied,
    )]
    pub merchant_reward_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn close_growth_bounty(ctx: Context<CloseGrowthBounty>) -> Result<()> {
    require!(
        ctx.accounts.reward_mint.key() == ctx.accounts.growth_campaign.reward_mint,
        ViralSyncError::InvalidConfig
    );

    let campaign = &mut ctx.accounts.growth_campaign;
    let escrow = &mut ctx.accounts.reward_escrow;
    let now = Clock::get()?.unix_timestamp;
    require!(now > campaign.expires_at, ViralSyncError::InvalidState);
    require!(escrow.total_reserved == 0, ViralSyncError::UnsettledSlotsRemain);

    let reclaimable = escrow
        .total_funded
        .checked_sub(escrow.total_settled)
        .ok_or(ViralSyncError::MathOverflow)?;
    let campaign_key = campaign.key();
    let reward_mint_key = campaign.reward_mint;
    let signer_seeds: &[&[&[u8]]] = &[&[
        RewardEscrow::SEED_PREFIX,
        campaign_key.as_ref(),
        reward_mint_key.as_ref(),
        &[escrow.bump],
    ]];

    if reclaimable > 0 {
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.reward_vault.to_account_info(),
            mint: ctx.accounts.reward_mint.to_account_info(),
            to: ctx.accounts.merchant_reward_account.to_account_info(),
            authority: escrow.to_account_info(),
        };
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_accounts,
                signer_seeds,
            ),
            reclaimable,
            ctx.accounts.reward_mint.decimals,
        )?;
    }

    let close_accounts = CloseAccount {
        account: ctx.accounts.reward_vault.to_account_info(),
        destination: ctx.accounts.merchant_authority.to_account_info(),
        authority: escrow.to_account_info(),
    };
    close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        close_accounts,
        signer_seeds,
    ))?;

    escrow.total_funded = escrow.total_settled;
    escrow.updated_at = now;
    campaign.status = GrowthCampaignStatus::Closed;
    campaign.updated_at = now;

    emit!(GrowthBountyClosed {
        growth_campaign: campaign.key(),
        reward_escrow: escrow.key(),
        reward_vault: ctx.accounts.reward_vault.key(),
        merchant_reward_account: ctx.accounts.merchant_reward_account.key(),
        reclaimed_amount: reclaimable,
        closed_at: now,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    receipt_id_hash: [u8; 32],
    parent_receipt_id_hash: [u8; 32],
    referrer_commitment: [u8; 32],
    claimer_nullifier_hash: [u8; 32]
)]
pub struct RecordCausalReceipt<'info> {
    #[account(
        mut,
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
        constraint = growth_campaign.status == GrowthCampaignStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub growth_campaign: Box<Account<'info, GrowthCampaign>>,

    #[account(
        address = growth_campaign.merchant_config @ ViralSyncError::InvalidState,
        constraint = merchant_config.status == CausalMerchantStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub merchant_config: Box<Account<'info, CausalMerchantConfig>>,

    #[account(
        mut,
        seeds = [
            RewardEscrow::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            growth_campaign.reward_mint.as_ref(),
        ],
        bump = reward_escrow.bump,
    )]
    pub reward_escrow: Box<Account<'info, RewardEscrow>>,

    #[account(
        constraint = reward_vault.key() == reward_escrow.reward_vault @ ViralSyncError::InvalidState,
        constraint = reward_vault.mint == growth_campaign.reward_mint @ ViralSyncError::InvalidConfig,
    )]
    pub reward_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = merchant_authority,
        space = CausalReceipt::SIZE,
        seeds = [
            CausalReceipt::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            receipt_id_hash.as_ref(),
        ],
        bump
    )]
    pub causal_receipt: Box<Account<'info, CausalReceipt>>,

    #[account(
        init,
        payer = merchant_authority,
        space = NullifierRecord::SIZE,
        seeds = [
            NullifierRecord::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            claimer_nullifier_hash.as_ref(),
        ],
        bump
    )]
    pub nullifier_record: Box<Account<'info, NullifierRecord>>,

    #[account(
        mut,
        constraint = claim_pass.campaign == growth_campaign.key() @ ViralSyncError::InvalidClaimPass,
        constraint = claim_pass.visitor_authority == visitor_authority.key() @ ViralSyncError::InvalidClaimPass,
        constraint = claim_pass.status == ClaimPassStatus::Active @ ViralSyncError::InvalidClaimPass,
        constraint = claim_pass.depth <= growth_campaign.max_depth @ ViralSyncError::MaxDepthExceeded,
    )]
    pub claim_pass: Box<Account<'info, ClaimPass>>,

    #[account(
        seeds = [
            TerminalDevice::SEED_PREFIX,
            merchant_config.key().as_ref(),
            terminal_authority.key().as_ref(),
        ],
        bump = terminal_device.bump,
    )]
    pub terminal_device: Box<Account<'info, TerminalDevice>>,

    pub terminal_authority: Signer<'info>,

    pub visitor_authority: Signer<'info>,

    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn record_causal_receipt<'info>(
    ctx: Context<'_, '_, 'info, 'info, RecordCausalReceipt<'info>>,
    receipt_id_hash: [u8; 32],
    parent_receipt_id_hash: [u8; 32],
    referrer_commitment: [u8; 32],
    claimer_nullifier_hash: [u8; 32],
    invite_hash: [u8; 32],
    visit_attestation_hash: [u8; 32],
    intent_manifest_hash: [u8; 32],
    risk_score_commitment: [u8; 32],
    referrer_beneficiary: Pubkey,
    visitor_beneficiary: Pubkey,
) -> Result<()> {
    require!(receipt_id_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(claimer_nullifier_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(invite_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(visit_attestation_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(intent_manifest_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(referrer_beneficiary != Pubkey::default(), ViralSyncError::InvalidConfig);
    require!(visitor_beneficiary != Pubkey::default(), ViralSyncError::InvalidConfig);
    require_keys_eq!(ctx.accounts.visitor_authority.key(), visitor_beneficiary, ViralSyncError::InvalidVisitorAuthority);
    require!(ctx.accounts.terminal_device.status == TerminalDeviceStatus::Active, ViralSyncError::TerminalDeviceInactive);
    require_keys_eq!(ctx.accounts.terminal_device.merchant_config, ctx.accounts.merchant_config.key(), ViralSyncError::InvalidTerminalDevice);
    require_keys_eq!(ctx.accounts.terminal_device.merchant_authority, ctx.accounts.merchant_authority.key(), ViralSyncError::InvalidTerminalDevice);
    require_keys_eq!(ctx.accounts.terminal_device.terminal_authority, ctx.accounts.terminal_authority.key(), ViralSyncError::InvalidTerminalAuthority);

    let campaign = &mut ctx.accounts.growth_campaign;
    let escrow = &mut ctx.accounts.reward_escrow;
    require!(campaign.total_recorded < campaign.max_redemptions, ViralSyncError::InvalidState);
    let committed = escrow
        .total_reserved
        .checked_add(escrow.total_settled)
        .ok_or(ViralSyncError::MathOverflow)?;
    let available = escrow
        .total_funded
        .checked_sub(committed)
        .ok_or(ViralSyncError::MathOverflow)?;
    require!(available >= campaign.reward_per_verified_visit, ViralSyncError::InsufficientBalance);

    let now = Clock::get()?.unix_timestamp;
    require!(now >= campaign.starts_at, ViralSyncError::InvalidState);
    require!(now <= campaign.expires_at, ViralSyncError::InvalidState);

    let receipt = &mut ctx.accounts.causal_receipt;
    let nullifier = &mut ctx.accounts.nullifier_record;
    let claim_pass = &ctx.accounts.claim_pass;
    if claim_pass.depth == 1 {
        require_keys_eq!(claim_pass.referrer_receipt, Pubkey::default(), ViralSyncError::InvalidLineageProof);
        require!(parent_receipt_id_hash == [0; 32], ViralSyncError::InvalidLineageProof);
    } else {
        require!(claim_pass.referrer_receipt != Pubkey::default(), ViralSyncError::InvalidLineageProof);
        require!(parent_receipt_id_hash != [0; 32], ViralSyncError::InvalidLineageProof);
        let parent_info = ctx
            .remaining_accounts
            .first()
            .ok_or(ViralSyncError::InvalidLineageProof)?;
        let parent_receipt = Account::<CausalReceipt>::try_from(parent_info)
            .map_err(|_| ViralSyncError::InvalidLineageProof)?;
        require_keys_eq!(parent_info.key(), claim_pass.referrer_receipt, ViralSyncError::InvalidLineageProof);
        require_keys_eq!(parent_receipt.campaign, campaign.key(), ViralSyncError::InvalidLineageProof);
        require_keys_eq!(parent_receipt.merchant_config, campaign.merchant_config, ViralSyncError::InvalidLineageProof);
        require!(parent_receipt.status == CausalReceiptStatus::Settled, ViralSyncError::InvalidLineageProof);
        require!(parent_receipt.receipt_id_hash == parent_receipt_id_hash, ViralSyncError::InvalidLineageProof);
        require!(
            parent_receipt
                .lineage_generation
                .checked_add(1)
                == Some(claim_pass.depth),
            ViralSyncError::InvalidLineageProof
        );
        require_keys_eq!(
            referrer_beneficiary,
            parent_receipt.visitor_beneficiary,
            ViralSyncError::IntentMismatch
        );
    }
    let claim_pass = &mut ctx.accounts.claim_pass;

    receipt.bump = ctx.bumps.causal_receipt;
    receipt.campaign = campaign.key();
    receipt.merchant_config = campaign.merchant_config;
    receipt.referrer_beneficiary = referrer_beneficiary;
    receipt.visitor_beneficiary = visitor_beneficiary;
    receipt.reward_mint = campaign.reward_mint;
    receipt.referrer_split_bps = campaign.referrer_split_bps;
    receipt.terminal_device = ctx.accounts.terminal_device.key();
    receipt.terminal_authority = ctx.accounts.terminal_authority.key();
    receipt.visitor_authority = ctx.accounts.visitor_authority.key();
    receipt.attestation_model = ReceiptAttestationModel::MerchantTerminalVisitorSigned;
    receipt.claim_pass = claim_pass.key();
    receipt.claim_pass_mint = campaign.claim_pass_mint;
    receipt.claim_pass_token_account = Pubkey::default();
    receipt.lineage_state = claim_pass.key();
    receipt.lineage_generation = claim_pass.depth;
    receipt.lineage_proof_hash = claim_pass.lineage_proof_hash;
    receipt.receipt_id_hash = receipt_id_hash;
    receipt.parent_receipt_id_hash = parent_receipt_id_hash;
    receipt.referrer_commitment = referrer_commitment;
    receipt.claimer_nullifier_hash = claimer_nullifier_hash;
    receipt.invite_hash = invite_hash;
    receipt.visit_attestation_hash = visit_attestation_hash;
    receipt.intent_manifest_hash = intent_manifest_hash;
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

    claim_pass.status = ClaimPassStatus::Recorded;
    claim_pass.first_receipt = receipt.key();
    claim_pass.updated_at = now;

    escrow.total_reserved = escrow
        .total_reserved
        .checked_add(campaign.reward_per_verified_visit)
        .ok_or(ViralSyncError::MathOverflow)?;
    escrow.updated_at = now;
    campaign.total_recorded = campaign
        .total_recorded
        .checked_add(1)
        .ok_or(ViralSyncError::MathOverflow)?;
    campaign.updated_at = now;

    emit!(CausalReceiptRecorded {
        causal_receipt: receipt.key(),
        growth_campaign: campaign.key(),
        receipt_id_hash,
        claimer_nullifier_hash,
        intent_manifest_hash,
        reward_amount: receipt.reward_amount,
        terminal_device: ctx.accounts.terminal_device.key(),
        terminal_authority: ctx.accounts.terminal_authority.key(),
        visitor_authority: ctx.accounts.visitor_authority.key(),
        claim_pass: claim_pass.key(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct SettleReceiptReward<'info> {
    #[account(
        mut,
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
        constraint = growth_campaign.status == GrowthCampaignStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub growth_campaign: Box<Account<'info, GrowthCampaign>>,

    #[account(
        address = growth_campaign.merchant_config @ ViralSyncError::InvalidState,
        constraint = merchant_config.status == CausalMerchantStatus::Active @ ViralSyncError::InvalidState,
    )]
    pub merchant_config: Box<Account<'info, CausalMerchantConfig>>,

    #[account(
        mut,
        seeds = [
            RewardEscrow::SEED_PREFIX,
            growth_campaign.key().as_ref(),
            growth_campaign.reward_mint.as_ref(),
        ],
        bump = reward_escrow.bump,
    )]
    pub reward_escrow: Box<Account<'info, RewardEscrow>>,

    #[account(
        mut,
        constraint = reward_vault.key() == reward_escrow.reward_vault @ ViralSyncError::InvalidState,
        constraint = reward_vault.mint == growth_campaign.reward_mint @ ViralSyncError::InvalidConfig,
    )]
    pub reward_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = causal_receipt.campaign == growth_campaign.key() @ ViralSyncError::InvalidState,
        constraint = causal_receipt.status == CausalReceiptStatus::Recorded @ ViralSyncError::SlotAlreadySettled,
        constraint = causal_receipt.intent_manifest_hash != [0u8; 32] @ ViralSyncError::InvalidConfig,
        constraint = causal_receipt.referrer_split_bps == growth_campaign.referrer_split_bps @ ViralSyncError::IntentMismatch,
        constraint = causal_receipt.reward_amount == growth_campaign.reward_per_verified_visit @ ViralSyncError::IntentMismatch,
        constraint = causal_receipt.reward_mint == growth_campaign.reward_mint @ ViralSyncError::IntentMismatch,
    )]
    pub causal_receipt: Box<Account<'info, CausalReceipt>>,

    #[account(
        init,
        payer = merchant_authority,
        space = SettlementRecord::SIZE,
        seeds = [
            SettlementRecord::SEED_PREFIX,
            causal_receipt.key().as_ref(),
        ],
        bump
    )]
    pub settlement_record: Box<Account<'info, SettlementRecord>>,

    #[account(
        mut,
        constraint = referrer_reward_account.mint == growth_campaign.reward_mint @ ViralSyncError::InvalidConfig,
        constraint = referrer_reward_account.owner == causal_receipt.referrer_beneficiary @ ViralSyncError::AccessDenied,
    )]
    pub referrer_reward_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = visitor_reward_account.mint == growth_campaign.reward_mint @ ViralSyncError::InvalidConfig,
        constraint = visitor_reward_account.owner == causal_receipt.visitor_beneficiary @ ViralSyncError::AccessDenied,
    )]
    pub visitor_reward_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: PDA authority for the protocol treasury token account.
    #[account(
        seeds = [
            PROTOCOL_TREASURY_SEED,
            growth_campaign.reward_mint.as_ref(),
        ],
        bump,
    )]
    pub protocol_treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = treasury_reward_account.mint == growth_campaign.reward_mint @ ViralSyncError::InvalidConfig,
        constraint = treasury_reward_account.owner == protocol_treasury.key() @ ViralSyncError::AccessDenied,
    )]
    pub treasury_reward_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        constraint = reward_mint.key() == growth_campaign.reward_mint @ ViralSyncError::InvalidConfig,
    )]
    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn settle_receipt_reward(ctx: Context<SettleReceiptReward>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let campaign = &mut ctx.accounts.growth_campaign;
    let escrow = &mut ctx.accounts.reward_escrow;
    let receipt = &mut ctx.accounts.causal_receipt;
    let settlement = &mut ctx.accounts.settlement_record;

    let protocol_fee = receipt
        .reward_amount
        .checked_mul(PROTOCOL_FEE_BPS)
        .and_then(|value| value.checked_div(10_000))
        .ok_or(ViralSyncError::MathOverflow)?;
    let beneficiary_amount = receipt
        .reward_amount
        .checked_sub(protocol_fee)
        .ok_or(ViralSyncError::MathOverflow)?;

    let referrer_amount = beneficiary_amount
        .checked_mul(campaign.referrer_split_bps as u64)
        .ok_or(ViralSyncError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(ViralSyncError::MathOverflow)?;
    let visitor_amount = beneficiary_amount
        .checked_sub(referrer_amount)
        .ok_or(ViralSyncError::MathOverflow)?;

    let campaign_key = campaign.key();
    let reward_mint_key = campaign.reward_mint;
    let signer_seeds: &[&[&[u8]]] = &[&[
        RewardEscrow::SEED_PREFIX,
        campaign_key.as_ref(),
        reward_mint_key.as_ref(),
        &[escrow.bump],
    ]];

    let referrer_transfer_accounts = TransferChecked {
        from: ctx.accounts.reward_vault.to_account_info(),
        mint: ctx.accounts.reward_mint.to_account_info(),
        to: ctx.accounts.referrer_reward_account.to_account_info(),
        authority: escrow.to_account_info(),
    };
    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            referrer_transfer_accounts,
            signer_seeds,
        ),
        referrer_amount,
        ctx.accounts.reward_mint.decimals,
    )?;

    let visitor_transfer_accounts = TransferChecked {
        from: ctx.accounts.reward_vault.to_account_info(),
        mint: ctx.accounts.reward_mint.to_account_info(),
        to: ctx.accounts.visitor_reward_account.to_account_info(),
        authority: escrow.to_account_info(),
    };
    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            visitor_transfer_accounts,
            signer_seeds,
        ),
        visitor_amount,
        ctx.accounts.reward_mint.decimals,
    )?;

    if protocol_fee > 0 {
        let treasury_transfer_accounts = TransferChecked {
            from: ctx.accounts.reward_vault.to_account_info(),
            mint: ctx.accounts.reward_mint.to_account_info(),
            to: ctx.accounts.treasury_reward_account.to_account_info(),
            authority: escrow.to_account_info(),
        };
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                treasury_transfer_accounts,
                signer_seeds,
            ),
            protocol_fee,
            ctx.accounts.reward_mint.decimals,
        )?;
    }

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
    settlement.protocol_fee = protocol_fee;
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
pub struct SetCausalMerchantStatus<'info> {
    #[account(
        mut,
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
    )]
    pub merchant_config: Account<'info, CausalMerchantConfig>,

    pub merchant_authority: Signer<'info>,
}

pub fn set_causal_merchant_status(
    ctx: Context<SetCausalMerchantStatus>,
    status: CausalMerchantStatus,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &mut ctx.accounts.merchant_config;

    config.status = status;
    config.updated_at = now;

    emit!(CausalMerchantStatusUpdated {
        merchant_config: config.key(),
        merchant_authority: ctx.accounts.merchant_authority.key(),
        status,
        updated_at: now,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct SetGrowthCampaignStatus<'info> {
    #[account(
        mut,
        has_one = merchant_authority @ ViralSyncError::AccessDenied,
        constraint = growth_campaign.status != GrowthCampaignStatus::Closed @ ViralSyncError::InvalidState,
    )]
    pub growth_campaign: Account<'info, GrowthCampaign>,

    pub merchant_authority: Signer<'info>,
}

pub fn set_growth_campaign_status(
    ctx: Context<SetGrowthCampaignStatus>,
    status: GrowthCampaignStatus,
) -> Result<()> {
    require!(status != GrowthCampaignStatus::Closed, ViralSyncError::InvalidState);

    let now = Clock::get()?.unix_timestamp;
    let campaign = &mut ctx.accounts.growth_campaign;

    campaign.status = status;
    campaign.updated_at = now;

    emit!(GrowthCampaignStatusUpdated {
        growth_campaign: campaign.key(),
        merchant_authority: ctx.accounts.merchant_authority.key(),
        status,
        updated_at: now,
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
    pub merchant_config: Box<Account<'info, CausalMerchantConfig>>,

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
    pub growth_campaign: Box<Account<'info, GrowthCampaign>>,

    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,

    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn create_growth_campaign(
    ctx: Context<CreateGrowthCampaign>,
    campaign_id_hash: [u8; 32],
    reward_per_verified_visit: u64,
    max_redemptions: u32,
    max_depth: u8,
    referrer_split_bps: u16,
    split_rules_hash: [u8; 32],
    fraud_policy_hash: [u8; 32],
    starts_at: i64,
    expires_at: i64,
) -> Result<()> {
    require!(campaign_id_hash != [0; 32], ViralSyncError::InvalidConfig);
    require!(reward_per_verified_visit > 0, ViralSyncError::InvalidConfig);
    require!(max_redemptions > 0, ViralSyncError::InvalidConfig);
    require!(max_depth > 0, ViralSyncError::InvalidConfig);
    require!(referrer_split_bps <= 10_000, ViralSyncError::InvalidConfig);
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
    campaign.claim_pass_mint = ctx.accounts.reward_mint.key();
    campaign.lineage_required = true;
    campaign.reward_per_verified_visit = reward_per_verified_visit;
    campaign.max_redemptions = max_redemptions;
    campaign.max_depth = max_depth;
    campaign.referrer_split_bps = referrer_split_bps;
    campaign.split_rules_hash = split_rules_hash;
    campaign.fraud_policy_hash = fraud_policy_hash;
    campaign.starts_at = starts_at;
    campaign.expires_at = expires_at;
    campaign.total_funded = 0;
    campaign.total_settled = 0;
    campaign.total_recorded = 0;
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
