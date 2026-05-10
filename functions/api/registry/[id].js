import {
  isRegistryAuthorized,
  json,
  readProjects,
  writeProjects
} from "../../cf/registry-storage.js";

export async function onRequestGet(context) {
  const id = String(context.params.id || "").trim();
  if (!id) {
    return json(400, { error: "Project id is required." });
  }
  try {
    const projects = await readProjects(context.env);
    const project = projects.find((item) => item.id === id);
    return project
      ? json(200, { ok: true, project })
      : json(404, { error: "Project not found." });
  } catch (error) {
    return json(500, { error: error.message || "Registry request failed." });
  }
}

export async function onRequestDelete(context) {
  const id = String(context.params.id || "").trim();
  if (!id) {
    return json(400, { error: "Project id is required." });
  }
  if (!isRegistryAuthorized(context.request, context.env)) {
    return json(403, { error: "Unauthorized registry request." });
  }
  try {
    const projects = await readProjects(context.env);
    const filtered = projects.filter((item) => item.id !== id);
    if (filtered.length === projects.length) {
      return json(404, { error: "Project not found." });
    }
    await writeProjects(context.env, filtered);
    return json(200, { ok: true, deletedId: id });
  } catch (error) {
    return json(500, { error: error.message || "Registry request failed." });
  }
}
