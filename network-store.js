(function () {
  const STORAGE_KEY = "devhaven-network-custom-projects";
  const PASSCODE_KEY = "devhaven-network-admin-passcode";
  const SESSION_KEY = "devhaven-network-admin-session";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("devhaven-network-updated"));
  }

  function slugify(value) {
    return String(value || "project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `project-${Date.now()}`;
  }

  function getSeedProjects() {
    return clone(Array.isArray(window.DevHavenNetworkSeedProjects) ? window.DevHavenNetworkSeedProjects : []);
  }

  function getCustomProjects() {
    return clone(readJson(STORAGE_KEY, []));
  }

  function replaceCustomProjects(projects) {
    writeJson(STORAGE_KEY, Array.isArray(projects) ? projects : []);
  }

  function getProjects() {
    const map = new Map();
    getSeedProjects().forEach(project => map.set(project.id, project));
    getCustomProjects().forEach(project => map.set(project.id, project));
    return Array.from(map.values());
  }

  function saveProject(project) {
    const list = getCustomProjects();
    const now = new Date().toISOString();
    const id = project.id || slugify(project.client || project.domain || now);
    const next = {
      id,
      domain: String(project.domain || "").trim(),
      client: String(project.client || "").trim(),
      type: String(project.type || "").trim(),
      category: String(project.category || "").trim(),
      url: String(project.url || "").trim(),
      status: String(project.status || "Live").trim(),
      description: String(project.description || "").trim(),
      screenshot: String(project.screenshot || "").trim(),
      featured: project.featured === true || project.featured === "true" || project.featured === "on",
      stack: String(project.stack || "").trim(),
      seoTitle: String(project.seoTitle || "").trim(),
      seoDescription: String(project.seoDescription || "").trim(),
      seoKeywords: String(project.seoKeywords || "").trim(),
      canonical: String(project.canonical || "").trim(),
      notes: String(project.notes || "").trim(),
      updatedAt: now,
      createdAt: project.createdAt || now
    };

    const index = list.findIndex(item => item.id === id);
    if (index >= 0) {
      list[index] = next;
    } else {
      list.unshift(next);
    }

    replaceCustomProjects(list);
    return next;
  }

  function deleteProject(id) {
    replaceCustomProjects(getCustomProjects().filter(project => project.id !== id));
  }

  function getAdminPasscode() {
    return window.localStorage.getItem(PASSCODE_KEY) || "";
  }

  function setAdminPasscode(value) {
    window.localStorage.setItem(PASSCODE_KEY, String(value || "").trim());
  }

  function hasAdminPasscode() {
    return Boolean(getAdminPasscode());
  }

  function login(passcode) {
    const saved = getAdminPasscode();
    if (!saved || saved !== String(passcode || "")) {
      return false;
    }
    window.sessionStorage.setItem(SESSION_KEY, "true");
    return true;
  }

  function logout() {
    window.sessionStorage.removeItem(SESSION_KEY);
  }

  function isAdminSession() {
    return window.sessionStorage.getItem(SESSION_KEY) === "true";
  }

  window.DevHavenNetworkStore = {
    STORAGE_KEY,
    getSeedProjects,
    getCustomProjects,
    replaceCustomProjects,
    getProjects,
    saveProject,
    deleteProject,
    hasAdminPasscode,
    getAdminPasscode,
    setAdminPasscode,
    login,
    logout,
    isAdminSession
  };
})();
