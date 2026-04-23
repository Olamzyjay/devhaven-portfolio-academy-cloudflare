import { json, readJson } from "../../cf/_utils.js";

export async function onRequestPost(context) {
  const payload = await readJson(context.request);
  if (!payload) {
    return json(400, { error: "Invalid JSON request body" });
  }

  const apiKey = context.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(500, { error: "OPENAI_API_KEY is not set on the server." });
  }

  const cleaned = String(payload.message ?? "").trim();
  if (!cleaned) {
    return json(400, { error: "Missing message" });
  }

  const model = String(context.env.OPENAI_MODEL || "gpt-4.1-mini").trim() || "gpt-4.1-mini";

  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, input: cleaned })
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return json(resp.status, { error: "OpenAI request failed", details: data?.error?.message || data || "Unknown error" });
    }

    return json(200, data);
  } catch (err) {
    return json(500, { error: "Server error while contacting OpenAI", details: err?.message || String(err) });
  }
}

