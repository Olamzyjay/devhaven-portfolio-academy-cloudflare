document.addEventListener("DOMContentLoaded", () => {
  const store = window.DevHavenNetworkStore;
  if (!store) {
    return;
  }

  const setupPanel = document.getElementById("adminSetupPanel");
  const unlockPanel = document.getElementById("adminUnlockPanel");
  const dashboardPanel = document.getElementById("adminDashboardPanel");
  const setupForm = document.getElementById("adminSetupForm");
  const unlockForm = document.getElementById("adminUnlockForm");
  const projectForm = document.getElementById("adminProjectForm");
  const projectList = document.getElementById("adminProjectList");
  const formMessage = document.getElementById("adminFormMessage");
  const unlockMessage = document.getElementById("adminUnlockMessage");
  const setupMessage = document.getElementById("adminSetupMessage");
  const importInput = document.getElementById("adminImportInput");
  const exportButton = document.getElementById("adminExportBtn");
  const clearButton = document.getElementById("adminClearBtn");
  const resetButton = document.getElementById("adminResetBtn");
  const logoutButton = document.getElementById("adminLogoutBtn");
  const cancelEditButton = document.getElementById("adminCancelEditBtn");
  const formTitle = document.getElementById("adminFormTitle");

  function setPanel(panel) {
    [setupPanel, unlockPanel, dashboardPanel].forEach(node => {
      if (node) {
        node.classList.add("d-none");
      }
    });
    if (panel) {
      panel.classList.remove("d-none");
    }
  }

  function fillStats() {
    const projects = store.getProjects();
    document.getElementById("adminTotalProjects").textContent = String(projects.length);
    document.getElementById("adminFeaturedProjects").textContent = String(projects.filter(project => project.featured).length);
    document.getElementById("adminLiveProjects").textContent = String(projects.filter(project => project.status === "Live").length);
    document.getElementById("adminCustomProjects").textContent = String(store.getCustomProjects().length);
  }

  function resetForm() {
    projectForm.reset();
    projectForm.projectId.value = "";
    formTitle.textContent = "Add or update a project";
    formMessage.textContent = "";
  }

  function loadProjectIntoForm(project) {
    projectForm.projectId.value = project.id || "";
    projectForm.domain.value = project.domain || "";
    projectForm.client.value = project.client || "";
    projectForm.type.value = project.type || "";
    projectForm.category.value = project.category || "";
    projectForm.url.value = project.url || "";
    projectForm.status.value = project.status || "Live";
    projectForm.screenshot.value = project.screenshot || "";
    projectForm.stack.value = project.stack || "";
    projectForm.description.value = project.description || "";
    projectForm.seoTitle.value = project.seoTitle || "";
    projectForm.seoDescription.value = project.seoDescription || "";
    projectForm.seoKeywords.value = project.seoKeywords || "";
    projectForm.canonical.value = project.canonical || "";
    projectForm.notes.value = project.notes || "";
    projectForm.featured.checked = Boolean(project.featured);
    formTitle.textContent = `Editing: ${project.client || project.id}`;
    formMessage.textContent = "Editing existing registry item.";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderList() {
    const projects = store.getProjects();
    if (!projects.length) {
      projectList.innerHTML = `<p class="network-empty">No projects saved yet.</p>`;
      return;
    }

    projectList.innerHTML = projects.map(project => `
      <article class="admin-project-card">
        <div class="admin-project-thumb">
          <img src="${project.screenshot || "https://placehold.co/900x600/111827/38BDF8?text=DevHaven+Project"}" alt="${project.client} screenshot" loading="lazy" decoding="async">
        </div>
        <div class="admin-project-body">
          <div class="admin-project-top">
            <div>
              <h3>${project.client}</h3>
              <p>${project.type} • ${project.category || "General"} • ${project.status || "Live"}</p>
            </div>
            ${project.featured ? `<span class="network-badge network-badge-featured">Featured</span>` : ""}
          </div>
          <p class="admin-project-copy">${project.description || "No description yet."}</p>
          <div class="admin-project-meta">
            <span><strong>Domain:</strong> ${project.domain || "Private"}</span>
            <span><strong>SEO title:</strong> ${project.seoTitle || "Not set"}</span>
            <span><strong>Canonical:</strong> ${project.canonical || "Not set"}</span>
          </div>
          <div class="admin-project-actions">
            <button class="btn btn-accent btn-sm fw-semibold" type="button" data-edit-project="${project.id}">Edit</button>
            <button class="btn btn-outline-danger btn-sm fw-semibold" type="button" data-delete-project="${project.id}">Delete</button>
          </div>
        </div>
      </article>
    `).join("");

    projectList.querySelectorAll("[data-edit-project]").forEach(button => {
      button.addEventListener("click", () => {
        const project = store.getProjects().find(item => item.id === button.getAttribute("data-edit-project"));
        if (project) {
          loadProjectIntoForm(project);
        }
      });
    });

    projectList.querySelectorAll("[data-delete-project]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-delete-project");
        const project = store.getProjects().find(item => item.id === id);
        if (!project) {
          return;
        }
        if (window.confirm(`Delete ${project.client}?`)) {
          store.deleteProject(id);
          fillStats();
          renderList();
          formMessage.textContent = `${project.client} removed from the custom registry layer.`;
        }
      });
    });
  }

  function showDashboard() {
    setPanel(dashboardPanel);
    fillStats();
    renderList();
  }

  setupForm.addEventListener("submit", event => {
    event.preventDefault();
    const passcode = setupForm.setupPasscode.value.trim();
    const confirmPasscode = setupForm.setupPasscodeConfirm.value.trim();

    if (!passcode || passcode.length < 6) {
      setupMessage.textContent = "Use at least 6 characters for the admin passcode.";
      return;
    }
    if (passcode !== confirmPasscode) {
      setupMessage.textContent = "Those passcodes do not match.";
      return;
    }

    store.setAdminPasscode(passcode);
    store.login(passcode);
    setupForm.reset();
    setupMessage.textContent = "";
    showDashboard();
  });

  unlockForm.addEventListener("submit", event => {
    event.preventDefault();
    const passcode = unlockForm.unlockPasscode.value.trim();
    if (!store.login(passcode)) {
      unlockMessage.textContent = "That passcode is not correct for this browser.";
      return;
    }
    unlockForm.reset();
    unlockMessage.textContent = "";
    showDashboard();
  });

  projectForm.addEventListener("submit", event => {
    event.preventDefault();
    const nextProject = store.saveProject({
      id: projectForm.projectId.value,
      domain: projectForm.domain.value,
      client: projectForm.client.value,
      type: projectForm.type.value,
      category: projectForm.category.value,
      url: projectForm.url.value,
      status: projectForm.status.value,
      screenshot: projectForm.screenshot.value,
      stack: projectForm.stack.value,
      description: projectForm.description.value,
      seoTitle: projectForm.seoTitle.value,
      seoDescription: projectForm.seoDescription.value,
      seoKeywords: projectForm.seoKeywords.value,
      canonical: projectForm.canonical.value,
      notes: projectForm.notes.value,
      featured: projectForm.featured.checked
    });

    formMessage.textContent = `${nextProject.client} saved to the registry.`;
    fillStats();
    renderList();
    resetForm();
  });

  cancelEditButton.addEventListener("click", resetForm);

  exportButton.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(store.getProjects(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "devhaven-network-registry.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  clearButton.addEventListener("click", () => {
    if (!window.confirm("Clear all custom registry entries for this browser?")) {
      return;
    }
    store.replaceCustomProjects([]);
    fillStats();
    renderList();
    resetForm();
  });

  resetButton.addEventListener("click", () => {
    if (!window.confirm("Reset the admin passcode and end this admin session?")) {
      return;
    }
    store.logout();
    window.localStorage.removeItem("devhaven-network-admin-passcode");
    setPanel(setupPanel);
  });

  logoutButton.addEventListener("click", () => {
    store.logout();
    setPanel(unlockPanel);
  });

  importInput.addEventListener("change", async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of projects.");
      }
      store.replaceCustomProjects(parsed);
      fillStats();
      renderList();
      formMessage.textContent = "Registry JSON imported successfully.";
    } catch (error) {
      formMessage.textContent = error.message || "Could not import that JSON file.";
    }
  });

  if (!store.hasAdminPasscode()) {
    setPanel(setupPanel);
  } else if (store.isAdminSession()) {
    showDashboard();
  } else {
    setPanel(unlockPanel);
  }
});
