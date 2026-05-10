import { getBaseUrl, json, readJson } from "../../../cf/_utils.js";
import { readInvoices } from "../../../cf/invoice-storage.js";

function amountToKobo(amount) {
  return Math.round(Number(amount) * 100);
}

export async function onRequestPost(context) {
  const secretKey = context.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return json(500, { error: "PAYSTACK_SECRET_KEY is not set on the server." });
  }

  const payload = await readJson(context.request);
  if (payload === null) {
    return json(400, { error: "Invalid JSON request body." });
  }

  const invoiceId = String(payload?.invoiceId || "").trim();
  const chargeType = String(payload?.chargeType || "due").trim();
  if (!invoiceId) {
    return json(400, { error: "invoiceId is required." });
  }

  try {
    const invoices = await readInvoices(context.env);
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) {
      return json(404, { error: "Invoice not found." });
    }
    if (!invoice.clientEmail || !invoice.clientEmail.includes("@")) {
      return json(400, { error: "Client email is required before payment can start." });
    }
    if (invoice.balanceAmount <= 0) {
      return json(400, { error: "This invoice is already fully paid." });
    }

    let amount = invoice.balanceAmount;
    let label = "full";

    if (invoice.paymentPlan === "split60" && chargeType === "deposit" && !invoice.hasDepositCovered) {
      amount = invoice.dueNowAmount;
      label = "deposit";
    } else if (invoice.paymentPlan === "split60" && chargeType === "balance" && invoice.hasDepositCovered) {
      amount = invoice.balanceAmount;
      label = "balance";
    } else if (chargeType === "full") {
      amount = invoice.balanceAmount;
      label = invoice.paymentPlan === "split60" && !invoice.hasDepositCovered ? "full-from-start" : "full";
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return json(400, { error: "There is no payable amount on this invoice right now." });
    }

    const callbackUrl = `${getBaseUrl(context.request)}/invoice.html?id=${encodeURIComponent(invoice.id)}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: invoice.clientEmail,
        amount: String(amountToKobo(amount)),
        currency: "NGN",
        callback_url: callbackUrl,
        metadata: {
          payment_type: "invoice",
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          chargeType: label,
          clientName: invoice.clientName,
          projectTitle: invoice.projectTitle
        }
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.status) {
      return json(response.status || 502, {
        error: "Paystack invoice payment initialization failed.",
        details: data?.message || "Unknown error"
      });
    }

    return json(200, {
      ok: true,
      authorization_url: data.data?.authorization_url,
      access_code: data.data?.access_code,
      reference: data.data?.reference,
      amount
    });
  } catch (error) {
    return json(500, { error: error.message || "Could not contact Paystack." });
  }
}
