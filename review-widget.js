document.addEventListener("DOMContentLoaded", async () => {
  const store = window.DevHavenReviewStore;
  const carousel = document.getElementById("testimonialCarousel");
  const listContainer = document.getElementById("testimonialCarouselInner");
  const indicators = document.getElementById("testimonialCarouselIndicators");
  const emptyState = document.getElementById("testimonialEmptyState");

  if (!store || !carousel || !listContainer || !indicators) return;

  try {
    const reviews = await store.loadApprovedReviews();
    if (!reviews.length) {
      emptyState?.classList.remove("d-none");
      return;
    }

    const visible = reviews.slice(0, 6);
    indicators.innerHTML = visible.map((review, index) => `
      <button type="button" data-bs-target="#testimonialCarousel" data-bs-slide-to="${index}" ${index === 0 ? 'class="active" aria-current="true"' : ""} aria-label="Testimonial ${index + 1}"></button>
    `).join("");

    listContainer.innerHTML = visible.map((review, index) => `
      <div class="carousel-item ${index === 0 ? "active" : ""}">
        <figure class="testimonial-card" data-live-review="true">
          <img class="testimonial-avatar" src="${review.imageUrl}" alt="${review.clientName} review image" width="72" height="72" loading="lazy" decoding="async">
          <blockquote class="testimonial-quote">
            “${review.reviewText}”
          </blockquote>
          <figcaption class="testimonial-meta">
            <strong>${review.clientName}</strong>
            <span>${review.clientRole} • ${review.organization}</span>
            <small class="testimonial-project-line">${review.projectName}${review.projectCategory ? ` • ${review.projectCategory}` : ""}</small>
          </figcaption>
        </figure>
      </div>
    `).join("");
  } catch (error) {
    console.warn("Could not load live reviews:", error);
  }
});

