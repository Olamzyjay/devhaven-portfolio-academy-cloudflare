# BioRegistry Access System

A browser-based prototype for an organization biometric registry system.

## What it does

- Enrolls staff with profile information and a linked biometric template.
- Prevents duplicate biometric enrollment.
- Matches biometric scans against the registry.
- Blocks unknown or inactive people from protected areas.
- Records timebook attendance and punctuality status.
- Provides staff directory checks.
- Keeps an audit log for allowed and denied access attempts.
- Exports attendance as CSV.
- Works offline after the first successful load in a browser.
- Has configured capture paths for DigitalPersona, Futronic, and desktop/PC webcam.
- Auto-captures a webcam face frame when the camera view is clear enough.
- Includes a consent-gated NIMC verification panel for an authorized API endpoint.

## Demo biometric codes

The prototype includes three registered staff members:

- `amaka-finger-001`
- `tunde-finger-002`
- `grace-face-003`

Any other scan code is treated as an unregistered person and access is denied.

## Production notes

This prototype intentionally does not store raw fingerprint or face images. It stores a hashed template representation so the workflow is safer and closer to how a real system should be designed.

For a production biometric deployment, connect the capture field to a certified scanner SDK or device middleware. The recommended flow is:

1. Scanner captures fingerprint, face, iris, or palm data.
2. Device SDK converts the sample into a biometric template.
3. Backend encrypts the template and stores it with the staff record.
4. Verification compares the new scan template against enrolled templates.
5. Access decisions are logged with user, device, location, and timestamp.

Recommended additions for production:

- Backend database such as PostgreSQL or MySQL.
- Role-based admin accounts.
- Encryption at rest for biometric templates.
- Device registration for trusted scanners only.
- Consent and retention policies.
- Audit export and tamper-resistant logs.
- Networked door controller or data-system access integration.

## Open

Run the local server and open the app once:

```bash
node dev-server.js
```

Then visit `http://127.0.0.1:8087`.

After the first successful load, the app shell is cached by the browser service worker and can continue opening offline from the same browser. Demo records, new enrollments, attendance, and audit logs are stored in that browser's local storage.

For a production offline deployment across multiple devices, add a sync layer so offline entries can be uploaded to a central server when the network returns.

## Device setup

DigitalPersona and Futronic fingerprint scanners need a local Windows bridge service because browser JavaScript cannot directly use most native fingerprint SDK drivers. See `BIOMETRIC-BRIDGE.md` for the exact API contract.

The webcam face capture button uses the browser camera permission. In this prototype it creates a local face-template placeholder from the camera frame. In production, connect it to a face recognition SDK with liveness detection.

The NIMC panel does not scrape the NIMC portal. Set the NIMC API URL in Devices to an official/authorized verification endpoint. For local testing with the stub bridge, use:

```text
http://127.0.0.1:8787/nimc/verify
```

For testing the bridge API shape without real scanners, run:

```bash
node device-bridge-stub.js
```

That starts a test bridge at `http://127.0.0.1:8787` for the DigitalPersona and Futronic buttons.
