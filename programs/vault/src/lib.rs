use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("72rGhJDuuNk9ggmmRRpY3gvTSyBngWu9jCAdnpHh9fv9");

const MAX_NAME_LEN: usize = 64;

#[program]
pub mod vault {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>, name: String) -> Result<()> {
        require!(!name.trim().is_empty(), VaultError::InvalidName);
        require!(name.len() <= MAX_NAME_LEN, VaultError::NameTooLong);

        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.mint = ctx.accounts.mint.key();
        vault.vault_token = ctx.accounts.vault_token.key();
        vault.name = name;
        vault.total_deposited = 0;
        vault.total_withdrawn = 0;
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.paused = false;
        vault.bump = ctx.bumps.vault;
        vault.vault_authority_bump = ctx.bumps.vault_authority;

        let owner_member = &mut ctx.accounts.owner_member;
        owner_member.vault = vault.key();
        owner_member.user = ctx.accounts.owner.key();
        owner_member.role = VaultRole::Owner;
        owner_member.bump = ctx.bumps.owner_member;

        Ok(())
    }

    pub fn add_member(ctx: Context<AddMember>, user: Pubkey, role: VaultRole) -> Result<()> {
        require!(
            can_manage_members(&ctx.accounts.authority_member.role),
            VaultError::Unauthorized
        );
        require!(role != VaultRole::Owner, VaultError::InvalidRole);

        let member = &mut ctx.accounts.member;
        member.vault = ctx.accounts.vault.key();
        member.user = user;
        member.role = role;
        member.bump = ctx.bumps.member;

        Ok(())
    }

    pub fn update_member_role(ctx: Context<UpdateMemberRole>, role: VaultRole) -> Result<()> {
        require!(
            can_manage_members(&ctx.accounts.authority_member.role),
            VaultError::Unauthorized
        );
        require!(role != VaultRole::Owner, VaultError::InvalidRole);
        require!(
            ctx.accounts.member.role != VaultRole::Owner,
            VaultError::CannotChangeOwner
        );

        ctx.accounts.member.role = role;
        Ok(())
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        ctx.accounts.vault.paused = paused;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);
        require!(!ctx.accounts.vault.paused, VaultError::VaultPaused);
        require!(
            can_deposit(&ctx.accounts.member.role),
            VaultError::Unauthorized
        );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.depositor_token.to_account_info(),
                    to: ctx.accounts.vault_token.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            amount,
        )?;

        let vault = &mut ctx.accounts.vault;
        vault.total_deposited = vault
            .total_deposited
            .checked_add(amount)
            .ok_or(VaultError::AmountOverflow)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);
        require!(!ctx.accounts.vault.paused, VaultError::VaultPaused);
        require!(
            can_withdraw(&ctx.accounts.authority_member.role),
            VaultError::Unauthorized
        );

        let vault_key = ctx.accounts.vault.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault_authority",
            vault_key.as_ref(),
            &[ctx.accounts.vault.vault_authority_bump],
        ]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token.to_account_info(),
                    to: ctx.accounts.recipient_token.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        let vault = &mut ctx.accounts.vault;
        vault.total_withdrawn = vault
            .total_withdrawn
            .checked_add(amount)
            .ok_or(VaultError::AmountOverflow)?;

        Ok(())
    }
}

fn can_manage_members(role: &VaultRole) -> bool {
    matches!(role, VaultRole::Owner | VaultRole::Admin)
}

fn can_deposit(role: &VaultRole) -> bool {
    matches!(role, VaultRole::Owner | VaultRole::Admin | VaultRole::Member)
}

fn can_withdraw(role: &VaultRole) -> bool {
    matches!(role, VaultRole::Owner | VaultRole::Admin)
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = owner,
        space = Vault::LEN,
        seeds = [b"vault", owner.key().as_ref(), mint.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    /// CHECK: PDA-only token authority. Seeds are verified by Anchor.
    #[account(
        seeds = [b"vault_authority", vault.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = owner,
        token::mint = mint,
        token::authority = vault_authority,
        seeds = [b"vault_token", vault.key().as_ref()],
        bump
    )]
    pub vault_token: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = owner,
        space = VaultMember::LEN,
        seeds = [b"vault_member", vault.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub owner_member: Account<'info, VaultMember>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(user: Pubkey, role: VaultRole)]
pub struct AddMember<'info> {
    #[account(
        seeds = [b"vault", vault.owner.as_ref(), vault.mint.as_ref(), vault.name.as_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        seeds = [b"vault_member", vault.key().as_ref(), authority.key().as_ref()],
        bump = authority_member.bump,
        constraint = authority_member.vault == vault.key() @ VaultError::Unauthorized,
        constraint = authority_member.user == authority.key() @ VaultError::Unauthorized
    )]
    pub authority_member: Account<'info, VaultMember>,
    #[account(
        init,
        payer = authority,
        space = VaultMember::LEN,
        seeds = [b"vault_member", vault.key().as_ref(), user.as_ref()],
        bump
    )]
    pub member: Account<'info, VaultMember>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMemberRole<'info> {
    #[account(
        seeds = [b"vault", vault.owner.as_ref(), vault.mint.as_ref(), vault.name.as_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        seeds = [b"vault_member", vault.key().as_ref(), authority.key().as_ref()],
        bump = authority_member.bump,
        constraint = authority_member.vault == vault.key() @ VaultError::Unauthorized,
        constraint = authority_member.user == authority.key() @ VaultError::Unauthorized
    )]
    pub authority_member: Account<'info, VaultMember>,
    #[account(
        mut,
        constraint = member.vault == vault.key() @ VaultError::Unauthorized
    )]
    pub member: Account<'info, VaultMember>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref(), vault.mint.as_ref(), vault.name.as_bytes()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized
    )]
    pub vault: Account<'info, Vault>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref(), vault.mint.as_ref(), vault.name.as_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        seeds = [b"vault_member", vault.key().as_ref(), depositor.key().as_ref()],
        bump = member.bump,
        constraint = member.vault == vault.key() @ VaultError::Unauthorized,
        constraint = member.user == depositor.key() @ VaultError::Unauthorized
    )]
    pub member: Account<'info, VaultMember>,
    pub depositor: Signer<'info>,
    #[account(
        mut,
        constraint = depositor_token.owner == depositor.key() @ VaultError::InvalidTokenOwner,
        constraint = depositor_token.mint == vault.mint @ VaultError::InvalidMint
    )]
    pub depositor_token: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token.key() == vault.vault_token @ VaultError::InvalidVaultToken,
        constraint = vault_token.mint == vault.mint @ VaultError::InvalidMint,
        constraint = vault_token.owner == vault_authority.key() @ VaultError::InvalidVaultAuthority
    )]
    pub vault_token: Account<'info, TokenAccount>,
    /// CHECK: PDA-only token authority. Seeds are verified by Anchor.
    #[account(
        seeds = [b"vault_authority", vault.key().as_ref()],
        bump = vault.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref(), vault.mint.as_ref(), vault.name.as_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        seeds = [b"vault_member", vault.key().as_ref(), authority.key().as_ref()],
        bump = authority_member.bump,
        constraint = authority_member.vault == vault.key() @ VaultError::Unauthorized,
        constraint = authority_member.user == authority.key() @ VaultError::Unauthorized
    )]
    pub authority_member: Account<'info, VaultMember>,
    pub authority: Signer<'info>,
    #[account(
        mut,
        constraint = vault_token.key() == vault.vault_token @ VaultError::InvalidVaultToken,
        constraint = vault_token.mint == vault.mint @ VaultError::InvalidMint,
        constraint = vault_token.owner == vault_authority.key() @ VaultError::InvalidVaultAuthority
    )]
    pub vault_token: Account<'info, TokenAccount>,
    /// CHECK: PDA-only token authority. Seeds are verified by Anchor.
    #[account(
        seeds = [b"vault_authority", vault.key().as_ref()],
        bump = vault.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = recipient_token.mint == vault.mint @ VaultError::InvalidMint
    )]
    pub recipient_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub vault_token: Pubkey,
    pub name: String,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub created_at: i64,
    pub paused: bool,
    pub bump: u8,
    pub vault_authority_bump: u8,
}

impl Vault {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 4 + MAX_NAME_LEN + 8 + 8 + 8 + 1 + 1 + 1;
}

#[account]
pub struct VaultMember {
    pub vault: Pubkey,
    pub user: Pubkey,
    pub role: VaultRole,
    pub bump: u8,
}

impl VaultMember {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VaultRole {
    Owner,
    Admin,
    Member,
    Viewer,
}

#[error_code]
pub enum VaultError {
    #[msg("Vault name cannot be empty")]
    InvalidName,
    #[msg("Vault name is too long")]
    NameTooLong,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Amount overflow")]
    AmountOverflow,
    #[msg("Vault is paused")]
    VaultPaused,
    #[msg("Invalid role assignment")]
    InvalidRole,
    #[msg("Owner role cannot be changed")]
    CannotChangeOwner,
    #[msg("Caller is not authorized for this vault")]
    Unauthorized,
    #[msg("Token account owner is invalid")]
    InvalidTokenOwner,
    #[msg("Token mint does not match vault mint")]
    InvalidMint,
    #[msg("Vault token account is invalid")]
    InvalidVaultToken,
    #[msg("Vault token authority is invalid")]
    InvalidVaultAuthority,
}
