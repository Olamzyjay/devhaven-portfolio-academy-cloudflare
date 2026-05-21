(function () {
  const api = window.DEVHavenResume;
  if (!api) {
    return;
  }

  const data = api.get();

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function setLink(selector, href, label) {
    document.querySelectorAll(selector).forEach((node) => {
      if (node instanceof HTMLAnchorElement) {
        node.href = href;
        if (label) {
          node.textContent = label;
        }
      }
    });
  }

  function renderList(selector, items) {
    const markup = items.map((item) => `<li>${item}</li>`).join("");
    document.querySelectorAll(selector).forEach((node) => {
      node.innerHTML = markup;
    });
  }

  function renderExperience(selector, items) {
    const markup = items.map((item) => `
      <article class="resume-role-card">
        <div class="resume-role-top">
          <div>
            <h3>${item.role}</h3>
            <strong>${item.company}</strong>
          </div>
          <span>${item.period}</span>
        </div>
        <ul class="service-list mb-0">
          ${(item.bullets || []).map((bullet) => `<li>${bullet}</li>`).join("")}
        </ul>
      </article>
    `).join("");

    document.querySelectorAll(selector).forEach((node) => {
      node.innerHTML = markup;
    });
  }

  setText("[data-resume-full-name]", data.fullName);
  setText("[data-resume-brand]", data.brandName);
  setText("[data-resume-title]", data.title);
  setText("[data-resume-location]", data.location);
  setText("[data-resume-phone]", data.phone);
  setText("[data-resume-email]", data.email);
  setText("[data-resume-summary]", data.summary);
  setText("[data-resume-experience-summary]", data.experienceSummary);

  setLink("[data-resume-github]", data.github, data.github.replace(/^https?:\/\//, ""));
  setLink("[data-resume-portfolio]", data.portfolio, data.portfolio.replace(/^https?:\/\//, ""));
  setLink("[data-resume-email-link]", `mailto:${data.email}`, data.email);
  const whatsappNumber = String(data.phone || "").replace(/[^\d]/g, "");
  setLink("[data-resume-phone-link]", `https://wa.me/${whatsappNumber || "2347066861881"}`, data.phone);

  renderList("[data-resume-skills]", data.skills || []);
  renderList("[data-resume-services]", data.services || []);
  renderList("[data-resume-projects]", data.projects || []);
  renderList("[data-resume-training]", data.training || []);
  renderExperience("[data-resume-experience-list]", data.experience || []);
})();
