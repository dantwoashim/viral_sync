use anchor_lang::prelude::*;
use crate::state::token_generation::GenSource;

#[event]
pub struct DexTransferDetected {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RedemptionDetected {
    pub redeemer: Pubkey,
    pub amount: u64,
    pub gen2_consumed: u64,
    pub slot: u64,
}

#[event]
pub struct TransferExecuted {
    pub from: Pubkey,
    pub to: Pubkey,
    pub effective_referrer: Pubkey,
    pub amount: u64,
    pub entry_type: GenSource,
    pub slot: u64,
}

#[event]
pub struct InboundBufferOverflow {
    pub recipient: Pubkey,
    pub amount: u64,
    pub sender: Pubkey,
}

#[event]
pub struct CommissionPaid {
    pub recipient: Pubkey,
    pub amount: u64,
    pub mint: Pubkey,
}
