document.addEventListener("DOMContentLoaded", () => {
  const store = window.DevHavenReviewStore;
  if (!store) return;

  const unlockPanel = document.getElementById("reviewUnlockPanel");
  const dashboardPanel = document.getElementById("reviewDashboardPanel");
  const unlockForm = document.getElementById("reviewUnlockForm");
  const unlockMessage = document.getElementById("reviewUnlockMessage");
  const reviewList = document.getElementById("reviewAdminList");
  const logoutButton = document.getElementById("reviewLogoutBtn");

  function setPanel(panel) {
    [unlockPanel, dashboardPanel].forEach((node) => node && node.classList.add("d-none"));
    if (panel) panel.classList.remove("d-none");
  }

  function fillStats(reviews) {
    document.getElementById("reviewTotalCount").textContent = String(reviews.length);
    document.getElementById("reviewPendingCount").textContent = String(reviews.filter((item) => item.status === "pending").length);
    document.getElementById("reviewApprovedCount").textContent = String(reviews.filter((item) => item.status === "approved").length);
    document.getElementById("reviewRejectedCount").textContent = String(reviews.filter((item) => item.status === "rejected").length);
  }

  function ratingStars(rating) {
    const filled = Math.max(1, Math.min(5, Number(rating) || 0));
    return `${"★".repeat(filled)}${"☆".repeat(Math.max(0, 5 - filled))}`;
  }

  async function renderList() {
    const reviews = store.getReviews();
    fillStats(reviews);

    if (!reviews.length) {
      reviewList.innerHTML = `<p class="network-empty">No reviews submitted yet.</p>`;
      return;
    }

    reviewList.innerHTML = reviews.map((review) => `
      <article class="admin-project-card review-admin-card">
        <div class="admin-project-thumb review-admin-thumb">
          <img src="${review.imageUrl}" alt="${review.clientName} review image" loading="lazy" decoding="async">
        </div>
        <div class="admin-project-body">
          <div class="admin-project-top">
            <div>
              <h3>${review.clientName}</h3>
              <p>${review.clientRole} • ${review.organization}</p>
            </div>
            <span class="network-badge ${review.status === "approved" ? "network-badge-featured" : ""}">${review.status}</span>
          </div>
          <p class="admin-project-copy review-admin-quote">“${review.reviewText}”</p>
          <div class="admin-project-meta">
            <span><strong>Project:</strong> ${review.projectName}</span>
            <span><strong>Category:</strong> ${review.projectCategory}</span>
            <span><strong>Rating:</strong> ${ratingStars(review.rating)}</span>
            <span><strong>Email:</strong> ${review.clientEmail}</span>
            ${review.projectUrl ? `<span><strong>Project URL:</strong> <a href="${review.projectUrl}" target="_blank" rel="noreferrer">${review.projectUrl}</a></span>` : ""}
          </div>
          <div class="admin-project-actions flex-wrap">
            <button class="btn btn-accent btn-sm fw-semibold" type="button" data-review-action="approve" data-review-id="${review.id}">Approve</button>
            <button class="btn btn-outline-dark btn-sm fw-semibold" type="button" data-review-action="reject" data-review-id="${review.id}">Reject</button>
            <button class="btn btn-outline-danger btn-sm fw-semibold" type="button" data-review-action="delete" data-review-id="${review.id}">Delete</button>
          </div>
        </div>
      </article>
    `).join("");

    reviewList.querySelectorAll("[data-review-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.getAttribute("data-review-action");
        const id = button.getAttribute("data-review-id");
        try {
          if (action === "delete") {
            if (!window.confirm("Delete this review permanently?")) return;
            await store.deleteReview(id);
          } else {
            await store.updateReview(id, { status: action === "approve" ? "approved" : "rejected" });
          }
          await renderList();
        } catch (error) {
          unlockMessage.textContent = error.message || "Could not update that review.";
        }
      });
    });
  }

  async function showDashboard() {
    await store.loadAllReviews();
    await renderList();
    setPanel(dashboardPanel);
  }

  unlockForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await store.verifyAdminKey(unlockForm.reviewUnlockKey.value.trim());
      unlockForm.reset();
      unlockMessage.textContent = "";
      await showDashboard();
    } catch (error) {
      unlockMessage.textContent = error.message || "That review admin key is not correct.";
    }
  });

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

