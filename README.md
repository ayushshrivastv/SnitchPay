# SnitchPay

SnitchPay is a Solana stablecoin finance operations platform for businesses. It combines a merchant-facing payment operations dashboard with Anchor-based on-chain programs for invoices, payouts, shared wallet permissions, and PDA-owned treasury vaults.

The project is built as a capstone-grade Solana application: the UI demonstrates the business workflow, while the Anchor programs and tests verify the core stablecoin operations on Solana localnet.

## Product Overview

Businesses that operate with stablecoins need more than a wallet. They need invoices, payouts, team permissions, treasury controls, payment records, and audit-friendly workflows. SnitchPay provides that operating layer for internet-native teams, startups, DAOs, and companies managing on-chain finance.

SnitchPay supports:

- Stablecoin invoice creation and payment tracking
- Single and batch USDC-style payouts
- Organization wallets with Owner, Admin, and Member roles
- PDA-owned vaults for treasury custody workflows
- Hosted checkout and transaction pages
- Confidential payment UX using Umbra-oriented flows
- Firebase Google sign-in for the hosted playground experience
- Localnet-verified Solana program tests

## Current Project Scope

This repository contains both frontend and Solana backend code. The hosted deployment is a playground for reviewing the product experience. Full Solana feature testing should be done locally with Anchor and Solana localnet.

The localnet test suite is the source of truth for verified on-chain behavior.

## Architecture

```text
Next.js app
  User-facing dashboard, checkout, payout, wallet, and playground flows

TypeScript service layer
  Frontend-safe functions for calling Anchor instructions

Anchor programs
  Invoice, payout, shared wallet, and vault programs

Anchor tests
  Localnet verification for SPL token transfers, PDAs, roles, and vault controls
```

## Solana Programs

### Invoice Program

Path: `programs/invoice`

The invoice program manages invoice state on-chain.

It supports:

- Creating invoices with amount, recipient, due date, memo, mint, and status
- Paying invoices through SPL token transfer
- Cancelling open invoices
- Marking invoice status as paid
- Storing payer and paid timestamp data

Verified by: `tests/invoice.ts`

### Payout Program

Path: `programs/payout`

The payout program handles stablecoin payout execution and records.

It supports:

- Single recipient payouts
- Batch payouts to multiple recipients
- Memo and reference ID tracking
- Payout record accounts
- SPL token account and mint validation

Verified by: `tests/payout.ts`

### Shared Wallet Program

Path: `programs/shared_wallet`

The shared wallet program models organization-level access controls.

It supports:

- Organization PDA creation
- Owner member initialization
- Admin and Member roles
- Role-gated member management
- Role-gated transfer from organization-owned token vaults

Verified by: `tests/shared-wallet.ts`

### Vault Program

Path: `programs/vault`

The vault program is the treasury custody layer. It uses PDA-owned SPL token accounts so funds are controlled by program authority rather than a normal wallet private key.

It supports:

- PDA vault initialization
- PDA vault token account creation
- Owner, Admin, Member, and Viewer roles
- Member deposits
- Owner/Admin withdrawals
- Unauthorized withdrawal rejection
- Pause controls for deposits and withdrawals
- Checked accounting for total deposited and withdrawn

Verified by: `tests/vault.ts`

## TypeScript Integration Layer

The service layer exposes typed helpers for the frontend and future API routes.

```text
services/solana.ts
  Connection, program IDs, wallet resolution, provider setup, amount parsing

services/idl.ts
  Client-side Anchor IDL definitions

services/invoice.ts
  createInvoice, payInvoice, cancelInvoice, fetchInvoice

services/payout.ts
  sendPayout, sendBatchPayout, fetchPayoutHistory

services/shared-wallet.ts
  organization wallet and member permission helpers

services/vault.ts
  vault initialization, member management, deposit, withdraw, pause, fetch helpers
```

## Frontend Application

The frontend is built with Next.js and TypeScript.

Important paths:

```text
src/app/page.tsx
  Main dashboard, landing page, wallet page, invoice/payout flows, playground notice

src/app/transactions/[account]/[shareId]/[invoiceId]/page.tsx
  Public invoice checkout page

src/app/transactions/[account]/[shareId]/[invoiceId]/explorer/page.tsx
  Transaction explorer-style page

src/app/api/confidential-invoices/route.ts
  Demo confidential invoice API route

src/app/api/payments/confirm/route.ts
  Demo payment confirmation route

src/app/api/payments/status/route.ts
  Demo payment status route

src/app/api/send-receipt/route.ts
  Demo receipt delivery route
```

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Firebase Auth
- Solana Web3.js
- SPL Token
- Anchor 0.31.1
- Rust Anchor programs
- Umbra SDK and web ZK prover packages
- Resend API route support

## Prerequisites

Install the following before running the full project:

- Node.js 20 or newer
- npm
- Rust
- Solana CLI / Agave CLI
- Anchor CLI 0.31.1

Check your local toolchain:

```bash
node --version
npm --version
solana --version
anchor --version
cargo build-sbf --version
```

## Setup

Clone the repository:

```bash
git clone git@github.com:ayushshrivastv/SnitchPay.git
cd SnitchPay
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` as needed for your local wallet, RPC, Firebase, and API keys.

## Environment Variables

The repository includes `.env.example` with the variables used by the app.

```env
RESEND_API_KEY=
NEXT_PUBLIC_UMBRA_NETWORK=mainnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-rpc.publicnode.com
NEXT_PUBLIC_SOLANA_WS_URL=wss://solana-rpc.publicnode.com
NEXT_PUBLIC_SNITCH_TREASURY_WALLET=
NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
NEXT_PUBLIC_USDT_MINT=
NEXT_PUBLIC_USDG_MINT=
NEXT_PUBLIC_PALM_USD_MINT=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_SNITCH_VAULT_PROGRAM_ID=
```

Do not commit real private keys or server-side secrets. Firebase public web config values are safe to expose, but Firebase security rules and authorized domains must still be configured correctly in Firebase Console.

## Run the Frontend

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build the production app:

```bash
npm run build
```

Start a production build:

```bash
npm run start
```

## Verify the Solana Programs

Run the complete localnet test suite:

```bash
anchor test --provider.cluster localnet
```

Expected result:

```text
8 passing
```

The suite verifies:

- Invoice creation
- Invoice SPL token payment
- Invoice cancellation
- Single payout
- Batch payout
- Shared wallet role-based transfer
- Vault initialization
- Vault deposits
- Vault authorized withdrawals
- Vault unauthorized withdrawal rejection
- Vault pause protection

Run only vault tests:

```bash
anchor test --provider.cluster localnet --run tests/vault.ts
```

Expected vault output:

```text
vault
  ✔ initializes a PDA vault, accepts deposits, and withdraws by owner
  ✔ allows members to deposit but blocks member withdrawals
  ✔ prevents deposits and withdrawals while the vault is paused
```

## Build Anchor Programs

Build all Anchor programs:

```bash
anchor build
```

The programs are configured in `Anchor.toml` for localnet and devnet:

```text
invoice
payout
shared_wallet
vault
```

## Devnet Notes

The repository is configured with devnet program IDs, but the verified execution path is localnet. To deploy or test on devnet, make sure your Solana CLI wallet has enough devnet SOL:

```bash
solana config set --url devnet
solana balance
anchor deploy --provider.cluster devnet
```

If deployment fails with an insufficient funds error, request devnet SOL or use a funded devnet wallet.

## Firebase Auth Notes

The landing page includes Google sign-in through Firebase. For production or preview deployments, add your deployed host to Firebase Authentication authorized domains:

```text
Firebase Console -> Authentication -> Settings -> Authorized domains
```

For local demos, use:

```text
localhost
127.0.0.1
```

The app includes a local playground fallback so the capstone demo can continue if Firebase rejects a local unauthorized domain.

## Hosted Playground Notice

After login, users see a required acknowledgement modal explaining that:

- SnitchPay was built for the Solana India Fellowship
- The hosted deployment is a playground
- Full feature testing requires cloning the repository and running Solana localnet

This keeps the hosted demo honest while still allowing reviewers to inspect the product experience.

## Useful Commands

```bash
# Frontend
npm install
npm run dev
npm run build
npm run lint

# Solana / Anchor
anchor build
anchor test --provider.cluster localnet
anchor test --provider.cluster localnet --run tests/vault.ts

# Toolchain checks
solana --version
anchor --version
cargo build-sbf --version
```

## Repository Hygiene

The following are intentionally ignored:

```text
node_modules/
.next/
target/
.anchor/
.env.local
*.tsbuildinfo
```

Generated build artifacts, local validator ledgers, and secrets should not be committed.

## Capstone Verification Statement

SnitchPay demonstrates a stablecoin SaaS workflow backed by real Solana program logic. The strongest verification artifact is the Anchor localnet test suite, which runs program instructions against a local Solana validator and confirms the invoice, payout, shared wallet, and vault flows end-to-end.
