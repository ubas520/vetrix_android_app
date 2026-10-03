<?php
$host = getenv('VETRIX_DB_HOST') ?: 'localhost';
$user = getenv('VETRIX_DB_USER') ?: 'root';
$pass = getenv('VETRIX_DB_PASSWORD') ?: '';
$db   = getenv('VETRIX_DB_NAME') ?: 'vet_clinic';

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("<div style='font-family:Arial;padding:20px;color:#7f1d1d;background:#fee2e2;border-radius:12px;margin:20px'>
    <h3>Database connection failed</h3>
    <p>Make sure MySQL is running and import <b>database.sql</b> in phpMyAdmin.</p>
    <p>Error: " . $conn->connect_error . "</p>
    </div>");
}

$conn->set_charset("utf8mb4");
?>
