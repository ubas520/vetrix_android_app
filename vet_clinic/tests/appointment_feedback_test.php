<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../includes/appointment_feedback.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$conn = new mysqli(getenv('VETRIX_DB_HOST') ?: 'localhost', getenv('VETRIX_DB_USER') ?: 'root', getenv('VETRIX_DB_PASSWORD') ?: '');
$db = 'vetrix_feedback_test_' . bin2hex(random_bytes(5));
$conn->query("CREATE DATABASE `$db` CHARACTER SET utf8mb4");
$conn->select_db($db);
$conn->set_charset('utf8mb4');
$checks = 0;
function feedback_check(bool $condition, string $label): void {
    global $checks;
    if (!$condition) throw new RuntimeException('FAIL: ' . $label);
    $checks++;
}
function feedback_reject(callable $callback, int $status): void {
    try { $callback(); } catch (DomainException $e) {
        feedback_check($e->getCode() === $status, 'rejection status'); return;
    }
    throw new RuntimeException('Invalid feedback was accepted');
}
try {
    $conn->query('CREATE TABLE users(id INT PRIMARY KEY) ENGINE=InnoDB');
    $conn->query('CREATE TABLE appointments(id INT PRIMARY KEY,owner_id INT,status VARCHAR(20)) ENGINE=InnoDB');
    $conn->query('CREATE TABLE feedback(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,rating INT,comment TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB');
    $conn->query('INSERT INTO users VALUES(1),(2)');
    $conn->query("INSERT INTO feedback(user_id,rating,comment) VALUES(1,4,'Existing website feedback')");
    $conn->query(file_get_contents(__DIR__ . '/../migrations/appointment_feedback.sql'));
    feedback_check($conn->query('SELECT appointment_id FROM feedback')->fetch_row()[0] === null, 'migration preserves general feedback');
    $conn->query("INSERT INTO appointments VALUES(1,1,'completed'),(2,1,'pending'),(3,1,'approved'),(4,1,'cancelled'),(5,2,'completed'),(6,1,'completed'),(7,1,'completed')");
    $submit = fn($id, $rating = 5, $comment = '') => appointment_feedback_submit($conn, 1, ['appointment_id' => $id, 'rating' => $rating, 'comment' => $comment]);
    foreach ([0, 6, 2.5, '5', true, null, []] as $invalid) feedback_reject(fn() => $submit(1, $invalid), 422);
    foreach ([0, -1, '1', 1.5, null] as $invalid) feedback_reject(fn() => $submit($invalid), 422);
    foreach ([2,3,4] as $id) feedback_reject(fn() => $submit($id), 409);
    feedback_reject(fn() => $submit(5), 404);
    feedback_reject(fn() => $submit(999), 404);
    feedback_reject(fn() => $submit(1, 5, str_repeat('x', 1001)), 422);
    feedback_reject(fn() => $submit(1, 5, []), 422);
    $first = $submit(1, 5, '  Kind staff 🐾  ');
    feedback_check($first['rating'] === 5 && $first['comment'] === 'Kind staff 🐾', 'rating and Unicode comment saved');
    feedback_check($submit(1, 5, 'Kind staff 🐾')['id'] === $first['id'], 'lost-response retry returns same record');
    feedback_reject(fn() => $submit(1, 1, 'Changed'), 409);
    feedback_reject(fn() => $submit(1, 5, 'Changed'), 409);
    feedback_check($submit(6, 1)['comment'] === '', 'lowest rating and optional comment accepted');
    feedback_check($submit(7, 3, str_repeat('好', 1000))['rating'] === 3, 'maximum Unicode comment accepted');
    feedback_check(count(appointment_feedback_for_user($conn, 1)) === 3, 'saved ratings reload by visit');
    feedback_check(appointment_feedback_for_user($conn, 2) === [], 'other client cannot read ratings');
    try {
        $conn->query('INSERT INTO feedback(user_id,appointment_id,rating) VALUES(1,1,2)');
        throw new RuntimeException('Duplicate database insert accepted');
    } catch (mysqli_sql_exception $e) { feedback_check($e->getCode() === 1062, 'database enforces one rating per appointment'); }
    feedback_check((int)$conn->query('SELECT COUNT(*) FROM feedback')->fetch_row()[0] === 4, 'retries and rejections add no rows');
    $conn->query('DELETE FROM appointments WHERE id=1');
    feedback_check((int)$conn->query('SELECT COUNT(*) FROM feedback WHERE appointment_id IS NULL')->fetch_row()[0] === 2, 'deleting a visit preserves feedback');
    echo "PASS: $checks appointment feedback checks\n";
} finally {
    $conn->query("DROP DATABASE `$db`");
}
