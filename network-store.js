(function () {
  const API_BASE = "/api/registry";
  const SESSION_KEY = "devhaven-registry-admin-key";
  let cachedProjects = [];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function apiFetch(path = "", options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Registry request failed.");
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

  async function loadProjects() {
    const data = await apiFetch("");
    cachedProjects = Array.isArray(data.projects) ? data.projects : [];
    window.dispatchEvent(new CustomEvent("devhaven-network-updated"));
    return clone(cachedProjects);
  }

  function getProjects() {
    return clone(cachedProjects);
  }

  function getCustomProjects() {
    return clone(cachedProjects);
  }

  async function saveProject(project) {
    const data = await apiFetch("", {
      method: "POST",
      headers: {
        "x-devhaven-key": getAdminKey()
      },
      body: JSON.stringify(project)
    });
    await loadProjects();
    return data.project;
  }

  async function deleteProject(id) {
    await apiFetch(`/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "x-devhaven-key": getAdminKey()
      }
    });
    await loadProjects();
  }

  async function replaceCustomProjects(projects) {
    await apiFetch("", {
      method: "PUT",
      headers: {
        "x-devhaven-key": getAdminKey()
      },
      body: JSON.stringify({ projects })
    });
    await loadProjects();
  }

  function logout() {
    setAdminKey("");
  }

  window.DevHavenNetworkStore = {
    verifyAdminKey,
    getAdminKey,
    isAdminSession() {
      return Boolean(getAdminKey());
    },
    loadProjects,
    getProjects,
    getCustomProjects,
    saveProject,
    deleteProject,
    replaceCustomProjects,
    logout
  };
})();
