(function () {
  const api = window.DEVHavenResume;
  if (!api) {
    return;
  }

  const form = document.getElementById("resumeAdminForm");
  const status = document.getElementById("resumeAdminStatus");
  const resetBtn = document.getElementById("resumeAdminReset");
  const exportBtn = document.getElementById("resumeAdminExport");

  if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) {
    return;
  }

  function linesToArray(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function arrayToLines(value) {
    return Array.isArray(value) ? value.join("\n") : "";
  }

  function experienceToText(items) {
    return (items || []).map((item) => {
      const bullets = (item.bullets || []).map((bullet) => `- ${bullet}`).join("\n");
      return `${item.role} | ${item.company} | ${item.period}\n${bullets}`;
    }).join("\n\n");
  }

  function textToExperience(value) {
    return String(value || "")
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const [role = "", company = "", period = ""] = (lines.shift() || "").split("|").map((part) => part.trim());
        const bullets = lines.map((line) => line.replace(/^-+\s*/, "")).filter(Boolean);
        return { role, company, period, bullets };
      });
  }

  function fillForm(data) {
    form.full_name.value = data.fullName || "";
    form.brand_name.value = data.brandName || "";
    form.title.value = data.title || "";
    form.location.value = data.location || "";
    form.phone.value = data.phone || "";
    form.email.value = data.email || "";
    form.github.value = data.github || "";
    form.portfolio.value = data.portfolio || "";
    form.summary.value = data.summary || "";
    form.experience_summary.value = data.experienceSummary || "";
    form.skills.value = arrayToLines(data.skills);
    form.services.value = arrayToLines(data.services);
    form.projects.value = arrayToLines(data.projects);
    form.training.value = arrayToLines(data.training);
    form.experience.value = experienceToText(data.experience);
  }

  function collectData() {
    return {
      fullName: form.full_name.value.trim(),
      brandName: form.brand_name.value.trim(),
      title: form.title.value.trim(),
      location: form.location.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      github: form.github.value.trim(),
      portfolio: form.portfolio.value.trim(),
      summary: form.summary.value.trim(),
      experienceSummary: form.experience_summary.value.trim(),
      skills: linesToArray(form.skills.value),
      services: linesToArray(form.services.value),
      projects: linesToArray(form.projects.value),
      training: linesToArray(form.training.value),
      experience: textToExperience(form.experience.value)
    };
  }

  fillForm(api.get());

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = collectData();
    api.save(data);
    status.textContent = "Resume and CV data saved on this browser. Open the resume pages again to see the updated content.";
  });

  resetBtn?.addEventListener("click", () => {
    fillForm(api.defaults);
    api.save(api.defaults);
    status.textContent = "Reset to the default DevHaven profile data.";
  });

  exportBtn?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(collectData(), null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "devhaven-resume-data.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  });
})();
