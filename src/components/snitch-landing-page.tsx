"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode, type SVGProps } from "react";
import { Copy, Menu, X } from "lucide-react";

type LandingActionProps = {
  onGoogleSignIn: () => void;
  onRequestAccess: () => void;
  googleAuthError?: string;
};

type Feature = {
  title: string;
  description: string;
  icon: "network" | "card" | "shield";
};

type FooterColumn = {
  title: string;
  links: string[];
};

const navItems = ["Products", "Developers", "Resources", "Pricing"];

const features: Feature[] = [
  {
    title: "Move money across wallets",
    description:
      "Send invoices, payroll batches, and vendor payouts with SPL USDC from one Solana workspace.",
    icon: "network",
  },
  {
    title: "Launch shared company wallets",
    description:
      "Create organization wallets with Owner, Admin, and Member controls before treasury funds move.",
    icon: "card",
  },
  {
    title: "Settle with privacy and control",
    description:
      "Use PDA vaults, Umbra-oriented checkout flows, and on-chain records for confidential business payments.",
    icon: "shield",
  },
];

const partners = [
  "Startups",
  "DAOs",
  "Agencies",
  "Freelancers",
  "Treasury teams",
  "Payroll teams",
  "Vendors",
  "Founders",
  "Operators",
  "Internet companies",
];

const footerColumns: FooterColumn[] = [
  { title: "Products", links: ["Invoices", "Payouts", "Shared Wallets", "Vaults"] },
  { title: "Resources", links: ["Demo", "Localnet Tests", "Setup Guide", "README"] },
  { title: "Developers", links: ["Anchor Programs", "TypeScript Services", "API Layer", "GitHub"] },
  { title: "Company", links: ["Early Access", "Solana India Fellowship", "Capstone", "Contact"] },
];

const codeLines = [
  "import { createInvoice, sendBatchPayout } from '@/services';",
  "",
  "const invoiceSig = await createInvoice({",
  '  amount: "4800",',
  '  recipient: vendorWallet,',
  '  memo: "May vendor invoice",',
  '  stablecoin: "USDC",',
  "});",
  "",
  "const payoutSig = await sendBatchPayout([",
  '  { recipient: payrollWallet, amount: "2200", memo: "Payroll" },',
  '  { recipient: contractorWallet, amount: "950", memo: "Design sprint" },',
  "]);",
  "",
  "console.log({ invoiceSig, payoutSig });",
];

const projectCopy =
  "Snitch is a Solana stablecoin SaaS platform for businesses managing on-chain financial operations. It brings payments, payroll, vendor payouts, treasury vaults, shared wallets, role-based permissions, and confidential settlement workflows into one collaborative system.";

function MiniIcon({
  kind,
  ...props
}: SVGProps<SVGSVGElement> & { kind: Feature["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      {kind === "network" ? (
        <>
          <circle cx="7" cy="15" r="2.25" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="17" cy="15" r="2.25" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.6" />
          <path d="m10.4 9.7-2 3.1m5.2-3.1 2 3.1M9.5 15h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </>
      ) : null}
      {kind === "card" ? (
        <>
          <rect x="4" y="6" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M7 10h10M8 14h3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </>
      ) : null}
      {kind === "shield" ? (
        <>
          <path d="M12 3.8 18 6v5.2c0 3.5-2.3 6.8-6 8.2-3.7-1.4-6-4.7-6-8.2V6l6-2.2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
          <path d="m9.4 12 1.8 1.8 3.7-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        </>
      ) : null}
    </svg>
  );
}

function Header({ onGoogleSignIn }: Pick<LandingActionProps, "onGoogleSignIn">) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1182px] items-center justify-between border-x border-border px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Snitch home"
          className="flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Image src="/snitch-logo.png" alt="" width={32} height={32} className="size-8" />
          <span className="sr-only">Snitch</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              key={item}
              href={item === "Pricing" ? "#pricing" : `#${item.toLowerCase()}`}
              className="flex min-h-10 items-center rounded-md px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="hidden md:block">
          <ActionButton onClick={onGoogleSignIn}>Open App</ActionButton>
        </div>
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          <nav className="grid gap-1" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a
                key={item}
                href={item === "Pricing" ? "#pricing" : `#${item.toLowerCase()}`}
                className="flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {item}
              </a>
            ))}
            <ActionButton onClick={onGoogleSignIn} className="mt-2 justify-center">
              Open App
            </ActionButton>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "dark",
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "blue" | "dark" | "light";
  className?: string;
}) {
  const variantClass = {
    blue: "bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700",
    dark: "bg-primary text-primary-foreground hover:bg-foreground",
    light:
      "border border-border bg-background text-foreground shadow-sm hover:bg-muted hover:text-foreground",
  }[variant];

  return (
      <button
        type="button"
        onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 text-[13px] font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-100 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${variantClass} ${className}`}
      >
      {children}
    </button>
  );
}

function AnnouncementBar() {
  return (
    <div className="border-b border-border bg-muted/35">
      <div className="mx-auto flex min-h-10 max-w-[1182px] items-center justify-center gap-2 border-x border-border px-4 text-center text-[11px] font-medium text-muted-foreground">
        <span className="whitespace-nowrap sm:hidden">Snitch for Solana teams</span>
        <span className="hidden whitespace-nowrap sm:inline">Snitch stablecoin infrastructure for Solana teams</span>
        <span className="text-border" aria-hidden="true">
          |
        </span>
        <a
          href="#developers"
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md px-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Learn more
          <span aria-hidden="true">▸</span>
        </a>
      </div>
    </div>
  );
}

function Hero({ onGoogleSignIn, onRequestAccess, googleAuthError }: LandingActionProps) {
  return (
    <section
      id="products"
      className="border-b border-border bg-background"
    >
      <div className="snitch-grid mx-auto flex min-h-[462px] max-w-[1182px] flex-col items-center justify-center border-x border-border px-4 py-14 text-center sm:min-h-[380px] sm:px-6 sm:py-12 lg:px-8">
        <h1 className="mx-auto mb-4 max-w-[650px] text-[42px] font-medium leading-[1.06] text-foreground/75 sm:text-[58px] md:text-[64px]">
          Stablecoin API for global payments
        </h1>
        <p className="mx-auto mb-6 max-w-[650px] text-[14px] font-medium leading-6 text-muted-foreground md:text-[15px]">
          Payments, payroll, vendor payouts, and treasury managed through shared
          wallets with role based controls and confidential settlement, all
          onchain.
        </p>
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <ActionButton onClick={onGoogleSignIn} className="rounded-md px-4 text-[13px]">
            Get Started
          </ActionButton>
          <ActionButton
            onClick={onRequestAccess}
            variant="light"
            className="rounded-md px-4 text-[13px]"
          >
            Get a Demo
          </ActionButton>
        </div>
        {googleAuthError ? (
          <p className="mx-auto mt-3 max-w-[620px] text-sm leading-5 text-destructive" role="alert">
            {googleAuthError}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ProductSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="snitch-grid mx-auto max-w-[1182px] border-x border-border shadow-[inset_0_2px_0_rgb(0_0_0/0.08)]">
        <FeatureTabs />
        <DashboardShot />
      </div>
    </section>
  );
}

function FeatureTabs() {
  const [active, setActive] = useState(0);

  return (
    <div className="border-b border-border bg-background/20">
      <div className="grid grid-cols-3">
        {features.map((feature, index) => (
          <button
            key={feature.title}
            type="button"
            onClick={() => setActive(index)}
            className={`group min-h-[62px] border-r border-border px-4 py-3 text-center transition-colors last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-[140px] md:px-8 md:py-7 ${
              active === index ? "bg-muted/45" : "hover:bg-muted/30"
            }`}
          >
            <span
              className={`mx-auto flex size-10 items-center justify-center rounded-md border border-border shadow-sm transition-colors md:mb-5 ${
                active === index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <MiniIcon kind={feature.icon} className="size-5" />
            </span>
            <h2 className="mx-auto mb-3 hidden max-w-[290px] text-[18px] font-medium leading-snug text-foreground md:block">
              {feature.title}
            </h2>
            <p className="mx-auto hidden max-w-[310px] text-[13px] leading-[18px] text-muted-foreground md:block">
              {feature.description}
            </p>
          </button>
        ))}
      </div>
      <div className="px-8 py-6 text-center md:hidden">
        <h2 className="mx-auto mb-3 max-w-[285px] text-[28px] font-medium leading-[1.1] text-foreground">
          {features[active].title}
        </h2>
        <p className="mx-auto max-w-[285px] text-[13px] leading-[18px] text-muted-foreground">
          {features[active].description}
        </p>
      </div>
    </div>
  );
}

function DashboardShot() {
  return (
    <div className="mx-4 my-6 rounded-md border border-border bg-white p-2 shadow-[0_2px_18px_rgb(15_15_15/0.12)] sm:mx-6 md:my-8 lg:mx-8">
      <div className="overflow-hidden rounded">
        <Image
          src="/images/snitch-dashboard-screenshot.png"
          alt="Snitch payout and treasury dashboard"
          width={2560}
          height={1664}
          priority
          className="h-auto w-full object-cover"
        />
      </div>
    </div>
  );
}

function DeveloperSection() {
  return (
    <section id="developers" className="border-b border-border bg-background">
      <div className="snitch-grid mx-auto max-w-[1182px] border-x border-border px-4 py-16 sm:px-6 md:py-[74px] lg:px-8">
        <div className="mx-auto max-w-[910px]">
          <h2 className="mx-auto mb-4 max-w-[640px] text-center text-[32px] font-medium leading-[1.1] text-foreground md:text-[40px]">
            Integrate stablecoin payments into your product in minutes.
          </h2>
          <p className="mx-auto mb-10 max-w-[650px] text-center text-[15px] leading-6 text-muted-foreground">
            Add invoice, payout, and shared wallet flows with TypeScript services
            backed by Anchor programs, SPL USDC transfers, and localnet-tested
            Solana instructions.
          </p>
          <div className="mb-8 hidden items-center justify-center gap-2 text-[13px] text-muted-foreground md:flex">
            {["Create invoice", "Pay with USDC", "Record payout"].map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className="inline-flex min-h-9 items-center rounded-full border border-border bg-background px-4">{step}</span>
                {index < 2 ? <span className="text-border" aria-hidden="true">--&gt;</span> : null}
              </div>
            ))}
          </div>
          <CodePanel />
        </div>
      </div>
    </section>
  );
}

function CodePanel() {
  const tabs = ["TypeScript", "Rust", "Anchor", "Solana", "SPL"];

  return (
    <div className="mx-auto overflow-hidden rounded-lg border border-border bg-background shadow-[0_2px_16px_rgb(15_15_15/0.12)]">
      <div className="flex min-h-11 items-center justify-between border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {tabs.map((tab, index) => (
            <button
              type="button"
              key={tab}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                index === 0 ? "bg-muted text-foreground" : "text-[var(--snitch-subtle)] hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="size-2 rounded-[2px] bg-current opacity-40" />
              {tab}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Copy code"
          className="ml-3 flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Copy className="size-4" />
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-4 pl-12 text-[13px] leading-5 text-[#24292e] sm:text-sm">
        <code>
          {codeLines.map((line, index) => (
            <span key={`${line}-${index}`} className="block">
              <span className="mr-5 inline-block w-5 select-none text-right text-muted-foreground/60">
                {index + 1}
              </span>
              <CodeLine line={line} />
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function CodeLine({ line }: { line: string }) {
  if (!line) return <span>&nbsp;</span>;

  return (
    <span>
      {line
        .replaceAll("const", "§const§")
        .replaceAll("await", "§await§")
        .replaceAll("import", "§import§")
        .replaceAll("from", "§from§")
        .split("§")
        .map((part, index) => {
          const keyword = ["const", "await", "import", "from"].includes(part);
          const className = keyword
            ? "text-[#d73a49]"
            : part.includes("'") || part.includes('"')
              ? "text-[#032f62]"
              : part.includes("createInvoice") || part.includes("sendBatchPayout")
                ? "text-[#6f42c1]"
                : "";

          return (
            <span key={`${part}-${index}`} className={className}>
              {part}
            </span>
          );
        })}
    </span>
  );
}

function LogoWall() {
  return (
    <section id="resources" className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1182px] border-x border-border">
        <h2 className="px-6 py-14 text-center text-[20px] font-medium leading-7 text-foreground sm:text-[24px]">
          Powering stablecoin payment infrastructure for internet-native companies
        </h2>
        <div className="grid grid-cols-2 border-t border-border sm:grid-cols-5">
          {partners.map((partner) => (
            <div
              key={partner}
              className="snitch-shine flex h-[120px] items-center justify-center border-b border-r border-border text-center text-[22px] font-semibold text-border last:border-r-0 sm:last:border-r"
            >
              {partner}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ onRequestAccess }: Pick<LandingActionProps, "onRequestAccess">) {
  return (
    <footer className="bg-muted/35">
      <section id="pricing" className="relative mx-auto max-w-[1182px] overflow-hidden border-x border-b border-border px-6 py-14 sm:px-10">
        <div className="snitch-map absolute inset-y-0 right-0 hidden w-2/3 md:block" />
        <div className="relative z-10">
          <h2 className="mb-6 text-[32px] font-medium leading-[1.1] text-foreground md:text-[40px]">
            One workspace.
            <br />
            Stablecoin finance operations.
          </h2>
          <div className="flex gap-2">
            <ActionButton onClick={onRequestAccess}>Get a Demo</ActionButton>
            <ActionButton onClick={onRequestAccess} variant="light">
              Go to Docs
            </ActionButton>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1182px] border-x border-b border-border px-6 py-12 sm:px-10">
        <p className="mb-10 max-w-[1060px] text-[15px] leading-7 text-muted-foreground">
          {projectCopy} The hosted deployment is a playground. Full Solana
          feature testing should be verified locally through Anchor localnet
          tests.
        </p>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-[1fr_1fr_1fr_1fr_220px]">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-[15px] font-semibold text-foreground">{column.title}</h3>
              <ul className="grid gap-1">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="inline-flex min-h-9 min-w-10 items-center rounded-md px-1 text-[15px] leading-6 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="mb-3 text-[15px] font-semibold text-foreground">Network</h3>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-[14px] font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500" />
              Localnet tests passing
            </span>
          </div>
        </div>
      </section>
      <section className="mx-auto flex max-w-[1182px] flex-col gap-4 border-x border-b border-border px-6 py-10 sm:px-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Image src="/snitch-logo.png" alt="" width={32} height={32} className="size-8" />
            <span className="text-lg font-semibold text-foreground">Snitch</span>
          </Link>
          <p className="max-w-[640px] text-[15px] leading-6 text-muted-foreground">
            Snitch is a stablecoin SaaS platform for businesses managing payments,
            payroll, payouts, and treasury operations on Solana.
          </p>
        </div>
      </section>
      <section className="mx-auto flex max-w-[1182px] flex-col gap-4 border-x border-border px-6 py-9 text-[15px] text-muted-foreground sm:px-10 md:flex-row md:items-center md:justify-between">
        <p>© Snitch 2026.</p>
        <div className="flex flex-wrap gap-6">
          {["Privacy", "Terms", "Localnet Verification"].map((link) => (
            <a
              key={link}
              href="#"
              className="inline-flex min-h-10 min-w-10 items-center rounded-md px-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {link}
            </a>
          ))}
        </div>
      </section>
    </footer>
  );
}

export function SnitchLandingPage({
  onGoogleSignIn,
  onRequestAccess,
  googleAuthError,
}: LandingActionProps) {
  return (
    <>
      <AnnouncementBar />
      <Header onGoogleSignIn={onGoogleSignIn} />
      <main>
        <Hero
          onGoogleSignIn={onGoogleSignIn}
          onRequestAccess={onRequestAccess}
          googleAuthError={googleAuthError}
        />
        <ProductSection />
        <DeveloperSection />
        <LogoWall />
      </main>
      <Footer onRequestAccess={onRequestAccess} />
    </>
  );
}
