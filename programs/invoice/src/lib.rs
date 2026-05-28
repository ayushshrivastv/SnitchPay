use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("8NNrnYjuajHC2jRLAaw5PYeahqRsDrRSzsZNXkTD8LES");

const MAX_ID_LEN: usize = 64;
const MAX_MEMO_LEN: usize = 280;

#[program]
pub mod invoice {
    use super::*;

    pub fn create_invoice(
        ctx: Context<CreateInvoice>,
        invoice_id: String,
        amount: u64,
        recipient: Pubkey,
        due_date: i64,
        memo: String,
        mint: Pubkey,
    ) -> Result<()> {
        require!(amount > 0, InvoiceError::InvalidAmount);
        require!(invoice_id.len() <= MAX_ID_LEN, InvoiceError::IdTooLong);
        require!(memo.len() <= MAX_MEMO_LEN, InvoiceError::MemoTooLong);

        let invoice = &mut ctx.accounts.invoice;
        invoice.creator = ctx.accounts.creator.key();
        invoice.recipient = recipient;
        invoice.mint = mint;
        invoice.amount = amount;
        invoice.due_date = due_date;
        invoice.invoice_id = invoice_id;
        invoice.memo = memo;
        invoice.status = InvoiceStatus::Open;
        invoice.created_at = Clock::get()?.unix_timestamp;
        invoice.paid_at = 0;
        invoice.paid_by = Pubkey::default();
        invoice.bump = ctx.bumps.invoice;

        Ok(())
    }

    pub fn pay_invoice(ctx: Context<PayInvoice>) -> Result<()> {
        let invoice = &mut ctx.accounts.invoice;
        require!(invoice.status == InvoiceStatus::Open, InvoiceError::InvoiceNotOpen);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_token.to_account_info(),
                    to: ctx.accounts.recipient_token.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            invoice.amount,
        )?;

        invoice.status = InvoiceStatus::Paid;
        invoice.paid_by = ctx.accounts.payer.key();
        invoice.paid_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn cancel_invoice(ctx: Context<CancelInvoice>) -> Result<()> {
        let invoice = &mut ctx.accounts.invoice;
        require!(invoice.status == InvoiceStatus::Open, InvoiceError::InvoiceNotOpen);
        invoice.status = InvoiceStatus::Cancelled;
        Ok(())
    }

    pub fn mark_invoice_paid(ctx: Context<MarkInvoicePaid>) -> Result<()> {
        let invoice = &mut ctx.accounts.invoice;
        require!(invoice.status == InvoiceStatus::Open, InvoiceError::InvoiceNotOpen);
        invoice.status = InvoiceStatus::Paid;
        invoice.paid_by = ctx.accounts.authority.key();
        invoice.paid_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(invoice_id: String)]
pub struct CreateInvoice<'info> {
    #[account(
        init,
        payer = creator,
        space = Invoice::LEN,
        seeds = [b"invoice", invoice_id.as_bytes()],
        bump
    )]
    pub invoice: Account<'info, Invoice>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PayInvoice<'info> {
    #[account(
        mut,
        seeds = [b"invoice", invoice.invoice_id.as_bytes()],
        bump = invoice.bump
    )]
    pub invoice: Account<'info, Invoice>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        constraint = payer_token.owner == payer.key() @ InvoiceError::InvalidTokenOwner,
        constraint = payer_token.mint == invoice.mint @ InvoiceError::InvalidMint
    )]
    pub payer_token: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = recipient_token.owner == invoice.recipient @ InvoiceError::InvalidRecipient,
        constraint = recipient_token.mint == invoice.mint @ InvoiceError::InvalidMint
    )]
    pub recipient_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelInvoice<'info> {
    #[account(
        mut,
        seeds = [b"invoice", invoice.invoice_id.as_bytes()],
        bump = invoice.bump,
        has_one = creator @ InvoiceError::Unauthorized
    )]
    pub invoice: Account<'info, Invoice>,
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct MarkInvoicePaid<'info> {
    #[account(
        mut,
        seeds = [b"invoice", invoice.invoice_id.as_bytes()],
        bump = invoice.bump,
        has_one = creator @ InvoiceError::Unauthorized
    )]
    pub invoice: Account<'info, Invoice>,
    pub creator: SystemAccount<'info>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Invoice {
    pub creator: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub paid_by: Pubkey,
    pub amount: u64,
    pub due_date: i64,
    pub invoice_id: String,
    pub memo: String,
    pub status: InvoiceStatus,
    pub created_at: i64,
    pub paid_at: i64,
    pub bump: u8,
}

impl Invoice {
    pub const LEN: usize = 8
        + 32
        + 32
        + 32
        + 32
        + 8
        + 8
        + 4
        + MAX_ID_LEN
        + 4
        + MAX_MEMO_LEN
        + 1
        + 8
        + 8
        + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum InvoiceStatus {
    Open,
    Paid,
    Cancelled,
}

#[error_code]
pub enum InvoiceError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Invoice id is too long")]
    IdTooLong,
    #[msg("Memo is too long")]
    MemoTooLong,
    #[msg("Invoice is not open")]
    InvoiceNotOpen,
    #[msg("Token account mint does not match invoice mint")]
    InvalidMint,
    #[msg("Token account owner is not authorized")]
    InvalidTokenOwner,
    #[msg("Recipient token account does not belong to invoice recipient")]
    InvalidRecipient,
    #[msg("Only the invoice creator can perform this action")]
    Unauthorized,
}
