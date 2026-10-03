<?php
// Copy this file to mail.local.php and fill in local-only credentials.
// mail.local.php is ignored and must never be committed or archived.

return [
    'send_real_email' => false,
    'from' => 'clinic@example.com',
    'from_name' => 'Vetrix Veterinary Clinic',
    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => 587,
    'smtp_secure' => 'tls',
    'smtp_username' => '',
    'smtp_password' => '',
    'smtp_timeout' => 30,
    'save_to_outbox' => true,
];
