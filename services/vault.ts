import { BN } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from "@solana/web3.js";
import { vaultIdl } from "./idl";
import {
  DEVNET_USDC_MINT,
  SnitchWallet,
  VAULT_PROGRAM_ID,
  getConnection,
  getProgram,
  getReadOnlyProgram,
  normalizePublicKey,
  parseUsdcAmount,
  textSeed,
  transactionError,
} from "./solana";

export type VaultRole = "owner" | "admin" | "member" | "viewer";

function roleToAnchor(role: VaultRole) {
  return { [role]: {} };
}

export function deriveVaultPda(
  owner: PublicKey,
  mint: PublicKey,
  name: string,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textSeed("vault"), owner.toBuffer(), mint.toBuffer(), textSeed(name)],
    VAULT_PROGRAM_ID,
  )[0];
}

export function deriveVaultAuthorityPda(vault: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textSeed("vault_authority"), vault.toBuffer()],
    VAULT_PROGRAM_ID,
  )[0];
}

export function deriveVaultTokenPda(vault: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textSeed("vault_token"), vault.toBuffer()],
    VAULT_PROGRAM_ID,
  )[0];
}

export function deriveVaultMemberPda(vault: PublicKey, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textSeed("vault_member"), vault.toBuffer(), user.toBuffer()],
    VAULT_PROGRAM_ID,
  )[0];
}

export async function initializeVault(params: {
  name: string;
  mint?: PublicKey | string;
  wallet?: SnitchWallet;
}): Promise<string> {
  try {
    const program = (await getProgram(vaultIdl, params.wallet)) as any;
    const owner = program.provider.publicKey as PublicKey;
    const mint = params.mint ? normalizePublicKey(params.mint) : DEVNET_USDC_MINT;
    const vault = deriveVaultPda(owner, mint, params.name);

    return await program.methods
      .initializeVault(params.name)
      .accounts({
        vault,
        vaultAuthority: deriveVaultAuthorityPda(vault),
        vaultToken: deriveVaultTokenPda(vault),
        ownerMember: deriveVaultMemberPda(vault, owner),
        mint,
        owner,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  } catch (error) {
    throw transactionError("initializeVault", error);
  }
}

export async function addVaultMember(params: {
  vault: PublicKey | string;
  user: PublicKey | string;
  role: Exclude<VaultRole, "owner">;
  wallet?: SnitchWallet;
}): Promise<string> {
  try {
    const program = (await getProgram(vaultIdl, params.wallet)) as any;
    const authority = program.provider.publicKey as PublicKey;
    const vault = normalizePublicKey(params.vault);
    const user = normalizePublicKey(params.user);

    return await program.methods
      .addMember(user, roleToAnchor(params.role))
      .accounts({
        vault,
        authorityMember: deriveVaultMemberPda(vault, authority),
        member: deriveVaultMemberPda(vault, user),
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  } catch (error) {
    throw transactionError("addVaultMember", error);
  }
}

export async function setVaultPaused(params: {
  vault: PublicKey | string;
  paused: boolean;
  wallet?: SnitchWallet;
}): Promise<string> {
  try {
    const program = (await getProgram(vaultIdl, params.wallet)) as any;
    const owner = program.provider.publicKey as PublicKey;
    const vault = normalizePublicKey(params.vault);

    return await program.methods
      .setPaused(params.paused)
      .accounts({ vault, owner })
      .rpc();
  } catch (error) {
    throw transactionError("setVaultPaused", error);
  }
}

export async function depositToVault(params: {
  vault: PublicKey | string;
  mint: PublicKey | string;
  amount: number | string | bigint | BN;
  wallet?: SnitchWallet;
}): Promise<string> {
  try {
    const program = (await getProgram(vaultIdl, params.wallet)) as any;
    const depositor = program.provider.publicKey as PublicKey;
    const vault = normalizePublicKey(params.vault);
    const mint = normalizePublicKey(params.mint);
    const depositorToken = getAssociatedTokenAddressSync(mint, depositor);

    return await program.methods
      .deposit(parseUsdcAmount(params.amount))
      .accounts({
        vault,
        member: deriveVaultMemberPda(vault, depositor),
        depositor,
        depositorToken,
        vaultToken: deriveVaultTokenPda(vault),
        vaultAuthority: deriveVaultAuthorityPda(vault),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  } catch (error) {
    throw transactionError("depositToVault", error);
  }
}

export async function withdrawFromVault(params: {
  vault: PublicKey | string;
  mint: PublicKey | string;
  recipient: PublicKey | string;
  amount: number | string | bigint | BN;
  wallet?: SnitchWallet;
}): Promise<string> {
  try {
    const connection = getConnection();
    const program = (await getProgram(vaultIdl, params.wallet)) as any;
    const authority = program.provider.publicKey as PublicKey;
    const vault = normalizePublicKey(params.vault);
    const mint = normalizePublicKey(params.mint);
    const recipientOwner = normalizePublicKey(params.recipient);
    const recipientToken = getAssociatedTokenAddressSync(mint, recipientOwner);
    const preInstructions = [];

    if (!(await connection.getAccountInfo(recipientToken))) {
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          authority,
          recipientToken,
          recipientOwner,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    return await program.methods
      .withdraw(parseUsdcAmount(params.amount))
      .accounts({
        vault,
        authorityMember: deriveVaultMemberPda(vault, authority),
        authority,
        vaultToken: deriveVaultTokenPda(vault),
        vaultAuthority: deriveVaultAuthorityPda(vault),
        recipientToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .rpc();
  } catch (error) {
    throw transactionError("withdrawFromVault", error);
  }
}

export async function fetchVault(vault: PublicKey | string) {
  try {
    const program = getReadOnlyProgram(vaultIdl) as any;
    return await program.account.vault.fetch(normalizePublicKey(vault));
  } catch (error) {
    throw transactionError("fetchVault", error);
  }
}
