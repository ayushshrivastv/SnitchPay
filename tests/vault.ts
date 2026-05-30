import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import assert from "assert";

describe("vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Vault as Program & any;
  const payer = provider.wallet as anchor.Wallet;

  function vaultPda(owner: PublicKey, mint: PublicKey, name: string): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer(), mint.toBuffer(), Buffer.from(name)],
      program.programId,
    )[0];
  }

  function vaultAuthorityPda(vault: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault_authority"), vault.toBuffer()],
      program.programId,
    )[0];
  }

  function vaultTokenPda(vault: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token"), vault.toBuffer()],
      program.programId,
    )[0];
  }

  function memberPda(vault: PublicKey, user: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault_member"), vault.toBuffer(), user.toBuffer()],
      program.programId,
    )[0];
  }

  async function createFundedMint(amount = 25_000_000) {
    const mint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      6,
    );
    const ownerToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      payer.publicKey,
    );

    await mintTo(
      provider.connection,
      payer.payer,
      mint,
      ownerToken.address,
      payer.publicKey,
      amount,
    );

    return { mint, ownerToken };
  }

  async function initializeVault(name: string, mint: PublicKey) {
    const vault = vaultPda(payer.publicKey, mint, name);

    await program.methods
      .initializeVault(name)
      .accounts({
        vault,
        vaultAuthority: vaultAuthorityPda(vault),
        vaultToken: vaultTokenPda(vault),
        ownerMember: memberPda(vault, payer.publicKey),
        mint,
        owner: payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return vault;
  }

  it("initializes a PDA vault, accepts deposits, and withdraws by owner", async () => {
    const name = `ops-${Date.now()}`;
    const { mint, ownerToken } = await createFundedMint();
    const vault = await initializeVault(name, mint);
    const recipient = Keypair.generate();
    const recipientToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      recipient.publicKey,
    );

    await program.methods
      .deposit(new anchor.BN(10_000_000))
      .accounts({
        vault,
        member: memberPda(vault, payer.publicKey),
        depositor: payer.publicKey,
        depositorToken: ownerToken.address,
        vaultToken: vaultTokenPda(vault),
        vaultAuthority: vaultAuthorityPda(vault),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    let vaultToken = await getAccount(provider.connection, vaultTokenPda(vault));
    assert.strictEqual(vaultToken.amount.toString(), "10000000");

    await program.methods
      .withdraw(new anchor.BN(3_500_000))
      .accounts({
        vault,
        authorityMember: memberPda(vault, payer.publicKey),
        authority: payer.publicKey,
        vaultToken: vaultTokenPda(vault),
        vaultAuthority: vaultAuthorityPda(vault),
        recipientToken: recipientToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    vaultToken = await getAccount(provider.connection, vaultTokenPda(vault));
    const paidToken = await getAccount(provider.connection, recipientToken.address);
    const vaultAccount = await program.account.vault.fetch(vault);

    assert.strictEqual(vaultToken.amount.toString(), "6500000");
    assert.strictEqual(paidToken.amount.toString(), "3500000");
    assert.strictEqual(vaultAccount.totalDeposited.toString(), "10000000");
    assert.strictEqual(vaultAccount.totalWithdrawn.toString(), "3500000");
  });

  it("allows members to deposit but blocks member withdrawals", async () => {
    const name = `member-${Date.now()}`;
    const { mint } = await createFundedMint();
    const vault = await initializeVault(name, mint);
    const member = Keypair.generate();
    const memberToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      member.publicKey,
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(member.publicKey, anchor.web3.LAMPORTS_PER_SOL),
      "confirmed",
    );

    await mintTo(
      provider.connection,
      payer.payer,
      mint,
      memberToken.address,
      payer.publicKey,
      5_000_000,
    );

    await program.methods
      .addMember(member.publicKey, { member: {} })
      .accounts({
        vault,
        authorityMember: memberPda(vault, payer.publicKey),
        member: memberPda(vault, member.publicKey),
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .deposit(new anchor.BN(2_000_000))
      .accounts({
        vault,
        member: memberPda(vault, member.publicKey),
        depositor: member.publicKey,
        depositorToken: memberToken.address,
        vaultToken: vaultTokenPda(vault),
        vaultAuthority: vaultAuthorityPda(vault),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([member])
      .rpc();

    await assert.rejects(
      program.methods
        .withdraw(new anchor.BN(1_000_000))
        .accounts({
          vault,
          authorityMember: memberPda(vault, member.publicKey),
          authority: member.publicKey,
          vaultToken: vaultTokenPda(vault),
          vaultAuthority: vaultAuthorityPda(vault),
          recipientToken: memberToken.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([member])
        .rpc(),
    );
  });

  it("prevents deposits and withdrawals while the vault is paused", async () => {
    const name = `paused-${Date.now()}`;
    const { mint, ownerToken } = await createFundedMint();
    const vault = await initializeVault(name, mint);
    const recipient = Keypair.generate();
    const recipientToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      mint,
      recipient.publicKey,
    );

    await program.methods
      .setPaused(true)
      .accounts({
        vault,
        owner: payer.publicKey,
      })
      .rpc();

    await assert.rejects(
      program.methods
        .deposit(new anchor.BN(1_000_000))
        .accounts({
          vault,
          member: memberPda(vault, payer.publicKey),
          depositor: payer.publicKey,
          depositorToken: ownerToken.address,
          vaultToken: vaultTokenPda(vault),
          vaultAuthority: vaultAuthorityPda(vault),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
    );

    await assert.rejects(
      program.methods
        .withdraw(new anchor.BN(1_000_000))
        .accounts({
          vault,
          authorityMember: memberPda(vault, payer.publicKey),
          authority: payer.publicKey,
          vaultToken: vaultTokenPda(vault),
          vaultAuthority: vaultAuthorityPda(vault),
          recipientToken: recipientToken.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
    );
  });
});
