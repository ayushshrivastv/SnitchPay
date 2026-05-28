use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("57aDA46BSyuGSfoW1DZLyTDTk46KatGsktGKTNzVCQ9y");

const MAX_MEMO_LEN: usize = 280;
const MAX_REFERENCE_LEN: usize = 64;
const MAX_BATCH_RECIPIENTS: usize = 16;

#[program]
pub mod payout {
    use super::*;

    pub fn send_payout(
        ctx: Context<SendPayout>,
        amount: u64,
        memo: String,
        reference_id: String,
    ) -> Result<()> {
        require!(amount > 0, PayoutError::InvalidAmount);
        require!(memo.len() <= MAX_MEMO_LEN, PayoutError::MemoTooLong);
        require!(reference_id.len() <= MAX_REFERENCE_LEN, PayoutError::ReferenceTooLong);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.authority_token.to_account_info(),
                    to: ctx.accounts.recipient_token.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        let record = &mut ctx.accounts.payout_record;
        record.authority = ctx.accounts.authority.key();
        record.mint = ctx.accounts.mint.key();
        record.recipient = ctx.accounts.recipient_token.owner;
        record.total_amount = amount;
        record.recipient_count = 1;
        record.memo = memo;
        record.reference_id = reference_id;
        record.status = PayoutStatus::Completed;
        record.created_at = Clock::get()?.unix_timestamp;
        record.completed_at = record.created_at;
        record.bump = ctx.bumps.payout_record;

        Ok(())
    }

    pub fn send_batch_payout<'info>(
        ctx: Context<'_, '_, '_, 'info, SendBatchPayout<'info>>,
        recipients: Vec<BatchRecipient>,
        memo: String,
        reference_id: String,
    ) -> Result<()> {
        require!(!recipients.is_empty(), PayoutError::EmptyBatch);
        require!(
            recipients.len() <= MAX_BATCH_RECIPIENTS,
            PayoutError::BatchTooLarge
        );
        require!(
            recipients.len() == ctx.remaining_accounts.len(),
            PayoutError::InvalidRemainingAccounts
        );
        require!(memo.len() <= MAX_MEMO_LEN, PayoutError::MemoTooLong);
        require!(reference_id.len() <= MAX_REFERENCE_LEN, PayoutError::ReferenceTooLong);

        let mut total_amount = 0_u64;

        for (recipient, account_info) in recipients.iter().zip(ctx.remaining_accounts.iter()) {
            require!(recipient.amount > 0, PayoutError::InvalidAmount);

            let destination =
                TokenAccount::try_deserialize(&mut &account_info.data.borrow()[..])?;
            require!(
                destination.owner == recipient.recipient,
                PayoutError::InvalidRecipient
            );
            require!(
                destination.mint == ctx.accounts.mint.key(),
                PayoutError::InvalidMint
            );

            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.authority_token.to_account_info(),
                        to: account_info.clone(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                recipient.amount,
            )?;

            total_amount = total_amount
                .checked_add(recipient.amount)
                .ok_or(PayoutError::AmountOverflow)?;
        }

        let record = &mut ctx.accounts.payout_record;
        record.authority = ctx.accounts.authority.key();
        record.mint = ctx.accounts.mint.key();
        record.recipient = Pubkey::default();
        record.total_amount = total_amount;
        record.recipient_count = recipients.len() as u16;
        record.memo = memo;
        record.reference_id = reference_id;
        record.status = PayoutStatus::Completed;
        record.created_at = Clock::get()?.unix_timestamp;
        record.completed_at = record.created_at;
        record.bump = ctx.bumps.payout_record;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(amount: u64, memo: String, reference_id: String)]
pub struct SendPayout<'info> {
    #[account(
        init,
        payer = authority,
        space = PayoutRecord::LEN,
        seeds = [b"payout", authority.key().as_ref(), reference_id.as_bytes()],
        bump
    )]
    pub payout_record: Account<'info, PayoutRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        constraint = authority_token.owner == authority.key() @ PayoutError::Unauthorized,
        constraint = authority_token.mint == mint.key() @ PayoutError::InvalidMint
    )]
    pub authority_token: Account<'info, TokenAccount>,
    /// CHECK: The mint is verified against SPL token accounts.
    pub mint: AccountInfo<'info>,
    #[account(
        mut,
        constraint = recipient_token.mint == mint.key() @ PayoutError::InvalidMint
    )]
    pub recipient_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(recipients: Vec<BatchRecipient>, memo: String, reference_id: String)]
pub struct SendBatchPayout<'info> {
    #[account(
        init,
        payer = authority,
        space = PayoutRecord::LEN,
        seeds = [b"payout", authority.key().as_ref(), reference_id.as_bytes()],
        bump
    )]
    pub payout_record: Account<'info, PayoutRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        constraint = authority_token.owner == authority.key() @ PayoutError::Unauthorized,
        constraint = authority_token.mint == mint.key() @ PayoutError::InvalidMint
    )]
    pub authority_token: Account<'info, TokenAccount>,
    /// CHECK: The mint is verified against SPL token accounts.
    pub mint: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct PayoutRecord {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub recipient: Pubkey,
    pub total_amount: u64,
    pub recipient_count: u16,
    pub memo: String,
    pub reference_id: String,
    pub status: PayoutStatus,
    pub created_at: i64,
    pub completed_at: i64,
    pub bump: u8,
}

impl PayoutRecord {
    pub const LEN: usize = 8
        + 32
        + 32
        + 32
        + 8
        + 2
        + 4
        + MAX_MEMO_LEN
        + 4
        + MAX_REFERENCE_LEN
        + 1
        + 8
        + 8
        + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BatchRecipient {
    pub recipient: Pubkey,
    pub amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PayoutStatus {
    Pending,
    Completed,
    Failed,
}

#[error_code]
pub enum PayoutError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Memo is too long")]
    MemoTooLong,
    #[msg("Reference id is too long")]
    ReferenceTooLong,
    #[msg("Batch must contain at least one recipient")]
    EmptyBatch,
    #[msg("Batch contains too many recipients")]
    BatchTooLarge,
    #[msg("Batch recipient accounts do not match recipient inputs")]
    InvalidRemainingAccounts,
    #[msg("Amount overflow")]
    AmountOverflow,
    #[msg("Token account mint does not match payout mint")]
    InvalidMint,
    #[msg("Recipient token account does not belong to expected recipient")]
    InvalidRecipient,
    #[msg("Payout authority is not authorized")]
    Unauthorized,
}
