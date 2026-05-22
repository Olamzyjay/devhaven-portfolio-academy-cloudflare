# Biometric Bridge Contract

DigitalPersona and Futronic fingerprint scanners require vendor SDK access on Windows. A normal browser page cannot reliably read those scanners directly, so BioRegistry expects a small local bridge service.

Default bridge URL:

```text
http://127.0.0.1:8787
```

## Required endpoints

### Status

```http
GET /status
```

Example response:

```json
{
  "ready": true,
  "devices": ["digitalpersona", "futronic"]
}
```

### DigitalPersona capture

```http
POST /capture/digitalpersona
Content-Type: application/json

{
  "purpose": "enrollment",
  "format": "template"
}
```

Example response:

```json
{
  "device": "digitalpersona",
  "template": "base64-or-vendor-template-string",
  "quality": 82
}
```

### Futronic capture

```http
POST /capture/futronic
Content-Type: application/json

{
  "purpose": "enrollment",
  "format": "template"
}
```

Example response:

```json
{
  "device": "futronic",
  "template": "base64-or-vendor-template-string",
  "quality": 79
}
```

## Production security

- Keep the bridge bound to `127.0.0.1`, not public network interfaces.
- Add a terminal/device token before production use.
- Return biometric templates, not raw fingerprint images.
- Encrypt templates before central storage.
- Log device serial number, operator, location, and timestamp.
- Use HTTPS or signed local requests if the bridge is exposed beyond localhost.

## Webcam face capture

The desktop/PC webcam path is handled directly by the browser using camera permission. The current app creates a local placeholder face template from the captured frame. A production version should use a face recognition SDK to produce a proper face embedding/template and perform liveness checks.

## NIMC verification

The app must use an authorized NIMC verification API or licensed partner endpoint. Do not scrape the public NIMC portal or automate login pages for production identity verification.

The app expects a configurable endpoint that accepts:

```http
POST /nimc/verify
Content-Type: application/json

{
  "nin": "12345678901",
  "phone": "+2348012345678",
  "purpose": "biometric_identity_match"
}
```

Example response:

```json
{
  "nin": "12345678901",
  "phone": "+2348012345678",
  "fullName": "Citizen Name",
  "dateOfBirth": "1990-01-01",
  "gender": "Female",
  "biometricReference": "provider-match-reference"
}
```

For local testing, the bridge stub includes:

```text
http://127.0.0.1:8787/nimc/verify
```
