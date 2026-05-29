use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("HK6ZtxWZSPjHFZWuJuvLZfKCJDB7ZEPWQe1GpMn8CVSG");

const MAX_NAME_LEN: usize = 64;

#[program]
pub mod shared_wallet {
    use super::*;

    pub fn create_organization(ctx: Context<CreateOrganization>, name: String) -> Result<()> {
        require!(name.len() <= MAX_NAME_LEN, SharedWalletError::NameTooLong);

        let organization = &mut ctx.accounts.organization;
        organization.owner = ctx.accounts.owner.key();
        organization.name = name;
        organization.created_at = Clock::get()?.unix_timestamp;
        organization.bump = ctx.bumps.organization;

        let member = &mut ctx.accounts.owner_member;
        member.organization = organization.key();
        member.user = ctx.accounts.owner.key();
        member.role = Role::Owner;
        member.bump = ctx.bumps.owner_member;

        Ok(())
    }

    pub fn add_member(ctx: Context<AddMember>, user: Pubkey, role: Role) -> Result<()> {
        require!(
            can_manage_members(&ctx.accounts.authority_member.role),
            SharedWalletError::Unauthorized
        );
        require!(role != Role::Owner, SharedWalletError::InvalidRole);

        let member = &mut ctx.accounts.member;
        member.organization = ctx.accounts.organization.key();
        member.user = user;
        member.role = role;
        member.bump = ctx.bumps.member;

        Ok(())
    }

    pub fn update_member_role(ctx: Context<UpdateMemberRole>, role: Role) -> Result<()> {
        require!(
            can_manage_members(&ctx.accounts.authority_member.role),
            SharedWalletError::Unauthorized
        );
        require!(role != Role::Owner, SharedWalletError::InvalidRole);
        require!(
            ctx.accounts.member.role != Role::Owner,
            SharedWalletError::CannotChangeOwner
        );

        ctx.accounts.member.role = role;
        Ok(())
    }

    pub fn transfer_usdc(ctx: Context<TransferUsdc>, amount: u64) -> Result<()> {
        require!(amount > 0, SharedWalletError::InvalidAmount);
        require!(
            can_move_funds(&ctx.accounts.authority_member.role),
            SharedWalletError::Unauthorized
        );

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"organization",
            ctx.accounts.organization.owner.as_ref(),
            ctx.accounts.organization.name.as_bytes(),
            &[ctx.accounts.organization.bump],
        ]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.organization_vault.to_account_info(),
                    to: ctx.accounts.recipient_token.to_account_info(),
                    authority: ctx.accounts.organization.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        Ok(())
    }
}

fn can_manage_members(role: &Role) -> bool {
    matches!(role, Role::Owner | Role::Admin)
}

fn can_move_funds(role: &Role) -> bool {
    matches!(role, Role::Owner | Role::Admin)
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateOrganization<'info> {
    #[account(
        init,
        payer = owner,
        space = Organization::LEN,
        seeds = [b"organization", owner.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub organization: Account<'info, Organization>,
    #[account(
        init,
        payer = owner,
        space = Member::LEN,
        seeds = [b"member", organization.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub owner_member: Account<'info, Member>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey, role: Role)]
pub struct AddMember<'info> {
    pub organization: Account<'info, Organization>,
    #[account(
        seeds = [b"member", organization.key().as_ref(), authority.key().as_ref()],
        bump = authority_member.bump,
        constraint = authority_member.organization == organization.key() @ SharedWalletError::Unauthorized,
        constraint = authority_member.user == authority.key() @ SharedWalletError::Unauthorized
    )]
    pub authority_member: Account<'info, Member>,
    #[account(
        init,
        payer = authority,
        space = Member::LEN,
        seeds = [b"member", organization.key().as_ref(), user.as_ref()],
        bump
    )]
    pub member: Account<'info, Member>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMemberRole<'info> {
    pub organization: Account<'info, Organization>,
    #[account(
        seeds = [b"member", organization.key().as_ref(), authority.key().as_ref()],
        bump = authority_member.bump,
        constraint = authority_member.organization == organization.key() @ SharedWalletError::Unauthorized,
        constraint = authority_member.user == authority.key() @ SharedWalletError::Unauthorized
    )]
    pub authority_member: Account<'info, Member>,
    #[account(
        mut,
        constraint = member.organization == organization.key() @ SharedWalletError::Unauthorized
    )]
    pub member: Account<'info, Member>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferUsdc<'info> {
    pub organization: Account<'info, Organization>,
    #[account(
        seeds = [b"member", organization.key().as_ref(), authority.key().as_ref()],
        bump = authority_member.bump,
        constraint = authority_member.organization == organization.key() @ SharedWalletError::Unauthorized,
        constraint = authority_member.user == authority.key() @ SharedWalletError::Unauthorized
    )]
    pub authority_member: Account<'info, Member>,
    pub authority: Signer<'info>,
    #[account(
        mut,
        constraint = organization_vault.owner == organization.key() @ SharedWalletError::InvalidVault
    )]
    pub organization_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = recipient_token.mint == organization_vault.mint @ SharedWalletError::InvalidMint
    )]
    pub recipient_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Organization {
    pub owner: Pubkey,
    pub name: String,
    pub created_at: i64,
    pub bump: u8,
}

impl Organization {
    pub const LEN: usize = 8 + 32 + 4 + MAX_NAME_LEN + 8 + 1;
}

#[account]
pub struct Member {
    pub organization: Pubkey,
    pub user: Pubkey,
    pub role: Role,
    pub bump: u8,
}

impl Member {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Role {
    Owner,
    Admin,
    Member,
}

#[error_code]
pub enum SharedWalletError {
    #[msg("Organization name is too long")]
    NameTooLong,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Invalid role assignment")]
    InvalidRole,
    #[msg("Owner role cannot be changed")]
    CannotChangeOwner,
    #[msg("Caller is not authorized for this organization")]
    Unauthorized,
    #[msg("Organization vault is invalid")]
    InvalidVault,
    #[msg("Recipient mint does not match vault mint")]
    InvalidMint,
}
