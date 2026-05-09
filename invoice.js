document.addEventListener("DOMContentLoaded", async () => {
  const store = window.DevHavenInvoiceStore;
  if (!store) return;

  const statusNode = document.getElementById("invoiceStatusText");
  const root = document.getElementById("invoiceView");
  const paymentBox = document.getElementById("invoicePaymentActions");
  const verificationNode = document.getElementById("invoiceVerificationMessage");
  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get("id") || "";
  const reference = params.get("reference") || "";

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(Number(amount) || 0);
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  async function renderInvoice(invoice) {
    setText("invoiceNumber", invoice.invoiceNumber || invoice.id);
    setText("invoiceClient", invoice.clientName || "-");
    setText("invoiceEmail", invoice.clientEmail || "-");
    setText("invoicePhone", invoice.clientPhone || "-");
    setText("invoiceProject", invoice.projectTitle || "-");
    setText("invoiceIssueDate", invoice.issueDate || "-");
    setText("invoiceDueDate", invoice.dueDate || "No fixed due date");
    setText("invoiceDescription", invoice.description || "No project note added yet.");
    setText("invoicePlan", invoice.paymentPlan === "split60" ? "60% upfront / 40% on delivery" : "Full payment");
    setText("invoiceTotal", formatCurrency(invoice.totalAmount));
    setText("invoicePaid", formatCurrency(invoice.paidAmount));
    setText("invoiceBalance", formatCurrency(invoice.balanceAmount));
    setText("invoiceDueNow", formatCurrency(invoice.dueNowAmount));
    setText("invoiceNextAction", invoice.nextPaymentLabel || "Pay outstanding balance");
    statusNode.textContent = invoice.paymentStatus === "paid" ? "Fully paid" : invoice.paymentStatus === "partly-paid" ? "Partly paid" : "Awaiting payment";

    const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
    const paymentHistory = document.getElementById("invoicePaymentHistory");
    paymentHistory.innerHTML = payments.length
      ? payments.map((payment) => `
          <li class="service-list-item">
            <strong>${formatCurrency(payment.amount)}</strong> - ${payment.chargeType} - ${payment.reference}
          </li>
        `).join("")
      : `<li class="service-list-item">No payments recorded yet.</li>`;

    paymentBox.innerHTML = "";
    if (invoice.balanceAmount <= 0) {
      paymentBox.innerHTML = `<p class="section-copy mb-0">This invoice has been fully settled.</p>`;
      return;
    }

    if (invoice.paymentPlan === "split60" && !invoice.hasDepositCovered) {
      paymentBox.innerHTML = `
        <button class="btn btn-accent fw-semibold" type="button" data-charge-type="deposit">${invoice.nextPaymentLabel} (${formatCurrency(invoice.dueNowAmount)})</button>
        <button class="btn btn-outline-dark fw-semibold" type="button" data-charge-type="full">Pay full invoice now (${formatCurrency(invoice.balanceAmount)})</button>
      `;
    } else {
      paymentBox.innerHTML = `
        <button class="btn btn-accent fw-semibold" type="button" data-charge-type="balance">${invoice.nextPaymentLabel} (${formatCurrency(invoice.dueNowAmount)})</button>
      `;
    }

    paymentBox.querySelectorAll("[data-charge-type]").forEach((button) => {
      button.addEventListener("click", async () => {
        verificationNode.textContent = "Starting Paystack payment...";
        try {
          const data = await store.initPayment(invoice.id, button.getAttribute("data-charge-type"));
          if (data.authorization_url) {
            window.location.href = data.authorization_url;
          }
        } catch (error) {
          verificationNode.textContent = error.message || "Could not start payment.";
        }
      });
    });
  }

  if (!invoiceId) {
    statusNode.textContent = "Invoice not found";
    verificationNode.textContent = "No invoice ID was provided.";
    return;
  }

  try {
    if (reference) {
      verificationNode.textContent = "Verifying payment reference...";
      await store.verifyPayment(reference);
      window.history.replaceState({}, "", `invoice.html?id=${encodeURIComponent(invoiceId)}`);
      verificationNode.textContent = "Payment verified and invoice updated.";
    }

    const invoice = await store.getInvoice(invoiceId);
    root.classList.remove("d-none");
    await renderInvoice(invoice);
  } catch (error) {
    statusNode.textContent = "Invoice unavailable";
    verificationNode.textContent = error.message || "Could not load this invoice.";
  }
});
