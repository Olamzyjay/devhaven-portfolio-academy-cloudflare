import { readJson } from "../../cf/_utils.js";
import {
  isInvoiceAuthorized,
  json,
  normalizeInvoice,
  readInvoices,
  writeInvoices
} from "../../cf/invoice-storage.js";

export async function onRequestGet(context) {
  if (!isInvoiceAuthorized(context.request, context.env)) {
    return json(403, { error: "Unauthorized invoice request." });
  }
  try {
    const invoices = await readInvoices(context.env);
    return json(200, { ok: true, invoices });
  } catch (error) {
    return json(500, { error: error.message || "Invoice request failed." });
  }
}

export async function onRequestPost(context) {
  if (!isInvoiceAuthorized(context.request, context.env)) {
    return json(403, { error: "Unauthorized invoice request." });
  }
  const payload = await readJson(context.request);
  if (payload === null) {
    return json(400, { error: "Invalid JSON request body." });
  }
  if (!payload?.clientName || !payload?.projectTitle || !payload?.totalAmount) {
    return json(400, { error: "clientName, projectTitle, and totalAmount are required." });
  }
  try {
    const invoices = await readInvoices(context.env);
    const existing = payload.id ? invoices.find((item) => item.id === payload.id) : null;
    const nextInvoice = normalizeInvoice(payload, existing);
    const index = invoices.findIndex((item) => item.id === nextInvoice.id);
    if (index >= 0) {
      invoices[index] = nextInvoice;
    } else {
      invoices.unshift(nextInvoice);
    }
    await writeInvoices(context.env, invoices);
    return json(200, { ok: true, invoice: nextInvoice });
  } catch (error) {
    return json(500, { error: error.message || "Invoice request failed." });
  }
}

export async function onRequestPut(context) {
  if (!isInvoiceAuthorized(context.request, context.env)) {
    return json(403, { error: "Unauthorized invoice request." });
  }
  const payload = await readJson(context.request);
  if (payload === null || !Array.isArray(payload?.invoices)) {
    return json(400, { error: "invoices array is required." });
  }
  try {
    const invoices = payload.invoices.map((invoice) => normalizeInvoice(invoice));
    await writeInvoices(context.env, invoices);
    return json(200, { ok: true, invoices });
  } catch (error) {
    return json(500, { error: error.message || "Invoice request failed." });
  }
}
