import { readJson } from "../../cf/_utils.js";
import {
  isRegistryAuthorized,
  json,
  normalizeProject,
  readProjects,
  writeProjects
} from "../../cf/registry-storage.js";

export async function onRequestGet(context) {
  try {
    const projects = await readProjects(context.env);
    return json(200, { ok: true, projects });
  } catch (error) {
    return json(500, { error: error.message || "Registry request failed." });
  }
}

export async function onRequestPost(context) {
  if (!isRegistryAuthorized(context.request, context.env)) {
    return json(403, { error: "Unauthorized registry request." });
  }
  const payload = await readJson(context.request);
  if (payload === null) {
    return json(400, { error: "Invalid JSON request body." });
  }
  if (!payload?.client || !payload?.type) {
    return json(400, { error: "client and type are required." });
  }

  try {
    const projects = await readProjects(context.env);
    const existing = payload.id ? projects.find((item) => item.id === payload.id) : null;
    const nextProject = normalizeProject(payload, existing);
    const index = projects.findIndex((item) => item.id === nextProject.id);
    if (index >= 0) {
      projects[index] = nextProject;
    } else {
      projects.unshift(nextProject);
    }
    await writeProjects(context.env, projects);
    return json(200, { ok: true, project: nextProject, projects });
  } catch (error) {
    return json(500, { error: error.message || "Registry request failed." });
  }
}

export async function onRequestPut(context) {
  if (!isRegistryAuthorized(context.request, context.env)) {
    return json(403, { error: "Unauthorized registry request." });
  }
  const payload = await readJson(context.request);
  if (payload === null || !Array.isArray(payload?.projects)) {
    return json(400, { error: "projects array is required." });
  }
  try {
    const projects = payload.projects.map((project) => normalizeProject(project));
    await writeProjects(context.env, projects);
    return json(200, { ok: true, projects });
  } catch (error) {
    return json(500, { error: error.message || "Registry request failed." });
  }
}
