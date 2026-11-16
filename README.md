# Luqma — Restaurant Solutions & Operations

Bilingual (Arabic / English, RTL / LTR) public website, private client portal and management
platform for Luqma, a restaurant consultancy in Bahrain. All amounts are in Bahraini Dinars (BHD,
three decimals).

Stack: Next.js (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL (Neon-ready) · Drizzle ORM.

## Getting started

```bash
cp .env.example .env          # set DATABASE_URL (Neon pooled URL in production)
npm install
npx drizzle-kit push          # create the tables
npm run build && npm run start
```

`drizzle.config.json` points at the local database. To push the schema to Neon, change its
`dbCredentials.url` to your Neon connection string (or pass `--url`).

On first start the platform installs only what it cannot run without — the six service pillars,
a starting SLA for each, the payment channels (all **disabled**), and the master admin account.
There are no demo clients, orders, portfolio items, prices or finance figures.

## Where things live

| Area | URL | Notes |
| --- | --- | --- |
| Public website | `/`, `/services/[slug]` | Landing page, six pillars, portfolio carousel, packages, contact form |
| Client portal | `/portal` | Sign-in / registration, dashboard, order page, checkout |
| Management | `/admin` | **Only** reachable by typing the URL. No public or client page links to it |

## Directory structure

```
src/
├─ app/
│  ├─ (site)/                   Public website (header + footer layout)
│  │  ├─ page.tsx               Landing page
│  │  └─ services/[slug]/       Service detail, packages, SLA
│  ├─ portal/
│  │  ├─ (auth)/login|register  Client sign-in and registration
│  │  └─ (app)/                 Private client area
│  │     ├─ page.tsx            Dashboard
│  │     ├─ orders/[id]/        Progress, invoices, updates / reports / deliverables
│  │     ├─ request/[slug]/     Checkout: package → SLA acceptance → payment method
│  │     └─ mock-checkout/      Test payment page for gateways in mock mode
│  ├─ admin/
│  │  ├─ page.tsx               Sign-in (the single entrance)
│  │  └─ (panel)/               overview · orders · clients · inquiries · portfolio ·
│  │                            services · contracts · payments · finance · team · settings
│  └─ api/
│     ├─ admin/auth/*           Admin login / logout
│     ├─ admin/upload           Device uploads (portfolio media, QR code, report files)
│     ├─ portal/auth/[action]   Client login / register / logout
│     ├─ portal/payments/[id]/return   Return from a hosted payment page
│     ├─ webhooks/[provider]    Tap · BENEFIT · PayPal webhooks (signature-verified)
│     ├─ media/[id]             Serves uploads (range requests, private-file access control)
│     ├─ inquiries              Public contact form
│     └─ health
├─ components/
│  ├─ brand/Logo.tsx            Logo (inline SVG)
│  ├─ site/                     PortfolioCarousel, header, footer, contact form, package card
│  ├─ portal/                   AuthForm, PaymentPanel
│  ├─ admin/                    AdminLogin, AdminShell, PortfolioForm, PaymentControls, FinanceControls
│  └─ ui/                       ActionForm (server-action runner + uploads), badges, toggles
├─ db/
│  ├─ schema.ts                 Drizzle schema (19 tables)
│  ├─ bootstrap.ts              Idempotent first-run setup
│  └─ seed-content.ts           The six pillars, SLA templates, payment channel definitions
├─ i18n/                        Locale detection, `t(en, ar)` helper, client provider
├─ lib/
│  ├─ auth/                     scrypt passwords, DB-backed sessions, guards, rate limiting
│  ├─ payments/gateways.ts      Tap / BENEFIT / PayPal adapters
│  ├─ payments/process.ts       Single idempotent pipeline for every gateway event
│  ├─ embed.ts                  Instagram / YouTube / Vimeo / TikTok link → in-page player
│  ├─ media.ts                  Upload validation and storage
│  ├─ email.ts, notifications.ts   SMTP delivery + client notifications (logged)
│  └─ finance.ts                Monthly P&L, trend, break-even
├─ server/
│  ├─ form.ts                   Validation helpers + adminAction / clientAction wrappers
│  └─ actions/                  Server actions (every one re-checks the session and permission)
└─ types/                       Shared types, enumerations and bilingual labels
```

## Security model

- **Admin isolation** — `/admin` is not linked anywhere, is `noindex`, and every admin page and
  server action checks the session and the specific permission itself.
- **Master admin** — full access, cannot be edited, deactivated or deleted by anyone; only its
  owner can change its password (Settings). Other admins get granular per-section permissions.
- **Sessions** — opaque random tokens in httpOnly cookies, stored hashed in PostgreSQL, separate
  cookies for admins and clients. Passwords are hashed with scrypt. Sign-in is rate-limited.
- **Client data** — every portal query filters by the signed-in client; report attachments are
  private files served only to admins and the owning, activated client.
- **Payments** — gateway secrets live in environment variables only. Webhooks are rejected unless
  the gateway is enabled, credentials are present and the signature verifies; amounts are checked
  against the invoice; processing is idempotent.

## Going live checklist

1. Sign in at `/admin` and change the master password (Settings).
2. Add contact details (Settings) and SMTP variables so clients receive e-mails.
3. Price packages (Services & pricing) and review the SLAs with legal counsel (Contracts).
4. Upload the BenefitPay QR code / enter the IBAN, then enable the payment methods you accept.
5. For an online gateway: set its credentials, register the webhook URL shown in Payment setup,
   run a sandbox payment, then switch it to **Live**.
6. Publish portfolio items.

## Notes and limits

- Uploads are stored in PostgreSQL (`media_files`) so the app has no filesystem dependency and runs
  on serverless hosts. Keep files modest (`MAX_UPLOAD_MB`); embed long videos via links instead.
- The logo is an SVG recreation of the Luqma mark. To use the original artwork, replace
  `LogoMark` in `src/components/brand/Logo.tsx` and `src/app/icon.svg`.
- Clients cannot reset a forgotten password themselves; an admin sets a new one from Clients.
- The Tap, BENEFIT and PayPal adapters follow each provider's published protocol but have not been
  exercised against live merchant accounts from this codebase — run a sandbox transaction with
  your own credentials before enabling live mode.
