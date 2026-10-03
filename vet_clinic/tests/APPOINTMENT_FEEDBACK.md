# Appointment ratings

Completed appointments in the mobile Booking timeline offer **Rate your visit**.
Clients choose 1–5 stars and can add a comment of up to 1,000 characters. Saved
ratings replace the button and reload with appointment data. Admin **Feedback**
shows the client, comment, visit, pet, date, and overall average. Feedback is private.

## Existing server rollout

1. Back up the database and apply `migrations/appointment_feedback.sql` once.
   It adds a nullable appointment reference and unique index; existing general
   website feedback remains intact. New installations use `database.sql`.
2. Deploy `includes/appointment_feedback.php`, `api/mobile/v1/feedback.php`,
   `api/mobile/v1/bootstrap.php`, and `admin/feedback.php` together.
3. Publish/reload the updated mobile bundle. The checked-in mobile environment
   points at Railway; local PHP changes do not update that server automatically.

`POST api/mobile/v1/feedback.php` requires a client bearer token and JSON:
`{"appointment_id":123,"rating":5,"comment":"Kind staff"}`.
Only the owning client can rate a completed appointment. Identical retries return
the saved record; a different second rating returns 409. Invalid input returns
422, and missing or other clients' visits return 404. A database unique key and
transactional appointment lock prevent duplicate submissions. The bootstrap
response includes each appointment's `feedback` object or `null`.

## Verification

Run `php tests/appointment_feedback_test.php` from `vet_clinic`. It uses a temporary
database and removes it afterward; it does not edit clinic records. Connection
settings use `VETRIX_DB_HOST`, `VETRIX_DB_USER`, and `VETRIX_DB_PASSWORD`.
Run `npm run lint` and `npx expo export --platform web` in the mobile project.
For the automated phone UI check, export with
`npx expo export --platform web --output-dir .expo-export-check/visit-ratings`,
then run `node scripts/check-visit-ratings.cjs`. This uses fixture API responses
and checks submission, retry, reload, dismissal, and the form in dark mode at
320px width. It does not submit feedback to Railway.

For manual verification, open a completed visit, select stars, submit with or
without a comment, and refresh. Confirm the saved rating remains, incomplete
visits have no rating button, a failed submission retains the form, and the admin
Feedback page includes the new entry. Check the modal at phone width and in dark
mode.
