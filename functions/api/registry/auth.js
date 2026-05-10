import { isRegistryAuthorized, json } from "../../cf/registry-storage.js";

export async function onRequestPost(context) {
  if (!isRegistryAuthorized(context.request, context.env)) {
    return json(403, { error: "Invalid registry admin key." });
  }
  return json(200, { ok: true });
}
