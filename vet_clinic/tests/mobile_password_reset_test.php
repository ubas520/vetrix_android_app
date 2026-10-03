<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../includes/mobile_password_reset.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$conn = new mysqli(getenv('VETRIX_DB_HOST') ?: 'localhost', getenv('VETRIX_DB_USER') ?: 'root', getenv('VETRIX_DB_PASSWORD') ?: '');
$db = 'vetrix_reset_test_' . bin2hex(random_bytes(5));
$conn->query("CREATE DATABASE `$db`");
$conn->select_db($db);
$checks = 0;
function check_reset(bool $condition, string $label): void {
    global $checks;
    if (!$condition) throw new RuntimeException('FAIL: ' . $label);
    $checks++;
}
function reject_reset(callable $callback, int $status = 422): void {
    try { $callback(); } catch (DomainException $e) { check_reset($e->getCode() === $status, 'expected rejection status'); return; }
    throw new RuntimeException('Unsafe reset accepted');
}
function reset_scalar(string $sql) { global $conn; return $conn->query($sql)->fetch_row()[0]; }
function age_reset(): void {
    global $conn;
    $conn->query('UPDATE mobile_password_resets SET sent_at=DATE_SUB(NOW(),INTERVAL 61 SECOND)');
    $conn->query('UPDATE mobile_password_reset_requests SET requested_at=DATE_SUB(NOW(),INTERVAL 61 SECOND)');
}
try {
    $conn->query("CREATE TABLE users(id INT PRIMARY KEY,email VARCHAR(120),full_name VARCHAR(120),password VARCHAR(255),role VARCHAR(20),status VARCHAR(20),otp_verified_at DATETIME,deleted_at DATETIME NULL) ENGINE=InnoDB");
    $conn->query("CREATE TABLE mobile_api_tokens(user_id INT,revoked_at DATETIME NULL) ENGINE=InnoDB");
    $conn->query(file_get_contents(__DIR__ . '/../migrations/mobile_password_resets.sql'));
    ensure_mobile_password_reset_schema($conn);
    ensure_mobile_password_reset_schema($conn);
    reset_db($conn, "INSERT INTO users VALUES(1,'reset@example.test','Client',?,'client','active',NOW(),NULL)", 's', [password_hash('Original123!', PASSWORD_DEFAULT)]);
    $conn->query("INSERT INTO users VALUES(2,'admin@example.test','Admin','','admin','active',NULL,NULL)");
    $conn->query('INSERT INTO mobile_api_tokens VALUES(1,NULL)');
    $code = ''; $sends = 0;
    $sender = function ($user, $otp) use (&$code, &$sends) { $code = $otp; $sends++; return true; };
    $request = fn() => mobile_password_reset($conn, 'reset@example.test', 'request');
    $reset = fn($otp) => mobile_password_reset($conn, 'reset@example.test', 'reset', $otp, 'Changed123!');
    $key = fn() => reset_scalar('SELECT request_key FROM mobile_password_reset_requests WHERE user_id=1');
    $approve = fn() => mobile_password_reset($conn, 'reset@example.test', 'approve', '', '', $sender, 2, $key());
    reject_reset(fn() => $reset('123456'));
    mobile_password_reset($conn, 'unknown@example.test', 'request');
    check_reset((int)reset_scalar('SELECT COUNT(*) FROM mobile_password_reset_requests') === 0, 'unknown account is not queued');
    $request();
    check_reset($sends === 0 && (int)reset_scalar('SELECT COUNT(*) FROM mobile_password_resets') === 0, 'request generates no OTP and sends no email');
    check_reset(reset_scalar('SELECT status FROM mobile_password_reset_requests') === 'pending', 'request awaits approval');
    $firstKey = $key();
    $request(); check_reset($key() === $firstKey, 'duplicate pending request is idempotent');
    reject_reset(fn() => $reset('123456'));
    reject_reset(fn() => mobile_password_reset($conn, 'reset@example.test', 'approve', '', '', $sender, 1, $key()), 403);
    reject_reset(fn() => mobile_password_reset($conn, 'reset@example.test', 'approve', '', '', $sender, 0, $key()), 403);
    reject_reset(fn() => mobile_password_reset($conn, 'reset@example.test', 'approve', '', '', $sender, 2, str_repeat('0',32)), 409);
    reject_reset(fn() => mobile_password_reset($conn, 'reset@example.test', 'approve', '', '', fn() => false, 2, $key()), 503);
    check_reset(reset_scalar('SELECT status FROM mobile_password_reset_requests') === 'pending' && (int)reset_scalar('SELECT COUNT(*) FROM mobile_password_resets') === 0, 'mail failure leaves request pending and no usable OTP');
    $approve();
    check_reset($sends === 1 && (bool)preg_match('/^\d{6}$/', $code), 'admin approval sends six-digit OTP');
    check_reset(reset_scalar('SELECT status FROM mobile_password_reset_requests') === 'approved' && (int)reset_scalar('SELECT reviewed_by FROM mobile_password_reset_requests') === 2, 'approval records reviewer');
    check_reset(password_verify('Original123!', reset_scalar('SELECT password FROM users WHERE id=1')), 'approval does not change password');
    $record = $conn->query('SELECT *, UNIX_TIMESTAMP(expires_at) AS expiry FROM mobile_password_resets')->fetch_assoc();
    check_reset($record['otp_hash'] !== $code && password_verify($code, $record['otp_hash']), 'OTP stored hashed');
    check_reset(abs((int)$record['expiry'] - time() - 600) < 5, 'expiry starts at approval');
    reject_reset($approve, 409);
    $request(); check_reset($key() === $firstKey && $sends === 1, 'resend cooldown');
    reject_reset(fn() => $reset('000000'));
    check_reset((int)reset_scalar('SELECT attempts FROM mobile_password_resets') === 1, 'failed attempt persists');
    reset_db($conn, 'UPDATE mobile_password_resets SET otp_hash=?', 's', [password_hash('000001', PASSWORD_DEFAULT)]);
    age_reset(); $request();
    check_reset($key() !== $firstKey && $sends === 1, 'new code needs fresh admin approval');
    reject_reset(fn() => $reset('000001'));
    reject_reset(fn() => mobile_password_reset($conn, 'reset@example.test', 'approve', '', '', $sender, 2, $firstKey), 409);
    $approve(); check_reset($sends === 2, 'fresh approval sends replacement OTP');
    reject_reset(fn() => $reset('000001'));
    $conn->query('UPDATE mobile_password_resets SET expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND)');
    reject_reset(fn() => $reset($code));
    $conn->query('UPDATE mobile_password_resets SET expires_at=DATE_ADD(NOW(),INTERVAL 10 MINUTE),attempts=9');
    reject_reset(fn() => $reset('000000'));
    reject_reset(fn() => $reset($code));
    age_reset(); $request(); check_reset(reset_scalar('SELECT status FROM mobile_password_reset_requests') === 'approved', 'request cannot bypass guess limit');
    $conn->query('UPDATE mobile_password_resets SET window_started_at=DATE_SUB(NOW(),INTERVAL 61 MINUTE)');
    $request(); $approve(); check_reset($sends === 3, 'hour window recovers after approval');
    $conn->query("UPDATE users SET status='inactive' WHERE id=1");
    reject_reset(fn() => $reset($code));
    $conn->query("UPDATE users SET status='active',otp_verified_at=NULL WHERE id=1");
    reject_reset(fn() => $reset($code));
    $conn->query('UPDATE users SET otp_verified_at=NOW() WHERE id=1');
    reject_reset(fn() => mobile_password_reset($conn, 'unknown@example.test', 'reset', $code, 'Changed123!'));
    $reset($code);
    $hash = reset_scalar('SELECT password FROM users WHERE id=1');
    check_reset(password_verify('Changed123!', $hash) && !password_verify('Original123!', $hash), 'password changes only with approved OTP');
    check_reset(reset_scalar('SELECT revoked_at FROM mobile_api_tokens') !== null, 'sessions revoked');
    check_reset(reset_scalar('SELECT status FROM mobile_password_reset_requests') === 'completed', 'request completed');
    reject_reset(fn() => $reset($code));
    age_reset(); $request();
    $rejectKey = $key();
    mobile_password_reset($conn, 'reset@example.test', 'reject', '', '', null, 2, $rejectKey);
    check_reset(reset_scalar('SELECT status FROM mobile_password_reset_requests') === 'rejected' && $sends === 3, 'rejection sends no email');
    reject_reset(fn() => $reset($code));
    reject_reset($approve, 409);
    age_reset(); $request(); check_reset($key() !== $rejectKey, 'new request allowed after rejection cooldown');
    $conn->query('UPDATE mobile_password_resets SET send_count=5');
    reject_reset($approve, 429);
    check_reset($sends === 3, 'hourly send limit');
    echo "PASS: $checks password reset checks\n";
} finally {
    $conn->query("DROP DATABASE `$db`");
}
