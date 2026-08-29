import { NextRequest } from "next/server";

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
      shipping: body.shipping === "yes" ? "yes" : "no",
      city: body.city || "",
      details: body.details || "",
      lang: body.lang || "",
      receivedAt: new Date().toISOString(),
    };

    if (GOOGLE_SHEETS_URL) {
      const res = await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Google Sheets web app failed:", res.status, await res.text());
      }

      return Response.json({ success: true }, { status: 200 });
    }

    return Response.json({ success: false, error: "No destination configured" }, { status: 500 });
  } catch (error) {
    console.error("Order API error:", error);
    return Response.json({ success: false }, { status: 500 });
  }
}
