import {
  isInvoiceAuthorized,
  json,
  readInvoices,
  writeInvoices
} from "../../cf/invoice-storage.js";

export async function onRequestGet(context) {
  const id = String(context.params.id || "").trim();
  if (!id) {
    return json(400, { error: "Invoice id is required." });
  }
  try {
    const invoices = await readInvoices(context.env);
    const invoice = invoices.find((item) => item.id === id);
    return invoice
      ? json(200, { ok: true, invoice })
      : json(404, { error: "Invoice not found." });
  } catch (error) {
    return json(500, { error: error.message || "Invoice request failed." });
  }
}

export async function onRequestDelete(context) {
  const id = String(context.params.id || "").trim();
  if (!id) {
    return json(400, { error: "Invoice id is required." });
  }
  if (!isInvoiceAuthorized(context.request, context.env)) {
    return json(403, { error: "Unauthorized invoice request." });
  }
  try {
    const invoices = await readInvoices(context.env);
    const filtered = invoices.filter((item) => item.id !== id);
    if (filtered.length === invoices.length) {
      return json(404, { error: "Invoice not found." });
    }
    await writeInvoices(context.env, filtered);
    return json(200, { ok: true, deletedId: id });
  } catch (error) {
    return json(500, { error: error.message || "Invoice request failed." });
  }
}
