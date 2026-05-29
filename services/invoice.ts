import { BN } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { invoiceIdl } from "./idl";
import {
  DEVNET_USDC_MINT,
  INVOICE_PROGRAM_ID,
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

export type CreateInvoiceParams = {
  amount: number | string | bigint | BN;
  recipient: PublicKey | string;
  dueDate: number | Date;
  memo?: string;
  invoiceId?: string;
  mint?: PublicKey | string;
  wallet?: SnitchWallet;
};

export type PayInvoiceOptions = {
  wallet?: SnitchWallet;
};

export function deriveInvoicePda(invoiceId: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [textSeed("invoice"), textSeed(invoiceId)],
    INVOICE_PROGRAM_ID,
  )[0];
}

export async function createInvoice(params: CreateInvoiceParams): Promise<string> {
  try {
    const invoiceId = params.invoiceId ?? createReferenceId("inv");
    const dueDate =
      params.dueDate instanceof Date
        ? Math.floor(params.dueDate.getTime() / 1000)
        : params.dueDate;
    const mint = params.mint ? normalizePublicKey(params.mint) : DEVNET_USDC_MINT;
    const program = (await getProgram(invoiceIdl, params.wallet)) as any;
    const creator = program.provider.publicKey as PublicKey;

    return await program.methods
      .createInvoice(
        invoiceId,
        parseUsdcAmount(params.amount),
        normalizePublicKey(params.recipient),
        new BN(dueDate),
        params.memo ?? "",
        mint,
      )
      .accounts({
        invoice: deriveInvoicePda(invoiceId),
        creator,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  } catch (error) {
    throw transactionError("createInvoice", error);
  }
}

export async function payInvoice(
  invoiceId: string,
  options: PayInvoiceOptions = {},
): Promise<string> {
  try {
    const connection = getConnection();
    const program = (await getProgram(invoiceIdl, options.wallet)) as any;
    const payer = program.provider.publicKey as PublicKey;
    const invoicePda = deriveInvoicePda(invoiceId);
    const invoice = await program.account.invoice.fetch(invoicePda);
    const mint = new PublicKey(invoice.mint);
    const recipient = new PublicKey(invoice.recipient);
    const payerToken = getAssociatedTokenAddressSync(mint, payer);
    const recipientToken = getAssociatedTokenAddressSync(mint, recipient);
    const preInstructions = [];

    if (!(await connection.getAccountInfo(recipientToken))) {
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          payer,
          recipientToken,
          recipient,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    return await program.methods
      .payInvoice()
      .accounts({
        invoice: invoicePda,
        payer,
        payerToken,
        recipientToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .rpc();
  } catch (error) {
    throw transactionError("payInvoice", error);
  }
}

export async function cancelInvoice(
  invoiceId: string,
  options: PayInvoiceOptions = {},
): Promise<string> {
  try {
    const program = (await getProgram(invoiceIdl, options.wallet)) as any;
    const creator = program.provider.publicKey as PublicKey;

    return await program.methods
      .cancelInvoice()
      .accounts({
        invoice: deriveInvoicePda(invoiceId),
        creator,
      })
      .rpc();
  } catch (error) {
    throw transactionError("cancelInvoice", error);
  }
}

export async function fetchInvoice(invoiceId: string) {
  try {
    const program = getReadOnlyProgram(invoiceIdl) as any;
    return await program.account.invoice.fetch(deriveInvoicePda(invoiceId));
  } catch (error) {
    throw transactionError("fetchInvoice", error);
  }
}
