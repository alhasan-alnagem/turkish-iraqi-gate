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

## 10. Admin panel (`/admin`) — added Oct 2026
- Purpose: let the user add/remove catalog PDFs without a code change or redeploy.
- **Login is the site's own password, not the mailbox.** Password lives in
  `ADMIN_PASSWORD`, session cookie is HMAC-signed with `ADMIN_SESSION_SECRET`
  (8 h, httpOnly, `sameSite=lax`, `secure` in production). Code: `src/lib/admin-auth.ts`,
  routes `/api/admin/login|logout`, page `/admin/login`. Session tokens are verified in
  every admin page and every `/api/admin/*` route — keep it that way when adding routes.
- **The mailbox is deliberately NOT integrated.** PrivateEmail offers webmail + IMAP
  only (no OAuth/SSO/login API), so the panel shows an "Open PrivateEmail" link that
  opens privateemail.com in a new tab. Do not "connect" the login form to it: that would
  mean storing the mailbox password server-side and replaying a login, which is credential
  harvesting and breaks on captcha/2FA.
- **Uploads go to Vercel Blob** (needs `BLOB_READ_WRITE_TOKEN`), not the repo: the repo is
  public, and the function body limit would cap uploads at ~4.5 MB. The browser asks
  `/api/admin/blob-upload` for a token and uploads directly.
- **Stamping happens in the browser before upload** (`src/lib/stamp-pdf.ts`): 45°, 55%
  opacity bilingual logo (built from the two SVG logos by `scripts/make-stamp.mjs` into
  `src/assets/stamp-logo.png`, deliberately outside `public/`), noise layer, invisible
  protection text, and supplier metadata (author/title/producer) is stripped. The
  untouched original never leaves the operator's machine.
- Files are stored with neutral names (`catalogs/<category>/<category>.pdf` + random
  suffix) so supplier filenames never appear in a URL.
- Repo-committed PDFs show as "locked" in the panel and can only be removed via a commit.
- `/admin` is disallowed in `robots.ts` and `noindex`; it has its own root layout
  (`src/app/admin/layout.tsx`) outside the `[lang]` tree, English-only by design.
