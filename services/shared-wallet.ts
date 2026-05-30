import { BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { sharedWalletIdl } from "./idl";
import {
  SHARED_WALLET_PROGRAM_ID,
  SnitchWallet,
  getProgram,
  normalizePublicKey,
  parseUsdcAmount,
  textSeed,
  transactionError,
} from "./solana";

export type Role = "owner" | "admin" | "member";

function roleToAnchor(role: Role) {
  return { [role]: {} };
}

export function deriveOrganizationPda(owner: PublicKey, name: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textSeed("organization"), owner.toBuffer(), textSeed(name)],
    SHARED_WALLET_PROGRAM_ID,
  )[0];
}

export function deriveMemberPda(organization: PublicKey, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textSeed("member"), organization.toBuffer(), user.toBuffer()],
    SHARED_WALLET_PROGRAM_ID,
  )[0];
}

export async function createOrganizationWallet(
  name: string,
  wallet?: SnitchWallet,
): Promise<string> {
  try {
    const program = (await getProgram(sharedWalletIdl, wallet)) as any;
    const owner = program.provider.publicKey as PublicKey;
    const organization = deriveOrganizationPda(owner, name);

    return await program.methods
      .createOrganization(name)
      .accounts({
        organization,
        ownerMember: deriveMemberPda(organization, owner),
        owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  } catch (error) {
    throw transactionError("createOrganizationWallet", error);
  }
}

export async function addOrganizationMember(
  organization: PublicKey | string,
  user: PublicKey | string,
  role: Exclude<Role, "owner">,
  wallet?: SnitchWallet,
): Promise<string> {
  try {
    const program = (await getProgram(sharedWalletIdl, wallet)) as any;
    const authority = program.provider.publicKey as PublicKey;
    const organizationKey = normalizePublicKey(organization);
    const userKey = normalizePublicKey(user);

    return await program.methods
      .addMember(userKey, roleToAnchor(role))
      .accounts({
        organization: organizationKey,
        authorityMember: deriveMemberPda(organizationKey, authority),
        member: deriveMemberPda(organizationKey, userKey),
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  } catch (error) {
    throw transactionError("addOrganizationMember", error);
  }
}

export async function transferFromOrganizationWallet(params: {
  organization: PublicKey | string;
  organizationVault: PublicKey | string;
  recipient: PublicKey | string;
  mint: PublicKey | string;
  amount: number | string | bigint | BN;
  wallet?: SnitchWallet;
}): Promise<string> {
  try {
    const program = (await getProgram(sharedWalletIdl, params.wallet)) as any;
    const authority = program.provider.publicKey as PublicKey;
    const organization = normalizePublicKey(params.organization);
    const mint = normalizePublicKey(params.mint);
    const recipientToken = getAssociatedTokenAddressSync(mint, normalizePublicKey(params.recipient));

    return await program.methods
      .transferUsdc(parseUsdcAmount(params.amount))
      .accounts({
        organization,
        authorityMember: deriveMemberPda(organization, authority),
        authority,
        organizationVault: normalizePublicKey(params.organizationVault),
        recipientToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  } catch (error) {
    throw transactionError("transferFromOrganizationWallet", error);
  }
}
