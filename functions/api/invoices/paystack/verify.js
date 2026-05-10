import { json } from "../../../cf/_utils.js";
import {
  appendPayment,
  appendPaymentRecord,
  readInvoices,
  readPayments,
  writeInvoices,
  writePayments
} from "../../../cf/invoice-storage.js";

export async function onRequestGet(context) {
  const secretKey = context.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return json(500, { error: "PAYSTACK_SECRET_KEY is not set on the server." });
  }

  const url = new URL(context.request.url);
  const reference = String(url.searchParams.get("reference") || "").trim();
  if (!reference) {
    return json(400, { error: "Payment reference is required." });
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` }
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.status || !data?.data) {
      return json(response.status || 502, {
        error: "Could not verify Paystack payment.",
        details: data?.message || "Unknown error"
      });
    }

    const transaction = data.data;
    const metadata = transaction.metadata || {};
    const invoiceId = String(metadata.invoiceId || "").trim();

    if (!invoiceId) {
      return json(400, { error: "This payment is not attached to a saved invoice." });
    }

    const invoices = await readInvoices(context.env);
    const index = invoices.findIndex((item) => item.id === invoiceId);
    if (index < 0) {
      return json(404, { error: "Invoice not found for this payment." });
    }

    const existing = invoices[index];
    const nextInvoice = appendPayment(existing, {
      reference,
      status: transaction.status === "success" ? "success" : String(transaction.status || "unknown"),
      amount: Math.round((Number(transaction.amount) || 0) / 100),
      paidAt: transaction.paid_at || new Date().toISOString(),
      chargeType: String(metadata.chargeType || "full"),
      channel: String(transaction.channel || ""),
      gatewayResponse: String(transaction.gateway_response || "")
    });

    invoices[index] = nextInvoice;
    await writeInvoices(context.env, invoices);

    const payments = await readPayments(context.env);
    const updatedPayments = appendPaymentRecord(payments, {
      reference,
      paymentType: "invoice",
      source: "invoice",
      status: String(transaction.status || "unknown"),
      amount: Math.round((Number(transaction.amount) || 0) / 100),
      currency: String(transaction.currency || "NGN"),
      customerEmail: String(transaction.customer?.email || existing.clientEmail || ""),
      customerName: String(existing.clientName || ""),
      invoiceId: existing.id,
      invoiceNumber: existing.invoiceNumber,
      chargeType: String(metadata.chargeType || "full"),
      gatewayResponse: String(transaction.gateway_response || ""),
      channel: String(transaction.channel || ""),
      paidAt: transaction.paid_at || new Date().toISOString(),
      metadata
    });
    await writePayments(context.env, updatedPayments);

    return json(200, {
      ok: true,
      invoice: nextInvoice,
      payment: {
        reference,
        status: transaction.status,
        amount: Math.round((Number(transaction.amount) || 0) / 100)
      }
    });
  } catch (error) {
    return json(500, { error: error.message || "Could not verify Paystack invoice payment." });
  }
}
