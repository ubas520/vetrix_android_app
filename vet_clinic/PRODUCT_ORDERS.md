# Mobile product purchases

For staff-uploaded GCash QR images and multiple bank receiving accounts, see
[Payment accounts](PAYMENT_ACCOUNTS.md). That extension adds bank-transfer checkout
and immutable recipient details for each order; the original setup notes below
describe the earlier GCash-only flow.

Clients shop the website's `inventory_items`, choose quantities, and place clinic-pickup orders. Payment choices are **pay at the clinic on pickup** and **GCash transfer with staff-verified proof**. GCash is a manual transfer: the app displays the recipient and accepts a payment screenshot and reference number. It does not debit a wallet or automatically verify transfers.

Staff use **Product Orders**, **GCash Settings**, and the notification bell. New orders, proof submissions, and client cancellations create staff notifications; the bell checks for updates every 15 seconds while a staff page is visible. Staff updates create client notifications and appear in the app's order screens, which also refresh every 15 seconds while open.

## Active XAMPP installation

Applied and verified on September 6, 2026 at `http://localhost/vetrix`, using `C:/Users/Justine Karl/OneDrive/Desktop/xamppppp/htdocs/vetrix` and its existing `vetrix` database. The mobile connection remains `http://192.168.1.12/vetrix/api/mobile/v1`. This is the active Desktop XAMPP installation, not `C:/xampp/htdocs`.

The active site has a newer layout than this workspace's original PHP copy. `deployment/build-xampp-purchases.cjs` builds the integration against a snapshot of that site, retaining its notification popover, navigation, dashboard, and receipt features. Only six existing files changed: the mobile bootstrap, shared functions, staff sidebar, footer, notification JavaScript, and the cashier POST handler. Twelve feature files were added. Do not replace the active site wholesale with the older workspace copy.

Backups and the deployment manifest are in the workspace's `.tmp/xampp-purchase-deploy/`: `site-before/`, `database-before.sql`, `mysql-before.ini`, and `deployment-manifest.json`. `applied-at.txt` records completion. The deployment script refuses files whose hashes changed after backup. The migration added six tables. MySQL's server packet limit was increased from 1 MB to 8 MB both for new connections and in `mysql/bin/my.ini`; no restart was needed. Existing database configuration was preserved (the active site uses `VETRIX_DB_PASS` and supports `VETRIX_DB_PORT`).

The active site uses its existing receipt archive for mobile payments. GCash sales use its electronic `qr` payment category, with GCash verification identified in receipt notes. Cash pickup receipts include cash received and change. Notifications link directly to `staff/product_orders.php?order_id=...`.

Validation passed: 53 database integration checks against the live schema with synthetic data, browser checkout and proof upload, staff bell navigation, verification, pickup, receipts, and settings editing. Read-only checks also passed against the actual deployed site and its LAN API address. Test databases and the temporary staff verification session were removed. Live GCash details remain samples; staff can enable GCash by saving the clinic's real recipient in **GCash Settings**.

## Setup and deployment

For other installations, deploy both the updated website and the mobile app. Keep the mobile app's `EXPO_PUBLIC_VETRIX_API_URL` pointed at the website serving these updated files. Restart Expo after changing this value.

Website files include `includes/product_orders.php`, the updated navigation, functions and POS cashier, all new `staff/` pages, `api/mobile/v1/orders.php`, the updated `bootstrap.php`, `config/payments.php`, and `migrations/product_orders.sql`. Deploy them together; copying only the API folder is insufficient.

1. Back up the website database, then select that database and run `migrations/product_orders.sql`. This migration adds six tables and preserves existing data. The application can create the tables on first use when the database account has CREATE permission. Existing inventory and POS tables must already be present (run `pos_product_cashier_update.sql` first on older installs).
2. Open **Staff → GCash Settings**. Initially the app shows **Sample Clinic GCash / 09XX XXX XXXX**, and GCash checkout is disabled. Save the real account name and number to enable it. Pay-at-clinic ordering works immediately. Recipient changes apply to new orders; existing orders retain the recipient they were given.
3. Configure PHP for image uploads: `upload_max_filesize=6M`, `post_max_size=8M`, a writable `upload_tmp_dir` and `session.save_path`, and MySQL `max_allowed_packet` of at least 8 MB. PHP requires mysqli/mysqlnd, mbstring, and fileinfo. Screenshots must be JPEG or PNG and at most 5 MB. Proof images are stored in the database and served only through the staff session-protected endpoint; they are never placed in a public uploads folder.
4. Use the existing website database configuration. Optional overrides: `VETRIX_DB_HOST`, `VETRIX_DB_USER`, `VETRIX_DB_PASSWORD`, `VETRIX_DB_NAME`. The existing default remains `vet_clinic`. Optional initial GCash configuration: `VETRIX_GCASH_NAME`/`VETRIX_GCASH_NUMBER` or `config/payments.local.php` (copy the example). Staff-saved settings take precedence.

## Order handling

- Creating an order reserves available stock immediately, using locked rows and a transaction. Cashier sales use the same stock checks, preventing a checkout from consuming reserved stock. Amounts come from current database prices; changed prices require the client to review checkout again.
- Checkout retries use a client-scoped request key and return the original order without extra stock deductions or notifications. Up to five open orders are allowed per client; each cart allows 50 products and 99 units per product. Staff should cancel abandoned unpaid orders to release reservations. Reservations do not expire automatically.
- GCash proof stays `under_review` until staff checks the actual recipient, reference, and amount received. Accepting it creates one paid POS transaction. Rejections require a reason, and corrected screenshots can be submitted under the same reference; the proof history is retained. One GCash reference cannot pay for two orders.
- For pay-at-clinic orders, staff mark the order ready, then enter the amount received and confirm collection to complete pickup and record the paid POS transaction. Stock is not deducted again.
- Clients and staff can cancel unpaid orders when no proof is awaiting review. Cancellation restores stock once. Paid orders cannot be cancelled through this flow; refunds need to be reconciled separately. A client who has already transferred money should contact staff instead of cancelling or paying twice.
- Staff must be active staff accounts to verify payments. Client API access requires an active verified client account. Clients can only view or cancel their own orders and upload their own proof. Staff mutations require CSRF tokens. Payment and order changes are audited.

## API

`GET orders.php` returns the authenticated client's orders and payment options; `GET orders.php?id=123` returns one owned order. Bootstrap also includes `orders` and `payment_options`.

`POST orders.php` with JSON:

```json
{
  "payment_method": "clinic",
  "request_key": "unique-checkout-key-16-to-80-characters",
  "items": [{"product_id": 1, "quantity": 2, "unit_price_centavos": 12550}],
  "notes": "Collect after lunch"
}
```

Use `payment_method: "gcash"` for GCash orders. Cancel with `{ "action": "cancel", "id": 123 }`. Upload proof as multipart POST fields `action=proof`, `id`, `reference`, and image file `proof`. Uploading proof never marks payment as paid.

## Verification

`php tests/product_orders_test.php` creates and deletes a disposable database and checks stock, prices, duplicate requests, ownership, state transitions, proof corrections, recipient snapshots, notifications, and POS integration. `--keep` retains a test database for browser checks and prints its name and test credentials. Never use a real clinic database for these checks.

For the browser/HTTP check, export the mobile web app to `.expo-export-check/product-orders` with `EXPO_PUBLIC_VETRIX_API_URL=http://127.0.0.1:8091/api/mobile/v1` and `EXPO_NO_DOTENV=1`. Set `VETRIX_ORDER_TEST_DB` to a freshly created disposable database, then run `node scripts/check-product-orders.js` from the mobile folder. The runner starts temporary servers on 8091 and 8089 and writes screenshots under `.visual-check/product-orders`. `VETRIX_PHP` and `VETRIX_BROWSER` can override the PHP and Chrome executable paths. It uses test payments only and sends no money. Remove the retained test database after reviewing the results.
