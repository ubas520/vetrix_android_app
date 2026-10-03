<?php
require_once "config/database.php";
require_once "includes/functions.php";
require_once "includes/pet_qr.php";

if (is_logged_in()) {
    redirect_to(pet_qr_login_destination($_SESSION['role']));
}

$error = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $email = trim($_POST["email"] ?? "");
    $password = $_POST["password"] ?? "";

    $stmt = $conn->prepare("SELECT id, full_name, email, password, role, status, otp_verified_at FROM users WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    $valid = false;
    if ($user && password_verify($password, $user['password'])) {
        $valid = true;
    }

    if ($user && check_seed_password($email, $password)) {
        $valid = true;
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        $up = $conn->prepare("UPDATE users SET password=? WHERE id=?");
        $up->bind_param("si", $newHash, $user['id']);
        $up->execute();
    }

    if ($user && $valid) {
        if ($user['role'] === 'client') {
            if ($user['status'] === 'pending') {
                $error = "Your account is still pending admin approval.";
            } elseif ($user['status'] === 'rejected') {
                $error = "Your account verification was rejected. Please contact the clinic for assistance.";
            } elseif ($user['status'] === 'approved' && empty($user['otp_verified_at'])) {
                $_SESSION['pending_client_verify_id'] = $user['id'];
                redirect_to('verify_account.php');
            } elseif ($user['status'] === 'approved' && !empty($user['otp_verified_at'])) {
                $_SESSION["user_id"] = $user["id"];
                $_SESSION["full_name"] = $user["full_name"];
                $_SESSION["email"] = $user["email"];
                $_SESSION["role"] = $user["role"];
                redirect_to(pet_qr_login_destination($user["role"]));
            } else {
                $error = "Your client account is not ready for login.";
            }
        } elseif (in_array($user['status'], ['active','approved'], true)) {
            $_SESSION["user_id"] = $user["id"];
            $_SESSION["full_name"] = $user["full_name"];
            $_SESSION["email"] = $user["email"];
            $_SESSION["role"] = $user["role"];
            redirect_to(pet_qr_login_destination($user["role"]));
        } else {
            $error = "Your account is not active. Please contact the administrator.";
        }
    } else {
        $error = "Invalid email or password. Make sure your account is approved and database.sql is imported into database named vet_clinic.";
    }
}

$title = "Login - Vetrix";
include "includes/header.php";
?>

<div class="vetrix-login-page">
    <div class="login-orb orb-one"></div>
    <div class="login-orb orb-two"></div>
    <div class="login-orb orb-three"></div>

    <section class="vetrix-showcase">
        <div class="showcase-badge">🐾 Smart Veterinary Platform</div>
        <h1>Vetrix</h1>
        <p>
            A modern clinic dashboard for pets, records, appointments, QR access,
            reports, analytics, and research-backed pet guidance.
        </p>

        <div class="dog-stage" id="dogStage" aria-label="Interactive dog animation">
            <div class="rub-hint" id="rubHint">Rub near the puppy 🐶</div>

            <div class="dog-shadow"></div>

            <div class="dog" id="dog">
                <div class="dog-tail"></div>
                <div class="dog-body">
                    <div class="dog-spot"></div>
                    <div class="dog-leg leg-one"></div>
                    <div class="dog-leg leg-two"></div>
                </div>
                <div class="dog-head" id="dogHead">
                    <div class="dog-ear ear-left"></div>
                    <div class="dog-ear ear-right"></div>
                    <div class="dog-face">
                        <div class="dog-eye eye-left"></div>
                        <div class="dog-eye eye-right"></div>
                        <div class="dog-snout">
                            <div class="dog-nose"></div>
                            <div class="dog-mouth"></div>
                        </div>
                    </div>
                </div>
                <div class="dog-heart heart-one">❤</div>
                <div class="dog-heart heart-two">❤</div>
                <div class="dog-heart heart-three">❤</div>
            </div>
        </div>

        <div class="showcase-features">
            <div>📊 Analytics</div>
            <div>💬 Chatbot</div>
            <div>🧾 PDF Reports</div>
            <div>🔐 Role Access</div>
        </div>
    </section>

    <section class="vetrix-login-panel">
        <div class="login-card-pro">
            <div class="mobile-logo">🐾</div>
            <h2>Welcome back</h2>
            <p class="text-muted">Sign in to continue to Vetrix.</p>

            <?php if ($error): ?>
                <div class="alert alert-danger"><?= e($error) ?></div>
            <?php endif; ?>

            <form method="POST">
                <label class="login-label">Email</label>
                <input class="form-control form-control-lg login-input" name="email" type="email" required value="<?= e($_POST['email'] ?? 'admin@vetclinic.test') ?>">

                <label class="login-label">Password</label>
                <input class="form-control form-control-lg login-input" name="password" type="password" required value="password123">

                <button class="btn btn-primary btn-lg w-100 rounded-pill login-btn">Login to Dashboard</button>
            </form>

            <div class="text-center mt-3 small">
                New pet owner?
                <a href="register.php" style="font-weight:800;color:#2563eb;text-decoration:none">Create a client account</a>
            </div>

            <div class="login-demo-box">
                <strong>Demo Accounts</strong>
                <div><span>Admin</span><code>admin@vetclinic.test</code></div>
                <div><span>Veterinarian</span><code>vet@vetclinic.test</code></div>
                <div><span>Staff</span><code>staff@vetclinic.test</code></div>
                <div><span>Client</span><code>client@vetclinic.test</code></div>
                <div><span>Password</span><code>password123</code></div>
            </div>
        </div>
    </section>
</div>

<script>
const dogStage = document.getElementById("dogStage");
const dog = document.getElementById("dog");
const dogHead = document.getElementById("dogHead");
const rubHint = document.getElementById("rubHint");

let lastMove = 0;
let rubScore = 0;
let idleTimer = null;

function setDogMood(mood) {
    dog.classList.remove("is-happy", "is-excited", "is-idle");
    dog.classList.add(mood);
}

dogStage.addEventListener("mousemove", (event) => {
    const rect = dogStage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const dx = (x - centerX) / centerX;
    const dy = (y - centerY) / centerY;

    dogHead.style.transform = `rotate(${dx * 8}deg) translate(${dx * 8}px, ${dy * 4}px)`;

    const now = Date.now();
    const speed = now - lastMove;
    lastMove = now;

    const nearDog = Math.abs(dx) < 0.65 && Math.abs(dy) < 0.65;

    if (nearDog) {
        rubScore++;
        rubHint.textContent = "Aww, puppy likes it!";
        setDogMood(rubScore > 15 ? "is-excited" : "is-happy");
    } else {
        rubHint.textContent = "Move closer to rub the puppy 🐶";
        setDogMood("is-idle");
    }

    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        rubScore = Math.max(0, rubScore - 4);
        dogHead.style.transform = "rotate(0deg)";
        rubHint.textContent = "Rub near the puppy 🐶";
        setDogMood("is-idle");
    }, 650);
});

dogStage.addEventListener("mouseleave", () => {
    dogHead.style.transform = "rotate(0deg)";
    rubHint.textContent = "Rub near the puppy 🐶";
    setDogMood("is-idle");
});

dogStage.addEventListener("click", () => {
    dog.classList.add("dog-jump");
    setDogMood("is-excited");
    setTimeout(() => dog.classList.remove("dog-jump"), 500);
});
</script>

<?php include "includes/footer.php"; ?>
