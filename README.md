# Snitch

Snitch is a SaaS platform that provides businesses with a secure stablecoin wallet infrastructure for managing on chain financial operations. Built on Solana, the platform enables companies to handle payments, payroll, vendor payouts, and treasury management through shared wallets with role based permissions and team access controls. Snitch streamlines stablecoin native finance workflows by giving organizations a centralized and collaborative system to manage stablecoin transactions efficiently at scale. [Click here to watch the Snitch Demo](https://www.youtube.com/watch?v=wsarGL3v5sQ)

The platform also integrates confidential settlement capabilities through Umbra on Solana to provide private checkout and payout infrastructure for businesses handling stablecoin transactions. This enables companies to process confidential payments while preserving the speed, transparency, and efficiency of blockchain based finance. Designed for startups, DAOs, and internet-native companies, Snitch combines enterprise grade controls with blockchain-native payment workflows to deliver a modern financial operations stack for the digital economy.

<img width="800" height="722" alt="Screenshot 2026-05-21 at 9 38 59 PM" src="https://github.com/user-attachments/assets/7dc845e8-3365-4002-81ab-f66a38a9d981" />

## Why It Exists

Public blockchains are transparent by default. That is useful for verification, but it creates a problem for businesses: every payment can reveal customer relationships, treasury wallets, payout patterns, and sensitive financial metadata.

Snitch explores a business-grade payment layer where merchants can still accept and reconcile Solana stablecoin payments while protecting sensitive payment relationships. The product goal is to make crypto payments feel closer to modern financial operations: private where needed, auditable where required, and simple enough for teams to use.

## Confidential Payments With Umbra

Snitch emphasizes confidential on-chain payments using Umbra. In a standard Solana transfer, a block explorer can often show the payer wallet, recipient wallet, amount, and transaction history. In Snitch's confidential checkout flow, the customer signs a payment through Umbra, and the merchant receives a receiver-claimable private payment state instead of a plain customer-to-treasury transfer row.

<img width="800" height="725" alt="Screenshot 2026-05-21 at 9 40 39 PM" src="https://github.com/user-attachments/assets/594725a8-11db-457e-8e99-33cd8427a776" />

The app's confidential transaction page explains the flow:

1. The customer signs the payment from their Solana wallet.
2. Umbra creates a private receiver-claimable payment note.
3. A public explorer can see an Umbra program interaction, but not the direct business relationship behind the invoice.
4. Snitch records the proof/signature and marks the invoice as paid for merchant reconciliation.

Reference: [Umbra Privacy on Solana Explained](https://www.datawallet.com/crypto/umbra-privacy-on-solana-explained).

<img width="800" height="724" alt="Screenshot 2026-05-21 at 9 40 55 PM" src="https://github.com/user-attachments/assets/0953f925-f05e-475e-9f8e-2dd2ffc9c962" />

## What is SnitchPay?

SnitchPay is a blockchain-native finance operations stack for startups, DAOs, and internet-native companies. It gives teams a shared system for stablecoin invoices, payroll-style payouts, vendor payments, and treasury management on Solana.

The repository is built as a capstone-grade Solana project. The hosted application demonstrates the product workflow, while the Anchor programs and tests verify the critical on-chain behavior locally against a Solana validator.

- Stablecoin-native: built around SPL token transfers for USDC-style assets
- Solana-first: Anchor programs, PDAs, CPI token transfers, and localnet verification
- SaaS-oriented: dashboard, checkout, payout, wallet, auth, and service-layer boundaries
- Team-ready: organization wallets, role-based access, member permissions, and vault controls
- Demo-honest: hosted deployment is a playground; full feature testing runs locally

---

## Why SnitchPay?

Businesses using stablecoins usually outgrow a single wallet quickly. They need payment records, team access controls, payout workflows, treasury separation, and verifiable transaction execution. SnitchPay models those workflows as a SaaS product while keeping the important settlement logic on-chain.

The goal is not only to show a frontend. The goal is to demonstrate a working Solana backend that can create financial records, move SPL tokens, enforce permissions, and prove behavior through Anchor tests.

<img width="800" height="721" alt="Screenshot 2026-05-21 at 9 39 36 PM" src="https://github.com/user-attachments/assets/8e79283f-ff72-46a6-8a52-97407f1019e8" />

## Features

| Area | What it does |
| --- | --- |
| Invoice operations | Create invoices, pay invoices through SPL token transfers, cancel open invoices, and store payment status on-chain. |
| Payout operations | Send single payouts, send batch payouts, attach memo/reference data, and record payout status. |
| Shared wallets | Create organization PDAs, assign Owner/Admin/Member roles, and gate transfers by permission. |
| Treasury vaults | Initialize PDA-owned token vaults, accept deposits, restrict withdrawals, and pause vault activity. |
| Frontend bridge | Exposes TypeScript service functions the existing frontend can import directly. |
| Hosted playground | Lets reviewers explore the product UI while clearly explaining that localnet is required for full Solana testing. |
| Confidential payment UX | Includes Umbra-oriented confidential invoice and payment flows for private settlement demos. |

---

## Architecture

```text
SnitchPay
  Next.js application
    Dashboard, landing page, checkout, payout, wallet, and playground flows

  TypeScript service layer
    Frontend-safe functions for building, signing, sending, and fetching Solana data

  Anchor programs
    Invoice, payout, shared wallet, and vault programs

  Anchor tests
    Localnet verification for SPL token transfers, PDAs, roles, and vault controls
```

The frontend calls the TypeScript services. The services derive PDAs, construct Anchor clients, build instructions, send transactions, and fetch account state. The Anchor programs own the business-critical settlement and permission logic.

---

## Solana Programs

| Program | Path | Responsibility | Verified by |
| --- | --- | --- | --- |
| Invoice | `programs/invoice` | On-chain invoice records, status transitions, SPL token payment settlement, and cancellation. | `tests/invoice.ts` |
| Payout | `programs/payout` | Single payout, batch payout, recipient token transfers, memo/reference tracking, and payout records. | `tests/payout.ts` |
| Shared wallet | `programs/shared_wallet` | Organization PDA creation, Owner/Admin/Member role management, and permission-gated vault transfers. | `tests/shared-wallet.ts` |
| Vault | `programs/vault` | PDA-owned treasury vaults, deposits, authorized withdrawals, role checks, pause controls, and accounting. | `tests/vault.ts` |

## TypeScript Service Layer

The service layer is the integration contract between the existing frontend and the Solana programs.

| File | Purpose |
| --- | --- |
| `services/solana.ts` | Connection setup, program IDs, wallet resolution, provider creation, and token amount parsing. |
| `services/idl.ts` | Client-side Anchor IDL definitions used by the service layer. |
| `services/invoice.ts` | `createInvoice`, `payInvoice`, `cancelInvoice`, and `fetchInvoice`. |
| `services/payout.ts` | `sendPayout`, `sendBatchPayout`, and `fetchPayoutHistory`. |
| `services/shared-wallet.ts` | Organization wallet, member role, and shared transfer helpers. |
| `services/vault.ts` | Vault initialization, member management, deposit, withdraw, pause, and fetch helpers. |

The frontend-facing contract includes:

```ts
// Invoices
createInvoice(params)
payInvoice(invoiceId)
cancelInvoice(invoiceId)
fetchInvoice(invoiceId)

// Payouts
sendPayout(recipient, amount, memo)
sendBatchPayout(recipients)
fetchPayoutHistory(wallet)
```

---

## Tech Stack

| Layer | Tools |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Auth and hosting support | Firebase Auth, Firebase Hosting-ready configuration |
| Solana client | `@solana/web3.js`, `@solana/spl-token`, Anchor TypeScript client |
| Programs | Rust, Anchor 0.31.1 |
| Privacy-oriented flows | Umbra SDK and web ZK prover packages |
| Email/API support | Resend-backed API route support |
| Verification | Anchor localnet tests |

---

## Quick Start

### Requirements

- Node.js 20 or newer
- npm
- Rust
- Solana CLI or Agave CLI
- Anchor CLI 0.31.1

Check your local toolchain:

```bash
node --version
npm --version
solana --version
anchor --version
cargo build-sbf --version
```

### Clone and install

```bash
git clone git@github.com:ayushshrivastv/SnitchPay.git
cd SnitchPay
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Update `.env.local` for your local wallet, RPC, Firebase project, and optional API keys.

### Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Production build

```bash
npm run build
npm run start
```

---

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

Do not commit real private keys or server-side secrets. Firebase public web config values can be exposed in a frontend app, but Firebase security rules and authorized domains still need to be configured in Firebase Console.

---

## Solana Localnet Verification

The Anchor localnet test suite is the strongest verification artifact in this repository.

Run the complete suite:

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
- Single payout execution
- Batch payout execution
- Shared wallet role-based transfer
- Vault initialization
- Vault deposits
- Vault authorized withdrawals
- Vault unauthorized withdrawal rejection
- Vault pause protection

Run only the vault tests:

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

---

## Anchor Build and Devnet

Build all Anchor programs:

```bash
anchor build
```

The programs are configured in `Anchor.toml` for localnet and devnet.

```text
invoice
payout
shared_wallet
vault
```

To deploy to devnet, configure your Solana CLI wallet and make sure it has devnet SOL:

```bash
solana config set --url devnet
solana balance
anchor deploy --provider.cluster devnet
```

If deployment fails because of insufficient funds, request devnet SOL or switch to a funded devnet wallet.

---

## Firebase Auth

The landing page includes Google sign-in through Firebase. For deployed previews or production hosting, add your deployed host to Firebase Authentication authorized domains:

```text
Firebase Console -> Authentication -> Settings -> Authorized domains
```

For local demos, allow:

```text
localhost
127.0.0.1
```

The app includes a local playground fallback so a capstone demo can continue if Firebase rejects an unauthorized local domain.

---

## Hosted Playground

After login, users see a required acknowledgement modal explaining that:

- SnitchPay was built for the Solana India Fellowship
- The hosted deployment is a playground
- Full feature testing requires cloning the repository and running Solana localnet

This keeps the hosted demo honest while still allowing reviewers to inspect the product experience.

---

## Project Structure

```text
programs/
  invoice/
  payout/
  shared_wallet/
  vault/

services/
  idl.ts
  invoice.ts
  payout.ts
  shared-wallet.ts
  solana.ts
  vault.ts

tests/
  invoice.ts
  payout.ts
  shared-wallet.ts
  vault.ts

src/
  app/
    api/
    transactions/
    page.tsx
```

---

## Useful Commands

```bash
# Application
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

---

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

## Contributing

Contributions should keep the same boundary used in the current project:

- Frontend changes should preserve the existing product experience unless a UI task explicitly asks for them.
- Solana changes should include Anchor tests for permission checks, PDA derivation, SPL token movement, and failed-path behavior.
- Service-layer changes should keep frontend-facing functions stable unless the frontend contract is intentionally changed.
- Secrets, generated build artifacts, and local validator state should stay out of git.

---

## Capstone Verification Statement

SnitchPay demonstrates a stablecoin SaaS workflow backed by real Solana program logic. The core qualification evidence is the Anchor localnet test suite, which runs program instructions against a local Solana validator and confirms invoice, payout, shared wallet, and vault flows end-to-end.

### Solana India Fellowship ❤️
