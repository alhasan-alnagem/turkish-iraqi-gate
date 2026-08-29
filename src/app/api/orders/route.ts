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
      try {
        await fetch(GOOGLE_SHEETS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json;charset=utf-8" },
          body: JSON.stringify(payload),
          redirect: "follow",
        });
      } catch (err) {
        console.error("Google Sheets write error:", err);
      }
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Order API error:", error);
    return Response.json({ success: true }, { status: 200 });
  }
}
