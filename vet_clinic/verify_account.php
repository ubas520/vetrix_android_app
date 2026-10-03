<?php
require_once "config/database.php";
require_once "includes/functions.php";

if (is_logged_in()) {
    redirect_to(dashboard_for_role($_SESSION['role']));
}

$user_id = $_SESSION['pending_client_verify_id'] ?? null;
if (!$user_id) {
    redirect_to('login.php');
}

$stmt = $conn->prepare("SELECT id, full_name, email, role, status, otp_verified_at FROM users WHERE id=? AND role='client' LIMIT 1");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user) {
    unset($_SESSION['pending_client_verify_id']);
    redirect_to('login.php');
}

$error = "";
$success = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $otp = trim($_POST['otp'] ?? '');
    if ($otp === '') {
        $error = 'Please enter the OTP sent to your Gmail.';
    } else {
        $result = verify_client_otp($conn, $user['id'], $otp);
        if ($result['ok']) {
            $success = $result['message'];
            log_action($conn, 'Client used account OTP', 'user', $user['id'], 'Client account OTP verified and marked as used.');
            notify_user($conn, $user['id'], 'Welcome to Vetrix', 'Your client account is now verified and ready to use.', 'system');
            send_client_welcome_email($conn, $user);
            unset($_SESSION['pending_client_verify_id']);
        } else {
            $error = $result['message'];
        }
    }
}

$title = "Verify Account - Vetrix";
include "includes/header.php";
?>
<div class="vetrix-login-page">
    <div class="login-orb orb-one"></div>
    <div class="login-orb orb-two"></div>
    <section class="vetrix-showcase">
        <div class="showcase-badge">🔐 Account Verification</div>
        <h1>Enter your OTP</h1>
        <p>Your account was approved by the clinic admin. Enter the one-time OTP sent to your Gmail to open your client account.</p>
        <div class="showcase-features">
            <div>✅ Admin Approved</div>
            <div>📧 Gmail OTP</div>
            <div>🔒 One-Time Use</div>
        </div>
    </section>
    <section class="vetrix-login-panel">
        <div class="login-card-pro">
            <div class="mobile-logo">🔐</div>
            <h2>Verify Account</h2>
            <p class="text-muted">OTP was sent to <strong><?= e($user['email']) ?></strong>.</p>
            <?php if ($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?>
            <?php if ($success): ?>
                <div class="alert alert-success"><?= e($success) ?></div>
                <a class="btn btn-primary btn-lg w-100 rounded-pill login-btn" href="login.php">Continue to Login</a>
            <?php else: ?>
                <form method="POST">
                    <label class="login-label">One-Time OTP</label>
                    <input class="form-control form-control-lg login-input text-center" name="otp" maxlength="6" inputmode="numeric" pattern="[0-9]{6}" placeholder="Enter 6-digit OTP" required>
                    <button class="btn btn-primary btn-lg w-100 rounded-pill login-btn">Verify and Open Account</button>
                </form>
            <?php endif; ?>
            <div class="text-center mt-3 small"><a href="login.php" style="font-weight:800;color:#2563eb;text-decoration:none">Back to Login</a></div>
        </div>
    </section>
</div>
<?php include "includes/footer.php"; ?>
