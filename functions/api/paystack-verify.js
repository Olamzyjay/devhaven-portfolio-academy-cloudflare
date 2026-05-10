import { json } from "../cf/_utils.js";
import {
  appendPaymentRecord,
  readPayments,
  writePayments
} from "../cf/invoice-storage.js";

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
    const metadata = tx.metadata || {};

    if (verified) {
      const paymentType = String(metadata.payment_type || (metadata.invoiceId ? "invoice" : "academy_checkout")).trim() || "academy_checkout";
      const payments = await readPayments(context.env);
      const updatedPayments = appendPaymentRecord(payments, {
        reference: tx.reference || reference,
        paymentType,
        source: paymentType === "support" ? String(metadata.support_source || "studio") : paymentType === "academy_checkout" ? "academy" : "invoice",
        status: String(tx.status || "unknown"),
        amount: Math.round((Number(tx.amount) || 0) / 100),
        currency: String(tx.currency || "NGN"),
        customerEmail: String(tx.customer?.email || metadata?.customer?.email || metadata?.donor?.email || ""),
        customerName: String(tx.customer?.first_name || metadata?.customer?.fullName || metadata?.donor?.fullName || ""),
        invoiceId: String(metadata.invoiceId || ""),
        invoiceNumber: String(metadata.invoiceNumber || ""),
        chargeType: String(metadata.chargeType || ""),
        gatewayResponse: String(tx.gateway_response || ""),
        channel: String(tx.channel || ""),
        paidAt: tx.paid_at || new Date().toISOString(),
        metadata
      });
      await writePayments(context.env, updatedPayments);
    }

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
