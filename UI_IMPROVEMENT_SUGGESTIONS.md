# Vetrix client mobile UI

The six requested UI improvements are implemented in the Expo app.

- Shared labels and helper text use a 12 px minimum; form inputs and body text are larger. Bottom navigation labels are 12 px with stronger contrast and safe-area spacing.
- Home opens with the next appointment and Book a Visit. The welcome artwork is shorter, and the four statistics appear farther down in a two-column care summary.
- Pet cards show photo, name, breed, status, and profile actions. Health, behavior, and registration information remain in View Profile. Edit requests start collapsed, and status filters scroll horizontally on narrow screens.
- Pending pet verification displays Waiting for clinic without changing API approval values. Vaccine dates display Overdue, Due soon (today through the next 30 days), Upcoming, or No due date.
- Booking hides its banner, statistics, and appointment history while the form is open. Continue, Review Request, and Send Request stay below the scrolling form.
- Login, registration, verification, profile, pet forms, and booking show compact errors with Try Again for connection/server failures. Retries retain current form values. Failed clinic-data loads can also be retried from the header.

## Verification

From vet_clinic_client_mobile, run npm run lint and npm run check:ui.

The UI check exports web and runs a local browser with simulated API responses. It verifies date boundaries, login and data retries, collapsed requests, pet details, booking button placement, identical booking/edit payloads after failures, 320 px layouts, and dark mode. Screenshots are saved under .visual-check/ui-refresh.

The check uses Microsoft Edge on Windows by default. Set VETRIX_BROWSER_PATH to another installed Chromium executable if needed. It does not contact the real clinic API.

Native bundle exports validate Android and iOS JavaScript; device keyboard behavior and live backend integration still need a device and a responsive database.
