<?php
// Mail settings come from environment variables or an ignored local override.
// Copy mail.local.example.php to mail.local.php for local XAMPP development.

$localMailConfig = [];
$localMailConfigPath = __DIR__ . '/mail.local.php';

if (is_file($localMailConfigPath)) {
    $loadedMailConfig = require $localMailConfigPath;
    if (is_array($loadedMailConfig)) {
        $localMailConfig = $loadedMailConfig;
    }
}

$readMailSetting = static function ($environmentName, $localName, $default) use ($localMailConfig) {
    $environmentValue = getenv($environmentName);
    if ($environmentValue !== false && $environmentValue !== '') {
        return $environmentValue;
    }

    return array_key_exists($localName, $localMailConfig)
        ? $localMailConfig[$localName]
        : $default;
};

$readMailBoolean = static function ($environmentName, $localName, $default) use ($readMailSetting) {
    $value = $readMailSetting($environmentName, $localName, $default ? 'true' : 'false');
    return filter_var($value, FILTER_VALIDATE_BOOLEAN);
};

$smtpUsername = trim((string)$readMailSetting('VETRIX_SMTP_USERNAME', 'smtp_username', ''));
$mailFrom = trim((string)$readMailSetting('VETRIX_MAIL_FROM', 'from', $smtpUsername));

define('APP_MAIL_SEND_REAL_EMAIL', $readMailBoolean('VETRIX_MAIL_SEND_REAL_EMAIL', 'send_real_email', false));
define('APP_MAIL_FROM', $mailFrom);
define('APP_MAIL_FROM_NAME', (string)$readMailSetting('VETRIX_MAIL_FROM_NAME', 'from_name', 'Vetrix Veterinary Clinic'));
define('APP_MAIL_SMTP_HOST', (string)$readMailSetting('VETRIX_SMTP_HOST', 'smtp_host', 'smtp.gmail.com'));
define('APP_MAIL_SMTP_PORT', (int)$readMailSetting('VETRIX_SMTP_PORT', 'smtp_port', 587));
define('APP_MAIL_SMTP_SECURE', (string)$readMailSetting('VETRIX_SMTP_SECURE', 'smtp_secure', 'tls'));
define('APP_MAIL_SMTP_USERNAME', $smtpUsername);
define('APP_MAIL_SMTP_PASSWORD', (string)$readMailSetting('VETRIX_SMTP_PASSWORD', 'smtp_password', ''));
define('APP_MAIL_SMTP_TIMEOUT', (int)$readMailSetting('VETRIX_SMTP_TIMEOUT', 'smtp_timeout', 30));
define('APP_MAIL_SAVE_TO_OUTBOX', $readMailBoolean('VETRIX_MAIL_SAVE_TO_OUTBOX', 'save_to_outbox', true));

unset(
    $loadedMailConfig,
    $localMailConfig,
    $localMailConfigPath,
    $mailFrom,
    $readMailBoolean,
    $readMailSetting,
    $smtpUsername
);
