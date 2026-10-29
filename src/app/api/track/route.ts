import type { NextRequest } from "next/server";
import { getOrderByRef, getTimeline, normalisePhone } from "@/lib/orders";
import { ORDER_STATUSES, statusLabel, statusStep } from "@/lib/order-status";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* Lookup throttle. Kept separate from the login one because Iraqi mobile
 * networks share addresses (CGNAT), so this must be generous: it only stops
 * automated reference-walking, not a family checking one order repeatedly. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_LOOKUPS = 40;
const lookups = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = lookups.get(key);
  if (!entry || entry.resetAt < now) {
    lookups.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (lookups.size > 5000) lookups.clear();
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_LOOKUPS;
}

type Lang = "en" | "ar" | "tr";

function asLang(value: unknown): Lang {
  return value === "ar" || value === "tr" ? value : "en";
}

/**
 * Public shipment tracking. Requires the order reference AND the phone number
 * used when ordering — one alone is not enough, so references cannot be walked.
 */
export async function POST(request: NextRequest) {
  // A customer checking their own order does this a handful of times; anything
  // faster is someone walking the reference numbers.
  const key = `track:${(request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`;
  if (rateLimited(key)) {
    return Response.json({ error: "Too many lookups. Try again in a few minutes." }, { status: 429 });
  }

  let ref = "";
  let phone = "";
  let lang: Lang = "en";

  try {
    const body = (await request.json()) as { ref?: unknown; phone?: unknown; lang?: unknown };
    ref = typeof body.ref === "string" ? body.ref.trim() : "";
    phone = typeof body.phone === "string" ? body.phone.trim() : "";
    lang = asLang(body.lang);
  } catch {
    /* handled below */
  }

  if (!ref || !phone) {
    return Response.json({ error: "Enter your order number and phone number." }, { status: 400 });
  }

  const order = await getOrderByRef(ref).catch(() => null);

  // Wrong reference and wrong phone look identical from the outside.
  if (!order || normalisePhone(order.phone) !== normalisePhone(phone)) {
    await sleep(500);
    return Response.json({ error: "No order matches that number and phone." }, { status: 404 });
  }

  const timeline = await getTimeline(order.id);

  return Response.json({
    order: {
      ref: order.ref,
      name: order.name,
      product: order.product,
      status: order.status,
      statusLabel: statusLabel(order.status, lang),
      step: statusStep(order.status),
      totalSteps: ORDER_STATUSES.length,
      updatedAt: order.updated_at,
    },
    history: timeline
      .filter((event) => event.status)
      .map((event) => ({
        status: event.status,
        label: statusLabel(event.status!, lang),
        at: event.created_at,
      })),
  });
}
