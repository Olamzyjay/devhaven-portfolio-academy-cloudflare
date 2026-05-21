const DEVHAVEN_RESUME_STORAGE_KEY = "devhaven-resume-data-v1";

const DEVHAVEN_DEFAULT_RESUME_DATA = {
  fullName: "Olamide Joshua Olawuyi",
  brandName: "DevHaven Studio",
  title: "CEO, developer, website designer, and digital skills trainer",
  location: "Nigeria",
  phone: "+234 706 686 1881",
  email: "devhaven1@gmail.com",
  github: "https://github.com/Olamzyjay",
  portfolio: "https://devhavenstudio.netlify.app",
  summary:
    "DevHaven Studio combines frontend delivery, practical backend workflow experience, digital skills training, and conversion-focused thinking to help brands launch websites and systems that are easier to trust, easier to use, and easier to grow.",
  experienceSummary:
    "Hands-on delivery across responsive websites, ecommerce builds, academy systems, portfolio platforms, marketing funnels, support workflows, and school CBT portal work using PHP and MySQL-backed logic.",
  skills: [
    "HTML5",
    "CSS3",
    "Bootstrap",
    "JavaScript",
    "Responsive UI",
    "PHP / MySQL workflows",
    "Paystack integrations",
    "Funnels and landing pages",
    "Shopify and ecommerce setup",
    "Technical support"
  ],
  services: [
    "Responsive business websites and brand platforms",
    "Landing pages, funnels, and conversion flow cleanup",
    "Portfolio builds and interface refinement",
    "Academy systems, checkout flow, and training pages",
    "Website maintenance, support, and digital problem solving"
  ],
  projects: [
    "AFSS Egosi-Ile website and trust-focused school presence",
    "Business landing pages with WhatsApp-first conversion flow",
    "DevHaven Academy enrollment and checkout experience",
    "School CBT portal exam work showing PHP and MySQL workflow knowledge"
  ],
  training: [
    "Frontend Website Design (6 weeks)",
    "Digital Marketing for Small Brands (4 weeks)",
    "Freelance Launch Lab (8 weeks)",
    "Practical AI and automation specialty tracks"
  ],
  experience: [
    {
      role: "Lead developer and founder",
      company: "DevHaven Studio",
      period: "2019 - Present",
      bullets: [
        "Design and build portfolio sites, school websites, ecommerce pages, and academy systems.",
        "Implement responsive HTML, CSS, Bootstrap, JavaScript, and payment-ready project flows.",
        "Train learners and support clients through delivery, updates, and digital troubleshooting."
      ]
    },
    {
      role: "Digital marketer and web freelancer",
      company: "Independent / client delivery",
      period: "2018 - Present",
      bullets: [
        "Support brands with offer positioning, online presence improvements, and conversion-oriented messaging.",
        "Bridge website builds with practical funnel, support, and launch thinking."
      ]
    }
  ]
};

function readStoredResumeData() {
  try {
    const raw = localStorage.getItem(DEVHAVEN_RESUME_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function getResumeData() {
  const stored = readStoredResumeData();
  if (!stored) {
    return structuredClone(DEVHAVEN_DEFAULT_RESUME_DATA);
  }

  return {
    ...structuredClone(DEVHAVEN_DEFAULT_RESUME_DATA),
    ...stored
  };
}

function saveResumeData(nextData) {
  localStorage.setItem(DEVHAVEN_RESUME_STORAGE_KEY, JSON.stringify(nextData));
}

window.DEVHavenResume = {
  storageKey: DEVHAVEN_RESUME_STORAGE_KEY,
  defaults: DEVHAVEN_DEFAULT_RESUME_DATA,
  get: getResumeData,
  save: saveResumeData
};
