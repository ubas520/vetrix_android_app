<?php
if (session_status() === PHP_SESSION_NONE) session_start();

function e($value) {
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

function app_url($path = '') {
    // Builds the correct base URL even if the project is inside an extra folder,
    // for example: /vet_clinic/ OR /vet_clinic_mobile_simulation/vet_clinic/
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME']);
    $dir = rtrim(dirname($script), '/\\');
    $knownFolders = ['/admin', '/vet', '/staff', '/client', '/includes', '/config', '/api', '/assets'];

    foreach ($knownFolders as $folder) {
        if (substr($dir, -strlen($folder)) === $folder) {
            $dir = substr($dir, 0, -strlen($folder));
            break;
        }
    }

    if ($dir === '/' || $dir === '\\' || $dir === '.') {
        $dir = '';
    }

    return $dir . '/' . ltrim($path, '/');
}

function redirect_to($path) {
    header("Location: " . app_url($path));
    exit;
}

function is_logged_in() { return isset($_SESSION['user_id']); }

function require_login() {
    if (!is_logged_in()) redirect_to("login.php");
}

function dashboard_for_role($role = null) {
    $role = $role ?? ($_SESSION['role'] ?? 'client');
    $map = [
        'admin' => 'admin/dashboard.php',
        'veterinarian' => 'vet/dashboard.php',
        'staff' => 'staff/dashboard.php',
        'client' => 'client/dashboard.php'
    ];
    return $map[$role] ?? 'client/dashboard.php';
}

function require_role($role) {
    require_login();
    $allowed = is_array($role) ? $role : [$role];
    if (!in_array($_SESSION['role'], $allowed, true)) {
        redirect_to(dashboard_for_role($_SESSION['role'] ?? 'client'));
    }
}

function current_user_id() { return $_SESSION['user_id'] ?? null; }

function flash($key, $message = null) {
    if ($message !== null) { $_SESSION['flash'][$key] = $message; return; }
    if (isset($_SESSION['flash'][$key])) {
        $msg = $_SESSION['flash'][$key];
        unset($_SESSION['flash'][$key]);
        return $msg;
    }
    return null;
}

function csrf_token() {
    if (empty($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field() {
    return '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
}

function verify_csrf_or_fail() {
    $token = $_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($token) || !hash_equals(csrf_token(), $token)) {
        http_response_code(419);
        exit('Your session form token expired. Reload the page and try again.');
    }
}

function badge($status) {
    $status = strtolower($status ?? '');
    $map = [
        'pending' => 'warning', 'approved' => 'success', 'completed' => 'primary',
        'cancelled' => 'danger', 'active' => 'success', 'inactive' => 'secondary',
        'read' => 'secondary', 'unread' => 'info', 'rejected' => 'danger',
        'in_person_confirmation' => 'info'
    ];
    $class = $map[$status] ?? 'secondary';
    return "<span class='badge text-bg-$class'>" . e(ucfirst($status)) . "</span>";
}

function check_seed_password($email, $password) {
    return in_array($email, ['admin@vetclinic.test', 'vet@vetclinic.test', 'staff@vetclinic.test', 'client@vetclinic.test', 'juan@vetclinic.test']) && $password === 'password123';
}

function log_action($conn, $action, $entity_type, $entity_id = null, $details = '') {
    $actor = current_user_id();
    $stmt = $conn->prepare("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?)");
    $stmt->bind_param("issis", $actor, $action, $entity_type, $entity_id, $details);
    $stmt->execute();
}

function get_nav_notification_count($conn, $role = null, $user_id = null) {
    if (!$conn) return 0;

    $role = $role ?? ($_SESSION['role'] ?? 'guest');
    $user_id = $user_id ?? current_user_id();

    if ($role === 'client' && $user_id) {
        $stmt = $conn->prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id=? AND status='unread'");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        return (int)($row['total'] ?? 0);
    }

    if (in_array($role, ['admin','staff'], true)) {
        $pendingAppointments = 0;
        $pendingEditRequests = 0;
        $pendingPets = 0;

        if ($result = $conn->query("SELECT COUNT(*) AS total FROM appointments WHERE status='pending'")) {
            $pendingAppointments = (int)($result->fetch_assoc()['total'] ?? 0);
        }

        if ($result = $conn->query("SELECT COUNT(*) AS total FROM edit_requests WHERE status='pending'")) {
            $pendingEditRequests = (int)($result->fetch_assoc()['total'] ?? 0);
        }

        if ($result = $conn->query("SELECT COUNT(*) AS total FROM pets WHERE verification_status IN ('pending','in_person_confirmation')")) {
            $pendingPets = (int)($result->fetch_assoc()['total'] ?? 0);
        }

        $pendingClients = 0;
        if ($role === 'admin') {
            if ($result = $conn->query("SELECT COUNT(*) AS total FROM users WHERE role='client' AND status='pending'")) {
                $pendingClients = (int)($result->fetch_assoc()['total'] ?? 0);
            }
        }

        $staffNotices = 0;
        if ($role === 'staff' && $user_id) {
            $stmt = $conn->prepare("SELECT COUNT(*) total FROM notifications WHERE user_id=? AND status='unread'");
            $stmt->bind_param('i', $user_id);
            $stmt->execute();
            $staffNotices = (int) ($stmt->get_result()->fetch_assoc()['total'] ?? 0);
        }
        return $pendingAppointments + $pendingEditRequests + $pendingPets + $pendingClients + $staffNotices;
    }

    return 0;
}

function notify_user($conn, $user_id, $title, $message, $type='system') {
    $stmt = $conn->prepare("INSERT INTO notifications(user_id,title,message,type) VALUES(?,?,?,?)");
    $stmt->bind_param("isss", $user_id, $title, $message, $type);
    $stmt->execute();
}


function ensure_pet_update_logs_table($conn) {
    if (!$conn) return;
    $conn->query("CREATE TABLE IF NOT EXISTS pet_update_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pet_id INT NOT NULL,
        updated_by INT NOT NULL,
        changes_summary TEXT,
        old_values TEXT NULL,
        new_values TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pet_update_logs_pet_id (pet_id),
        INDEX idx_pet_update_logs_updated_by (updated_by)
    )");
}

function create_client_otp($conn, $user_id, $purpose = 'account_activation') {
    $otp = (string)random_int(100000, 999999);
    $token_hash = password_hash($otp, PASSWORD_DEFAULT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $cancel = $conn->prepare("UPDATE account_verification_tokens SET status='expired' WHERE user_id=? AND purpose=? AND used_at IS NULL AND status='active'");
    $cancel->bind_param("is", $user_id, $purpose);
    $cancel->execute();

    $stmt = $conn->prepare("INSERT INTO account_verification_tokens(user_id, token_hash, purpose, expires_at, created_by) VALUES(?,?,?,?,?)");
    $actor = current_user_id();
    $stmt->bind_param("isssi", $user_id, $token_hash, $purpose, $expires_at, $actor);
    $stmt->execute();
    return $otp;
}

function send_app_email($conn, $to_email, $to_name, $subject, $body, $type = 'system') {
    if (file_exists(__DIR__ . '/../config/mail.php')) {
        require_once __DIR__ . '/../config/mail.php';
    }
    if (file_exists(__DIR__ . '/smtp_mailer.php')) {
        require_once __DIR__ . '/smtp_mailer.php';
    }

    $sendReal = defined('APP_MAIL_SEND_REAL_EMAIL') ? APP_MAIL_SEND_REAL_EMAIL : false;
    $saveToOutbox = defined('APP_MAIL_SAVE_TO_OUTBOX') ? APP_MAIL_SAVE_TO_OUTBOX : true;
    $status = $sendReal ? 'failed' : 'queued';
    $error = $sendReal ? 'Real email sending is enabled but SMTP was not attempted.' : null;
    $method = null;

    if ($sendReal) {
        if (function_exists('smtp_send_mail')) {
            $result = smtp_send_mail($to_email, $to_name, $subject, $body);
            $status = !empty($result['ok']) ? 'sent' : 'failed';
            $error = !empty($result['ok']) ? null : ($result['error'] ?? 'SMTP sending failed.');
            $method = $result['method'] ?? null;
        } else {
            $error = 'SMTP mailer file was not found.';
        }
    }

    if ($saveToOutbox) {
        $stmt = $conn->prepare("INSERT INTO email_outbox(to_email,to_name,subject,body,email_type,status,error_message) VALUES(?,?,?,?,?,?,?)");
        if ($stmt) {
            $stmt->bind_param("sssssss", $to_email, $to_name, $subject, $body, $type, $status, $error);
            $stmt->execute();
        }
    }

    $GLOBALS['APP_LAST_MAIL_RESULT'] = array(
        'ok' => ($status === 'sent' || (!$sendReal && $status === 'queued')),
        'status' => $status,
        'error' => $error,
        'method' => $method,
        'to' => $to_email,
        'subject' => $subject,
        'type' => $type
    );

    return $GLOBALS['APP_LAST_MAIL_RESULT']['ok'];
}

function get_last_mail_result() {
    return $GLOBALS['APP_LAST_MAIL_RESULT'] ?? null;
}

function flash_mail_result($successText, $fallbackText = '') {
    $mail = get_last_mail_result();
    if ($mail && !empty($mail['ok'])) {
        $detail = !empty($mail['method']) ? ' Method: '.$mail['method'].'.' : '';
        flash('success', $successText . $detail);
        return true;
    }

    $error = $mail['error'] ?? 'Unknown email error.';
    $message = ($fallbackText !== '' ? $fallbackText . ' ' : '') . 'Email was NOT sent. Error: ' . $error;
    flash('error', $message);
    return false;
}

function send_client_approval_email($conn, $user, $otp) {
    $subject = 'Vetrix Account Approved - Your One-Time OTP';
    $body = "Hello {$user['full_name']},

" .
            "Your Vetrix client account has been approved by the clinic admin.

" .
            "Your one-time OTP is: {$otp}

" .
            "This OTP can only be used once and will expire in 24 hours. Please enter this code on the account verification page to open your account.

" .
            "Thank you,
Vetrix Veterinary Clinic";
    return send_app_email($conn, $user['email'], $user['full_name'], $subject, $body, 'client_approval_otp');
}

function send_client_rejection_email($conn, $user) {
    $subject = 'Vetrix Account Verification Update';
    $body = "Hello {$user['full_name']},

" .
            "We are sorry, but your Vetrix client account verification request was rejected.
" .
            "Please contact the clinic or submit correct information if you believe this needs to be reviewed again.

" .
            "Thank you,
Vetrix Veterinary Clinic";
    return send_app_email($conn, $user['email'], $user['full_name'], $subject, $body, 'client_rejected');
}

function send_client_welcome_email($conn, $user) {
    $subject = 'Welcome to Vetrix!';
    $body = "Hello {$user['full_name']},

" .
            "Welcome to Vetrix Veterinary Clinic. Your client account is now successfully opened.

" .
            "You can now log in, add your pets, book appointments, view medical records, receive reminders, and access your pet QR code.

" .
            "Thank you for trusting Vetrix with your pet care needs.

" .
            "Best regards,
Vetrix Veterinary Clinic";
    return send_app_email($conn, $user['email'], $user['full_name'], $subject, $body, 'client_welcome');
}

function verify_client_otp($conn, $user_id, $otp) {
    $stmt = $conn->prepare("SELECT * FROM account_verification_tokens WHERE user_id=? AND purpose='account_activation' AND used_at IS NULL AND status='active' ORDER BY created_at DESC LIMIT 1");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $token = $stmt->get_result()->fetch_assoc();

    if (!$token) return ['ok' => false, 'message' => 'No active OTP was found. Please ask the admin to resend your OTP.'];
    if (strtotime($token['expires_at']) < time()) {
        $up = $conn->prepare("UPDATE account_verification_tokens SET status='expired' WHERE id=?");
        $up->bind_param("i", $token['id']);
        $up->execute();
        return ['ok' => false, 'message' => 'This OTP has expired. Please ask the admin to resend a new OTP.'];
    }
    if (!password_verify($otp, $token['token_hash'])) {
        return ['ok' => false, 'message' => 'Invalid OTP. Please check the code sent to your Gmail.'];
    }

    $now = date('Y-m-d H:i:s');
    $up = $conn->prepare("UPDATE account_verification_tokens SET used_at=?, status='used' WHERE id=?");
    $up->bind_param("si", $now, $token['id']);
    $up->execute();

    $upUser = $conn->prepare("UPDATE users SET otp_verified_at=?, status='approved' WHERE id=? AND role='client'");
    $upUser->bind_param("si", $now, $user_id);
    $upUser->execute();
    return ['ok' => true, 'message' => 'Your account has been verified. You may now log in.'];
}

function pet_age($birth_date) {
    if (!$birth_date) return 'Unknown';
    $dob = new DateTime($birth_date);
    $now = new DateTime();
    $diff = $now->diff($dob);
    return $diff->y . ' yr ' . $diff->m . ' mo';
}

function ensure_pos_product_schema($conn) {
    $hasPrice = $conn->query("SHOW COLUMNS FROM inventory_items LIKE 'sale_price'");
    if ($hasPrice && $hasPrice->num_rows === 0) {
        $conn->query("ALTER TABLE inventory_items ADD COLUMN sale_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER category");
    }
    $hasSku = $conn->query("SHOW COLUMNS FROM inventory_items LIKE 'sku'");
    if ($hasSku && $hasSku->num_rows === 0) {
        $conn->query("ALTER TABLE inventory_items ADD COLUMN sku VARCHAR(60) NULL AFTER id");
    }
    $hasUpdated = $conn->query("SHOW COLUMNS FROM inventory_items LIKE 'updated_at'");
    if ($hasUpdated && $hasUpdated->num_rows === 0) {
        $conn->query("ALTER TABLE inventory_items ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
    }
    $conn->query("CREATE TABLE IF NOT EXISTS pos_transaction_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id INT NOT NULL,
        item_id INT NULL,
        item_name VARCHAR(160) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        quantity INT NOT NULL DEFAULT 1,
        line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE SET NULL
    )");
}

?>
