(function () {
  const API_BASE = "/api/network";
  const SESSION_KEY = "devhaven-network-admin-key";
  let cachedProjects = Array.isArray(window.DevHavenNetworkSeedProjects)
    ? JSON.parse(JSON.stringify(window.DevHavenNetworkSeedProjects))
    : [];

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
      throw new Error(data.error || "Network request failed.");
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

  function isAdminSession() {
    return Boolean(getAdminKey());
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

  async function loadProjects() {
    try {
      const data = await apiFetch("/projects");
      cachedProjects = Array.isArray(data.projects) ? data.projects : [];
    } catch (error) {
      cachedProjects = Array.isArray(window.DevHavenNetworkSeedProjects)
        ? clone(window.DevHavenNetworkSeedProjects)
        : [];
    }

    return clone(cachedProjects);
  }

  function getProjects() {
    return clone(cachedProjects);
  }

  async function saveProject(project) {
    const data = await apiFetch("/projects", {
      method: "POST",
      headers: {
        "x-devhaven-key": getAdminKey()
      },
      body: JSON.stringify(project)
    });
    await loadProjects();
    window.dispatchEvent(new CustomEvent("devhaven-network-updated"));
    return data.project;
  }

  async function deleteProject(id) {
    await apiFetch(`/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "x-devhaven-key": getAdminKey()
      }
    });
    await loadProjects();
    window.dispatchEvent(new CustomEvent("devhaven-network-updated"));
  }

  async function replaceProjects(projects) {
    await apiFetch("/projects", {
      method: "PUT",
      headers: {
        "x-devhaven-key": getAdminKey()
      },
      body: JSON.stringify({ projects })
    });
    await loadProjects();
    window.dispatchEvent(new CustomEvent("devhaven-network-updated"));
  }

  function logout() {
    setAdminKey("");
  }

  window.DevHavenNetworkStore = {
    loadProjects,
    getProjects,
    saveProject,
    deleteProject,
    replaceProjects,
    verifyAdminKey,
    getAdminKey,
    isAdminSession,
    logout
  };
})();
