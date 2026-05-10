import { clone, getHeader, json, makeInvoiceId, normalizeAmount } from "./_utils.js";

const INVOICE_KEY = "devhaven:invoices";
const PAYMENT_KEY = "devhaven:payments";

function getStore(env) {
  const store = env.DEVHAVEN_STORE;
  if (!store) {
    throw new Error("DEVHAVEN_STORE KV binding is not configured on Cloudflare.");
  }
  return store;
}

export function getInvoiceAdminKey(env) {
  return env.DEVHAVEN_INVOICE_ADMIN_KEY || env.DEVHAVEN_REGISTRY_ADMIN_KEY || "";
}

export function isInvoiceAuthorized(request, env) {
  const expected = getInvoiceAdminKey(env);
  const received = getHeader(request, "x-devhaven-key");
  return Boolean(expected) && received === expected;
}

export function computeInvoiceTotals(invoice) {
  const totalAmount = normalizeAmount(invoice.totalAmount);
  const paymentPlan = invoice.paymentPlan === "split60" ? "split60" : "full";
  const depositPercent = paymentPlan === "split60" ? 60 : 100;
  const depositAmount = paymentPlan === "split60" ? Math.round(totalAmount * 0.6) : totalAmount;
  const deliveryAmount = Math.max(0, totalAmount - depositAmount);
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  const paidAmount = payments.reduce((sum, payment) => {
    if (payment && payment.status === "success") {
      return sum + normalizeAmount(payment.amount);
    }
    return sum;
  }, 0);
  const balanceAmount = Math.max(0, totalAmount - paidAmount);
  const hasDepositCovered = paidAmount >= depositAmount;

  let dueNowAmount = balanceAmount;
  let nextPaymentLabel = "Pay remaining balance";

  if (paymentPlan === "split60") {
    if (!hasDepositCovered) {
      dueNowAmount = Math.max(0, depositAmount - paidAmount);
      nextPaymentLabel = paidAmount > 0 ? "Complete 60% upfront payment" : "Pay 60% upfront";
    } else if (balanceAmount > 0) {
      dueNowAmount = balanceAmount;
      nextPaymentLabel = "Pay remaining 40% on delivery";
    }
  } else if (balanceAmount > 0) {
    nextPaymentLabel = "Pay full invoice";
  }

  let paymentStatus = "sent";
  if (balanceAmount <= 0 && totalAmount > 0) {
    paymentStatus = "paid";
  } else if (paidAmount > 0) {
    paymentStatus = "partly-paid";
  } else if (String(invoice.status || "").toLowerCase() === "draft") {
    paymentStatus = "draft";
  }

  return {
    totalAmount,
    depositPercent,
    depositAmount,
    deliveryAmount,
    paidAmount,
    balanceAmount,
    dueNowAmount,
    nextPaymentLabel,
    paymentPlan,
    paymentStatus,
    hasDepositCovered
  };
}

export function normalizeInvoice(input = {}, existingInvoice = null) {
  const now = new Date().toISOString();
  const id = String(input.id || existingInvoice?.id || makeInvoiceId(input.projectTitle || input.clientName)).trim();
  const lineItems = Array.isArray(input.lineItems)
    ? input.lineItems
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const title = String(item.title || "").trim();
          const amount = normalizeAmount(item.amount);
          return title && amount > 0 ? { title, amount } : null;
        })
        .filter(Boolean)
    : [];

  const invoice = {
    id,
    invoiceNumber: String(input.invoiceNumber || existingInvoice?.invoiceNumber || id).trim(),
    clientName: String(input.clientName || "").trim(),
    clientEmail: String(input.clientEmail || "").trim(),
    clientPhone: String(input.clientPhone || "").trim(),
    projectTitle: String(input.projectTitle || "").trim(),
    description: String(input.description || "").trim(),
    currency: "NGN",
    totalAmount: normalizeAmount(input.totalAmount),
    paymentPlan: input.paymentPlan === "split60" ? "split60" : "full",
    issueDate: String(input.issueDate || existingInvoice?.issueDate || now.slice(0, 10)).trim(),
    dueDate: String(input.dueDate || "").trim(),
    status: String(input.status || existingInvoice?.status || "sent").trim(),
    notes: String(input.notes || "").trim(),
    lineItems,
    payments: Array.isArray(existingInvoice?.payments) ? clone(existingInvoice.payments) : [],
    createdAt: existingInvoice?.createdAt || now,
    updatedAt: now
  };

  return {
    ...invoice,
    ...computeInvoiceTotals(invoice)
  };
}

export function appendPayment(invoice, payment) {
  const payments = Array.isArray(invoice.payments) ? clone(invoice.payments) : [];
  const alreadyExists = payments.some((item) => item.reference === payment.reference);
  if (!alreadyExists) {
    payments.push(payment);
  }

  return normalizeInvoice(
    {
      ...invoice,
      payments
    },
    {
      ...invoice,
      payments,
      createdAt: invoice.createdAt,
      invoiceNumber: invoice.invoiceNumber
    }
  );
}

export function normalizePaymentRecord(input = {}, existing = null) {
  const now = new Date().toISOString();
  const metadata = input.metadata && typeof input.metadata === "object" ? clone(input.metadata) : {};

  return {
    reference: String(input.reference || existing?.reference || "").trim(),
    paymentType: String(input.paymentType || existing?.paymentType || "general").trim(),
    source: String(input.source || existing?.source || "").trim(),
    status: String(input.status || existing?.status || "unknown").trim(),
    amount: normalizeAmount(input.amount ?? existing?.amount),
    currency: String(input.currency || existing?.currency || "NGN").trim() || "NGN",
    customerEmail: String(input.customerEmail || existing?.customerEmail || "").trim(),
    customerName: String(input.customerName || existing?.customerName || "").trim(),
    invoiceId: String(input.invoiceId || existing?.invoiceId || "").trim(),
    invoiceNumber: String(input.invoiceNumber || existing?.invoiceNumber || "").trim(),
    chargeType: String(input.chargeType || existing?.chargeType || "").trim(),
    gatewayResponse: String(input.gatewayResponse || existing?.gatewayResponse || "").trim(),
    channel: String(input.channel || existing?.channel || "").trim(),
    paidAt: String(input.paidAt || existing?.paidAt || now).trim(),
    metadata,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}

export function appendPaymentRecord(payments = [], input = {}) {
  const list = Array.isArray(payments) ? clone(payments) : [];
  const reference = String(input.reference || "").trim();
  if (!reference) {
    return list;
  }

  const index = list.findIndex((item) => String(item.reference || "").trim() === reference);
  if (index >= 0) {
    list[index] = normalizePaymentRecord(input, list[index]);
  } else {
    list.unshift(normalizePaymentRecord(input));
  }

  return list;
}

export async function readInvoices(env) {
  const raw = await getStore(env).get(INVOICE_KEY, "json");
  return Array.isArray(raw) ? clone(raw) : [];
}

export async function writeInvoices(env, invoices) {
  const nextInvoices = Array.isArray(invoices) ? invoices : [];
  await getStore(env).put(INVOICE_KEY, JSON.stringify(nextInvoices));
  return nextInvoices;
}

export async function readPayments(env) {
  const raw = await getStore(env).get(PAYMENT_KEY, "json");
  return Array.isArray(raw) ? clone(raw) : [];
}

export async function writePayments(env, payments) {
  const nextPayments = Array.isArray(payments) ? payments : [];
  await getStore(env).put(PAYMENT_KEY, JSON.stringify(nextPayments));
  return nextPayments;
}

export { json };
