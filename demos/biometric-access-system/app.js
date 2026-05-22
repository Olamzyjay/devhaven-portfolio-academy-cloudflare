(function () {
  const storageKey = "bioregistry-system-v1";
  const settingsKey = "bioregistry-settings-v1";
  const todayKey = new Date().toISOString().slice(0, 10);

  const seedData = {
    staff: [
      {
        id: crypto.randomUUID(),
        fullName: "Amaka Okafor",
        staffId: "ORG/STF/001",
        department: "Operations",
        role: "Access Control Officer",
        email: "amaka.okafor@company.test",
        phone: "+234 801 000 1001",
        shiftStart: "08:00",
        accessLevel: "IT Admin",
        notes: "Authorized for identity verification and security console.",
        templateHash: "",
        demoCode: "amaka-finger-001",
        status: "Active",
        enrolledAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        fullName: "Tunde Balogun",
        staffId: "ORG/STF/002",
        department: "Finance",
        role: "Account Officer",
        email: "tunde.balogun@company.test",
        phone: "+234 802 000 1002",
        shiftStart: "08:30",
        accessLevel: "Finance",
        notes: "Authorized for finance vault and general staff records.",
        templateHash: "",
        demoCode: "tunde-finger-002",
        status: "Active",
        enrolledAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        fullName: "Grace Eze",
        staffId: "ORG/STF/003",
        department: "Human Resources",
        role: "HR Manager",
        email: "grace.eze@company.test",
        phone: "+234 803 000 1003",
        shiftStart: "09:00",
        accessLevel: "HR",
        notes: "Authorized for HR files and general records.",
        templateHash: "",
        demoCode: "grace-face-003",
        status: "Active",
        enrolledAt: new Date().toISOString()
      }
    ],
    attendance: [],
    audit: []
  };

  const state = loadState();
  const settings = loadSettings();
  const views = document.querySelectorAll(".view");
  const navButtons = document.querySelectorAll(".nav-button");
  let faceStream = null;
  let faceScanTimer = null;
  let autoFaceCapture = true;
  let lastVerifiedStaff = null;

  init();

  async function init() {
    registerServiceWorker();
    bindNetworkStatus();
    await ensureSeedHashes();
    bindNavigation();
    bindForms();
    renderSettings();
    renderAll();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("Offline cache registration failed.", error);
      });
    });
  }

  function bindNetworkStatus() {
    const indicator = document.getElementById("networkStatus");
    const update = () => {
      const online = navigator.onLine;
      indicator.textContent = online ? "Online" : "Offline ready";
      indicator.className = online ? "online" : "offline";
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
  }

  function loadState() {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.warn("Saved registry data could not be read.", error);
      }
    }
    return structuredClone(seedData);
  }

  async function ensureSeedHashes() {
    let changed = false;
    for (const staff of state.staff) {
      if (!staff.templateHash && staff.demoCode) {
        staff.templateHash = await hashTemplate(staff.demoCode);
        changed = true;
      }
    }
    if (changed) saveState();
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function loadSettings() {
    const saved = localStorage.getItem(settingsKey);
    if (!saved) return { bridgeUrl: "http://127.0.0.1:8787", nimcApiUrl: "" };
    try {
      return { bridgeUrl: "http://127.0.0.1:8787", nimcApiUrl: "", ...JSON.parse(saved) };
    } catch (error) {
      console.warn("Saved device settings could not be read.", error);
      return { bridgeUrl: "http://127.0.0.1:8787", nimcApiUrl: "" };
    }
  }

  function saveSettings() {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }

  function bindNavigation() {
    navButtons.forEach((button) => {
      button.addEventListener("click", () => showView(button.dataset.view));
    });
    document.querySelectorAll("[data-jump]").forEach((button) => {
      button.addEventListener("click", () => showView(button.dataset.jump));
    });
  }

  function showView(id) {
    views.forEach((view) => view.classList.toggle("active", view.id === id));
    navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === id));
  }

  function bindForms() {
    document.getElementById("captureBiometric").addEventListener("click", () => {
      document.getElementById("biometricInput").value = generateDemoCode();
    });
    document.getElementById("captureDigitalPersona").addEventListener("click", () => captureFingerprint("digitalpersona"));
    document.getElementById("captureFutronic").addEventListener("click", () => captureFingerprint("futronic"));
    document.getElementById("startFaceCapture").addEventListener("click", startFaceCapture);
    document.getElementById("captureFaceFrame").addEventListener("click", captureFaceFrame);
    document.getElementById("toggleAutoFace").addEventListener("click", toggleAutoFace);
    document.getElementById("stopFaceCapture").addEventListener("click", stopFaceCapture);
    document.getElementById("saveBridge").addEventListener("click", saveBridgeUrl);
    document.getElementById("testBridge").addEventListener("click", testBridge);
    document.getElementById("nimcForm").addEventListener("submit", handleNimcLookup);

    document.querySelectorAll("[data-demo-scan]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.demoScan || "quickBiometric";
        const activeStaff = state.staff.find((staff) => staff.status === "Active");
        document.getElementById(target).value = activeStaff ? activeStaff.demoCode : generateDemoCode();
      });
    });

    document.getElementById("enrollmentForm").addEventListener("submit", handleEnrollment);
    document.getElementById("quickVerifyForm").addEventListener("submit", handleQuickVerify);
    document.getElementById("verificationForm").addEventListener("submit", handleFullVerify);
    document.getElementById("markAttendance").addEventListener("click", handleAttendanceButton);
    document.getElementById("staffSearch").addEventListener("input", renderStaffDirectory);
    document.getElementById("exportAttendance").addEventListener("click", exportAttendanceCsv);
    document.getElementById("resetDemo").addEventListener("click", resetDemoData);
  }

  function renderSettings() {
    document.getElementById("bridgeUrl").value = settings.bridgeUrl;
    document.getElementById("nimcApiUrl").value = settings.nimcApiUrl || "";
  }

  async function captureFingerprint(device) {
    const mode = device === "digitalpersona" ? "DigitalPersona" : "Futronic";
    const endpoint = `${settings.bridgeUrl.replace(/\/$/, "")}/capture/${device}`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "enrollment", format: "template" })
      });
      if (!response.ok) throw new Error(`Bridge returned ${response.status}`);
      const payload = await response.json();
      if (!payload.template) throw new Error("Bridge response did not include a template.");
      document.getElementById("biometricInput").value = `${device}:${payload.template}`;
      addAudit("Device Capture", mode, "Enrollment", "Allowed");
      saveState();
      renderAll();
    } catch (error) {
      const fallback = `${device}:demo-${generateDemoCode()}`;
      document.getElementById("biometricInput").value = fallback;
      alert(`${mode} bridge is not connected yet. A demo template was inserted so you can continue testing.`);
    }
  }

  async function startFaceCapture() {
    const panel = document.getElementById("cameraPanel");
    const video = document.getElementById("faceVideo");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("This browser does not support webcam capture.");
      return;
    }
    try {
      faceStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = faceStream;
      panel.hidden = false;
      updateFaceStatus("Position face clearly in view", 0);
      startAutoFaceScan();
    } catch (error) {
      alert("Camera permission was not granted or no webcam was found.");
    }
  }

  async function captureFaceFrame() {
    const video = document.getElementById("faceVideo");
    const canvas = document.getElementById("faceCanvas");
    const context = canvas.getContext("2d");
    if (!faceStream) {
      alert("Start the webcam first.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = canvas.toDataURL("image/jpeg", 0.55);
    const template = await hashTemplate(`face:${frame.slice(0, 2400)}`);
    document.getElementById("biometricInput").value = `face:${template}`;
    updateFaceStatus("Face template captured", 100);
    stopFaceCapture();
  }

  function startAutoFaceScan() {
    clearInterval(faceScanTimer);
    if (!autoFaceCapture) return;
    faceScanTimer = setInterval(async () => {
      if (!faceStream) return;
      const score = measureFaceFrameQuality();
      updateFaceStatus(score >= 72 ? "Clear face view detected" : "Waiting for clear face view", score);
      if (score >= 72) {
        clearInterval(faceScanTimer);
        faceScanTimer = null;
        await captureFaceFrame();
      }
    }, 800);
  }

  function measureFaceFrameQuality() {
    const video = document.getElementById("faceVideo");
    const canvas = document.getElementById("faceCanvas");
    if (!video.videoWidth || !video.videoHeight) return 0;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const sample = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let brightness = 0;
    let contrast = 0;
    let previous = 0;
    let edges = 0;
    const pixels = sample.length / 4;
    for (let index = 0; index < sample.length; index += 16) {
      const value = (sample[index] + sample[index + 1] + sample[index + 2]) / 3;
      brightness += value;
      contrast += Math.abs(value - 128);
      edges += Math.abs(value - previous);
      previous = value;
    }
    const sampledPixels = pixels / 4;
    const avgBrightness = brightness / sampledPixels;
    const brightnessScore = Math.max(0, 100 - Math.abs(avgBrightness - 135) * 1.2);
    const contrastScore = Math.min(100, (contrast / sampledPixels) * 2.2);
    const edgeScore = Math.min(100, (edges / sampledPixels) * 2.6);
    return Math.round((brightnessScore * 0.35) + (contrastScore * 0.25) + (edgeScore * 0.4));
  }

  function updateFaceStatus(message, score) {
    document.getElementById("faceCaptureStatus").textContent = `${message} (${Math.round(score)}%)`;
    document.getElementById("faceCaptureQuality").value = Math.round(score);
  }

  function toggleAutoFace(event) {
    autoFaceCapture = !autoFaceCapture;
    event.currentTarget.textContent = autoFaceCapture ? "Auto Capture On" : "Auto Capture Off";
    if (autoFaceCapture && faceStream) startAutoFaceScan();
    if (!autoFaceCapture) clearInterval(faceScanTimer);
  }

  function stopFaceCapture() {
    clearInterval(faceScanTimer);
    faceScanTimer = null;
    if (faceStream) {
      faceStream.getTracks().forEach((track) => track.stop());
      faceStream = null;
    }
    document.getElementById("cameraPanel").hidden = true;
  }

  function saveBridgeUrl() {
    settings.bridgeUrl = document.getElementById("bridgeUrl").value.trim() || "http://127.0.0.1:8787";
    settings.nimcApiUrl = document.getElementById("nimcApiUrl").value.trim();
    saveSettings();
    setBridgeStatus("Bridge saved", "partial");
  }

  async function testBridge() {
    saveBridgeUrl();
    try {
      const response = await fetch(`${settings.bridgeUrl.replace(/\/$/, "")}/status`);
      if (!response.ok) throw new Error(`Bridge returned ${response.status}`);
      const payload = await response.json();
      setBridgeStatus(payload.ready ? "Bridge ready" : "Bridge online", payload.ready ? "allowed" : "partial");
    } catch (error) {
      setBridgeStatus("Bridge offline", "denied");
    }
  }

  function setBridgeStatus(text, type) {
    const badge = document.getElementById("bridgeStatus");
    badge.textContent = text;
    badge.className = `badge ${type}`;
  }

  async function handleEnrollment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const templateHash = await hashTemplate(data.biometricInput);
    const duplicate = state.staff.find((staff) => staff.templateHash === templateHash);
    if (duplicate) {
      alert(`This biometric already belongs to ${duplicate.fullName} (${duplicate.staffId}).`);
      return;
    }

    state.staff.unshift({
      id: crypto.randomUUID(),
      fullName: data.fullName.trim(),
      staffId: data.staffId.trim(),
      department: data.department.trim(),
      role: data.role.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      shiftStart: data.shiftStart,
      accessLevel: data.accessLevel,
      notes: data.notes.trim(),
      templateHash,
      demoCode: data.biometricInput.trim(),
      status: "Active",
      enrolledAt: new Date().toISOString()
    });

    addAudit("Enrollment", data.fullName, "Registry", "Allowed");
    saveState();
    form.reset();
    document.getElementById("shiftStart").value = "08:00";
    renderAll();
    alert("Staff member enrolled and biometric template linked.");
  }

  async function handleQuickVerify(event) {
    event.preventDefault();
    const code = document.getElementById("quickBiometric").value;
    const result = await verifyCode(code, "General");
    const resultBox = document.getElementById("quickResult");
    document.getElementById("lastResultBadge").textContent = result.allowed ? "Allowed" : "Denied";
    document.getElementById("lastResultBadge").className = `badge ${result.allowed ? "allowed" : "denied"}`;
    resultBox.className = `result-box ${result.allowed ? "" : "muted"}`;
    resultBox.innerHTML = result.allowed
      ? `<strong>${escapeHtml(result.staff.fullName)}</strong><br>${escapeHtml(result.staff.role)} · ${escapeHtml(result.staff.department)}<br>Access approved for general staff records.`
      : `<strong>Access denied.</strong><br>${escapeHtml(result.reason)}`;
    lastVerifiedStaff = result.allowed ? result.staff : null;
    renderAll();
  }

  async function handleFullVerify(event) {
    event.preventDefault();
    const code = document.getElementById("verifyBiometric").value;
    const area = document.getElementById("accessArea").value;
    const result = await verifyCode(code, area);
    renderVerificationResult(result, area);
    lastVerifiedStaff = result.allowed ? result.staff : null;
    renderAll();
  }

  async function handleAttendanceButton() {
    const code = document.getElementById("verifyBiometric").value;
    if (!code.trim()) {
      alert("Scan or type a biometric code first.");
      return;
    }
    const result = await verifyCode(code, "Attendance Terminal", { logAccess: false });
    if (!result.allowed) {
      addAudit("Timebook", "Unknown", "Attendance Terminal", "Denied");
      saveState();
      renderVerificationResult(result, "Attendance Terminal");
      renderAll();
      return;
    }
    markAttendance(result.staff);
    addAudit("Timebook", result.staff.fullName, "Attendance Terminal", "Allowed");
    saveState();
    renderVerificationResult({ ...result, attendanceMarked: true }, "Attendance Terminal");
    lastVerifiedStaff = result.staff;
    renderAll();
  }

  async function handleNimcLookup(event) {
    event.preventDefault();
    const nin = document.getElementById("ninInput").value.trim();
    const phone = document.getElementById("nimcPhone").value.trim();
    const consent = document.getElementById("nimcConsent").checked;
    const status = document.getElementById("nimcStatus");
    const resultBox = document.getElementById("nimcResult");

    if (!/^\d{11}$/.test(nin)) {
      alert("Enter a valid 11-digit NIN.");
      return;
    }
    if (!consent) {
      alert("Consent is required before NIMC verification.");
      return;
    }

    let payload;
    try {
      payload = await fetchNimcProfile(nin, phone);
    } catch (error) {
      status.textContent = "NIMC unavailable";
      status.className = "badge denied";
      resultBox.className = "result-box muted";
      resultBox.innerHTML = `<strong>NIMC lookup failed.</strong><br>${escapeHtml(error.message)}`;
      return;
    }
    const matchedStaff = lastVerifiedStaff || findStaffByPhone(phone);
    const match = compareNimcToStaff(payload, matchedStaff);
    status.textContent = payload.demo ? "Demo mode" : "NIMC checked";
    status.className = `badge ${match.passed ? "allowed" : "denied"}`;
    resultBox.className = "result-box";
    resultBox.innerHTML = `
      <strong>${escapeHtml(payload.fullName)}</strong><br>
      NIN: ${escapeHtml(maskNin(nin))}<br>
      Phone: ${escapeHtml(payload.phone || phone || "-")}<br>
      Matched against: ${escapeHtml(matchedStaff ? matchedStaff.fullName : "No current biometric identity")}<br>
      Result: <strong>${match.passed ? "Matched" : "Needs review"}</strong><br>
      <small>${escapeHtml(match.reason)}</small>
    `;
    addAudit("NIMC Check", payload.fullName, "Identity Verification", match.passed ? "Allowed" : "Denied");
    saveState();
    renderAll();
  }

  async function fetchNimcProfile(nin, phone) {
    if (settings.nimcApiUrl) {
      const response = await fetch(settings.nimcApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nin, phone, purpose: "biometric_identity_match" })
      });
      if (!response.ok) throw new Error(`NIMC API returned ${response.status}`);
      return response.json();
    }
    return {
      demo: true,
      nin,
      phone,
      fullName: lastVerifiedStaff ? lastVerifiedStaff.fullName : "Demo NIMC Citizen",
      biometricReference: "official-api-required"
    };
  }

  function compareNimcToStaff(profile, staff) {
    if (!staff) return { passed: false, reason: "Run a biometric match first, then verify NIMC data against that identity." };
    const nameMatch = normalizeName(profile.fullName) === normalizeName(staff.fullName);
    const phoneMatch = !profile.phone || !staff.phone || digits(profile.phone).endsWith(digits(staff.phone).slice(-10));
    if (nameMatch && phoneMatch) return { passed: true, reason: "Name and phone align with the current biometric identity." };
    if (nameMatch) return { passed: true, reason: "Name aligns. Phone should be manually reviewed." };
    return { passed: false, reason: "NIMC data does not align with the current biometric identity." };
  }

  function findStaffByPhone(phone) {
    const needle = digits(phone).slice(-10);
    if (!needle) return null;
    return state.staff.find((staff) => digits(staff.phone).endsWith(needle)) || null;
  }

  async function verifyCode(code, area, options = {}) {
    const templateHash = await hashTemplate(code);
    const staff = state.staff.find((person) => person.templateHash === templateHash);
    if (!staff) {
      if (options.logAccess !== false) addAudit("Biometric Match", "Unknown", area, "Denied");
      saveState();
      return { allowed: false, reason: "Biometric template was not found in the registry." };
    }
    if (staff.status !== "Active") {
      if (options.logAccess !== false) addAudit("Biometric Match", staff.fullName, area, "Denied");
      saveState();
      return { allowed: false, reason: "The staff record is not active.", staff };
    }
    const allowed = area === "General" || area === "General Records" || area === "Attendance Terminal" || staff.accessLevel === area || staff.accessLevel === "Executive" || staff.accessLevel === "IT Admin";
    if (options.logAccess !== false) addAudit("Biometric Match", staff.fullName, area, allowed ? "Allowed" : "Denied");
    saveState();
    return { allowed, staff, reason: allowed ? "Access granted." : `Access level ${staff.accessLevel} cannot open ${area}.` };
  }

  function markAttendance(staff) {
    const now = new Date();
    const alreadyMarked = state.attendance.find((entry) => entry.staffId === staff.staffId && entry.date === todayKey);
    if (alreadyMarked) {
      alreadyMarked.time = formatTime(now);
      alreadyMarked.status = punctualityStatus(staff.shiftStart, now);
      return;
    }
    state.attendance.unshift({
      id: crypto.randomUUID(),
      date: todayKey,
      time: formatTime(now),
      staffId: staff.staffId,
      fullName: staff.fullName,
      department: staff.department,
      shiftStart: staff.shiftStart,
      status: punctualityStatus(staff.shiftStart, now)
    });
  }

  function punctualityStatus(shiftStart, now) {
    const [hour, minute] = shiftStart.split(":").map(Number);
    const shift = new Date(now);
    shift.setHours(hour, minute, 0, 0);
    return now <= shift ? "On Time" : "Late";
  }

  function addAudit(event, identity, area, decision) {
    state.audit.unshift({
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
      event,
      identity,
      area,
      decision
    });
  }

  function renderAll() {
    renderCounters();
    renderRecentActivity();
    renderAttendance();
    renderStaffDirectory();
    renderAudit();
  }

  function renderCounters() {
    const todaysAttendance = state.attendance.filter((entry) => entry.date === todayKey);
    const denied = state.audit.filter((entry) => entry.decision === "Denied").length;
    const onTime = todaysAttendance.filter((entry) => entry.status === "On Time").length;
    const late = todaysAttendance.filter((entry) => entry.status === "Late").length;

    setText("registryCount", state.staff.length);
    setText("presentCount", todaysAttendance.length);
    setText("deniedCount", denied);
    setText("metricRegistered", state.staff.length);
    setText("metricOnTime", onTime);
    setText("metricLate", late);
    setText("metricBlocked", denied);
  }

  function renderRecentActivity() {
    const container = document.getElementById("recentActivity");
    const rows = state.audit.slice(0, 5);
    if (!rows.length) {
      container.innerHTML = emptyState("No access activity yet.");
      return;
    }
    container.innerHTML = rows.map((entry) => `
      <article class="activity-item">
        <div>
          <strong>${escapeHtml(entry.event)} · ${escapeHtml(entry.identity)}</strong>
          <span>${escapeHtml(entry.area)} · ${formatDateTime(entry.time)}</span>
        </div>
        <span class="badge ${entry.decision === "Allowed" ? "allowed" : "denied"}">${entry.decision}</span>
      </article>
    `).join("");
  }

  function renderVerificationResult(result, area) {
    const panel = document.getElementById("verificationResult");
    if (!result.allowed) {
      panel.innerHTML = `
        <span class="badge denied">Denied</span>
        <h2>Identity not authorized</h2>
        <p>${escapeHtml(result.reason)}</p>
      `;
      return;
    }

    panel.innerHTML = `
      <span class="badge allowed">${result.attendanceMarked ? "Attendance Marked" : "Access Allowed"}</span>
      <div class="identity-card">
        <h2>${escapeHtml(result.staff.fullName)}</h2>
        <p>${escapeHtml(result.staff.role)} · ${escapeHtml(result.staff.department)}</p>
        <div class="identity-meta">
          <div><span>Staff ID</span>${escapeHtml(result.staff.staffId)}</div>
          <div><span>Access Level</span>${escapeHtml(result.staff.accessLevel)}</div>
          <div><span>Area Requested</span>${escapeHtml(area)}</div>
          <div><span>Shift Start</span>${escapeHtml(result.staff.shiftStart)}</div>
          <div><span>Email</span>${escapeHtml(result.staff.email || "-")}</div>
          <div><span>Phone</span>${escapeHtml(result.staff.phone || "-")}</div>
        </div>
      </div>
    `;
  }

  function renderAttendance() {
    const tbody = document.getElementById("attendanceRows");
    if (!state.attendance.length) {
      tbody.innerHTML = `<tr><td colspan="6">${emptyState("No attendance entries yet.")}</td></tr>`;
      return;
    }
    tbody.innerHTML = state.attendance.map((entry) => `
      <tr>
        <td>${escapeHtml(entry.date)}</td>
        <td>${escapeHtml(entry.time)}</td>
        <td>${escapeHtml(entry.fullName)}<br><small>${escapeHtml(entry.staffId)}</small></td>
        <td>${escapeHtml(entry.department)}</td>
        <td><span class="badge ${entry.status === "On Time" ? "on-time" : "late"}">${escapeHtml(entry.status)}</span></td>
        <td>${escapeHtml(entry.shiftStart)}</td>
      </tr>
    `).join("");
  }

  function renderStaffDirectory() {
    const query = document.getElementById("staffSearch").value.trim().toLowerCase();
    const container = document.getElementById("staffDirectory");
    const records = state.staff.filter((staff) => {
      const haystack = `${staff.fullName} ${staff.staffId} ${staff.department} ${staff.role}`.toLowerCase();
      return haystack.includes(query);
    });
    if (!records.length) {
      container.innerHTML = emptyState("No staff records match your search.");
      return;
    }
    container.innerHTML = records.map((staff) => `
      <article class="staff-card">
        <span class="badge secure">${escapeHtml(staff.status)}</span>
        <h2>${escapeHtml(staff.fullName)}</h2>
        <p>${escapeHtml(staff.role)}</p>
        <dl>
          <dt>ID</dt><dd>${escapeHtml(staff.staffId)}</dd>
          <dt>Dept</dt><dd>${escapeHtml(staff.department)}</dd>
          <dt>Access</dt><dd>${escapeHtml(staff.accessLevel)}</dd>
          <dt>Shift</dt><dd>${escapeHtml(staff.shiftStart)}</dd>
          <dt>Bio</dt><dd>Template linked</dd>
        </dl>
      </article>
    `).join("");
  }

  function renderAudit() {
    const tbody = document.getElementById("auditRows");
    if (!state.audit.length) {
      tbody.innerHTML = `<tr><td colspan="5">${emptyState("No security events yet.")}</td></tr>`;
      return;
    }
    tbody.innerHTML = state.audit.map((entry) => `
      <tr>
        <td>${formatDateTime(entry.time)}</td>
        <td>${escapeHtml(entry.event)}</td>
        <td>${escapeHtml(entry.identity)}</td>
        <td>${escapeHtml(entry.area)}</td>
        <td><span class="badge ${entry.decision === "Allowed" ? "allowed" : "denied"}">${escapeHtml(entry.decision)}</span></td>
      </tr>
    `).join("");
  }

  async function hashTemplate(value) {
    const normalized = value.trim().toLowerCase();
    const bytes = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function generateDemoCode() {
    const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
    let code = "bio-";
    for (let index = 0; index < 12; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }

  function exportAttendanceCsv() {
    const header = ["Date", "Time", "Staff ID", "Name", "Department", "Status", "Shift Start"];
    const rows = state.attendance.map((entry) => [entry.date, entry.time, entry.staffId, entry.fullName, entry.department, entry.status, entry.shiftStart]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${todayKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function resetDemoData() {
    if (!confirm("Reset all demo records, attendance, and audit logs?")) return;
    localStorage.removeItem(storageKey);
    const fresh = structuredClone(seedData);
    state.staff = fresh.staff;
    state.attendance = fresh.attendance;
    state.audit = fresh.audit;
    await ensureSeedHashes();
    renderAll();
  }

  function csvCell(value) {
    return `"${String(value || "").replaceAll('"', '""')}"`;
  }

  function emptyState(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatDateTime(value) {
    return new Date(value).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function normalizeName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function maskNin(value) {
    const clean = digits(value);
    if (clean.length < 4) return "****";
    return `${clean.slice(0, 2)}*******${clean.slice(-2)}`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
