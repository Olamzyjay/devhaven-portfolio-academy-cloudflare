(function () {
  const API_BASE = "/api/reviews";
  const SESSION_KEY = "devhaven-review-admin-key";
  let cachedReviews = [];

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
      throw new Error(data.error || "Review request failed.");
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

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read the selected image."));
      reader.readAsDataURL(file);
    });
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

  async function loadApprovedReviews() {
    const data = await apiFetch("");
    cachedReviews = Array.isArray(data.reviews) ? data.reviews : [];
    return clone(cachedReviews);
  }

  async function loadAllReviews() {
    const data = await apiFetch("", {
      headers: {
        "x-devhaven-key": getAdminKey()
      }
    });
    cachedReviews = Array.isArray(data.reviews) ? data.reviews : [];
    return clone(cachedReviews);
  }

  function getReviews() {
    return clone(cachedReviews);
  }

  async function submitReview(fields, imageFile) {
    const imageDataUrl = await fileToDataUrl(imageFile);
    const data = await apiFetch("", {
      method: "POST",
      body: JSON.stringify({
        ...fields,
        imageDataUrl
      })
    });
    return data.review;
  }

  async function updateReview(id, payload) {
    const data = await apiFetch(`/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "x-devhaven-key": getAdminKey()
      },
      body: JSON.stringify(payload)
    });
    await loadAllReviews();
    return data.review;
  }

  async function deleteReview(id) {
    await apiFetch(`/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "x-devhaven-key": getAdminKey()
      }
    });
    await loadAllReviews();
  }

  function logout() {
    setAdminKey("");
  }

  window.DevHavenReviewStore = {
    verifyAdminKey,
    getAdminKey,
    isAdminSession() {
      return Boolean(getAdminKey());
    },
    loadApprovedReviews,
    loadAllReviews,
    getReviews,
    submitReview,
    updateReview,
    deleteReview,
    logout
  };
})();

