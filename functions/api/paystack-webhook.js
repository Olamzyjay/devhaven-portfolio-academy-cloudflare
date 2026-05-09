function textResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function hmacSha512Hex(secret, body) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(signature))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost(context) {
  const secret = context.env.PAYSTACK_SECRET_KEY;
  const signature = context.request.headers.get("x-paystack-signature");
  const body = await context.request.text();

  if (!secret) {
    return textResponse("Missing secret", 500);
  }

  const hash = await hmacSha512Hex(secret, body);

  if (hash !== signature) {
    return textResponse("Invalid signature", 401);
  }

  const payload = JSON.parse(body);

  if (payload.event === "charge.success") {
    const payment = payload.data;

    const reference = payment.reference;
    const amountPaid = payment.amount / 100;
    const customerEmail = payment.customer?.email;
    const status = payment.status;

    console.log("Payment successful:", {
      reference,
      amountPaid,
      customerEmail,
      status
    });

    /*
      TODO:
      Update your invoice record here.

      Example logic:
      - Find invoice by payment.reference
      - Confirm amount matches invoice amount
      - Mark invoice as paid
      - Save paid_at date
    */
  }

  return textResponse("Webhook received", 200);
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return textResponse("Method Not Allowed", 405);
  }
  return onRequestPost(context);
}
