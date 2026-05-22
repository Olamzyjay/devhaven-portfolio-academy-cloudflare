const http = require("http");

const port = Number(process.env.BRIDGE_PORT || 8787);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
  });
}

function createTemplate(device) {
  return Buffer.from(`${device}:${Date.now()}:${Math.random().toString(36).slice(2)}`).toString("base64");
}

http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && request.url === "/status") {
    sendJson(response, 200, {
      ready: true,
      mode: "stub",
      devices: ["digitalpersona", "futronic"]
    });
    return;
  }

  if (request.method === "POST" && request.url === "/capture/digitalpersona") {
    await readBody(request);
    sendJson(response, 200, {
      device: "digitalpersona",
      template: createTemplate("digitalpersona"),
      quality: 84
    });
    return;
  }

  if (request.method === "POST" && request.url === "/capture/futronic") {
    await readBody(request);
    sendJson(response, 200, {
      device: "futronic",
      template: createTemplate("futronic"),
      quality: 81
    });
    return;
  }

  if (request.method === "POST" && request.url === "/nimc/verify") {
    const body = await readBody(request);
    let requestPayload = {};
    try {
      requestPayload = JSON.parse(body || "{}");
    } catch (error) {
      requestPayload = {};
    }
    sendJson(response, 200, {
      demo: true,
      nin: requestPayload.nin || "",
      phone: requestPayload.phone || "",
      fullName: "Demo NIMC Citizen",
      dateOfBirth: "1990-01-01",
      gender: "Not returned in demo",
      biometricReference: "stub-only"
    });
    return;
  }

  sendJson(response, 404, { error: "Unknown bridge endpoint" });
}).listen(port, "127.0.0.1", () => {
  console.log(`Biometric bridge stub running at http://127.0.0.1:${port}`);
});
