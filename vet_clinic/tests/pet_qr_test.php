<?php
// Temporary tables shadow clinic tables only on this connection; no clinic data is changed.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
session_save_path(sys_get_temp_dir());
require_once __DIR__ . '/../includes/pet_qr.php';
$conn = new mysqli(getenv('VETRIX_DB_HOST') ?: 'localhost', getenv('VETRIX_DB_USER') ?: 'root', getenv('VETRIX_DB_PASSWORD') ?: '');
$database = 'vetrix_qr_test_' . bin2hex(random_bytes(5));
$conn->query("CREATE DATABASE `$database` CHARACTER SET utf8mb4");
$conn->select_db($database);
$checks = 0;
function qr_expect(bool $condition, string $label): void {
    global $checks;
    if (!$condition) throw new RuntimeException('FAIL: ' . $label);
    $checks++;
}

try {
$conn->query('CREATE TEMPORARY TABLE users (id INT PRIMARY KEY, full_name VARCHAR(100), email VARCHAR(100), phone VARCHAR(30), address VARCHAR(255))');
$conn->query('CREATE TEMPORARY TABLE pets (id INT PRIMARY KEY, owner_id INT, name VARCHAR(100), verification_status VARCHAR(30))');
$conn->query('CREATE TEMPORARY TABLE qr_tokens (pet_id INT, token VARCHAR(255), status VARCHAR(30), expires_at DATETIME NULL)');
$conn->query("INSERT INTO users VALUES (101,'QR Owner','qr@example.test','123','Test address'),(102,'Other Owner','other@example.test','456','Other address')");
$conn->query("INSERT INTO pets VALUES (201,101,'QR Pet','approved'),(202,102,'Other Pet','approved'),(203,101,'Pending Pet','pending')");
$conn->query("INSERT INTO qr_tokens VALUES (201,'ACTIVE-TOKEN','active',NULL),(202,'OTHER-TOKEN','active',NULL),(203,'PENDING-TOKEN','active',NULL),(201,'REVOKED-TOKEN','revoked',NULL),(201,'EXPIRED-TOKEN','active',DATE_SUB(NOW(),INTERVAL 1 DAY)),(201,'FUTURE-TOKEN','active',DATE_ADD(NOW(),INTERVAL 1 DAY)),(201,'A+B & /?=','active',NULL)");

foreach (['admin', 'staff', 'veterinarian'] as $role) {
    qr_expect(pet_qr_record($conn, 'ACTIVE-TOKEN', $role, 1)['pet_id'] === 201, $role . ' retrieves active pet');
}
qr_expect(pet_qr_record($conn, 'ACTIVE-TOKEN', 'client', 101)['pet_id'] === 201, 'owner can retrieve own pet');
qr_expect(pet_qr_record($conn, 'OTHER-TOKEN', 'client', 101) === null, 'owner cannot retrieve another owner pet');
foreach (['EXPIRED-TOKEN', 'REVOKED-TOKEN', 'PENDING-TOKEN', 'MISSING', '', "' OR 1=1 --"] as $token) {
    qr_expect(pet_qr_record($conn, $token, 'staff', 1) === null, 'reject invalid/inactive token: ' . $token);
}
qr_expect(pet_qr_record($conn, 'ACTIVE-TOKEN', 'guest', 1) === null, 'unrecognized role denied');
qr_expect(pet_qr_record($conn, 'ACTIVE-TOKEN', 'client', 0) === null, 'missing user denied');
qr_expect(pet_qr_record($conn, 'FUTURE-TOKEN', 'client', 101) !== null, 'unexpired code works');
qr_expect(pet_qr_record($conn, 'https://clinic.example/vetrix/qr.php?token=A%2BB%20%26%20%2F%3F%3D', 'staff', 1)['pet_id'] === 201, 'full URL decodes reserved characters');
foreach ([[], ['token'], str_repeat('x', 256), "bad\nvalue", 'https://clinic.example/?token[]=bad'] as $input) {
    qr_expect(pet_qr_token($input) === '', 'malformed input rejected');
}
$_SESSION['pending_pet_qr_token'] = 'A+B & /?=';
qr_expect(pet_qr_login_destination('staff') === 'qr.php?token=A%2BB%20%26%20%2F%3F%3D', 'login resumes fixed QR route');
qr_expect(!isset($_SESSION['pending_pet_qr_token']), 'login continuation consumed');
qr_expect(pet_qr_login_destination('staff') === 'staff/dashboard.php', 'ordinary login unchanged');
$_SESSION['pending_pet_qr_token'] = '//untrusted.example';
qr_expect(str_starts_with(pet_qr_login_destination('client'), 'qr.php?token='), 'cannot turn continuation into open redirect');
$_SERVER['SCRIPT_NAME'] = '/nested/vetrix/client/qr.php';
$_SERVER['HTTP_HOST'] = '192.168.1.12:8088';
putenv('VETRIX_PUBLIC_BASE_URL');
qr_expect(pet_qr_url('ACTIVE-TOKEN') === 'http://192.168.1.12:8088/nested/vetrix/qr.php?token=ACTIVE-TOKEN', 'web QR preserves host, port and installation path');
putenv('VETRIX_PUBLIC_BASE_URL=https://clinic.example/vetrix/');
qr_expect(pet_qr_url('ACTIVE-TOKEN') === 'https://clinic.example/vetrix/qr.php?token=ACTIVE-TOKEN', 'configured public website used');
echo "Passed {$checks} pet QR checks.\n";
} finally {
    $conn->query("DROP DATABASE `$database`");
    $conn->close();
    session_destroy();
}
