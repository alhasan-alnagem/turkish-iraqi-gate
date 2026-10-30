import "server-only";

import { after } from "next/server";
import type { Order } from "@/lib/orders";
import { whatsappNumber } from "@/lib/orders";

/**
 * The Google Sheet is a mirror, never the source of truth. Every order lives in
 * Postgres; if GOOGLE_SHEETS_URL is unset (or Google is down) the portal keeps
 * working and the sheet simply misses the row.
 *
 * `phone` stays exactly as the customer typed it (the import matches on it),
 * while `countryCode` and `phoneIntl` are extra fields the Apps Script may use
 * to build a wa.me link. Unknown fields are ignored by the existing script.
 */
export type SheetPayload = {
  name: string;
  phone: string;
  phoneIntl: string;
  countryCode: string;
  product: string;
  quantity: string;
  budget: string;
  budgetCurrency: string;
  shipping: "yes" | "no";
  city: string;
  details: string;
  lang: string;
  ref: string;
  receivedAt: string;
};

export function sheetMirrorConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SHEETS_URL);
}

export function orderSheetPayload(order: Order): SheetPayload {
  return {
    name: order.name,
    phone: order.phone,
    phoneIntl: whatsappNumber(order.phone, order.country_code),
    countryCode: order.country_code,
    product: order.product,
    quantity: order.quantity,
    budget: order.budget,
    budgetCurrency: order.currency,
    shipping: order.shipping ? "yes" : "no",
    city: order.city,
    details: order.details,
    lang: order.lang,
    ref: order.ref,
    receivedAt: order.created_at,
  };
}

/** Awaited write, for the "send to sheet" button. */
export async function sendOrderToSheet(
  order: Order,
): Promise<{ ok: boolean; reason?: string }> {
  const url = process.env.GOOGLE_SHEETS_URL;
  if (!url) return { ok: false, reason: "GOOGLE_SHEETS_URL is not set in this deployment." };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify(orderSheetPayload(order)),
      redirect: "follow",
    });
    if (!response.ok) return { ok: false, reason: `Google answered ${response.status}.` };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "network error" };
  }
}

/** Fire-and-forget write used while creating an order, so nobody waits on Google. */
export function mirrorOrderToSheet(order: Order): void {
  const url = process.env.GOOGLE_SHEETS_URL;
  if (!url) return;

  const body = JSON.stringify(orderSheetPayload(order));
  after(async () => {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=utf-8" },
        body,
        redirect: "follow",
      });
    } catch (error) {
      console.error("Google Sheets write error:", error);
    }
  });
}
