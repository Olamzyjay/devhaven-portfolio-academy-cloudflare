async function askAI() {
  const promptEl = document.getElementById("prompt");
  const outEl = document.getElementById("aiOutput");
  const btn = document.getElementById("askAiBtn");

  if (!promptEl || !outEl) return;

  const message = String(promptEl.value || "").trim();
  if (!message) {
    outEl.textContent = "Type a question first.";
    return;
  }

  const setBusy = busy => {
    if (btn) btn.disabled = !!busy;
    promptEl.disabled = !!busy;
  };

  setBusy(true);
  outEl.textContent = "Thinking...";

  function extractResponseText(data) {
    if (!data || typeof data !== "object") return "";
    if (typeof data.output_text === "string") return data.output_text.trim();

    // Fallback: parse Responses API "output" messages for output_text parts.
    const output = Array.isArray(data.output) ? data.output : [];
    const chunks = [];
    for (const item of output) {
      if (!item || item.type !== "message") continue;
      const content = Array.isArray(item.content) ? item.content : [];
      for (const part of content) {
        if (part?.type === "output_text" && typeof part.text === "string") {
          chunks.push(part.text);
        }
        if (part?.type === "refusal" && typeof part.refusal === "string") {
          chunks.push(part.refusal);
        }
      }
    }
    return chunks.join("\n").trim();
  }

  function getErrorMessage(status, data, raw) {
    const err = data?.error;
    let msg = "";

    if (typeof err === "string") msg = err;
    else if (err && typeof err === "object") msg = err.message || JSON.stringify(err);
    else if (typeof data?.message === "string") msg = data.message;
    else msg = String(raw || "").trim();

    msg = msg || `HTTP ${status}`;

    // Normalize common OpenAI errors.
    if (status === 401) {
      return `OpenAI auth failed (401). Check that OPENAI_API_KEY is set correctly in your host (Cloudflare Pages) and redeploy.\nDetails: ${msg}`;
    }
    if (status === 429) {
      return `OpenAI rate limited (429). Try again in a moment.\nDetails: ${msg}`;
    }

    return `Request failed (${status}). ${msg}`;
  }

  try {
    const res = await fetch("/api/ask-openai", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const raw = await res.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      outEl.textContent = getErrorMessage(res.status, data, raw);
      return;
    }

    const text = extractResponseText(data);
    outEl.textContent = text || JSON.stringify(data, null, 2);
  } catch (err) {
    let msg = "";
    if (err instanceof Error) {
      msg = err.message || String(err);
    } else if (typeof err === "string") {
      msg = err;
    } else if (err && typeof err === "object") {
      try {
        msg = JSON.stringify(err);
      } catch {
        msg = String(err);
      }
    } else {
      msg = String(err);
    }

    outEl.textContent = `Error: ${msg || "Unknown error"}`;
  } finally {
    setBusy(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("askAiBtn");
  if (!btn) return;
  btn.addEventListener("click", askAI);
});
