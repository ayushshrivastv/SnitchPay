import { Idl } from "@coral-xyz/anchor";
import {
  INVOICE_PROGRAM_ID,
  PAYOUT_PROGRAM_ID,
  SHARED_WALLET_PROGRAM_ID,
  VAULT_PROGRAM_ID,
} from "./solana";

export const invoiceIdl = {
  address: INVOICE_PROGRAM_ID.toBase58(),
  metadata: { name: "invoice", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "create_invoice",
      discriminator: [154, 170, 31, 135, 134, 100, 156, 146],
      accounts: [
        { name: "invoice", writable: true },
        { name: "creator", writable: true, signer: true },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "invoice_id", type: "string" },
        { name: "amount", type: "u64" },
        { name: "recipient", type: "pubkey" },
        { name: "due_date", type: "i64" },
        { name: "memo", type: "string" },
        { name: "mint", type: "pubkey" },
      ],
    },
    {
      name: "pay_invoice",
      discriminator: [104, 6, 62, 239, 197, 206, 208, 220],
      accounts: [
        { name: "invoice", writable: true },
        { name: "payer", writable: true, signer: true },
        { name: "payer_token", writable: true },
        { name: "recipient_token", writable: true },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      ],
      args: [],
    },
    {
      name: "cancel_invoice",
      discriminator: [88, 158, 54, 49, 53, 26, 92, 68],
      accounts: [
        { name: "invoice", writable: true },
        { name: "creator", signer: true },
      ],
      args: [],
    },
    {
      name: "mark_invoice_paid",
      discriminator: [22, 190, 62, 17, 82, 172, 89, 243],
      accounts: [
        { name: "invoice", writable: true },
        { name: "creator" },
        { name: "authority", signer: true },
      ],
      args: [],
    },
  ],
  accounts: [{ name: "Invoice", discriminator: [51, 194, 250, 114, 6, 104, 18, 164] }],
  types: [
    {
      name: "Invoice",
      type: {
        kind: "struct",
        fields: [
          { name: "creator", type: "pubkey" },
          { name: "recipient", type: "pubkey" },
          { name: "mint", type: "pubkey" },
          { name: "paid_by", type: "pubkey" },
          { name: "amount", type: "u64" },
          { name: "due_date", type: "i64" },
          { name: "invoice_id", type: "string" },
          { name: "memo", type: "string" },
          { name: "status", type: { defined: { name: "InvoiceStatus" } } },
          { name: "created_at", type: "i64" },
          { name: "paid_at", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "InvoiceStatus",
      type: {
        kind: "enum",
        variants: [{ name: "Open" }, { name: "Paid" }, { name: "Cancelled" }],
      },
    },
  ],
} satisfies Idl;

export const payoutIdl = {
  address: PAYOUT_PROGRAM_ID.toBase58(),
  metadata: { name: "payout", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "send_payout",
      discriminator: [113, 130, 45, 158, 96, 145, 152, 235],
      accounts: [
        { name: "payout_record", writable: true },
        { name: "authority", writable: true, signer: true },
        { name: "authority_token", writable: true },
        { name: "mint" },
        { name: "recipient_token", writable: true },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "memo", type: "string" },
        { name: "reference_id", type: "string" },
      ],
    },
    {
      name: "send_batch_payout",
      discriminator: [169, 186, 115, 181, 176, 204, 32, 67],
      accounts: [
        { name: "payout_record", writable: true },
        { name: "authority", writable: true, signer: true },
        { name: "authority_token", writable: true },
        { name: "mint" },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        {
          name: "recipients",
          type: { vec: { defined: { name: "BatchRecipient" } } },
        },
        { name: "memo", type: "string" },
        { name: "reference_id", type: "string" },
      ],
    },
  ],
  accounts: [
    { name: "PayoutRecord", discriminator: [7, 79, 243, 33, 243, 68, 106, 123] },
  ],
  types: [
    {
      name: "PayoutRecord",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "pubkey" },
          { name: "mint", type: "pubkey" },
          { name: "recipient", type: "pubkey" },
          { name: "total_amount", type: "u64" },
          { name: "recipient_count", type: "u16" },
          { name: "memo", type: "string" },
          { name: "reference_id", type: "string" },
          { name: "status", type: { defined: { name: "PayoutStatus" } } },
          { name: "created_at", type: "i64" },
          { name: "completed_at", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "BatchRecipient",
      type: {
        kind: "struct",
        fields: [
          { name: "recipient", type: "pubkey" },
          { name: "amount", type: "u64" },
        ],
      },
    },
    {
      name: "PayoutStatus",
      type: {
        kind: "enum",
        variants: [{ name: "Pending" }, { name: "Completed" }, { name: "Failed" }],
      },
    },
  ],
} satisfies Idl;

export const sharedWalletIdl = {
  address: SHARED_WALLET_PROGRAM_ID.toBase58(),
  metadata: { name: "shared_wallet", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "create_organization",
      discriminator: [60, 173, 177, 39, 122, 23, 68, 185],
      accounts: [
        { name: "organization", writable: true },
        { name: "owner_member", writable: true },
        { name: "owner", writable: true, signer: true },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [{ name: "name", type: "string" }],
    },
    {
      name: "add_member",
      discriminator: [13, 116, 123, 130, 126, 198, 57, 34],
      accounts: [
        { name: "organization" },
        { name: "authority_member" },
        { name: "member", writable: true },
        { name: "authority", writable: true, signer: true },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "user", type: "pubkey" },
        { name: "role", type: { defined: { name: "Role" } } },
      ],
    },
    {
      name: "update_member_role",
      discriminator: [252, 36, 202, 222, 22, 168, 39, 69],
      accounts: [
        { name: "organization" },
        { name: "authority_member" },
        { name: "member", writable: true },
        { name: "authority", signer: true },
      ],
      args: [{ name: "role", type: { defined: { name: "Role" } } }],
    },
    {
      name: "transfer_usdc",
      discriminator: [164, 158, 120, 183, 64, 98, 244, 11],
      accounts: [
        { name: "organization" },
        { name: "authority_member" },
        { name: "authority", signer: true },
        { name: "organization_vault", writable: true },
        { name: "recipient_token", writable: true },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
  ],
  accounts: [
    { name: "Organization", discriminator: [145, 38, 152, 251, 91, 57, 118, 160] },
    { name: "Member", discriminator: [54, 19, 162, 21, 29, 166, 17, 198] },
  ],
  types: [
    {
      name: "Organization",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "pubkey" },
          { name: "name", type: "string" },
          { name: "created_at", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Member",
      type: {
        kind: "struct",
        fields: [
          { name: "organization", type: "pubkey" },
          { name: "user", type: "pubkey" },
          { name: "role", type: { defined: { name: "Role" } } },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Role",
      type: {
        kind: "enum",
        variants: [{ name: "Owner" }, { name: "Admin" }, { name: "Member" }],
      },
    },
  ],
} satisfies Idl;

export const vaultIdl = {
  address: VAULT_PROGRAM_ID.toBase58(),
  metadata: { name: "vault", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "initialize_vault",
      discriminator: [48, 191, 163, 44, 71, 129, 63, 164],
      accounts: [
        { name: "vault", writable: true },
        { name: "vault_authority" },
        { name: "vault_token", writable: true },
        { name: "owner_member", writable: true },
        { name: "mint" },
        { name: "owner", writable: true, signer: true },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { name: "system_program", address: "11111111111111111111111111111111" },
        { name: "rent", address: "SysvarRent111111111111111111111111111111111" },
      ],
      args: [{ name: "name", type: "string" }],
    },
    {
      name: "add_member",
      discriminator: [13, 116, 123, 130, 126, 198, 57, 34],
      accounts: [
        { name: "vault" },
        { name: "authority_member" },
        { name: "member", writable: true },
        { name: "authority", writable: true, signer: true },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "user", type: "pubkey" },
        { name: "role", type: { defined: { name: "VaultRole" } } },
      ],
    },
    {
      name: "update_member_role",
      discriminator: [252, 36, 202, 222, 22, 168, 39, 69],
      accounts: [
        { name: "vault" },
        { name: "authority_member" },
        { name: "member", writable: true },
        { name: "authority", signer: true },
      ],
      args: [{ name: "role", type: { defined: { name: "VaultRole" } } }],
    },
    {
      name: "set_paused",
      discriminator: [91, 60, 125, 192, 176, 225, 166, 218],
      accounts: [
        { name: "vault", writable: true },
        { name: "owner", signer: true },
      ],
      args: [{ name: "paused", type: "bool" }],
    },
    {
      name: "deposit",
      discriminator: [242, 35, 198, 137, 82, 225, 242, 182],
      accounts: [
        { name: "vault", writable: true },
        { name: "member" },
        { name: "depositor", signer: true },
        { name: "depositor_token", writable: true },
        { name: "vault_token", writable: true },
        { name: "vault_authority" },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "withdraw",
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34],
      accounts: [
        { name: "vault", writable: true },
        { name: "authority_member" },
        { name: "authority", signer: true },
        { name: "vault_token", writable: true },
        { name: "vault_authority" },
        { name: "recipient_token", writable: true },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
  ],
  accounts: [
    { name: "Vault", discriminator: [211, 8, 232, 43, 2, 152, 117, 119] },
    { name: "VaultMember", discriminator: [26, 195, 159, 142, 38, 12, 117, 218] },
  ],
  types: [
    {
      name: "Vault",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "pubkey" },
          { name: "mint", type: "pubkey" },
          { name: "vault_token", type: "pubkey" },
          { name: "name", type: "string" },
          { name: "total_deposited", type: "u64" },
          { name: "total_withdrawn", type: "u64" },
          { name: "created_at", type: "i64" },
          { name: "paused", type: "bool" },
          { name: "bump", type: "u8" },
          { name: "vault_authority_bump", type: "u8" },
        ],
      },
    },
    {
      name: "VaultMember",
      type: {
        kind: "struct",
        fields: [
          { name: "vault", type: "pubkey" },
          { name: "user", type: "pubkey" },
          { name: "role", type: { defined: { name: "VaultRole" } } },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "VaultRole",
      type: {
        kind: "enum",
        variants: [
          { name: "Owner" },
          { name: "Admin" },
          { name: "Member" },
          { name: "Viewer" },
        ],
      },
    },
  ],
} satisfies Idl;
