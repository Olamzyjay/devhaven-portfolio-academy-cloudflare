import { json, readJson } from "../../cf/_utils.js";

function buildDevHavenInstructions() {
  return [
    "You are DevHaven Assistant for DevHaven Studio, a developer portfolio + academy site.",
    "Your job is to help visitors understand services, see proof, and pick the right course.",
    "",
    "Hard rules:",
    "- Do not invent personal details, prices, links, or claims not provided here.",
    "- If a visitor asks for a quote, ask 2-3 quick questions (goal, timeline, budget range) and then suggest next steps.",
    "- Keep answers short and easy to scan (3-8 short lines).",
    "- If you cannot complete a request, offer WhatsApp and email contact details.",
    "",
    "Studio positioning:",
    "- Responsive websites for schools, ecommerce brands, and creators.",
    "- Clear structure, modern Bootstrap UI, and WhatsApp-first conversion flow.",
    "",
    "Academy courses (NGN):",
    "- Frontend Website Design: 6 weeks, NGN 45,000",
    "- Digital Marketing for Small Brands: 4 weeks, NGN 35,000",
    "- Freelance Launch Lab: 8 weeks, NGN 55,000",
    "",
    "Specialty tracks (pricing on request):",
    "- AI Prompting",
    "- Coding Assistance",
    "- Payment Integrations",
    "- Chatbot Automation/Setup",
    "- AI Problem Solving",
    "- Blockchain Technology",
    "- Digital Literacy",
    "",
    "Contact:",
    "- WhatsApp: +234 706 686 1881",
    "- Email: devhaven1@gmail.com",
    "",
    "If asked about checkout:",
    "- Explain that visitors can add courses to cart and pay with Paystack. WhatsApp/email are available for support."
  ].join("\n");
}

function normalizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];
  const cleaned = rawMessages
    .map(msg => {
      if (!msg || typeof msg !== "object") return null;
      const role = String(msg.role || "").trim();
      const content = String(msg.content || "").trim();
      if (!role || !content) return null;
      if (!["user", "assistant"].includes(role)) return null;
      return { role, content };
    })
    .filter(Boolean);
  return cleaned.slice(-12);
}

function extractAssistantText(responseJson) {
  const output = Array.isArray(responseJson?.output) ? responseJson.output : [];
  const textParts = [];

  for (const item of output) {
    if (!item || item.type !== "message" || item.role !== "assistant") continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === "output_text" && typeof part.text === "string") textParts.push(part.text);
      if (part?.type === "refusal" && typeof part.refusal === "string") textParts.push(part.refusal);
    }
  }

  return textParts.join("\n").trim();
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get("Origin") || "*";
  return new Response("", {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
  });
}

export async function onRequestPost(context) {
  const origin = context.request.headers.get("Origin") || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  const apiKey = context.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(
      500,
      { error: "OPENAI_API_KEY is not set. Add it in Cloudflare Pages > Settings > Variables and Secrets." },
      corsHeaders
    );
  }

  const payload = await readJson(context.request);
  if (!payload) {
    return json(400, { error: "Invalid JSON request body" }, corsHeaders);
  }

  const messages = normalizeMessages(payload.messages);
  if (messages.length === 0) {
    return json(400, { error: "Missing messages" }, corsHeaders);
  }

  const model = String(context.env.OPENAI_MODEL || "gpt-4.1-mini").trim() || "gpt-4.1-mini";
  const input = messages.map(msg => ({
    role: msg.role,
    content: [{ type: "input_text", text: msg.content }]
  }));

  const body = {
    model,
    instructions: buildDevHavenInstructions(),
    input,
    max_output_tokens: 450
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return json(
        resp.status,
        { error: "OpenAI request failed", details: data?.error?.message || data || "Unknown error" },
        corsHeaders
      );
    }

    const reply = extractAssistantText(data) || "I can help. What are you trying to build or learn?";
    return json(200, { reply }, corsHeaders);
  } catch (err) {
    return json(500, { error: "Server error while contacting OpenAI", details: err?.message || String(err) }, corsHeaders);
  }
}

