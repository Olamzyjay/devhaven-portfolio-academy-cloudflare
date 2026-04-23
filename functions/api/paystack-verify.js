import { json } from "../../cf/_utils.js";

export async function onRequestGet(context) {
  const secretKey = context.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return json(500, { error: "PAYSTACK_SECRET_KEY is not set on the server." });
  }

  const url = new URL(context.request.url);
  const reference = String(url.searchParams.get("reference") || "").trim();
  if (!reference) {
    return json(400, { error: "Missing reference" });
  }

  try {
    const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey}` }
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data) {
      return json(resp.status || 502, { error: "Paystack verify failed", details: data?.message || data || "Unknown error" });
    }

    const tx = data.data || {};
    const verified = data.status === true && tx.status === "success";

    return json(200, {
      ok: true,
      verified,
      reference: tx.reference || reference,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      paid_at: tx.paid_at,
      gateway_response: tx.gateway_response,
      customer: tx.customer,
      metadata: tx.metadata
    });
  } catch (err) {
    return json(500, { error: "Server error while contacting Paystack", details: err?.message || String(err) });
  }
}

