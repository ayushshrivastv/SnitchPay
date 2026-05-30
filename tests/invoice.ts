import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import assert from "assert";

describe("invoice", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Invoice as Program & any;
  const payer = provider.wallet as anchor.Wallet;

  function invoicePda(invoiceId: string): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("invoice"), Buffer.from(invoiceId)],
      program.programId,
    )[0];
  }

  it("creates and pays an invoice with SPL USDC", async () => {
    const recipient = Keypair.generate();
    const invoiceId = `inv-${Date.now()}`;
    const amount = new anchor.BN(25_000_000);
    const mint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      6,
    );
    const payerToken = await getOrCreateAssociatedTokenAccount(
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
      payerToken.address,
      payer.publicKey,
      Number(amount),
    );

    await program.methods
      .createInvoice(
        invoiceId,
        amount,
        recipient.publicKey,
        new anchor.BN(Math.floor(Date.now() / 1000) + 86_400),
        "May services",
        mint,
      )
      .accounts({
        invoice: invoicePda(invoiceId),
        creator: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .payInvoice()
      .accounts({
        invoice: invoicePda(invoiceId),
        payer: payer.publicKey,
        payerToken: payerToken.address,
        recipientToken: recipientToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const invoice = await program.account.invoice.fetch(invoicePda(invoiceId));
    const paidToken = await getAccount(provider.connection, recipientToken.address);

    assert.deepStrictEqual(invoice.status, { paid: {} });
    assert.strictEqual(paidToken.amount.toString(), amount.toString());
  });

  it("cancels an open invoice", async () => {
    const recipient = Keypair.generate();
    const invoiceId = `cancel-${Date.now()}`;
    const mint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      6,
    );

    await program.methods
      .createInvoice(
        invoiceId,
        new anchor.BN(5_000_000),
        recipient.publicKey,
        new anchor.BN(Math.floor(Date.now() / 1000) + 86_400),
        "Cancelled invoice",
        mint,
      )
      .accounts({
        invoice: invoicePda(invoiceId),
        creator: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .cancelInvoice()
      .accounts({
        invoice: invoicePda(invoiceId),
        creator: payer.publicKey,
      })
      .rpc();

    const invoice = await program.account.invoice.fetch(invoicePda(invoiceId));
    assert.deepStrictEqual(invoice.status, { cancelled: {} });
  });
});
