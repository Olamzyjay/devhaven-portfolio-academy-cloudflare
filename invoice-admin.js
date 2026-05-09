document.addEventListener("DOMContentLoaded", () => {
  const store = window.DevHavenInvoiceStore;
  if (!store) return;

  const unlockPanel = document.getElementById("invoiceUnlockPanel");
  const dashboardPanel = document.getElementById("invoiceDashboardPanel");
  const unlockForm = document.getElementById("invoiceUnlockForm");
  const unlockMessage = document.getElementById("invoiceUnlockMessage");
  const invoiceForm = document.getElementById("invoiceForm");
  const invoiceList = document.getElementById("invoiceList");
  const formMessage = document.getElementById("invoiceFormMessage");
  const formTitle = document.getElementById("invoiceFormTitle");
  const logoutButton = document.getElementById("invoiceLogoutBtn");
  const cancelEditButton = document.getElementById("invoiceCancelEditBtn");

  function setPanel(panel) {
    [unlockPanel, dashboardPanel].forEach((node) => node && node.classList.add("d-none"));
    if (panel) panel.classList.remove("d-none");
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(Number(amount) || 0);
  }

  function invoiceUrl(id) {
    return `${window.location.origin}${window.location.pathname.replace(/invoice-admin\.html$/i, "invoice.html")}?id=${encodeURIComponent(id)}`;
  }

  function fillStats(invoices) {
    document.getElementById("invoiceTotalCount").textContent = String(invoices.length);
    document.getElementById("invoicePaidCount").textContent = String(invoices.filter((item) => item.paymentStatus === "paid").length);
    document.getElementById("invoicePartialCount").textContent = String(invoices.filter((item) => item.paymentStatus === "partly-paid").length);
    document.getElementById("invoiceOutstandingTotal").textContent = formatCurrency(
      invoices.reduce((sum, item) => sum + (Number(item.balanceAmount) || 0), 0)
    );
  }

  function resetForm() {
    invoiceForm.reset();
    invoiceForm.invoiceId.value = "";
    invoiceForm.paymentPlan.value = "full";
    formTitle.textContent = "Create an invoice";
    formMessage.textContent = "";
  }

  function loadInvoiceIntoForm(invoice) {
    invoiceForm.invoiceId.value = invoice.id || "";
    invoiceForm.invoiceNumber.value = invoice.invoiceNumber || "";
    invoiceForm.clientName.value = invoice.clientName || "";
    invoiceForm.clientEmail.value = invoice.clientEmail || "";
    invoiceForm.clientPhone.value = invoice.clientPhone || "";
    invoiceForm.projectTitle.value = invoice.projectTitle || "";
    invoiceForm.totalAmount.value = invoice.totalAmount || "";
    invoiceForm.issueDate.value = invoice.issueDate || "";
    invoiceForm.dueDate.value = invoice.dueDate || "";
    invoiceForm.paymentPlan.value = invoice.paymentPlan || "full";
    invoiceForm.description.value = invoice.description || "";
    invoiceForm.notes.value = invoice.notes || "";
    formTitle.textContent = `Editing: ${invoice.invoiceNumber || invoice.id}`;
    formMessage.textContent = "Editing existing invoice.";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function renderList() {
    const invoices = store.getInvoices();
    fillStats(invoices);

    if (!invoices.length) {
      invoiceList.innerHTML = `<p class="network-empty">No invoices created yet.</p>`;
      return;
    }

    invoiceList.innerHTML = invoices.map((invoice) => `
      <article class="admin-project-card">
        <div class="admin-project-body">
          <div class="admin-project-top">
            <div>
              <h3>${invoice.invoiceNumber}</h3>
              <p>${invoice.clientName} • ${invoice.projectTitle}</p>
            </div>
            <span class="network-badge ${invoice.paymentStatus === "paid" ? "network-badge-featured" : ""}">${invoice.paymentStatus}</span>
          </div>
          <p class="admin-project-copy">${invoice.description || "No description added yet."}</p>
          <div class="admin-project-meta">
            <span><strong>Total:</strong> ${formatCurrency(invoice.totalAmount)}</span>
            <span><strong>Paid:</strong> ${formatCurrency(invoice.paidAmount)}</span>
            <span><strong>Balance:</strong> ${formatCurrency(invoice.balanceAmount)}</span>
            <span><strong>Plan:</strong> ${invoice.paymentPlan === "split60" ? "60% upfront / 40% delivery" : "Full payment"}</span>
          </div>
          <div class="admin-project-actions flex-wrap">
            <button class="btn btn-accent btn-sm fw-semibold" type="button" data-edit-invoice="${invoice.id}">Edit</button>
            <button class="btn btn-outline-dark btn-sm fw-semibold" type="button" data-copy-link="${invoice.id}">Copy link</button>
            <a class="btn btn-outline-dark btn-sm fw-semibold" href="invoice.html?id=${encodeURIComponent(invoice.id)}" target="_blank" rel="noreferrer">Open</a>
            <button class="btn btn-outline-danger btn-sm fw-semibold" type="button" data-delete-invoice="${invoice.id}">Delete</button>
          </div>
        </div>
      </article>
    `).join("");

    invoiceList.querySelectorAll("[data-edit-invoice]").forEach((button) => {
      button.addEventListener("click", () => {
        const invoice = store.getInvoices().find((item) => item.id === button.getAttribute("data-edit-invoice"));
        if (invoice) loadInvoiceIntoForm(invoice);
      });
    });

    invoiceList.querySelectorAll("[data-copy-link]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.getAttribute("data-copy-link");
        try {
          await navigator.clipboard.writeText(invoiceUrl(id));
          formMessage.textContent = "Invoice link copied.";
        } catch {
          formMessage.textContent = invoiceUrl(id);
        }
      });
    });

    invoiceList.querySelectorAll("[data-delete-invoice]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.getAttribute("data-delete-invoice");
        const invoice = store.getInvoices().find((item) => item.id === id);
        if (!invoice) return;
        if (!window.confirm(`Delete ${invoice.invoiceNumber}?`)) return;
        try {
          await store.deleteInvoice(id);
          await renderList();
          formMessage.textContent = `${invoice.invoiceNumber} deleted.`;
        } catch (error) {
          formMessage.textContent = error.message || "Could not delete invoice.";
        }
      });
    });
  }

  async function showDashboard() {
    await store.loadInvoices();
    await renderList();
    setPanel(dashboardPanel);
  }

  unlockForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = unlockForm.invoiceUnlockKey.value.trim();
    try {
      await store.verifyAdminKey(key);
      unlockForm.reset();
      unlockMessage.textContent = "";
      await showDashboard();
    } catch (error) {
      unlockMessage.textContent = error.message || "That invoice admin key is not correct.";
    }
  });

  invoiceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const nextInvoice = await store.saveInvoice({
        id: invoiceForm.invoiceId.value,
        invoiceNumber: invoiceForm.invoiceNumber.value,
        clientName: invoiceForm.clientName.value,
        clientEmail: invoiceForm.clientEmail.value,
        clientPhone: invoiceForm.clientPhone.value,
        projectTitle: invoiceForm.projectTitle.value,
        totalAmount: invoiceForm.totalAmount.value,
        issueDate: invoiceForm.issueDate.value,
        dueDate: invoiceForm.dueDate.value,
        paymentPlan: invoiceForm.paymentPlan.value,
        description: invoiceForm.description.value,
        notes: invoiceForm.notes.value,
        status: "sent"
      });
      resetForm();
      await renderList();
      formMessage.textContent = `${nextInvoice.invoiceNumber} saved.`;
    } catch (error) {
      formMessage.textContent = error.message || "Could not save invoice.";
    }
  });

  cancelEditButton.addEventListener("click", resetForm);
  logoutButton.addEventListener("click", () => {
    store.logout();
    setPanel(unlockPanel);
  });

  if (store.isAdminSession()) {
    showDashboard().catch(() => {
      store.logout();
      setPanel(unlockPanel);
    });
  } else {
    setPanel(unlockPanel);
  }
});
