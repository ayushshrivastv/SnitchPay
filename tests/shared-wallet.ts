import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import assert from "assert";

describe("shared_wallet", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SharedWallet as Program & any;
  const payer = provider.wallet as anchor.Wallet;

  function organizationPda(name: string): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), payer.publicKey.toBuffer(), Buffer.from(name)],
      program.programId,
    )[0];
  }

  function memberPda(organization: PublicKey, user: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("member"), organization.toBuffer(), user.toBuffer()],
      program.programId,
    )[0];
  }

  it("creates an organization, adds an admin, and transfers from the org vault", async () => {
    const name = `snitch-${Date.now()}`;
    const organization = organizationPda(name);
    const admin = Keypair.generate();
    const recipient = Keypair.generate();

    await provider.connection.requestAirdrop(admin.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);

    await program.methods
      .createOrganization(name)
      .accounts({
        organization,
        ownerMember: memberPda(organization, payer.publicKey),
        owner: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .addMember(admin.publicKey, { admin: {} })
      .accounts({
        organization,
        authorityMember: memberPda(organization, payer.publicKey),
        member: memberPda(organization, admin.publicKey),
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const mint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      6,
    );
    const organizationVault = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      organization,
      true,
    );
    const recipientToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      recipient.publicKey,
    );
    const adminRecipientToken = getAssociatedTokenAddressSync(mint, recipient.publicKey);
    assert.strictEqual(adminRecipientToken.toBase58(), recipientToken.address.toBase58());

    await mintTo(
      provider.connection,
      payer.payer,
      mint,
      organizationVault.address,
      payer.publicKey,
      15_000_000,
    );

    await program.methods
      .transferUsdc(new anchor.BN(4_000_000))
      .accounts({
        organization,
        authorityMember: memberPda(organization, payer.publicKey),
        authority: payer.publicKey,
        organizationVault: organizationVault.address,
        recipientToken: recipientToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const paidToken = await getAccount(provider.connection, recipientToken.address);
    assert.strictEqual(paidToken.amount.toString(), "4000000");
  });
});
