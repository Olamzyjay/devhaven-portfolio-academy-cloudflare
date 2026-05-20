document.addEventListener("DOMContentLoaded", () => {
  const store = window.DevHavenReviewStore;
  const form = document.getElementById("reviewSubmitForm");
  const status = document.getElementById("reviewSubmitStatus");
  const previewImage = document.getElementById("reviewImagePreview");
  const previewState = document.getElementById("reviewImagePreviewState");

  if (!store || !form) return;

  const imageInput = form.reviewImage;

  imageInput.addEventListener("change", () => {
    const file = imageInput.files && imageInput.files[0];
    if (!file) {
      previewImage.hidden = true;
      previewImage.src = "";
      previewState.textContent = "Your selected image preview will show here.";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    previewImage.src = objectUrl;
    previewImage.hidden = false;
    previewState.textContent = "Image ready to send.";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Sending your review...";
    status.classList.remove("text-danger", "text-success");

    const imageFile = imageInput.files && imageInput.files[0];
    if (!imageFile) {
      status.textContent = "Please choose a client image before sending.";
      status.classList.add("text-danger");
      return;
    }

    try {
      await store.submitReview({
        clientName: form.clientName.value,
        clientRole: form.clientRole.value,
        clientEmail: form.clientEmail.value,
        organization: form.organization.value,
        projectName: form.projectName.value,
        projectCategory: form.projectCategory.value,
        projectUrl: form.projectUrl.value,
        reviewText: form.reviewText.value,
        rating: form.rating.value
      }, imageFile);

      form.reset();
      previewImage.hidden = true;
      previewImage.src = "";
      previewState.textContent = "Your selected image preview will show here.";
      status.textContent = "Thank you. Your review has been submitted and is waiting for approval.";
      status.classList.add("text-success");
    } catch (error) {
      status.textContent = error.message || "Could not send the review right now.";
      status.classList.add("text-danger");
    }
  });
});

