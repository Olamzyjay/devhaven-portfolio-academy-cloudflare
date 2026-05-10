import seedProjects from "./registry-seed.js";
import { clone, getHeader, json, slugify } from "./_utils.js";

const REGISTRY_KEY = "devhaven:registry";

function getStore(env) {
  const store = env.DEVHAVEN_STORE;
  if (!store) {
    throw new Error("DEVHAVEN_STORE KV binding is not configured on Cloudflare.");
  }
  return store;
}

export function getRegistryAdminKey(env) {
  return env.DEVHAVEN_REGISTRY_ADMIN_KEY || env.DEVHAVEN_INVOICE_ADMIN_KEY || "";
}

export function isRegistryAuthorized(request, env) {
  const expected = getRegistryAdminKey(env);
  const received = getHeader(request, "x-devhaven-key");
  return Boolean(expected) && received === expected;
}

export function normalizeProject(project = {}, existing = null) {
  const now = new Date().toISOString();
  const id = String(project.id || existing?.id || slugify(project.client || project.domain || now)).trim();
  return {
    id,
    domain: String(project.domain || "").trim(),
    client: String(project.client || "").trim(),
    type: String(project.type || "").trim(),
    category: String(project.category || "").trim(),
    url: String(project.url || "").trim(),
    status: String(project.status || "Live").trim(),
    description: String(project.description || "").trim(),
    screenshot: String(project.screenshot || "").trim(),
    featured: project.featured === true || project.featured === "true" || project.featured === "on",
    stack: String(project.stack || "").trim(),
    seoTitle: String(project.seoTitle || "").trim(),
    seoDescription: String(project.seoDescription || "").trim(),
    seoKeywords: String(project.seoKeywords || "").trim(),
    canonical: String(project.canonical || "").trim(),
    notes: String(project.notes || "").trim(),
    updatedAt: now,
    createdAt: existing?.createdAt || project.createdAt || now
  };
}

export async function readProjects(env) {
  const raw = await getStore(env).get(REGISTRY_KEY, "json");
  const projects = Array.isArray(raw) && raw.length ? raw : clone(seedProjects);
  return clone(projects);
}

export async function writeProjects(env, projects) {
  const nextProjects = Array.isArray(projects) ? projects : clone(seedProjects);
  await getStore(env).put(REGISTRY_KEY, JSON.stringify(nextProjects));
  return nextProjects;
}

export { json };
