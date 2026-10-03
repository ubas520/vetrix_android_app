Vetrix - FULL ADVANCED VERSION WITH REPORTING SYSTEM

Folder name:
vet_clinic

Put here:
C:\xampp\htdocs\vet_clinic

Setup:
1. Extract ZIP.
2. Put vet_clinic folder inside C:\xampp\htdocs\
3. Start Apache and MySQL in XAMPP.
4. Open phpMyAdmin.
5. Import database.sql.
   It creates database: vet_clinic
6. Open:
   http://localhost/vet_clinic/login.php

Login:
Admin: admin@vetclinic.test
Client: client@vetclinic.test
Second client: juan@vetclinic.test
Password: password123

PDF / Report System:
This version does NOT require GitHub, Composer, or TCPDF.
Reports open as printable pages.
To save as PDF:
1. Open Admin > Reports.
2. Choose a report.
3. Click "Print / Save as PDF".
4. In browser print dialog, choose "Save as PDF".

Included Reports:
- Pet Medical Report
- Appointment Date Range Report
- Vaccination Due Report
- Client & Pet Directory
- QR Emergency Report
- Clinic Analytics Report

Other Upgrades:
- Improved admin analytics dashboard
- Appointment status metrics
- Appointment trend chart
- Species analytics
- Activity logs
- Client-owned pet profiles
- Medical records and vaccinations controlled by admin
- QR emergency retrieval
- Appointment conflict checking
- Auto vaccine reminder notifications
- Pet-aware chatbot with Europe PMC research links


Login UI update:
- System branding changed from VetCare to Vetrix.
- Login page redesigned with a modern SaaS-style layout.
- Added interactive animated puppy: move cursor near the dog to make it react, wag, and show hearts.


Hybrid account update:
- Clients can self-register using register.php.
- Admin can still create walk-in client accounts.
- Client table now shows account source:
  self_registered, admin_created, or system_seed.
- Database users table includes account_source and created_by fields.


Dashboard animation update:
- Added animated owner walking dog scene in Admin Dashboard hero.
- Pure CSS animation, no external library required.


All requested upgrades except SMS:
- Better empty state for records with Request Checkup button.
- Completed appointments can be converted into medical records.
- Client profile page with phone, address, emergency contact, password update.
- Client pet edits now create approval requests for admin.
- Admin Pet Edit Requests page added.
- Records UI upgraded into card/timeline style.
- Notifications improved for records, appointments, vaccines, and pet edits.
- Chatbot now asks follow-up symptom questions.
- Admin calendar view added.
- CSV backup/export tools added.
- SMS/A76 module intentionally not added yet.


Analytics upgrade:
- Added appointment status pie chart.
- Added pets-by-species horizontal bar chart.
- Added top diagnosis chart.
- Added analytics insight cards.
- Still works offline/localhost with pure CSS and PHP, no Chart.js required.

ROLE ACCESS UPDATE
------------------
Panel-suggested user levels are now added:
- Admin: admin@vetclinic.test / password123
- Veterinarian: vet@vetclinic.test / password123
- Staff: staff@vetclinic.test / password123
- Client: client@vetclinic.test / password123

If you are updating an existing imported database, run migrations/role_access_update.sql in phpMyAdmin.
For a fresh setup, import database.sql again.

CLIENT ACCOUNT OTP VERIFICATION UPDATE
--------------------------------------
Client-focused account opening flow is now added:
1. Client registers using register.php.
2. Account status becomes PENDING.
3. Admin opens User Management and approves or rejects the client.
4. If approved, the system generates a 6-digit one-time OTP.
5. The OTP is saved securely as a hash and can only be used once.
6. The approval OTP email is sent to the client Gmail.
7. Client logs in using email/password, then enters the OTP in verify_account.php.
8. After successful OTP verification, the token is marked USED and the client receives a welcome letter.

Important for Gmail/email:
- Real Gmail SMTP sending is configured in config/mail.php.
- For Gmail SMTP, use a 16-character Google App Password instead of your normal Gmail password.

If updating an existing database, run:
migrations/client_account_otp_update.sql

For fresh setup, importing database.sql already includes the new tables and fields.

REAL GMAIL SMTP EMAIL UPDATE FOR LOCAL XAMPP
--------------------------------------------
The system can now send real emails even while running on local XAMPP.
It uses Gmail SMTP through includes/smtp_mailer.php, so Composer/PHPMailer is not required.

Before testing OTP emails, edit:
config/mail.php

Change these values:
- APP_MAIL_FROM = your Gmail address
- APP_MAIL_SMTP_USERNAME = your Gmail address
- APP_MAIL_SMTP_PASSWORD = your 16-character Gmail App Password

Important:
- Do not use your normal Gmail password.
- Your Gmail account must have 2-Step Verification enabled.
- Then create an App Password in Google Account > Security > App passwords.
- Remove spaces from the App Password before pasting it.

Flow after setup:
1. Client registers.
2. Admin approves client in User Management.
3. System sends the OTP to the client's Gmail.
5. Client verifies the OTP.
6. System sends the welcome letter to the client's Gmail.

If email sending fails:
- Make sure your Gmail and App Password are correct.
- Make sure OpenSSL is enabled in XAMPP PHP.
- Make sure your laptop has internet connection.


MAIL UPDATE
Real Gmail SMTP is configured in config/mail.php. The sender account is set and the Gmail App Password is handled by the SMTP mailer. If sending still fails, check XAMPP OpenSSL, internet connection, and Google account security settings.

UPDATE: Added an admin dashboard Top Diagnoses tracking feature with Monthly, Quarterly, Semi-Annual, and Annual filters. The chart uses medical_records.visit_date and diagnosis data, with an ECharts bar chart and fallback list.

Role-Based POS and Inventory Update:
- POS Management is now handled by Staff for daily cashier/payment transactions.
- Admin side now uses POS Reports for monitoring sales and payment records only.
- Inventory is shared by role: Admin manages products, stock oversight, and adjustments; Staff records daily stock-in/stock-out updates.
