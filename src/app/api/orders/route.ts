import { NextRequest } from "next/server";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/order";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const payload = {
      ...body,
      receivedAt: new Date().toISOString(),
    };

    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!n8nRes.ok) {
      console.error("n8n webhook failed:", n8nRes.status, await n8nRes.text());
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Order API error:", error);
    return Response.json({ success: false }, { status: 500 });
  }
}
