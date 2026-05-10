import { isInvoiceAuthorized, json } from "../../cf/invoice-storage.js";

export async function onRequestPost(context) {
  if (!isInvoiceAuthorized(context.request, context.env)) {
    return json(403, { error: "Invalid invoice admin key." });
  }
  return json(200, { ok: true });
}
