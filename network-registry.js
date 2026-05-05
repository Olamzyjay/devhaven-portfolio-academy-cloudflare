function initNetworkRegistry() {
  const grid = document.getElementById("networkProjects");
  const search = document.getElementById("networkSearch");
  const statusFilter = document.getElementById("networkStatusFilter");
  const categoryWrap = document.getElementById("networkCategoryButtons");

  if (!grid || !search || !statusFilter || !categoryWrap) {
    return;
  }

  const store = window.DevHavenNetworkStore;
  let activeCategory = "";
  let projects = [];

  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = String(value);
    }
  };

  function refreshProjects() {
    projects = store && typeof store.getProjects === "function"
      ? store.getProjects()
      : (Array.isArray(window.DEVHavenNetworkProjects) ? window.DEVHavenNetworkProjects : []);
  }

  function updateStats() {
    setText("networkTotalProjects", projects.length);
    setText("networkLiveProjects", projects.filter(project => project.status === "Live").length);
    setText("networkProjectCategories", new Set(projects.map(project => project.category || project.type).filter(Boolean)).size);
    setText("networkFeaturedProjects", projects.filter(project => project.featured).length);
  }

  function buildCategoryButtons() {
    const categories = [...new Set(projects.map(project => project.category || project.type).filter(Boolean))];
    categoryWrap.innerHTML = categories
      .map(category => `<button class="network-filter" type="button" data-network-category="${category}">${category}</button>`)
      .join("");

    document.querySelectorAll("[data-network-category]").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-network-category]").forEach(node => node.classList.remove("active"));
        button.classList.add("active");
        activeCategory = button.getAttribute("data-network-category") || "";
        renderProjects();
      });
    });
  }

  function getProjectUrl(project) {
    return project.url || (project.domain && project.domain.includes(".") ? `https://${project.domain}` : "");
  }

  function getProjectScreenshot(project) {
    return project.screenshot || `https://placehold.co/900x600/111827/38BDF8?text=${encodeURIComponent(project.client || "DevHaven Project")}`;
  }

  function renderProjects() {
    const query = String(search.value || "").trim().toLowerCase();
    const status = String(statusFilter.value || "").trim();

    const filtered = projects.filter(project => {
      const haystack = [
        project.client,
        project.domain,
        project.type,
        project.category,
        project.description,
        project.stack,
        project.seoTitle,
        project.seoKeywords
      ].join(" ").toLowerCase();

      return (!query || haystack.includes(query))
        && (!status || project.status === status)
        && (!activeCategory || (project.category || project.type) === activeCategory);
    });

    if (!filtered.length) {
      grid.innerHTML = `<p class="network-empty">No matching DevHaven projects found right now.</p>`;
      return;
    }

    grid.innerHTML = filtered.map(project => {
      const projectUrl = getProjectUrl(project);
      const target = projectUrl.startsWith("http") ? "_blank" : "_self";
      const category = project.category || project.type || "Project";
      const seoLine = project.seoTitle || project.seoDescription
        ? `<div class="network-seo">
            ${project.seoTitle ? `<span><strong>SEO title:</strong> ${project.seoTitle}</span>` : ""}
            ${project.seoDescription ? `<span><strong>SEO description:</strong> ${project.seoDescription}</span>` : ""}
          </div>`
        : "";

      return `
        <article class="network-card ${project.featured ? "is-featured" : ""}">
          <div class="network-thumb">
            <img src="${getProjectScreenshot(project)}" alt="${project.client} preview" loading="lazy" decoding="async">
          </div>
          <div class="network-card-body">
            <div class="network-card-top">
              <span class="network-badge">${project.status || "Live"}</span>
              ${project.featured ? `<span class="network-badge network-badge-featured">Featured</span>` : ""}
            </div>
            <h3>${project.client}</h3>
            <p>${project.description || "A verified DevHaven Studio project."}</p>
            <div class="network-meta">
              <span><strong>Domain:</strong> ${project.domain || "Private deployment"}</span>
              <span><strong>Category:</strong> ${category}</span>
              <span><strong>Type:</strong> ${project.type}</span>
              <span><strong>Stack:</strong> ${project.stack || "Project-specific stack"}</span>
            </div>
            ${seoLine}
            <div class="network-actions">
              ${projectUrl ? `<a class="btn btn-accent btn-sm fw-semibold" href="${projectUrl}" target="${target}" rel="noreferrer">Open project</a>` : ""}
              ${project.domain && project.domain.includes(".") ? `<a class="btn btn-outline-light btn-sm fw-semibold" href="https://${project.domain}" target="_blank" rel="noreferrer">Open domain</a>` : ""}
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function fullRefresh() {
    refreshProjects();
    updateStats();
    buildCategoryButtons();
    renderProjects();
  }

  search.addEventListener("input", renderProjects);
  statusFilter.addEventListener("change", renderProjects);
  window.addEventListener("devhaven-network-updated", fullRefresh);

  fullRefresh();
}

document.addEventListener("DOMContentLoaded", initNetworkRegistry);
