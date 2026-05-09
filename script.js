const CART_STORAGE_KEY = "devhaven-academy-cart-v2";
const EXIT_INTENT_KEY = "devhaven-exit-intent-v1";
const WHATSAPP_NUMBER = "2347066861881";
const FALLBACK_EMAIL = "devhaven1@gmail.com";
const BANK_DETAILS = {
  bankName: "United Bank for Africa (UBA)",
  accountName: "Olamide Joshua Olawuyi",
  accountNumber: "2240256403"
};

const COURSE_CATALOG = {
  "web-design-starter": {
    id: "web-design-starter",
    title: "Frontend Website Design",
    duration: "6 weeks",
    price: 45000
  },
  "digital-marketing-bootcamp": {
    id: "digital-marketing-bootcamp",
    title: "Digital Marketing for Small Brands",
    duration: "4 weeks",
    price: 35000
  },
  "freelance-launch-lab": {
    id: "freelance-launch-lab",
    title: "Freelance Launch Lab",
    duration: "8 weeks",
    price: 55000
  }
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
}

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function getDetailedCart() {
  return getCart()
    .map(item => {
      const course = COURSE_CATALOG[item.id];
      if (!course) {
        return null;
      }

      const qty = Math.max(1, Number(item.qty) || 1);
      return {
        ...course,
        qty,
        total: course.price * qty
      };
    })
    .filter(Boolean);
}

function getCartCount(cart = getDetailedCart()) {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotal(cart = getDetailedCart()) {
  return cart.reduce((sum, item) => sum + item.total, 0);
}

function syncCartBadges() {
  const count = getCartCount();
  document.querySelectorAll("[data-cart-count]").forEach(badge => {
    badge.textContent = String(count);
  });
}

function showToast(message) {
  const toastElement = document.getElementById("cartToast");
  const toastBody = document.getElementById("cartToastBody");
  if (!toastElement || !toastBody || !window.bootstrap) {
    return;
  }

  toastBody.textContent = message;
  const toast = bootstrap.Toast.getOrCreateInstance(toastElement);
  toast.show();
}

function addToCart(courseId) {
  const course = COURSE_CATALOG[courseId];
  if (!course) {
    return;
  }

  const cart = getCart();
  const existing = cart.find(item => item.id === courseId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: courseId, qty: 1 });
  }

  saveCart(cart);
  renderCartDrawer();
  renderCheckoutPage();
  syncCartBadges();
  showToast(`${course.title} added to cart.`);
}

function updateCartItem(courseId, nextQty) {
  let cart = getCart();
  if (nextQty <= 0) {
    cart = cart.filter(item => item.id !== courseId);
  } else {
    cart = cart.map(item => item.id === courseId ? { ...item, qty: nextQty } : item);
  }

  saveCart(cart);
  renderCartDrawer();
  renderCheckoutPage();
  syncCartBadges();
}

function clearCart() {
  saveCart([]);
  renderCartDrawer();
  renderCheckoutPage();
  syncCartBadges();
}

function renderCartDrawer() {
  const itemsContainer = document.getElementById("cartItems");
  const emptyState = document.getElementById("cartEmpty");
  const totalElement = document.getElementById("cartTotal");
  const checkoutLink = document.getElementById("checkoutLink");

  if (!itemsContainer || !emptyState || !totalElement || !checkoutLink) {
    return;
  }

  const cart = getDetailedCart();

  if (cart.length === 0) {
    itemsContainer.innerHTML = "";
    emptyState.classList.remove("d-none");
    totalElement.textContent = formatCurrency(0);
    checkoutLink.classList.add("disabled");
    checkoutLink.setAttribute("aria-disabled", "true");
    return;
  }

  emptyState.classList.add("d-none");
  checkoutLink.classList.remove("disabled");
  checkoutLink.removeAttribute("aria-disabled");
  totalElement.textContent = formatCurrency(getCartTotal(cart));

  itemsContainer.innerHTML = cart.map(item => `
    <article class="cart-line">
      <h3>${item.title}</h3>
      <p>${item.duration}</p>
      <div class="cart-line-footer">
        <span class="cart-line-qty">x${item.qty}</span>
        <div class="d-flex align-items-center gap-2">
          <strong>${formatCurrency(item.total)}</strong>
          <button class="btn btn-sm btn-outline-dark" type="button" data-remove-course="${item.id}">Remove</button>
        </div>
      </div>
    </article>
  `).join("");
}

function generateProfileText() {
  return [
    "DEVHAVEN STUDIO",
    "",
    "Positioning",
    "Developer portfolio systems, business websites, and academy experiences with clear proof, modern UI, and direct conversion paths.",
    "",
    "Core strengths",
    "- Portfolio and business website builds",
    "- School and academy page systems",
    "- Bootstrap 5.3.8 front-end implementation",
    "- Responsive HTML5 and CSS3 delivery",
    "- Client-ready checkout and inquiry flows",
    "",
    "Selected proof",
    "- 40+ project launches",
    "- 500+ learners trained",
    "- Clear WhatsApp and email conversion workflow",
    "",
    "Contact",
    "WhatsApp: +234 706 686 1881",
    `Email: ${FALLBACK_EMAIL}`
  ].join("\n");
}

function downloadProfile() {
  const blob = new Blob([generateProfileText()], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "devhaven-studio-profile.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function initPaystackPayment() {
  const button = document.getElementById("paystackPayBtn");
  const status = document.getElementById("paystackStatus");
  const form = document.getElementById("checkoutForm");

  if (!button || !status || !form) {
    return;
  }

  const setStatus = (text) => {
    status.textContent = text;
  };

  const setBusy = (busy) => {
    button.disabled = !!busy;
    button.setAttribute("aria-disabled", busy ? "true" : "false");
  };

  button.addEventListener("click", async () => {
    setStatus("");

    if (location.protocol === "file:") {
      setStatus("Paystack works after deployment (Netlify). Open the live site and try again.");
      return;
    }

    const cart = getCart();
    if (!Array.isArray(cart) || cart.length === 0) {
      setStatus("Add at least one core course to cart first.");
      return;
    }

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      setStatus("Please complete the required fields (name, email, phone).");
      return;
    }

    const data = new FormData(form);
    const customer = {
      fullName: String(data.get("full_name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim()
    };

    setBusy(true);
    setStatus("Starting Paystack payment...");

    try {
      const resp = await fetch("/api/paystack-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, customer })
      });

      const out = await resp.json().catch(() => null);
      if (!resp.ok || !out?.authorization_url) {
        const msg = out?.details || out?.error || "Paystack is not available yet.";
        setStatus(String(msg));
        setBusy(false);
        return;
      }

      setStatus("Redirecting to Paystack...");
      window.location.href = out.authorization_url;
    } catch (err) {
      setStatus("Could not start payment. Try again.");
      setBusy(false);
    }
  });
}

async function initPaymentSuccessPage() {
  const statusEl = document.getElementById("paymentVerifyStatus");
  const refEl = document.getElementById("paymentReference");
  const detailsWrap = document.getElementById("paymentDetails");
  const whatsappBtn = document.getElementById("paymentWhatsappBtn");
  const nextStepText = document.getElementById("paymentNextStepText");
  const primaryLink = document.getElementById("paymentPrimaryLink");

  if (!statusEl) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const reference = String(params.get("reference") || "").trim();
  const isSupportPayment = params.get("support") === "1";
  const supportSource = String(params.get("source") || "studio").trim() || "studio";

  if (isSupportPayment) {
    if (nextStepText) {
      nextStepText.textContent = "Send your payment reference on WhatsApp if you want a direct acknowledgement or to tell DevHaven what the support is for.";
    }
    if (primaryLink instanceof HTMLAnchorElement) {
      primaryLink.href = supportSource === "academy" ? "academy/index.html#support" : "index.html#donations";
      primaryLink.innerHTML = supportSource === "academy"
        ? '<i class="bi bi-mortarboard me-2"></i>Back to Academy'
        : '<i class="bi bi-house-door me-2"></i>Back to Portfolio';
    }
  }

  if (!reference) {
    statusEl.textContent = isSupportPayment
      ? "Missing support payment reference. If you paid, please send your Paystack reference on WhatsApp."
      : "Missing payment reference. If you paid, please send your Paystack reference on WhatsApp.";
    return;
  }

  statusEl.textContent = "Verifying payment with Paystack...";

  try {
    const resp = await fetch(`/api/paystack-verify?reference=${encodeURIComponent(reference)}`, {
      method: "GET"
    });
    const out = await resp.json().catch(() => null);

    if (!resp.ok || !out?.ok) {
      statusEl.textContent = isSupportPayment
        ? "Could not verify the support payment right now. Please message DevHaven Studio on WhatsApp with your reference."
        : "Could not verify payment right now. Please message DevHaven Studio on WhatsApp with your reference.";
      if (refEl) {
        refEl.textContent = reference;
      }
      detailsWrap?.classList.remove("d-none");
      whatsappBtn?.addEventListener("click", () => {
        openWhatsapp(
          isSupportPayment
            ? `Hello DevHaven Studio,\n\nI just made a Paystack support payment.\nReference: ${reference}\n\nPlease help me confirm it and let me know the next step.`
            : `Hello DevHaven Studio,\n\nI just made a Paystack payment.\nReference: ${reference}\n\nPlease help me confirm enrollment and share next steps.`
        );
      });
      return;
    }

    if (out.verified) {
      statusEl.textContent = isSupportPayment
        ? "Support payment verified successfully. Thank you for backing the work."
        : "Payment verified successfully. Thanks. Your cart has been cleared.";
      if (!isSupportPayment) {
        clearCart();
      }
    } else {
      statusEl.textContent = isSupportPayment
        ? `Support payment status: ${out.status || "unknown"}. If you paid, message DevHaven Studio with your reference.`
        : `Payment status: ${out.status || "unknown"}. If you paid, message DevHaven Studio with your reference.`;
    }

    if (refEl) {
      refEl.textContent = out.reference || reference;
    }
    detailsWrap?.classList.remove("d-none");

    whatsappBtn?.addEventListener("click", () => {
      let message = "";
      if (isSupportPayment) {
        message = [
          "Hello DevHaven Studio,",
          "",
          "I just made a Paystack support payment.",
          `Reference: ${out.reference || reference}`,
          "",
          "Please help me confirm it. Thank you."
        ].join("\n");
      } else {
        const cart = getDetailedCart();
        const lines = cart.map(item => `- ${item.title} x${item.qty}`).join("\n");
        message = [
          "Hello DevHaven Studio,",
          "",
          "I just made a Paystack payment.",
          `Reference: ${out.reference || reference}`,
          "",
          "Courses:",
          lines || "- (cart cleared after verification)",
          "",
          "Please help me confirm enrollment and share next steps."
        ].join("\n");
      }
      openWhatsapp(message);
    });
  } catch {
    statusEl.textContent = isSupportPayment
      ? "Could not verify the support payment right now. Please message DevHaven Studio on WhatsApp with your reference."
      : "Could not verify payment right now. Please message DevHaven Studio on WhatsApp with your reference.";
  }
}

function initProfileDownload() {
  document.querySelectorAll("[data-download-profile]").forEach(button => {
    button.addEventListener("click", downloadProfile);
  });
}

function buildLeadMessage(fields) {
  return [
    "Hello DevHaven Studio,",
    "",
    `Name: ${fields.fullName}`,
    `Email: ${fields.email}`,
    `Phone: ${fields.phone}`,
    `Interest: ${fields.interest}`,
    "",
    "Project or learning goal:",
    fields.message
  ].join("\n");
}

function buildOrderMessage(fields, cart) {
  const lines = cart.map(item => `- ${item.title} x${item.qty} (${formatCurrency(item.total)})`);
  return [
    "Hello DevHaven Studio,",
    "",
    "I want to proceed with these course enrollments:",
    ...lines,
    "",
    `Total: ${formatCurrency(getCartTotal(cart))}`,
    "",
    `Name: ${fields.fullName}`,
    `Email: ${fields.email}`,
    `Phone: ${fields.phone}`,
    `Preferred payment method: ${fields.paymentMethod}`,
    `Bank transfer account: ${BANK_DETAILS.accountNumber} (${BANK_DETAILS.accountName}, ${BANK_DETAILS.bankName})`,
    "",
    "Goal or note:",
    fields.note || "None supplied."
  ].join("\n");
}

function buildCourseEnquiryMessage(courseTitle) {
  return [
    "Hello DevHaven Studio,",
    "",
    `I want to enroll for this course: ${courseTitle}`,
    "",
    "Please share:",
    "- Current price",
    "- Class schedule / start date",
    "- What I will build by the end",
    "- Requirements (laptop/phone, data, etc.)"
  ].join("\n");
}

function openWhatsapp(message) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  const popup = window.open(url, "_blank", "noopener");
  if (!popup) {
    window.location.href = url;
  }
}

function normalizeWhatsappTemplate(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/%0A/gi, "\n")
    .trim();
}

function buildEmailLink(subject, body) {
  return `mailto:${FALLBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildSupportMessage(fields) {
  return [
    "Hello DevHaven Studio,",
    "",
    `I would like to support DevHaven through the ${fields.source} side.`,
    "",
    `Name: ${fields.fullName || "Not provided"}`,
    `Email: ${fields.email}`,
    `Amount: ${formatCurrency(fields.amount)}`,
    "",
    "What I want to support:",
    fields.note || "General support for the developer, tools, training access, or community work."
  ].join("\n");
}

function initCheckoutPaymentMethodUI() {
  const methodSelect = document.getElementById("paymentMethod");
  const primaryAction = document.getElementById("checkoutPrimaryAction");
  if (!methodSelect || !primaryAction) {
    return;
  }

  const choiceButtons = Array.from(document.querySelectorAll("[data-payment-choice]"));
  const panels = Array.from(document.querySelectorAll("[data-payment-panel]"));
  const paystackStatus = document.getElementById("paystackStatus");

  const labels = {
    "Paystack": "Proceed with Paystack",
    "Bank transfer": "Continue with bank transfer",
    "WhatsApp inquiry/order": "Send order on WhatsApp",
    "Email inquiry/order": "Prepare email order"
  };

  function setActiveMethod(value, fromButton = false) {
    methodSelect.value = value || "";
    choiceButtons.forEach(button => {
      const active = button.getAttribute("data-payment-choice") === value;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    panels.forEach(panel => {
      panel.classList.toggle("d-none", panel.getAttribute("data-payment-panel") !== value);
    });
    primaryAction.innerHTML = `<i class="bi bi-send-check me-2"></i>${labels[value] || "Continue with selected method"}`;
    if (fromButton && paystackStatus) {
      paystackStatus.textContent = "";
    }
  }

  choiceButtons.forEach(button => {
    button.addEventListener("click", () => {
      setActiveMethod(button.getAttribute("data-payment-choice") || "", true);
    });
  });

  methodSelect.addEventListener("change", () => {
    setActiveMethod(methodSelect.value);
  });

  setActiveMethod(methodSelect.value);
}

function initLeadForm() {
  const form = document.getElementById("leadForm");
  const formStatus = document.getElementById("formStatus");
  const emailFallback = document.getElementById("emailFallback");

  if (!form || !formStatus || !emailFallback) {
    return;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      formStatus.textContent = "Please complete the required fields.";
      return;
    }

    const data = new FormData(form);
    const fields = {
      fullName: String(data.get("full_name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      interest: String(data.get("interest") || "").trim(),
      message: String(data.get("message") || "").trim()
    };

    const message = buildLeadMessage(fields);
    emailFallback.href = buildEmailLink(
      `New ${fields.interest || "project"} enquiry from ${fields.fullName}`,
      message
    );
    formStatus.textContent = "Opening WhatsApp with your message. The email button is ready as a fallback.";
    openWhatsapp(message);
  });
}

function initQuickEnquiryForm() {
  const textarea = document.getElementById("quickEnquiryMessage");
  const button = document.getElementById("quickEnquiryBtn");
  const status = document.getElementById("quickEnquiryStatus");

  if (!textarea || !button || !status) {
    return;
  }

  button.addEventListener("click", () => {
    const note = String(textarea.value || "").trim();
    const message = [
      "Hello DevHaven Studio,",
      "",
      "I want to make a quick enquiry.",
      "",
      "What I need help with:",
      note || "I want to discuss a website, funnel, digital product, or training."
    ].join("\n");

    status.textContent = "Opening WhatsApp with your message.";
    openWhatsapp(message);
  });
}

function initSupportForms() {
  const forms = Array.from(document.querySelectorAll("[data-support-form]"));
  if (!forms.length) {
    return;
  }

  forms.forEach(form => {
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const status = form.querySelector("[data-support-status]");
    const source = String(form.getAttribute("data-support-source") || "studio").trim() || "studio";

    form.addEventListener("submit", async event => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        if (status instanceof HTMLElement) {
          status.textContent = "Please enter a support amount and a valid email address.";
        }
        return;
      }

      const data = new FormData(form);
      const fields = {
        amount: Math.max(1000, Number(data.get("amount")) || 0),
        fullName: String(data.get("full_name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        note: String(data.get("message") || "").trim(),
        source
      };

      if (!fields.email.includes("@")) {
        if (status instanceof HTMLElement) {
          status.textContent = "Please enter a valid email address for the support receipt.";
        }
        return;
      }

      if (window.location.protocol === "file:") {
        if (status instanceof HTMLElement) {
          status.textContent = "Support by Paystack works after deployment. For now, use WhatsApp or bank transfer.";
        }
        return;
      }

      if (status instanceof HTMLElement) {
        status.textContent = "Preparing your Paystack support payment...";
      }

      try {
        const resp = await fetch("/api/support-paystack-init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: fields.amount,
            source: fields.source,
            donor: {
              email: fields.email,
              fullName: fields.fullName,
              note: fields.note
            }
          })
        });

        const out = await resp.json().catch(() => ({}));
        if (!resp.ok || !out?.authorization_url) {
          const msg = out?.details || out?.error || "Support payment is not available yet.";
          throw new Error(msg);
        }

        if (status instanceof HTMLElement) {
          status.textContent = "Redirecting to Paystack...";
        }
        window.location.href = out.authorization_url;
      } catch {
        if (status instanceof HTMLElement) {
          status.textContent = "Could not start Paystack right now. Opening WhatsApp instead.";
        }
        openWhatsapp(buildSupportMessage(fields));
      }
    });
  });
}

function renderCheckoutPage() {
  const summaryList = document.getElementById("checkoutItems");
  const emptyState = document.getElementById("checkoutEmpty");
  const totalElement = document.getElementById("checkoutTotal");
  const form = document.getElementById("checkoutForm");

  // form is optional (e.g., payment-success page reuses the summary UI).
  if (!summaryList || !emptyState || !totalElement) {
    return;
  }

  const cart = getDetailedCart();

  if (cart.length === 0) {
    summaryList.innerHTML = "";
    emptyState.classList.remove("d-none");
    totalElement.textContent = formatCurrency(0);
    if (form) {
      form.querySelectorAll("input, select, textarea, button").forEach(element => {
        element.disabled = true;
      });
      form.querySelectorAll("a").forEach(element => {
        element.classList.add("disabled");
        element.setAttribute("aria-disabled", "true");
      });
    }
    return;
  }

  emptyState.classList.add("d-none");
  totalElement.textContent = formatCurrency(getCartTotal(cart));
  if (form) {
    form.querySelectorAll("input, select, textarea, button").forEach(element => {
      element.disabled = false;
    });
    form.querySelectorAll("a").forEach(element => {
      element.classList.remove("disabled");
      element.removeAttribute("aria-disabled");
    });
  }

  summaryList.innerHTML = cart.map(item => `
    <article class="checkout-course">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div>
          <h3 class="h6 mb-1">${item.title}</h3>
          <p class="mb-2 text-secondary">${item.duration}</p>
        </div>
        <button class="btn btn-sm btn-outline-dark" type="button" data-remove-course="${item.id}">Remove</button>
      </div>
      <div class="d-flex justify-content-between align-items-center gap-3">
        <span class="cart-line-qty">x${item.qty}</span>
        <strong>${formatCurrency(item.total)}</strong>
      </div>
    </article>
  `).join("");
}

function initCheckoutForm() {
  const form = document.getElementById("checkoutForm");
  const emailLink = document.getElementById("checkoutEmailLink");
  const status = document.getElementById("checkoutStatus");

  if (!form || !emailLink || !status) {
    return;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const cart = getDetailedCart();

    if (cart.length === 0) {
      status.textContent = "Add at least one course before checkout.";
      return;
    }

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      status.textContent = "Please complete the required checkout fields.";
      return;
    }

    const data = new FormData(form);
    const fields = {
      fullName: String(data.get("full_name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      paymentMethod: String(data.get("payment_method") || "").trim(),
      note: String(data.get("message") || "").trim()
    };

    const message = buildOrderMessage(fields, cart);
    emailLink.href = buildEmailLink(`Course checkout request from ${fields.fullName}`, message);

    if (fields.paymentMethod === "Paystack") {
      const paystackButton = document.getElementById("paystackPayBtn");
      status.textContent = "Your details are ready. Continue with the Paystack button in the payment section.";
      paystackButton?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (fields.paymentMethod === "Bank transfer") {
      status.textContent = "Use the bank details shown above, then send your proof of payment on WhatsApp or by email.";
      openWhatsapp([
        message,
        "",
        "I want to pay by bank transfer.",
        `Bank: ${BANK_DETAILS.bankName}`,
        `Account name: ${BANK_DETAILS.accountName}`,
        `Account number: ${BANK_DETAILS.accountNumber}`,
        "",
        "I will send proof of payment after transfer."
      ].join("\n"));
      return;
    }

    if (fields.paymentMethod === "Email inquiry/order") {
      status.textContent = "Opening your email app with the full order summary.";
      window.location.href = emailLink.href;
      return;
    }

    status.textContent = "Opening WhatsApp with your order summary. The email fallback is ready beside it.";
    openWhatsapp(message);
  });

  emailLink.addEventListener("click", () => {
    const cart = getDetailedCart();
    if (cart.length === 0) {
      emailLink.href = "#";
      return;
    }

    const data = new FormData(form);
    const fields = {
      fullName: String(data.get("full_name") || "").trim() || "Website visitor",
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      paymentMethod: String(data.get("payment_method") || "").trim() || "Not selected",
      note: String(data.get("message") || "").trim()
    };

    const message = buildOrderMessage(fields, cart);
    emailLink.href = buildEmailLink(`Course checkout request from ${fields.fullName}`, message);
  });
}

function initGlobalEvents() {
  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const addButton = target.closest("[data-add-course]");
    if (addButton instanceof HTMLElement) {
      addToCart(addButton.dataset.addCourse);
      return;
    }

    const enquireButton = target.closest("[data-enquire-course]");
    if (enquireButton instanceof HTMLElement) {
      const title = enquireButton.dataset.enquireCourse;
      if (title) {
        openWhatsapp(buildCourseEnquiryMessage(title));
      }
      return;
    }

    const whatsappButton = target.closest("[data-whatsapp-message]");
    if (whatsappButton instanceof HTMLElement) {
      const template = normalizeWhatsappTemplate(whatsappButton.dataset.whatsappMessage);
      if (template) {
        openWhatsapp(template);
      }
      return;
    }

    const removeButton = target.closest("[data-remove-course]");
    if (removeButton instanceof HTMLElement) {
      const id = removeButton.dataset.removeCourse;
      updateCartItem(id, 0);
      return;
    }

    const clearButton = target.closest("[data-clear-cart]");
    if (clearButton instanceof HTMLElement) {
      clearCart();
    }
  });
}

function initYear() {
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  }
}

function initExitIntentModal() {
  const modalEl = document.getElementById("exitIntentModal");
  if (!modalEl || !window.bootstrap) {
    return;
  }

  // Desktop only. Avoid annoying visitors on smaller screens.
  const canShow = window.matchMedia && window.matchMedia("(pointer: fine)").matches && window.innerWidth >= 992;
  if (!canShow) {
    return;
  }

  try {
    if (localStorage.getItem(EXIT_INTENT_KEY)) {
      return;
    }
  } catch {
    // ignore
  }

  const whatsappBtn = document.querySelector("[data-exit-whatsapp]");
  if (whatsappBtn instanceof HTMLElement) {
    whatsappBtn.addEventListener("click", () => {
      openWhatsapp([
        "Hello DevHaven Studio,",
        "",
        "I saw your portfolio and I want a quick chat:",
        "- Course pricing / schedule OR",
        "- Website quote / next steps",
        "",
        "My goal is:"
      ].join("\n"));
    });
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  let armedAt = Date.now();
  let hasScrolledEnough = false;
  let armed = false;

  const onScroll = () => {
    if (window.scrollY > 140) {
      hasScrolledEnough = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });

  // Arm after a short delay so it won't trigger instantly.
  setTimeout(() => {
    armed = true;
  }, 9000);

  const onMouseOut = (event) => {
    if (!armed || !hasScrolledEnough) {
      return;
    }

    // Only when leaving at the top of the viewport.
    if (event.clientY > 0) {
      return;
    }

    // If user just landed, skip.
    if (Date.now() - armedAt < 9000) {
      return;
    }

    try {
      localStorage.setItem(EXIT_INTENT_KEY, new Date().toISOString());
    } catch {
      // ignore
    }

    document.removeEventListener("mouseout", onMouseOut);
    window.removeEventListener("scroll", onScroll);
    modal.show();
  };

  document.addEventListener("mouseout", onMouseOut);
}

function init() {
  initYear();
  initProfileDownload();
  initLeadForm();
  initQuickEnquiryForm();
  initSupportForms();
  initCheckoutPaymentMethodUI();
  initCheckoutForm();
  initPaystackPayment();
  initPaymentSuccessPage();
  initGlobalEvents();
  initExitIntentModal();
  syncCartBadges();
  renderCartDrawer();
  renderCheckoutPage();
}

document.addEventListener("DOMContentLoaded", init);
