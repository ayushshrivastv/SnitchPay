import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { AccountMeta, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import assert from "assert";

describe("payout", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Payout as Program & any;
  const payer = provider.wallet as anchor.Wallet;

  function payoutPda(referenceId: string): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("payout"), payer.publicKey.toBuffer(), Buffer.from(referenceId)],
      program.programId,
    )[0];
  }

  it("sends a single payout and records status", async () => {
    const recipient = Keypair.generate();
    const amount = new anchor.BN(12_500_000);
    const referenceId = `pay-${Date.now()}`;
    const mint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      6,
    );
    const authorityToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      payer.publicKey,
    );
    const recipientToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      recipient.publicKey,
    );

    await mintTo(
      provider.connection,
      payer.payer,
      mint,
      authorityToken.address,
      payer.publicKey,
      Number(amount),
    );

    await program.methods
      .sendPayout(amount, "Vendor payout", referenceId)
      .accounts({
        payoutRecord: payoutPda(referenceId),
        authority: payer.publicKey,
        authorityToken: authorityToken.address,
        mint,
        recipientToken: recipientToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const record = await program.account.payoutRecord.fetch(payoutPda(referenceId));
    const paidToken = await getAccount(provider.connection, recipientToken.address);

    assert.deepStrictEqual(record.status, { completed: {} });
    assert.strictEqual(record.totalAmount.toString(), amount.toString());
    assert.strictEqual(paidToken.amount.toString(), amount.toString());
  });

  it("sends a batch payout with remaining recipient accounts", async () => {
    const recipients = [Keypair.generate(), Keypair.generate()];
    const amounts = [new anchor.BN(2_000_000), new anchor.BN(3_000_000)];
    const referenceId = `batch-${Date.now()}`;
    const mint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      6,
    );
    const authorityToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      payer.publicKey,
    );
    const recipientTokens = [];

    await mintTo(
      provider.connection,
      payer.payer,
      mint,
      authorityToken.address,
      payer.publicKey,
      10_000_000,
    );

    for (const recipient of recipients) {
      recipientTokens.push(
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          payer.payer,
          mint,
          recipient.publicKey,
        ),
      );
    }

    const remainingAccounts: AccountMeta[] = recipientTokens.map((token) => ({
      pubkey: token.address,
      isWritable: true,
      isSigner: false,
    }));

    await program.methods
      .sendBatchPayout(
        recipients.map((recipient, index) => ({
          recipient: recipient.publicKey,
          amount: amounts[index],
        })),
        "Payroll batch",
        referenceId,
      )
      .accounts({
        payoutRecord: payoutPda(referenceId),
        authority: payer.publicKey,
        authorityToken: authorityToken.address,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();

    const record = await program.account.payoutRecord.fetch(payoutPda(referenceId));
    assert.deepStrictEqual(record.status, { completed: {} });
    assert.strictEqual(record.recipientCount, 2);
  });
});
