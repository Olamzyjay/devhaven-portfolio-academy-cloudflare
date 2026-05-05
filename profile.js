window.DEVHavenProfile = {
  name: "Olamide Joshua Olawuyi",
  tagline: "CEO | Developer | Website Designer | Digital Skills Trainer",
  socials: {
    facebook: "https://www.facebook.com/profile.php?id=61582940563204",
    github: "https://github.com/Olamzyjay",
    linkedin: ""
  }
};

function applyProfile() {
  const profile = window.DEVHavenProfile || {};

  const name = String(profile.name || "").trim();
  if (name) {
    document.querySelectorAll("[data-profile-name]").forEach(node => {
      node.textContent = name;
    });
  }

  const tagline = String(profile.tagline || "").trim();
  if (tagline) {
    document.querySelectorAll("[data-profile-tagline]").forEach(node => {
      node.textContent = tagline;
    });
  }

  const socials = profile.socials && typeof profile.socials === "object" ? profile.socials : {};
  const socialMap = {
    facebook: String(socials.facebook || "").trim(),
    github: String(socials.github || "").trim(),
    linkedin: String(socials.linkedin || "").trim()
  };

  Object.entries(socialMap).forEach(([key, url]) => {
    document.querySelectorAll(`[data-social-${key}]`).forEach(node => {
      if (!(node instanceof HTMLAnchorElement)) return;
      if (!url) {
        node.classList.add("d-none");
        node.setAttribute("aria-hidden", "true");
        node.setAttribute("tabindex", "-1");
        node.removeAttribute("href");
        return;
      }
      node.classList.remove("d-none");
      node.removeAttribute("aria-hidden");
      node.removeAttribute("tabindex");
      node.href = url;
    });
  });

  const anySocial = Object.values(socialMap).some(Boolean);
  document.querySelectorAll("[data-social-note]").forEach(node => {
    if (anySocial) {
      node.classList.add("d-none");
    } else {
      node.classList.remove("d-none");
    }
  });
}

document.addEventListener("DOMContentLoaded", applyProfile);
