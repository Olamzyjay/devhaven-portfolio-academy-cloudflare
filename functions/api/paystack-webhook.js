import { hmacSha512Hex, text } from "../cf/_utils.js";
import {
  appendPayment,
  appendPaymentRecord,
  readInvoices,
  readPayments,
  writeInvoices,
  writePayments
} from "../cf/invoice-storage.js";

export async function onRequestPost(context) {
  const secret = context.env.PAYSTACK_SECRET_KEY;
  const signature = context.request.headers.get("x-paystack-signature");
  const body = await context.request.text();

  if (!secret) {
    return text("Missing secret", 500);
  }

  const hash = await hmacSha512Hex(secret, body);
  if (hash !== signature) {
    return text("Invalid signature", 401);
  }

  const payload = JSON.parse(body);

  if (payload.event === "charge.success") {
    const payment = payload.data;
    const reference = payment.reference;
    const amountPaid = payment.amount / 100;
    const customerEmail = payment.customer?.email;
    const status = payment.status;
    const metadata = payment.metadata || {};
    const invoiceId = String(metadata.invoiceId || "").trim();
    const chargeType = String(metadata.chargeType || "full").trim() || "full";
    const paymentType = String(metadata.payment_type || (invoiceId ? "invoice" : "academy_checkout")).trim() || "academy_checkout";

    const payments = await readPayments(context.env);
    const updatedPayments = appendPaymentRecord(payments, {
      reference,
      paymentType,
      source: paymentType === "support" ? String(metadata.support_source || "studio") : paymentType === "academy_checkout" ? "academy" : "invoice",
      status: status === "success" ? "success" : String(status || "unknown"),
      amount: Math.round(Number(amountPaid) || 0),
      currency: String(payment.currency || "NGN"),
      customerEmail: String(customerEmail || metadata?.customer?.email || metadata?.donor?.email || ""),
      customerName: String(metadata?.customer?.fullName || metadata?.donor?.fullName || ""),
      invoiceId,
      invoiceNumber: String(metadata.invoiceNumber || ""),
      chargeType,
      gatewayResponse: String(payment.gateway_response || ""),
      channel: String(payment.channel || ""),
      paidAt: payment.paid_at || new Date().toISOString(),
      metadata
    });
    await writePayments(context.env, updatedPayments);

    if (invoiceId) {
      const invoices = await readInvoices(context.env);
      const index = invoices.findIndex((item) => item.id === invoiceId);
      if (index >= 0) {
        const existing = invoices[index];
        const updated = appendPayment(existing, {
          reference,
          status: status === "success" ? "success" : String(status || "unknown"),
          amount: Math.round(Number(amountPaid) || 0),
          paidAt: payment.paid_at || new Date().toISOString(),
          chargeType,
          channel: String(payment.channel || ""),
          gatewayResponse: String(payment.gateway_response || ""),
          customerEmail: String(customerEmail || ""),
          source: "webhook"
        });
        invoices[index] = updated;
        await writeInvoices(context.env, invoices);
      }
    }
  }

  return text("Webhook received", 200);
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return text("Method Not Allowed", 405);
  }
  return onRequestPost(context);
}
