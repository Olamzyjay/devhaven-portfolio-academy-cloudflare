/* DevHaven Assistant (frontend)
 * Calls a serverless endpoint at: /api/chat
 */

const CHAT_STORAGE_KEY = "devhaven-chat-history-v1";
const CHAT_SESSION_KEY = "devhaven-chat-session-id-v1";
const CHAT_ENDPOINT = "/api/chat";

function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChatHistory(history) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

function getChatSessionId() {
  try {
    const existing = localStorage.getItem(CHAT_SESSION_KEY);
    if (existing) {
      return existing;
    }
    const id =
      (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function")
        ? globalThis.crypto.randomUUID()
        : `sess_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    localStorage.setItem(CHAT_SESSION_KEY, id);
    return id;
  } catch {
    return `sess_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function encodeForm(data) {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    params.append(key, String(value ?? ""));
  });
  return params.toString();
}

async function submitNetlifyForm(formName, fields) {
  // Netlify Forms JS submission (works on Netlify). On Cloudflare Pages, use export/transcript instead.
  const payload = encodeForm({
    "form-name": formName,
    ...fields
  });

  const resp = await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload
  });

  if (!resp.ok) {
    throw new Error("Feedback submission failed");
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}

function formatLineBreaks(text) {
  return String(text || "").split("\n");
}

function renderMessage(container, role, text) {
  const wrap = el("div", `chat-msg chat-${role}`);
  const bubble = el("div", "chat-bubble");

  const lines = formatLineBreaks(text);
  lines.forEach((line, idx) => {
    bubble.appendChild(el("span", "chat-line", line));
    if (idx !== lines.length - 1) {
      bubble.appendChild(document.createElement("br"));
    }
  });

  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function setBusy(form, busy) {
  form.querySelectorAll("button, textarea").forEach(node => {
    node.disabled = !!busy;
  });
}

async function sendToAssistant(history) {
  const resp = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history })
  });

  // Some platforms return HTML on errors (404/500), which breaks resp.json().
  const raw = await resp.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!resp.ok) {
    const base = data?.error ? String(data.error) : `HTTP ${resp.status}`;
    const detail = data?.details ? ` (${String(data.details)})` : "";
    throw new Error(`HTTP ${resp.status}: ${base}${detail}`);
  }

  const reply = String(data?.reply || "").trim();
  if (!reply) {
    throw new Error("Assistant returned an empty response.");
  }
  return reply;
}

function initChatbot() {
  const drawer = document.getElementById("chatDrawer");
  const messagesEl = document.getElementById("chatMessages");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const status = document.getElementById("chatStatus");
  const exportBtn = document.querySelector("[data-chat-export]");
  const rateUpBtn = document.querySelector("[data-chat-rate='up']");
  const rateDownBtn = document.querySelector("[data-chat-rate='down']");
  const feedbackWrap = document.getElementById("chatFeedbackWrap");
  const feedbackForm = document.getElementById("chatFeedbackForm");
  const feedbackComment = document.getElementById("chatFeedbackComment");
  const feedbackRating = document.getElementById("chatFeedbackRating");
  const feedbackPage = document.getElementById("chatFeedbackPage");
  const feedbackSession = document.getElementById("chatFeedbackSession");
  const feedbackTranscript = document.getElementById("chatFeedbackTranscript");
  const feedbackStatus = document.getElementById("chatFeedbackStatus");

  if (!drawer || !messagesEl || !form || !input || !status) {
    return;
  }

  let history = loadChatHistory().filter(m => m && (m.role === "user" || m.role === "assistant"));

  function clearStatus() {
    status.textContent = "";
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function paintHistory() {
    messagesEl.innerHTML = "";
    history.forEach(m => renderMessage(messagesEl, m.role, m.content));
  }

  function ensureHello() {
    if (history.length > 0) return;
    history.push({
      role: "assistant",
      content:
        "Hi, I am DevHaven Assistant.\nTell me what you need: a website build, a redesign, or a course recommendation."
    });
    saveChatHistory(history);
  }

  ensureHello();
  paintHistory();

  function fillFeedbackHiddenFields() {
    if (!feedbackPage || !feedbackSession || !feedbackTranscript) {
      return;
    }

    feedbackPage.value = location.pathname || "/";
    feedbackSession.value = getChatSessionId();
    feedbackTranscript.value = JSON.stringify(history.slice(-18));
  }

  function openFeedback(rating) {
    if (!feedbackWrap || !feedbackRating) {
      return;
    }
    feedbackWrap.classList.remove("d-none");
    feedbackRating.value = rating;
    fillFeedbackHiddenFields();
    feedbackComment?.focus();
  }

  exportBtn?.addEventListener("click", () => {
    downloadJson("devhaven-chat-transcript.json", {
      session_id: getChatSessionId(),
      page: location.pathname || "/",
      created_at: new Date().toISOString(),
      transcript: history
    });
    setStatus("Transcript exported.");
    setTimeout(clearStatus, 1500);
  });

  rateUpBtn?.addEventListener("click", () => openFeedback("helpful"));
  rateDownBtn?.addEventListener("click", () => openFeedback("not_helpful"));

  feedbackForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!feedbackStatus) {
      return;
    }

      if (location.protocol === "file:") {
        feedbackStatus.textContent = "Feedback works after deploy.";
        return;
      }

    fillFeedbackHiddenFields();
    feedbackStatus.textContent = "Sending...";

    try {
      await submitNetlifyForm("chat-feedback", {
        rating: feedbackRating?.value || "",
        comment: feedbackComment?.value || "",
        page: feedbackPage?.value || "",
        session_id: feedbackSession?.value || "",
        transcript: feedbackTranscript?.value || "",
        created_at: new Date().toISOString()
      });

      feedbackStatus.textContent = "Thanks. Feedback received.";
      if (feedbackComment) {
        feedbackComment.value = "";
      }
      setTimeout(() => {
        feedbackWrap?.classList.add("d-none");
        feedbackStatus.textContent = "";
      }, 1600);
    } catch {
      feedbackStatus.textContent = "Could not send feedback. Try again later.";
    }
  });

  drawer.addEventListener("shown.bs.offcanvas", () => {
    fillFeedbackHiddenFields();
    input.focus();
  });

  drawer.addEventListener("hidden.bs.offcanvas", () => {
    clearStatus();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    clearStatus();

    const text = String(input.value || "").trim();
    if (!text) return;

    if (location.protocol === "file:") {
      renderMessage(messagesEl, "user", text);
      renderMessage(
        messagesEl,
        "assistant",
        "Chat needs the site opened from a web server (not a file).\nDeploy to Cloudflare Pages (or another host) and try again."
      );
      input.value = "";
      return;
    }

    history.push({ role: "user", content: text });
    renderMessage(messagesEl, "user", text);
    input.value = "";
    saveChatHistory(history);
    fillFeedbackHiddenFields();

    const typing = el("div", "chat-msg chat-assistant");
    typing.appendChild(el("div", "chat-bubble chat-typing", "Typing..."));
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    setBusy(form, true);
    setStatus("Connecting...");

    try {
      const reply = await sendToAssistant(history.slice(-12));
      typing.remove();
      history.push({ role: "assistant", content: reply });
      renderMessage(messagesEl, "assistant", reply);
      saveChatHistory(history);
      fillFeedbackHiddenFields();
      clearStatus();
    } catch (err) {
      typing.remove();
      setStatus("Assistant could not connect.");

      const msg = String(err?.message || "");
      // Useful for debugging without exposing secrets.
      console.warn("DevHaven Assistant error:", msg);

      if (msg.startsWith("HTTP 401")) {
        renderMessage(
          messagesEl,
          "assistant",
          "The assistant is not authenticated right now (401).\nThe site owner should re-check OPENAI_API_KEY in Cloudflare Pages Variables and redeploy.\nWhatsApp: +234 706 686 1881\nEmail: devhaven1@gmail.com"
        );
      } else if (msg.startsWith("HTTP 429")) {
        renderMessage(
          messagesEl,
          "assistant",
          "The assistant is busy right now (rate limited).\nPlease try again in a minute.\nWhatsApp: +234 706 686 1881\nEmail: devhaven1@gmail.com"
        );
      } else if (msg.includes("OPENAI_API_KEY")) {
        renderMessage(
          messagesEl,
          "assistant",
          "The assistant is not configured yet.\nThe site owner needs to add OPENAI_API_KEY in Cloudflare Pages Variables and redeploy.\nFor now, message DevHaven Studio on WhatsApp: +234 706 686 1881\nOr email: devhaven1@gmail.com"
        );
      } else if (msg.startsWith("HTTP 404") && !msg.includes("OpenAI request failed")) {
        renderMessage(
          messagesEl,
          "assistant",
          "The chat endpoint is not deployed yet.\nPlease try again after the latest deploy completes.\nWhatsApp: +234 706 686 1881\nEmail: devhaven1@gmail.com"
        );
      } else if (msg.startsWith("HTTP 404") && msg.includes("OpenAI request failed")) {
        renderMessage(
          messagesEl,
          "assistant",
          "The AI request failed (404).\nThis can happen if the model name is wrong or not available on this key.\nWhatsApp: +234 706 686 1881\nEmail: devhaven1@gmail.com"
        );
      } else if (msg.startsWith("HTTP 500")) {
        renderMessage(
          messagesEl,
          "assistant",
          "The assistant endpoint returned an error (500).\nThis is usually a server configuration issue.\nWhatsApp: +234 706 686 1881\nEmail: devhaven1@gmail.com"
        );
      } else {
        renderMessage(
          messagesEl,
          "assistant",
          "I could not reach the AI endpoint.\nMessage DevHaven Studio on WhatsApp: +234 706 686 1881\nOr email: devhaven1@gmail.com"
        );
      }
    } finally {
      setBusy(form, false);
    }
  });

  document.querySelectorAll("[data-chat-prompt]").forEach(btn => {
    btn.addEventListener("click", () => {
      const prompt = btn.getAttribute("data-chat-prompt");
      if (!prompt) return;
      input.value = prompt;
      input.focus();
    });
  });

  document.querySelectorAll("[data-chat-reset]").forEach(btn => {
    btn.addEventListener("click", () => {
      history = [];
      saveChatHistory(history);
      ensureHello();
      paintHistory();
      setStatus("Chat reset.");
      setTimeout(clearStatus, 1500);
    });
  });
}

document.addEventListener("DOMContentLoaded", initChatbot);
