# Vetrix Client Mobile UI Setup

This folder contains a real Expo React Native app adapted from the PHP client mobile simulator at:

```text
vet_clinic/client/mobile_app.php
```

The simulator was used only as the visual and flow reference. The React Native app is not a simulator, iframe, phone frame, or browser mockup.

## Scope

- Client side only
- UI-first React Native app
- Mock Login and Sign Up UI
- Mock/static data only
- No MySQL connection yet
- No PHP API endpoints yet
- No database migrations or SQL changes
- No admin, vet, or staff mobile screens
- Original PHP project remains unchanged

## Included Screens

- Home / Dashboard
- Client Login
- Client Sign Up
- Client Profile with mock edit and logout
- My Pets
- Pet Details
- Appointments / Book
- Appointment request form with mock cancel confirmation
- Medical Records
- Vaccination Records
- QR Pet Retrieval
- Vetrix Chatbot Preview
- Notification panel opened from the bell button with read/unread state
- Chatbot preview adapted from the PHP website chatbot/simulator flow

## Visual Reference

The app adapts these simulator details:

- `Vetrix Mobile` top label
- Greeting like `Hi, Maria`
- Paw avatar symbol
- Bell notification badge and panel
- Soft blue/cyan veterinary theme
- Gradient hero card
- Rounded cards
- Big simple buttons
- Bottom navigation icons: Home, Pets, Book, Records, QR, Chat
- Friendly, non-technical client wording

## Install Dependencies

```powershell
cd C:\capstoneproject\app\vetrix_app\vet_clinic_client_mobile
npm install
```

## Run in Expo Go

Keep the computer and physical phone on the same Wi-Fi network, then start Expo
in Expo Go/LAN mode on port `8080`:

```powershell
cd C:\capstoneproject\app\vetrix_app\vet_clinic_client_mobile
npm start -- --lan --go --port 8080 --clear
```

Scan the new QR code in Expo Go. If you need to enter the address manually, use
the computer's current Wi-Fi IPv4 address (shown by `ipconfig`), not a saved IP
from an earlier session. For example, on the current network:

```text
exp://192.168.100.100:8080
```

If LAN mode is blocked by a guest/public Wi-Fi router, restart Metro with
`npm start -- --tunnel --go --clear` and scan the replacement QR code.

If the port is busy, stop the old server with `Ctrl + C` in the terminal that is running it.

## Mock Login

The Login screen is mock-only. Any non-empty email and password will open the client app.

Sample values are already filled in:

```text
Email: client@vetrix.test
Password: password
```

The Sign Up screen also uses local mock state only. It does not create a database record.

## Mock Data

All sample data is in:

```text
vet_clinic_client_mobile/src/data/mockData.js
```

Edit that file to change:

- Client profile
- Pets
- Appointments
- Medical records
- Vaccination records
- QR token
- Notifications
- Chatbot preview replies
- Trusted chatbot API recommendation

The app now has local-only mock state for:

- Login and Sign Up
- Profile edit/save
- Appointment request and cancel
- Notification read/unread status

These actions are intentionally not saved to MySQL yet.

## Chatbot API Recommendation

See:

```text
CHATBOT_API_RECOMMENDATION.md
```

## UI Improvement Suggestions

See:

```text
UI_IMPROVEMENT_SUGGESTIONS.md
```

Recommended future approach:

1. Keep the mobile Chat screen UI in React Native.
2. Create a PHP endpoint such as `vet_clinic/api/mobile_chatbot.php`.
3. Store the AI API key only on the PHP/server side.
4. PHP verifies the logged-in client and pet ownership.
5. PHP sends safe pet context and the client message to the trusted chatbot API.
6. React Native receives JSON and renders triage, guidance, follow-up questions, and safety notes.

## Change Colors or Branding

Colors are in:

```text
vet_clinic_client_mobile/src/theme/colors.js
```

Spacing and radius values are in:

```text
vet_clinic_client_mobile/src/theme/spacing.js
```

The app currently uses the same paw-style branding from the PHP system. If a real logo image is added later, it can replace the paw symbol in `src/components/HeaderBar.js`.

## Future API and Database Work

Database integration is intentionally skipped for now.

When the UI is approved, add API code later in a new folder such as:

```text
vet_clinic_client_mobile/src/api/
  apiClient.js
  authApi.js
  clientApi.js
```

Recommended future order:

1. Add client login API.
2. Replace mock pets with PHP API data.
3. Replace mock appointments with PHP API data.
4. Replace mock records, QR, notifications, and chatbot preview one module at a time.
5. Only then update MySQL or migrations if truly needed.

## Common Fixes

### Scannable pet QR codes

The QR Pet Retrieval and Pet Details screens generate a real QR locally, encoding
`<website>/qr.php?token=<pet-token>`. A phone camera opens the PHP web app; sign-in
returns to the scanned record. Clinic accounts can retrieve approved pets. On
installations that also support client web sign-in, clients can retrieve only
their own pets. Expired or inactive tokens are rejected.

The website address defaults to `EXPO_PUBLIC_VETRIX_API_URL` without `/api/mobile/v1`.
If the website uses another address, set `EXPO_PUBLIC_VETRIX_WEBSITE_URL` in
`vet_clinic_client_mobile/.env.local`, then restart Expo. On a physical phone use
the computer's Wi-Fi address, not `localhost` or the emulator's `10.0.2.2`.
Scanning a local Wi-Fi address requires the phone to be on the same network.
For access away from that network, configure your deployed public HTTPS website.

Deploy `vet_clinic/qr.php`, `includes/pet_qr.php`, and the updated `login.php`
together with the web QR pages. The retrieval link requires these PHP files on the
web server used by the app.

For newer clinic-only installations, retain the existing login checks and add
`pet_qr_login_destination()` to the successful login redirects. Their shared
`includes/qr_retrieval_page.php` must also accept the `token` query parameter;
keep CSRF verification on POST requests. The root retrieval page reuses that
screen when it exists. This does not enable client web sign-in on clinic-only sites.

Run `C:\xampp\php\php.exe vet_clinic\tests\pet_qr_test.php` from the workspace to
verify token expiry, role/owner access, and sign-in continuation using temporary tables.
Run `npm run check:qr` inside the mobile app to decode the rendered QR images and
check pet switching, encoded web addresses, and unavailable states.

### Scan from the staff laptop

In the PHP web app, open **QR Token Retrieval**, choose **Scan with camera**, and
allow camera access. Hold the mobile app's pet QR in front of the laptop webcam.
The scanner decodes it locally and submits the existing protected retrieval form
automatically. **Stop camera** releases the webcam; a camera selector appears if
multiple cameras are connected. The manual token/link field remains available.

On the computer running XAMPP, use `http://localhost/vetrix/staff/qr.php`.
Browsers allow camera access on localhost or HTTPS; plain HTTP at a Wi-Fi IP
address does not support camera access. Staff using a different laptop should
open the clinic's HTTPS address.

The scanner uses `includes/qr_camera.php`, `assets/js/pet-qr-scanner.js`,
`assets/css/pet-qr-scanner.css`, and the bundled `assets/js/vendor/jsQR.js`.
Newer shared retrieval pages include `qr_camera.php` beside `#qrTokenForm`.
If the site sends a `Permissions-Policy` header that blocks cameras, allow
`camera=(self)` specifically on the QR retrieval pages before rendering the header.
Run `npm run check:qr-camera` in the mobile folder to test the camera pipeline
with a simulated video feed, including permission failures and camera cleanup.

### Expo connection

If Expo Go shows an old error, close Expo Go and reopen the project from the newest QR code.

If Metro serves an old bundle:

```powershell
npm start -- --lan --go --port 8080 --clear
```

If a port is busy, stop the process already using it before restarting Expo.

## Clean Generated Files

The project keeps source files and installed dependencies while removing Expo caches,
exports, browser profiles, screenshots, QR artifacts, and debug logs:

```powershell
cd C:\capstoneproject\app\vetrix_app\vet_clinic_client_mobile
npm run clean
```

Preview the cleanup without deleting anything:

```powershell
npm run clean:dry
```

To also remove `node_modules` when preparing a minimal archive, run `npm run clean:all`.
Restore dependencies later with `npm install`.
