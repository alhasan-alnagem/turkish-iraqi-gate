import { NextRequest, after } from "next/server";
import { createOrder, whatsappNumber } from "@/lib/orders";

const GOOGLE_SHEETS_URL = process.env.GOOGLE_SHEETS_URL || "";

export const runtime = "nodejs";

type Payload = {
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

export async function POST(request: NextRequest) {
  let payload: Payload | null = null;

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const countryCode =
      typeof body.countryCode === "string" ? body.countryCode.replace(/\D/g, "") : "964";
    const currency = (typeof body.budgetCurrency === "string" ? body.budgetCurrency : "usd").toUpperCase();
    const shipping = body.shipping === "yes";
    const product = typeof body.product === "string" ? body.product : "";
    const quantity = typeof body.quantity === "string" ? body.quantity : "";
    const budget = typeof body.budget === "string" ? body.budget : "";
    const city = typeof body.city === "string" ? body.city : "";
    const details = typeof body.details === "string" ? body.details : "";
    const lang = typeof body.lang === "string" ? body.lang : "";

    // An order with no way to contact the customer is not an order.
    if (!name || !phone) {
      return Response.json({ success: false, error: "missing-contact" }, { status: 400 });
    }

    // The database is the source of truth for the portal. If it is unavailable
    // the lead must still reach the Google Sheet — the customer filled the form
    // and must never see an error because of our infrastructure.
    let ref = "";
    try {
      const order = await createOrder({
        name,
        phone,
        countryCode,
        product,
        quantity,
        budget,
        currency,
        shipping,
        city,
        details,
        lang,
        source: "website",
      });
      ref = order.ref;
    } catch (error) {
      console.error("Order persistence error:", error);
    }

    payload = {
      name,
      phone,
      phoneIntl: whatsappNumber(phone, countryCode),
      countryCode,
      product,
      quantity,
      budget,
      budgetCurrency: currency,
      shipping: shipping ? "yes" : "no",
      city,
      details,
      lang,
      ref,
      receivedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Order API error:", error);
    return Response.json({ success: true }, { status: 200 });
  }

  if (GOOGLE_SHEETS_URL && payload) {
    // Respond to the user instantly, then write to Google Sheets after the
    // response is sent. `after` keeps the task alive so the write completes
    // without making the user wait on Google's slow redirect handshake.
    const bodyText = JSON.stringify(payload);
    after(async () => {
      await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=utf-8" },
        body: bodyText,
        redirect: "follow",
      }).catch((err) => {
        console.error("Google Sheets write error:", err);
      });
    });
  }

  // `ref` lets the confirmation message show the customer their tracking number.
  return Response.json({ success: true, ref: payload?.ref || "" }, { status: 200 });
}
