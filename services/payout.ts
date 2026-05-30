import { BN } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { AccountMeta, PublicKey, SystemProgram } from "@solana/web3.js";
import { payoutIdl } from "./idl";
import {
  DEVNET_USDC_MINT,
  PAYOUT_PROGRAM_ID,
  SnitchWallet,
  createReferenceId,
  getConnection,
  getProgram,
  getReadOnlyProgram,
  normalizePublicKey,
  parseUsdcAmount,
  textSeed,
  transactionError,
} from "./solana";

export type SendPayoutOptions = {
  wallet?: SnitchWallet;
  mint?: PublicKey | string;
  referenceId?: string;
};

export type BatchPayoutRecipient = {
  recipient: PublicKey | string;
  amount: number | string | bigint | BN;
};

export function derivePayoutRecordPda(authority: PublicKey, referenceId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textSeed("payout"), authority.toBuffer(), textSeed(referenceId)],
    PAYOUT_PROGRAM_ID,
  )[0];
}

export async function sendPayout(
  recipient: PublicKey | string,
  amount: number | string | bigint | BN,
  memo = "",
  options: SendPayoutOptions = {},
): Promise<string> {
  try {
    const connection = getConnection();
    const program = (await getProgram(payoutIdl, options.wallet)) as any;
    const authority = program.provider.publicKey as PublicKey;
    const mint = options.mint ? normalizePublicKey(options.mint) : DEVNET_USDC_MINT;
    const recipientOwner = normalizePublicKey(recipient);
    const authorityToken = getAssociatedTokenAddressSync(mint, authority);
    const recipientToken = getAssociatedTokenAddressSync(mint, recipientOwner);
    const referenceId = options.referenceId ?? createReferenceId("pay");
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
      .sendPayout(parseUsdcAmount(amount), memo, referenceId)
      .accounts({
        payoutRecord: derivePayoutRecordPda(authority, referenceId),
        authority,
        authorityToken,
        mint,
        recipientToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions(preInstructions)
      .rpc();
  } catch (error) {
    throw transactionError("sendPayout", error);
  }
}

export async function sendBatchPayout(
  recipients: BatchPayoutRecipient[],
  options: SendPayoutOptions & { memo?: string } = {},
): Promise<string> {
  try {
    const connection = getConnection();
    const program = (await getProgram(payoutIdl, options.wallet)) as any;
    const authority = program.provider.publicKey as PublicKey;
    const mint = options.mint ? normalizePublicKey(options.mint) : DEVNET_USDC_MINT;
    const authorityToken = getAssociatedTokenAddressSync(mint, authority);
    const referenceId = options.referenceId ?? createReferenceId("batch");
    const preInstructions = [];
    const remainingAccounts: AccountMeta[] = [];
    const batchRecipients = [];

    for (const item of recipients) {
      const recipientOwner = normalizePublicKey(item.recipient);
      const recipientToken = getAssociatedTokenAddressSync(mint, recipientOwner);

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

      batchRecipients.push({
        recipient: recipientOwner,
        amount: parseUsdcAmount(item.amount),
      });
      remainingAccounts.push({
        pubkey: recipientToken,
        isWritable: true,
        isSigner: false,
      });
    }

    return await program.methods
      .sendBatchPayout(batchRecipients, options.memo ?? "", referenceId)
      .accounts({
        payoutRecord: derivePayoutRecordPda(authority, referenceId),
        authority,
        authorityToken,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions(preInstructions)
      .rpc();
  } catch (error) {
    throw transactionError("sendBatchPayout", error);
  }
}

export async function fetchPayoutHistory(wallet: PublicKey | string) {
  try {
    const program = getReadOnlyProgram(payoutIdl) as any;
    return await program.account.payoutRecord.all([
      {
        memcmp: {
          offset: 8,
          bytes: normalizePublicKey(wallet).toBase58(),
        },
      },
    ]);
  } catch (error) {
    throw transactionError("fetchPayoutHistory", error);
  }
}
