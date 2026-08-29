import { NextRequest } from "next/server";
import { after } from "next/server";

const GOOGLE_SHEETS_URL = process.env.GOOGLE_SHEETS_URL || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const payload = {
      name: body.name || "",
      phone: body.phone || "",
      product: body.product || "",
      quantity: body.quantity || "",
      budget: body.budget || "",
      budgetCurrency: (body.budgetCurrency || "usd").toUpperCase(),
      shipping: body.shipping === "yes" ? "yes" : "no",
      city: body.city || "",
      details: body.details || "",
      lang: body.lang || "",
      receivedAt: new Date().toISOString(),
    };

    if (GOOGLE_SHEETS_URL) {
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

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Order API error:", error);
    return Response.json({ success: true }, { status: 200 });
  }
}

