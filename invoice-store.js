(function () {
  const API_BASE = "/api/invoices";
  const SESSION_KEY = "devhaven-invoice-admin-key";
  let cachedInvoices = [];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Invoice request failed.");
    }

    return data;
  }

  function getAdminKey() {
    return window.sessionStorage.getItem(SESSION_KEY) || "";
  }

  function setAdminKey(key) {
    if (key) {
      window.sessionStorage.setItem(SESSION_KEY, String(key));
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  }

  async function verifyAdminKey(key) {
    await apiFetch("/auth", {
      method: "POST",
      headers: {
        "x-devhaven-key": key
      }
    });
    setAdminKey(key);
    return true;
  }

  async function loadInvoices() {
    const data = await apiFetch("", {
      headers: {
        "x-devhaven-key": getAdminKey()
      }
    });
    cachedInvoices = Array.isArray(data.invoices) ? data.invoices : [];
    return clone(cachedInvoices);
  }

  function getInvoices() {
    return clone(cachedInvoices);
  }

  async function getInvoice(id) {
    const data = await apiFetch(`/${encodeURIComponent(id)}`);
    return data.invoice;
  }

  async function saveInvoice(invoice) {
    const data = await apiFetch("", {
      method: "POST",
      headers: {
        "x-devhaven-key": getAdminKey()
      },
      body: JSON.stringify(invoice)
    });
    await loadInvoices();
    return data.invoice;
  }

  async function deleteInvoice(id) {
    await apiFetch(`/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "x-devhaven-key": getAdminKey()
      }
    });
    await loadInvoices();
  }

  async function initPayment(invoiceId, chargeType) {
    return apiFetch("/paystack/init", {
      method: "POST",
      body: JSON.stringify({ invoiceId, chargeType })
    });
  }

  async function verifyPayment(reference) {
    return apiFetch(`/paystack/verify?reference=${encodeURIComponent(reference)}`);
  }

  function logout() {
    setAdminKey("");
  }

  window.DevHavenInvoiceStore = {
    verifyAdminKey,
    getAdminKey,
    isAdminSession() {
      return Boolean(getAdminKey());
    },
    loadInvoices,
    getInvoices,
    getInvoice,
    saveInvoice,
    deleteInvoice,
    initPayment,
    verifyPayment,
    logout
  };
})();
