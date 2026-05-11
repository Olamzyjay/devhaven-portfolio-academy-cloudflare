function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function shouldEnableThree() {
  if (prefersReducedMotion()) return false;
  if (!canUseWebGL()) return false;
  if (Math.min(window.innerWidth || 0, window.innerHeight || 0) < 900) return false;

  const cores = Number(navigator.hardwareConcurrency || 0);
  if (cores && cores <= 4) return false;

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    if (conn.saveData) return false;
    const type = String(conn.effectiveType || "").toLowerCase();
    if (type.includes("2g")) return false;
  }

  return true;
}

function getMaxDevicePixelRatio() {
  const dpr = Number(window.devicePixelRatio || 1);
  return Math.min(Math.max(dpr, 1), 1.1);
}

function mountCanvas() {
  const wrap = document.createElement("div");
  wrap.className = "three-bg";
  wrap.setAttribute("aria-hidden", "true");

  const canvas = document.createElement("canvas");
  canvas.className = "three-canvas";
  wrap.appendChild(canvas);

  document.body.prepend(wrap);
  document.documentElement.classList.add("has-three");
  return { wrap, canvas };
}

function buildCodeTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#07111e");
  gradient.addColorStop(0.45, "#0a1d31");
  gradient.addColorStop(0.72, "#081a2c");
  gradient.addColorStop(1, "#08121d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < canvas.width; x += 32) {
    ctx.strokeStyle = "rgba(83, 198, 255, 0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += 32) {
    ctx.strokeStyle = "rgba(83, 198, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.font = "600 28px Inter, Arial, sans-serif";
  ctx.textBaseline = "top";

  const lines = [
    "const project = {",
    "  brand: 'DevHaven Studio',",
    "  focus: ['responsive sites', 'landing pages', 'funnels'],",
    "  stack: ['HTML5', 'CSS3', 'Bootstrap', 'JavaScript'],",
    "  backend: ['PHP', 'MySQL', 'Paystack integrations'],",
    "  promise: 'clear structure + conversion-ready UI'",
    "};",
    "",
    "function launch(idea) {",
    "  return buildExperience({",
    "    message: idea,",
    "    devices: 'all',",
    "    action: 'visible'",
    "  });",
    "}"
  ];

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(52, 48, canvas.width - 104, 64);

  ctx.fillStyle = "#5df2bf";
  ctx.beginPath();
  ctx.arc(94, 80, 10, 0, Math.PI * 2);
  ctx.arc(128, 80, 10, 0, Math.PI * 2);
  ctx.arc(162, 80, 10, 0, Math.PI * 2);
  ctx.fill();

  let y = 152;
  lines.forEach((line, index) => {
    if (!line) {
      y += 22;
      return;
    }

    ctx.fillStyle = index % 3 === 0 ? "#f4f7fb" : index % 3 === 1 ? "#40c4ff" : "#ffc247";
    ctx.fillText(line, 72, y);
    y += 34;
  });

  ctx.font = "700 18px Inter, Arial, sans-serif";
  ctx.fillStyle = "rgba(93, 242, 191, 0.9)";
  ctx.fillText("DEVHAVEN // LIVE DELIVERY GRID", 72, canvas.height - 82);
  ctx.fillStyle = "rgba(255,255,255,0.52)";
  ctx.fillText("responsive • academy • payments • support • deployment", 72, canvas.height - 50);

  for (let i = 0; i < 28; i += 1) {
    const opacity = 0.06 + Math.random() * 0.09;
    ctx.strokeStyle = `rgba(73, 210, 255, ${opacity.toFixed(3)})`;
    ctx.lineWidth = 1 + Math.random() * 1.4;
    ctx.beginPath();
    const startX = Math.random() * canvas.width;
    const startY = Math.random() * canvas.height;
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX + Math.random() * 150,
      startY - Math.random() * 120,
      startX - Math.random() * 110,
      startY + Math.random() * 120,
      startX + Math.random() * 190,
      startY + Math.random() * 60
    );
    ctx.stroke();
  }

  for (let i = 0; i < 12; i += 1) {
    const cx = 96 + i * 76;
    const cy = canvas.height - 118;
    ctx.fillStyle = "rgba(64, 196, 255, 0.22)";
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(64, 196, 255, 0.46)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

async function initThreeBackground() {
  if (!shouldEnableThree()) return;

  const { canvas } = mountCanvas();
  const THREE = await import("https://unpkg.com/three@0.165.0/build/three.module.js");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(getMaxDevicePixelRatio());
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x041018, 10, 28);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(0, 0.9, 10.5);

  const ambient = new THREE.AmbientLight(0xf4fbff, 0.58);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0x68d5ff, 1.35);
  key.position.set(5, 7, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x3cffc8, 0.95);
  rim.position.set(-6, 1, 2);
  scene.add(rim);

  const laptopRig = new THREE.Group();
  scene.add(laptopRig);

  const laptop = new THREE.Group();
  laptopRig.add(laptop);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f1824,
    metalness: 0.65,
    roughness: 0.32,
    clearcoat: 0.35,
    clearcoatRoughness: 0.24
  });

  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x59c6ff,
    emissive: 0x0c3650,
    emissiveIntensity: 0.4,
    metalness: 0.5,
    roughness: 0.28
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.22, 3.6), bodyMat);
  base.position.set(0, -1.45, 0.1);
  laptop.add(base);

  const keyboardGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 2.55),
    new THREE.MeshBasicMaterial({ color: 0x0d2233, transparent: true, opacity: 0.94 })
  );
  keyboardGlow.rotation.x = -Math.PI / 2;
  keyboardGlow.position.set(0, -1.32, 0.12);
  laptop.add(keyboardGlow);

  const trackPad = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.76),
    new THREE.MeshBasicMaterial({ color: 0x10293f, transparent: true, opacity: 0.9 })
  );
  trackPad.rotation.x = -Math.PI / 2;
  trackPad.position.set(0, -1.32, 1.08);
  laptop.add(trackPad);

  const screenGroup = new THREE.Group();
  screenGroup.position.set(0, -0.15, -1.45);
  screenGroup.rotation.x = -0.46;
  laptop.add(screenGroup);

  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(5.15, 3.2, 0.18), bodyMat);
  screenGroup.add(screenFrame);

  const screenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.72, 2.82),
    new THREE.MeshBasicMaterial({
      map: buildCodeTexture(THREE),
      transparent: false
    })
  );
  screenGlow.position.z = 0.1;
  screenGroup.add(screenGlow);

  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.3, 24), edgeMat);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, -1.42, -1.58);
  laptop.add(hinge);

  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.038, 14, 112),
    new THREE.MeshStandardMaterial({
      color: 0x48bfff,
      emissive: 0x164a6e,
      emissiveIntensity: 0.9,
      metalness: 0.4,
      roughness: 0.18
    })
  );
  glowRing.rotation.set(1.2, 0.2, 0.26);
  glowRing.position.set(-2.9, 0.7, -1.1);
  laptopRig.add(glowRing);

  const secondaryRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.25, 0.026, 14, 96),
    new THREE.MeshStandardMaterial({
      color: 0x5df2bf,
      emissive: 0x12392f,
      emissiveIntensity: 0.85,
      metalness: 0.32,
      roughness: 0.18
    })
  );
  secondaryRing.rotation.set(1.28, -0.18, -0.24);
  secondaryRing.position.set(2.85, -0.35, -0.95);
  laptopRig.add(secondaryRing);

  const codeCardMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1625,
    metalness: 0.35,
    roughness: 0.22,
    transmission: 0.08,
    thickness: 0.35,
    emissive: 0x0d2740,
    emissiveIntensity: 0.4
  });

  const cardA = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.92), codeCardMat);
  cardA.position.set(3.15, 1.55, -0.85);
  cardA.rotation.set(-0.15, -0.5, 0.08);
  laptopRig.add(cardA);

  const cardB = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.76), codeCardMat);
  cardB.position.set(3.85, -0.2, -0.35);
  cardB.rotation.set(0.08, -0.62, -0.05);
  laptopRig.add(cardB);

  const lineMat = new THREE.LineBasicMaterial({ color: 0x47d0ff, transparent: true, opacity: 0.6 });
  const circuitPoints = [
    new THREE.Vector3(-4.2, -1.2, -2.4),
    new THREE.Vector3(-4.2, 1.35, -2.2),
    new THREE.Vector3(-3.1, 2.1, -1.55),
    new THREE.Vector3(-1.75, 2.45, -0.8)
  ];
  const circuitGeo = new THREE.BufferGeometry().setFromPoints(circuitPoints);
  const circuit = new THREE.Line(circuitGeo, lineMat);
  laptopRig.add(circuit);

  const nodeGroup = new THREE.Group();
  laptopRig.add(nodeGroup);
  [
    [-4.2, -1.2, -2.4],
    [-4.2, 1.35, -2.2],
    [-3.1, 2.1, -1.55],
    [-1.75, 2.45, -0.8],
    [3.15, 1.55, -0.85],
    [3.85, -0.2, -0.35]
  ].forEach(([x, y, z]) => {
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x79dbff,
        emissive: 0x124867,
        emissiveIntensity: 1.1
      })
    );
    node.position.set(x, y, z);
    nodeGroup.add(node);
  });

  const holoPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.35, 1.42),
    new THREE.MeshPhysicalMaterial({
      color: 0x0d2234,
      transparent: true,
      opacity: 0.28,
      transmission: 0.12,
      thickness: 0.4,
      emissive: 0x0f2740,
      emissiveIntensity: 0.65,
      metalness: 0.2,
      roughness: 0.14
    })
  );
  holoPanel.position.set(-3.2, 1.45, -0.1);
  holoPanel.rotation.set(0.12, 0.58, 0.02);
  laptopRig.add(holoPanel);

  const particles = new THREE.BufferGeometry();
  const particleCount = 96;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const index = i * 3;
    positions[index] = (Math.random() - 0.5) * 20;
    positions[index + 1] = (Math.random() - 0.5) * 12;
    positions[index + 2] = (Math.random() - 0.5) * 14 - 3;
  }
  particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMesh = new THREE.Points(
    particles,
    new THREE.PointsMaterial({
      color: 0xd9fbff,
      size: 0.03,
      transparent: true,
      opacity: 0.72
    })
  );
  scene.add(particleMesh);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(8.2, 72),
    new THREE.MeshBasicMaterial({
      color: 0x071522,
      transparent: true,
      opacity: 0.38
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.75, 0.2);
  scene.add(floor);

  const grid = new THREE.GridHelper(18, 18, 0x1c81a8, 0x12405a);
  grid.position.set(0, -1.73, 0.15);
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  scene.add(grid);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  let targetX = 0;
  let targetY = 0;
  let parallaxX = 0;
  let parallaxY = 0;

  window.addEventListener("pointermove", event => {
    targetX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 0.7;
    targetY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 0.45;
  }, { passive: true });

  let raf = 0;
  let last = performance.now();

  function animate(now) {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;

    parallaxX += (targetX - parallaxX) * (1 - Math.pow(0.001, dt));
    parallaxY += (targetY - parallaxY) * (1 - Math.pow(0.001, dt));

    laptopRig.rotation.y = 0.4 + Math.sin(now * 0.00028) * 0.18 + parallaxX * 0.24;
    laptopRig.rotation.x = -0.08 + Math.cos(now * 0.00023) * 0.04 - parallaxY * 0.16;
    laptopRig.position.y = -0.05 + Math.sin(now * 0.0005) * 0.18;

    glowRing.rotation.z += dt * 0.35;
    secondaryRing.rotation.z -= dt * 0.28;
    cardA.rotation.y += dt * 0.14;
    cardB.rotation.y -= dt * 0.16;
    holoPanel.rotation.y = 0.58 + Math.sin(now * 0.00058) * 0.06;
    nodeGroup.rotation.y = Math.sin(now * 0.00022) * 0.12;
    particleMesh.rotation.y += dt * 0.02;
    grid.rotation.z = Math.sin(now * 0.00012) * 0.02;

    camera.position.x = parallaxX * 0.6;
    camera.position.y = 0.9 - parallaxY * 0.5;
    camera.lookAt(0, -0.25, 0);

    renderer.render(scene, camera);
  }

  function start() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(animate);
  }

  function stop() {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  window.addEventListener("pagehide", stop, { once: true });
  start();
}

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener(
    "load",
    () => {
      const run = () => initThreeBackground().catch(() => {});

      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(run, { timeout: 3200 });
        return;
      }

      setTimeout(run, 2600);
    },
    { once: true }
  );
});
