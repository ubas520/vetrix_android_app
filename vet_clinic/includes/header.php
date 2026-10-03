<?php
require_once __DIR__ . "/functions.php";
if (!empty($allowQrCamera) && !headers_sent()) {
    header('Permissions-Policy: camera=(self), microphone=(), geolocation=()');
}
$title = $title ?? "Vetrix";
$styleVersion = time();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?= e($title) ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#2563eb">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="<?= app_url('assets/css/bootstrap.min.css') ?>" rel="stylesheet">
    <link href="<?= app_url('assets/css/style.css') ?>?v=<?= e($styleVersion) ?>" rel="stylesheet">
</head>
<body data-app-base="<?= app_url('') ?>" data-user-role="<?= e($_SESSION['role'] ?? 'guest') ?>">
