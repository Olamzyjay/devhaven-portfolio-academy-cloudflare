document.addEventListener("DOMContentLoaded", () => {
  const store = window.DevHavenNetworkStore;
  if (!store) {
    return;
  }

  const unlockPanel = document.getElementById("adminUnlockPanel");
  const dashboardPanel = document.getElementById("adminDashboardPanel");
  const unlockForm = document.getElementById("adminUnlockForm");
  const projectForm = document.getElementById("adminProjectForm");
  const projectList = document.getElementById("adminProjectList");
  const formMessage = document.getElementById("adminFormMessage");
  const unlockMessage = document.getElementById("adminUnlockMessage");
  const importInput = document.getElementById("adminImportInput");
  const exportButton = document.getElementById("adminExportBtn");
  const clearButton = document.getElementById("adminClearBtn");
  const logoutButton = document.getElementById("adminLogoutBtn");
  const cancelEditButton = document.getElementById("adminCancelEditBtn");
  const formTitle = document.getElementById("adminFormTitle");

  function setPanel(panel) {
    [unlockPanel, dashboardPanel].forEach((node) => node && node.classList.add("d-none"));
    if (panel) {
      panel.classList.remove("d-none");
    }
  }

  async function fillStats() {
    const projects = await store.loadProjects();
    document.getElementById("adminTotalProjects").textContent = String(projects.length);
    document.getElementById("adminFeaturedProjects").textContent = String(projects.filter((project) => project.featured).length);
    document.getElementById("adminLiveProjects").textContent = String(projects.filter((project) => project.status === "Live").length);
    document.getElementById("adminCustomProjects").textContent = String(projects.filter((project) => project.updatedAt || project.createdAt).length);
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

  async function renderList() {
    const projects = store.getProjects();
    if (!projects.length) {
      projectList.innerHTML = `<p class="network-empty">No projects saved yet.</p>`;
      return;
    }

    projectList.innerHTML = projects.map((project) => `
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

    projectList.querySelectorAll("[data-edit-project]").forEach((button) => {
      button.addEventListener("click", () => {
        const project = store.getProjects().find((item) => item.id === button.getAttribute("data-edit-project"));
        if (project) {
          loadProjectIntoForm(project);
        }
      });
    });

    projectList.querySelectorAll("[data-delete-project]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.getAttribute("data-delete-project");
        const project = store.getProjects().find((item) => item.id === id);
        if (!project) return;
        if (!window.confirm(`Delete ${project.client}?`)) return;
        try {
          await store.deleteProject(id);
          await fillStats();
          await renderList();
          formMessage.textContent = `${project.client} removed from the live registry.`;
        } catch (error) {
          formMessage.textContent = error.message || "Could not delete project.";
        }
      });
    });
  }

  async function showDashboard() {
    setPanel(dashboardPanel);
    await fillStats();
    await renderList();
  }

  unlockForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = unlockForm.unlockPasscode.value.trim();
    try {
      await store.verifyAdminKey(key);
      unlockForm.reset();
      unlockMessage.textContent = "";
      await showDashboard();
    } catch (error) {
      unlockMessage.textContent = error.message || "That admin key is not correct.";
    }
  });

  projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const nextProject = await store.saveProject({
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
      await fillStats();
      await renderList();
      resetForm();
      formMessage.textContent = `${nextProject.client} saved to the live registry.`;
    } catch (error) {
      formMessage.textContent = error.message || "Could not save registry item.";
    }
  });

  cancelEditButton.addEventListener("click", resetForm);

  exportButton.addEventListener("click", async () => {
    const projects = await store.loadProjects();
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "devhaven-network-registry.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  clearButton.addEventListener("click", async () => {
    if (!window.confirm("Replace the live registry with an empty list?")) {
      return;
    }
    try {
      await store.replaceProjects([]);
      await fillStats();
      await renderList();
      resetForm();
      formMessage.textContent = "The live registry is now empty.";
    } catch (error) {
      formMessage.textContent = error.message || "Could not clear registry.";
    }
  });

  logoutButton.addEventListener("click", () => {
    store.logout();
    setPanel(unlockPanel);
  });

  importInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of projects.");
      }
      await store.replaceProjects(parsed);
      await fillStats();
      await renderList();
      formMessage.textContent = "Live registry JSON imported successfully.";
    } catch (error) {
      formMessage.textContent = error.message || "Could not import that JSON file.";
    } finally {
      importInput.value = "";
    }
  });

  window.addEventListener("devhaven-network-updated", async () => {
    await fillStats();
    await renderList();
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
