import {
  AnchorProvider,
  BN,
  Idl,
  Program,
  setProvider,
} from "@coral-xyz/anchor";
import { PublicKey, Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

export const DEVNET_RPC_URL =
  process.env.NEXT_PUBLIC_SNITCH_RPC_URL ?? "https://api.devnet.solana.com";

export const DEVNET_USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_SNITCH_USDC_MINT ??
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

export const INVOICE_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SNITCH_INVOICE_PROGRAM_ID ??
    "8NNrnYjuajHC2jRLAaw5PYeahqRsDrRSzsZNXkTD8LES",
);

export const PAYOUT_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SNITCH_PAYOUT_PROGRAM_ID ??
    "57aDA46BSyuGSfoW1DZLyTDTk46KatGsktGKTNzVCQ9y",
);

export const SHARED_WALLET_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SNITCH_SHARED_WALLET_PROGRAM_ID ??
    "HK6ZtxWZSPjHFZWuJuvLZfKCJDB7ZEPWQe1GpMn8CVSG",
);

export type SnitchWallet = {
  publicKey: PublicKey | null;
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
  signAllTransactions?: <T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ) => Promise<T[]>;
};

type ResolvedSnitchWallet = Omit<SnitchWallet, "publicKey" | "signAllTransactions"> & {
  publicKey: PublicKey;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ) => Promise<T[]>;
};

type BrowserSolanaWallet = SnitchWallet & {
  connect?: () => Promise<unknown>;
  isConnected?: boolean;
};

declare global {
  interface Window {
    solana?: BrowserSolanaWallet;
  }
}

export function getConnection(): Connection {
  return new Connection(DEVNET_RPC_URL, "confirmed");
}

export async function resolveWallet(wallet?: SnitchWallet): Promise<ResolvedSnitchWallet> {
  const resolved = wallet ?? (typeof window !== "undefined" ? window.solana : undefined);

  if (!resolved) {
    throw new Error("No Solana wallet found. Connect a wallet before sending a transaction.");
  }

  const browserWallet = resolved as BrowserSolanaWallet;
  if (!resolved.publicKey && browserWallet.connect) {
    await browserWallet.connect();
  }

  if (!resolved.publicKey) {
    throw new Error("Wallet is not connected.");
  }

  if (!resolved.signTransaction) {
    throw new Error("Connected wallet cannot sign transactions.");
  }

  return {
    publicKey: new PublicKey(resolved.publicKey),
    signTransaction: resolved.signTransaction.bind(resolved),
    signAllTransactions:
      resolved.signAllTransactions?.bind(resolved) ??
      ((transactions) => Promise.all(transactions.map((tx) => resolved.signTransaction(tx)))),
  };
}

export async function getProvider(wallet?: SnitchWallet): Promise<AnchorProvider> {
  const provider = new AnchorProvider(getConnection(), await resolveWallet(wallet), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  setProvider(provider);
  return provider;
}

export async function getProgram(idl: Idl, wallet?: SnitchWallet): Promise<Program> {
  return new Program(idl, await getProvider(wallet));
}

export function getReadOnlyProgram(idl: Idl): Program {
  const provider = new AnchorProvider(
    getConnection(),
    {
      publicKey: PublicKey.default,
      signTransaction: async () => {
        throw new Error("Read-only provider cannot sign transactions.");
      },
      signAllTransactions: async () => {
        throw new Error("Read-only provider cannot sign transactions.");
      },
    },
    { commitment: "confirmed", preflightCommitment: "confirmed" },
  );

  return new Program(idl, provider);
}

export function textSeed(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function parseUsdcAmount(amount: number | string | bigint | BN, decimals = 6): BN {
  if (BN.isBN(amount)) {
    return amount;
  }

  if (typeof amount === "bigint") {
    return new BN(amount.toString());
  }

  const raw = String(amount).trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error("Amount must be a positive USDC value.");
  }

  const [whole, fraction = ""] = raw.split(".");
  const scaledFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  const baseUnits =
    BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(scaledFraction || "0");

  if (baseUnits <= BigInt(0)) {
    throw new Error("Amount must be greater than zero.");
  }

  return new BN(baseUnits.toString());
}

export function createReferenceId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "")
      : `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;

  return `${prefix}_${random}`.slice(0, 64);
}

export function normalizePublicKey(value: PublicKey | string): PublicKey {
  return value instanceof PublicKey ? value : new PublicKey(value);
}

export function transactionError(action: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`${action} failed: ${message}`);
}
