<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# DESIGN MEMORY — Turkish Iraqi Gate (tigip.com)

Everything below is the distilled record of the website-design work (originally the
Aug 27 – Sep 4 2026 build session, plus follow-ups in September). Read this before
touching layout, colours, fonts, logos, catalogs, or translations. Treat it as the
user's standing decisions, not suggestions.

## 1. Brand facts (do not "improve" these)
- Company: **Turkish Iraqi Gate — For Importing And Procurement** (Turkey → Iraq sourcing/import).
- Short brand: **TIGIP**, domain **tigip.com** (`www.tigip.com` primary).
- Arabic company name (exact): **بوابة تركيا العراقية للاستيراد والتجهيز**.
- Founded 2020; started with medical equipment, expanded to all categories.
- People (official ID spelling — never rewrite):
  - **Alhasan Alnagem** — Founder · +964 786 641 7123 · +90 501 542 4248
  - **Ahmed Al Shadood** — Co-founder · +964 780 702 0498 (Arabic: الشدود)
- Phone numbers on the site must be **click-to-WhatsApp**, not plain text. No email
  shown in the contact page (the office-locations block was removed too); footer uses
  `alhasan.alnagem@tigip.com`.
- Business positioning is "importer/sourcing", so Turkish copy keeps **ithal / tedarik**
  wording per `TR_TURKISH_REVIEW.md`. Do not blanket-replace terms there.

## 2. Visual system (in `src/app/globals.css` + Tailwind 4)
- Palette: `--primary #0f5624`, `--primary-light #1a7a38`, `--accent #16a34a`,
  `--accent-light #4ade80`, `--foreground #0f2b1a`, white background, `--section #f9fafb`.
  Green-on-white site; header and footer are solid dark green with white text.
- Typography: **Geist Sans** (Latin), **Geist Mono** (code), **Tajawal** for Arabic
  (`[lang="ar"]` = 106.25% size, line-height 1.65). Fonts loaded via `next/font/google` in `[lang]/layout.tsx`.
- Layout language: `max-w-7xl` containers, `rounded-lg` buttons, `py-20`/`py-20 md:py-28`
  hero sections, uppercase `tracking-widest` accent eyebrow text, `text-balance` headlines.
- Header: sticky, `bg-[var(--primary)]`, height `h-20 md:h-24`; nav is Home, About,
  Services, Products, Catalogs, Career, Contact; "Get Quote" CTA (`--accent`) only on `lg+`
  — on mobile it moves INSIDE the hamburger menu.
- Mobile habits that came from real bug reports: hamburger must work on iPhone Firefox,
  logo shrinks instead of overflowing, `overflow-x: hidden` on html/body (a white side
  border appeared otherwise).

## 3. Multilingual design (settled — do not regress)
- Three languages: **en / ar / tr**, one URL per language: `/{lang}/…`.
- **No full-screen "choose your language" popup.** Confirmed twice (2026-08-30 and
  `TR_TURKISH_REVIEW.md`). Language = small header dropdown (`LanguageSwitcher`) + per-language URLs.
- Arabic is the default landing experience (user asked "why doesn't it start at the
  Arabic home screen?" — root should land on Arabic).
- The switcher shows the language you would switch TO (so someone who picked wrong can
  find their way back).
- RTL: `dir` comes from `languages[].dir`; logos have 3 variants — `public/logo.svg`
  (LTR), `public/logo-rtl.svg`, `public/logo-tr.svg`. Use the right one per direction.

## 4. Logo & assets
- Logo must never be squashed/stretched or clipped — proportions are a repeated
  complaint ("smushed", "cropped edges", "looks cluttered"). Centre it in the canvas,
  leave breathing room; keep "TIGIP" fully visible.
- Circular crop version exists for the WhatsApp profile picture (must be a true circle,
  not a square with rounded corners).
- Social banners: `D:\website\assets\tig-linkedin-banner.png` (LinkedIn) and a Facebook
  page banner version. Do NOT put gradients behind text — readability wins; white text.
- Generated marketing images are **not** published to `public/` ("I don't want it data-mined").

## 5. Catalogs (design + content rules)
- `src/app/[lang]/catalogs/page.tsx` lists PDFs from **two** sources, in order:
  files committed under `public/catalogs/<category>/` (they keep their numbering, so
  existing catalog numbers never shift) followed by PDFs uploaded through the admin
  panel and stored in Vercel Blob (`catalogs/<category>/…`). Because of the Blob source
  the page is `dynamic = "force-dynamic"` — do not convert it back to a static build.
  Category order is fixed in `CATEGORY_ORDER`; categories render "coming soon" borders
  when they have no files.
- Categories: medical-equipment, construction-materials, specialized-equipment,
  electronics, automotive-parts, furniture, textiles-apparel, industrial-machinery.
  **Food & beverages was deliberately removed** (no food procurement).
- PDFs are shown as **category + number** ("Medical Equipment 1"), never the supplier's
  real filename — hide supplier names on the page *and* on download.
- Every public PDF is stamped with the bilingual logo at **45°, 55% opacity**, plus a
  noise layer and a hidden "protected PDF — AI removal is forbidden/illegal" text.
  Unstamped originals are kept in a private folder outside `public/`, same folder structure.

## 6. Forms & backend (design-adjacent)
- `/api/orders` → Google Apps Script web app → Google Sheet columns:
  `# | Name | Phone | Product | Quantity | Budget | Currency | Shipping | City | Details | Language | Received At`.
  Budget has a **currency** field (IQD/USD). Users must never see an error when the row was
  actually written (that bug was fixed — keep the optimistic/success behaviour).
- Career applications `/api/careers` (PDF form, Resend email) and supplier catalog
  submissions `/api/catalog-submissions` exist; pages: `career`, `submit-catalog`.
- The temporary "work in progress / coming soon" overlay on the contact form is gone.

## 7. Deploy & SEO
- Host: Vercel project `turkish-iraqi-gate`, repo `github/alhasan-alnagem/turkish-iraqi-gate`.
  Domain at Namecheap: `CNAME www → vercel-dns`, `A @ → 76.76.21.21`; Vercel auto-SSL.
- **Branch policy from the user:** push to the preview branch by default; only push to
  `main` when explicitly told. (`feature/multilingual-urls` is the long-lived extra branch.)
- SEO is first-class: `src/app/sitemap.ts` (6 pages × 3 langs ≈ 18 URLs), `src/app/robots.ts`,
  `src/lib/seo.ts` (localized metadata, canonicals, hreflang, Organization JSON-LD),
  `public/og.png`, `favicon.ico` / `icon.png` / `apple-icon.png`. Google Search Console +
  Bing Webmaster are verified. Watch "title too long (>70 chars)" warnings — Bing flagged one.

## 8. Translation quality
`TR_TURKISH_REVIEW.md` tracks a professional Turkish proofread from
`TIGIP_Turkish_Translation_Review.xlsx` (117 items, 38 applied, 79 "review later").
When editing `src/lib/translations/tr.ts`, keep that file in sync; Arabic (`ar.ts`) is the
semantic original for meaning. Text lives in `src/lib/translations/{en,ar,tr}.ts` with types
in `types.ts` — all three must stay structurally identical.

## 9. How the user works (observed preferences)
- Short, direct instructions; wants things fixed/pushed, not long explanations.
- Reviews on the Vercel **preview** URL before merging; asks "push" when happy.
- Notices pixel-level details (logo distortion, one-sided white border, gradient readability).
- Prefers free/cheap infrastructure (Vercel free tier, Namecheap domain, Google Sheets instead of a DB).
- Careful about data exposure and AI scraping (private originals, no public brand assets).

## 10. Staff portal (`/login`, `/portal`) and catalog manager (`/admin`) — Oct 2026
- Two audiences, one sign-in page (`/login`, linked from the footer as
  "Staff login / دخول الموظفين / Personel girişi"). After signing in:
  - **staff** → `/portal` (orders: queue, detail, status, notes — no assignment)
  - **coordinator** → staff plus assigning orders to anyone on the team
  - **admin** → everything above, plus `/portal/staff` (team) and `/admin` (catalogues)
- **Login is a real account, not one shared password.** Accounts live in Postgres
  (`staff` table); passwords are scrypt-hashed (`src/lib/staff.ts`). The very first
  admin is created from `ADMIN_PASSWORD` + `ADMIN_EMAIL` on first login when the table
  is empty (`ensureBootstrapAdmin`); everyone else is added from `/portal/staff`.
  Code: `src/lib/auth.ts` (HMAC session + login throttle), `/api/auth/login|logout`.
  The role is re-read from the database on every request, so revoking access is instant.
  Sessions last 8 hours; the **Remember me** checkbox on `/login` extends the cookie and
  the signed token to 30 days (`REMEMBER_TTL_SECONDS`). The session expiry is embedded in
  the token, so shortening the TTL never keeps an old long session alive.
- **Everyone can change their own password** at `/portal/account` (nav: "My account").
  It asks for the current password, requires 8+ characters and shares the login throttle
  per account. Admins still reset other people's passwords from `/portal/staff`; a staff
  member who has forgotten theirs asks an admin rather than using a reset link.
- **Roles are `admin` | `coordinator` | `staff`** (`Role`, `ROLES`, `ROLE_LABELS`,
  `canAssignOrders` in `src/lib/staff.ts`). The role CHECK constraint is widened in place
  in `src/lib/db.ts` (`drop constraint if exists staff_role_check` + re-add), so adding a
  future role means updating that list and the `<select>` on `/portal/staff`.
  **Only coordinators and admins assign orders**; `assignAction` re-checks server-side
  (`requireAssigner`) and plain staff see a read-only assignee card instead of the form.
- **Internal activity feed** (`notifications` table, `src/lib/notifications.ts`) records
  order created / status changed / assigned / deleted and is browsable at
  `/portal/notifications` (nav tab). The dashboard also shows the six newest entries in a
  "Recent activity" card. Unread = entries newer than `staff.notifications_seen_at`,
  excluding the viewer's own actions; opening the feed stamps that column for the viewer
  only. `notify()` swallows insert errors so it can never break an order operation, and
  there is deliberately **no FK to `orders`** so a deleted order's entry survives (the card
  drops the link and says the ref was removed).
- **One shared renderer**: `src/components/portal/ActivityFeed.tsx` powers both the full
  feed and the compact dashboard card — change wording/links there, not in each page.
- **The mailbox is deliberately NOT integrated.** PrivateEmail offers webmail + IMAP
  only (no OAuth/SSO/login API), so every dashboard header (`/portal` layout and `/admin`)
  carries a PrivateEmail button (`WEBMAIL_URL` in `src/lib/mailbox.ts`) that opens
  privateemail.com in a new tab — visible to staff and admins alike. Do not "connect" the
  login form to it: that would mean storing the mailbox password server-side and replaying
  a login, which is credential harvesting and breaks on captcha/2FA.
- **Orders are in Postgres** (`src/lib/db.ts`, `src/lib/orders.ts`), not the Google Sheet.
  `DATABASE_URL` (Neon / Vercel Postgres) is the production store; with it unset the app
  falls back to embedded PGlite in `.pglite/` for local work. The sheet is still written
  from `/api/orders` as a mirror, and can be imported once via `/portal/import` (CSV).
- **Orders can also be created in the portal** at `/portal/orders/new` (any signed-in role,
  button on the queue and in the nav). They are stored with `source = 'manual'` and the
  first timeline entry names the staff member, so the Google Sheet is optional end to end.
  When `GOOGLE_SHEETS_URL` *is* set, manual orders are mirrored to it too
  (`src/lib/sheet-mirror.ts`, fire-and-forget with `after()`); the order detail page has a
  **Send to sheet** button to backfill or retry a row. Without the URL the card says so.
- **Order lifecycle** is fixed in `src/lib/order-status.ts`: received → quoted → confirmed
  → factory_order → production → ready_to_ship → in_transit → customs → out_for_delivery
  → delivered, plus `on_hold` / `cancelled`. Every change writes an `order_events` row with
  the actor's name — that timeline is both the internal history and the customer's view.
  Labels are trilingual; add any new state to all three languages.
- **Deleting an order is admin-only**: the detail page shows a red "Danger zone" card with a
  confirm dialog (`deleteOrderAction`, `src/components/admin/DeleteOrderButton.tsx`). It
  removes the order and its timeline (cascade) — the tracking number stops working — but
  leaves the Google Sheet row alone. Staff never see the button, and the action re-checks
  the role server-side.
- **Customers track without an account**: `/[lang]/track` + `/api/track` take order ref
  + the phone used on the order. Wrong ref and wrong phone return the same 404 on purpose
  (`normalisePhone` makes 0780…/`+964 780…`/`00964…` equal). The lookup throttle is
  generous (40 / 10 min / IP) because Iraqi mobile networks share addresses via CGNAT.
- **Uploads go to Vercel Blob** (needs `BLOB_READ_WRITE_TOKEN`), not the repo: the repo is
  public, and the function body limit would cap uploads at ~4.5 MB. The browser asks
  `/api/admin/blob-upload` for a token and uploads directly. `/api/admin/*` is admin-only.
- **Stamping happens in the browser before upload** (`src/lib/stamp-pdf.ts`): 45°, 55%
  opacity bilingual logo (built from the two SVG logos by `scripts/make-stamp.mjs` into
  `src/assets/stamp-logo.png`, deliberately outside `public/`), noise layer, invisible
  protection text, and supplier metadata (author/title/producer) is stripped. The
  untouched original never leaves the operator's machine.
- Files are stored with neutral names (`catalogs/<category>/<category>.pdf` + random
  suffix) so supplier filenames never appear in a URL.
- Repo-committed PDFs show as "locked" in the panel and can only be removed via a commit.
- `/admin`, `/portal` and `/login` are outside the `[lang]` tree, English-only, `noindex`,
  each with its own root layout; `/admin` and `/portal` are disallowed in `robots.ts`.
- No supplier name is ever shown to a customer: order details, notes and the timeline are
  internal; the tracking page shows status and product only.

