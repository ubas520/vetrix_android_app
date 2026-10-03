# Vetrix

This workspace has two authoritative applications:

- `vet_clinic/` — PHP/MySQL web application
- `vet_clinic_client_mobile/` — Expo SDK 57 client mobile application

Temporary tool folders, generated builds, runtime logs, browser profiles, and ZIP
snapshots are not source code and are excluded by `.gitignore`.

## Mobile development

See `README_CLIENT_MOBILE_UI_SETUP.md` for setup and run instructions.

From `vet_clinic_client_mobile/`:

```powershell
npm start
npm run lint
npm run clean
```

Use `npm run clean:dry` to preview generated-file cleanup. Use
`npm run clean:all` only when intentionally removing `node_modules` too.

## Web mail configuration

`vet_clinic/config/mail.php` reads mail settings from `VETRIX_*` environment
variables. For local XAMPP development, copy
`vet_clinic/config/mail.local.example.php` to
`vet_clinic/config/mail.local.php` and add local credentials there.
`mail.local.php` is ignored and must never be committed or archived.

## Project notes

- `CHATBOT_API_RECOMMENDATION.md`
- `UI_IMPROVEMENT_SUGGESTIONS.md`

Keep one working copy of each application. Do not place project backup ZIPs or
temporary source copies inside this workspace.
