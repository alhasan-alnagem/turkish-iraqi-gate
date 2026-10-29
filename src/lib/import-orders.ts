import "server-only";

import { query } from "@/lib/db";
import { createOrder, normalisePhone } from "@/lib/orders";

/**
 * One-off import of the Google Sheet backlog.
 *
 * The sheet's columns are, in order:
 *   # | Name | Phone | Product | Quantity | Budget | Currency | Shipping | City | Details | Language | Received At
 *
 * Nothing here is scheduled or exposed publicly — an administrator pastes the
 * CSV on /portal/import. Rows that already exist (same phone, same day) are
 * skipped, so re-uploading the same export cannot duplicate the backlog.
 */

export type ImportResult = {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
};

/** Splits one CSV line, honouring quoted fields with embedded commas/newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** Accepts the date shapes Google Sheets exports and returns ISO, or null. */
export function parseSheetDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  // YYYY-MM-DD HH:mm:ss (what the Apps Script writes)
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (iso) {
    const [, y, m, d, hh, mm, ss] = iso;
    return new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss ?? "00"}Z`).toISOString();
  }

  // D/M/YYYY H:mm:ss — day first, as sheets in this region render it
  const dayFirst = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (dayFirst) {
    const [, d, m, y, hh, mm, ss] = dayFirst;
    const pad = (v: string) => v.padStart(2, "0");
    return new Date(
      `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:${ss ?? "00"}Z`,
    ).toISOString();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function alreadyImported(
  phone: string,
  createdAt: string | null,
  name: string,
  product: string,
): Promise<boolean> {
  const digits = normalisePhone(phone);
  if (!digits) return false;

  const normalisedPhone =
    "regexp_replace(regexp_replace(phone, '\\D', '', 'g'), '^(00)?(964)?0*', '')";

  // With a readable date the same phone on the same day is the same order.
  // Without one (a malformed sheet export) fall back to phone + name + product.
  const rows = createdAt
    ? await query<{ id: string }>(
        `select id from orders
         where ${normalisedPhone} = $1 and created_at::date = $2::date
         limit 1`,
        [digits, createdAt],
      )
    : await query<{ id: string }>(
        `select id from orders
         where ${normalisedPhone} = $1
           and lower(name) = lower($2)
           and lower(coalesce(product, '')) = lower($3)
         limit 1`,
        [digits, name, product],
      );

  return rows.length > 0;
}

const SHIPPING_TRUE = new Set(["yes", "true", "1", "y", "shipping", "نعم", "evet"]);

export async function importCsv(text: string): Promise<ImportResult> {
  const cleaned = text.replace(/^\uFEFF/, "");
  const rows = parseCsv(cleaned);
  const result: ImportResult = { created: 0, skipped: 0, failed: 0, errors: [] };

  for (const [index, row] of rows.entries()) {
    const cells = row.map((cell) => cell.trim());
    if (cells.every((cell) => cell === "")) continue;

    const [first, name, phone, product, quantity, budget, currency, shipping, city, details, lang, receivedAt] =
      cells;

    // Header row, or a row with no customer to contact.
    if (first === "#" || /^name$/i.test(name ?? "")) {
      continue;
    }
    if (!name || !phone) {
      result.failed += 1;
      if (result.errors.length < 5) result.errors.push(`Row ${index + 1}: missing name or phone`);
      continue;
    }

    const createdAt = parseSheetDate(receivedAt ?? "");

    try {
      if (await alreadyImported(phone, createdAt, name, product ?? "")) {
        result.skipped += 1;
        continue;
      }

      const budgetValue = (budget ?? "").replace(/[^\d.,]/g, "");
      const upperCurrency = (currency ?? "").toUpperCase();

      await createOrder({
        name,
        phone,
        product: product ?? "",
        quantity: quantity ?? "",
        budget: budgetValue,
        currency: upperCurrency === "IQD" ? "IQD" : upperCurrency === "USD" ? "USD" : "USD",
        shipping: SHIPPING_TRUE.has((shipping ?? "").toLowerCase()),
        city: city ?? "",
        details: details ?? "",
        lang: (lang ?? "").toLowerCase(),
        source: "sheet-import",
        createdAt: createdAt ?? undefined,
      });

      result.created += 1;
    } catch (error) {
      result.failed += 1;
      if (result.errors.length < 5) {
        result.errors.push(
          `Row ${index + 1}: ${error instanceof Error ? error.message : "could not import"}`,
        );
      }
    }
  }

  return result;
}
