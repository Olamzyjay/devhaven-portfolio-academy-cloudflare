(function () {
  const STORAGE_KEY = "devhaven-theme";
  const THEMES = {
    orange: "theme-orange.css",
    glass: "theme-glass.css"
  };

  function getThemeLink() {
    return document.getElementById("themeStylesheet");
  }

  function getPrefix() {
    const link = getThemeLink();
    if (!link) {
      return "";
    }

    const href = link.getAttribute("href") || THEMES.glass;
    return href.slice(0, Math.max(0, href.lastIndexOf("/") + 1));
  }

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "orange" ? "orange" : "glass";
    } catch {
      return "glass";
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore private-mode storage failures.
    }
  }

  function syncButtons(theme) {
    const next = theme === "orange" ? "glass" : "orange";
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      button.setAttribute("aria-pressed", theme === "glass" ? "true" : "false");
      button.setAttribute("aria-label", `Switch to ${next === "glass" ? "day / sunshine" : "night / dark"} theme`);
      button.innerHTML = `
        <span class="theme-switch-track" aria-hidden="true">
          <span class="theme-switch-icon theme-switch-night"><i class="bi bi-moon-stars"></i></span>
          <span class="theme-switch-thumb"></span>
          <span class="theme-switch-icon theme-switch-day"><i class="bi bi-cloud-sun"></i></span>
        </span>
        <span class="visually-hidden">${theme === "orange" ? "Night theme active" : "Day theme active"}</span>
      `;
    });
  }

  function applyTheme(theme, persist) {
    const nextTheme = theme === "glass" ? "glass" : "orange";
    const link = getThemeLink();
    if (link) {
      link.setAttribute("href", `${getPrefix()}${THEMES[nextTheme]}`);
    }
    document.documentElement.setAttribute("data-devhaven-theme", nextTheme);
    document.documentElement.setAttribute("data-bs-theme", nextTheme === "glass" ? "light" : "dark");
    if (persist) {
      saveTheme(nextTheme);
    }
    syncButtons(nextTheme);
  }

  function createButton() {
    const button = document.createElement("button");
    button.className = "theme-switch-btn";
    button.type = "button";
    button.dataset.themeToggle = "";
    return button;
  }

  function ensureNavbarButton() {
    if (document.querySelector("[data-theme-toggle]")) {
      return;
    }

    const navActions = document.querySelector(".navbar .container .ms-auto");
    const navContainer = document.querySelector(".navbar .container");
    const button = createButton();

    if (navActions) {
      navActions.insertBefore(button, navActions.firstChild);
      return;
    }

    if (navContainer) {
      button.classList.add("ms-auto");
      navContainer.appendChild(button);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureNavbarButton();
    applyTheme(getSavedTheme(), false);

    document.addEventListener("click", event => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const button = event.target.closest("[data-theme-toggle]");
      if (!button) {
        return;
      }

      const current = document.documentElement.getAttribute("data-devhaven-theme") || getSavedTheme();
      applyTheme(current === "orange" ? "glass" : "orange", true);
    });
  });
})();
