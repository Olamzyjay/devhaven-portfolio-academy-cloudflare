import { getBaseUrl, json, readJson } from "../cf/_utils.js";

export async function onRequestPost(context) {
  const secretKey = context.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return json(500, { error: "PAYSTACK_SECRET_KEY is not set on the server." });
  }

  const payload = await readJson(context.request);
  if (payload === null) {
    return json(400, { error: "Invalid JSON request body" });
  }

  const donor = payload && typeof payload.donor === "object" ? payload.donor : {};
  const email = String(donor.email || "").trim();
  const fullName = String(donor.fullName || "").trim();
  const note = String(donor.note || "").trim();
  const source = String(payload.source || "studio").trim() || "studio";
  const amountNgn = Math.round(Number(payload.amount) || 0);

  if (!email || !email.includes("@")) {
    return json(400, { error: "A valid email is required for support payment." });
  }

  if (!Number.isFinite(amountNgn) || amountNgn < 1000) {
    return json(400, { error: "Support amount must be at least NGN 1,000." });
  }

  const amountKobo = Math.round(amountNgn * 100);
  const callbackUrl = `${getBaseUrl(context.request)}/payment-success.html?support=1&source=${encodeURIComponent(source)}`;

  const initBody = {
    email,
    amount: String(amountKobo),
    currency: "NGN",
    callback_url: callbackUrl,
    metadata: {
      payment_type: "support",
      support_source: source,
      donor: {
        email,
        fullName
      },
      note,
      custom_fields: [
        { display_name: "Supporter Name", variable_name: "supporter_name", value: fullName || "Supporter" },
        { display_name: "Support Source", variable_name: "support_source", value: source },
        { display_name: "Support Note", variable_name: "support_note", value: note || "General support" }
      ]
    }
  };

  try {
    const resp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(initBody)
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data || data.status !== true) {
      return json(resp.status || 502, { error: "Paystack initialize failed", details: data?.message || data || "Unknown error" });
    }

    return json(200, {
      authorization_url: data.data?.authorization_url,
      access_code: data.data?.access_code,
      reference: data.data?.reference,
      amount: amountNgn,
      currency: "NGN"
    });
  } catch (err) {
    return json(500, { error: "Server error while contacting Paystack", details: err?.message || String(err) });
  }
}
