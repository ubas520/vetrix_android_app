<?php
require_once "config/database.php";
require_once "includes/functions.php";

if (is_logged_in()) {
    redirect_to(dashboard_for_role($_SESSION['role']));
}

$error = "";
$success = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $full_name = trim($_POST["full_name"] ?? "");
    $email = trim($_POST["email"] ?? "");
    $phone = trim($_POST["phone"] ?? "");
    $address = trim($_POST["address"] ?? "");
    $password = $_POST["password"] ?? "";
    $confirm = $_POST["confirm_password"] ?? "";

    if ($full_name === "" || $email === "" || $password === "") {
        $error = "Please fill in all required fields.";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = "Please enter a valid email address.";
    } elseif (strlen($password) < 6) {
        $error = "Password must be at least 6 characters.";
    } elseif ($password !== $confirm) {
        $error = "Passwords do not match.";
    } else {
        $check = $conn->prepare("SELECT id FROM users WHERE email=? LIMIT 1");
        $check->bind_param("s", $email);
        $check->execute();

        if ($check->get_result()->fetch_assoc()) {
            $error = "This email is already registered.";
        } else {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $role = "client";
            $source = "self_registered";
            $created_by = null;
            $status = "pending";

            $stmt = $conn->prepare("INSERT INTO users(full_name,email,phone,address,password,role,account_source,created_by,status) VALUES(?,?,?,?,?,?,?,?,?)");
            $stmt->bind_param("sssssssis", $full_name, $email, $phone, $address, $hash, $role, $source, $created_by, $status);
            $stmt->execute();

            $new_user_id = $conn->insert_id;
            log_action($conn, "Client self-registered", "user", $new_user_id, "New client account created through public registration.");

            log_action($conn, "Client verification request submitted", "user", $new_user_id, "Account is waiting for admin approval.");
            $success = "Your client account was submitted for admin approval. After approval, the clinic will send a one-time OTP to your Gmail. You can only open the account after entering that OTP.";
        }
    }
}

$title = "Register - Vetrix";
include "includes/header.php";
?>

<div class="vetrix-login-page">
    <div class="login-orb orb-one"></div>
    <div class="login-orb orb-two"></div>
    <div class="login-orb orb-three"></div>

    <section class="vetrix-showcase">
        <div class="showcase-badge">🐾 Pet Owner Registration</div>
        <h1>Join Vetrix</h1>
        <p>Create your client account, register your pets, request appointments, view clinic records, and use chatbot guidance.</p>

        <div class="dog-stage compact-dog-stage" id="dogStage">
            <div class="rub-hint" id="rubHint">Rub near the puppy 🐶</div>
            <div class="dog-shadow"></div>
            <div class="dog" id="dog">
                <div class="dog-tail"></div>
                <div class="dog-body"><div class="dog-spot"></div><div class="dog-leg leg-one"></div><div class="dog-leg leg-two"></div></div>
                <div class="dog-head" id="dogHead">
                    <div class="dog-ear ear-left"></div><div class="dog-ear ear-right"></div>
                    <div class="dog-face"><div class="dog-eye eye-left"></div><div class="dog-eye eye-right"></div><div class="dog-snout"><div class="dog-nose"></div><div class="dog-mouth"></div></div></div>
                </div>
                <div class="dog-heart heart-one">❤</div><div class="dog-heart heart-two">❤</div><div class="dog-heart heart-three">❤</div>
            </div>
        </div>
    </section>

    <section class="vetrix-login-panel">
        <div class="login-card-pro">
            <div class="mobile-logo">🐾</div>
            <h2>Create account</h2>
            <p class="text-muted">Client accounts can be created by owners or by clinic staff for walk-ins.</p>

            <?php if ($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?>
            <?php if ($success): ?><div class="alert alert-success"><?= e($success) ?></div><?php endif; ?>

            <form method="POST">
                <label class="login-label">Full Name</label>
                <input class="form-control form-control-lg login-input" name="full_name" required value="<?= e($_POST['full_name'] ?? '') ?>">

                <label class="login-label">Email</label>
                <input class="form-control form-control-lg login-input" name="email" type="email" required value="<?= e($_POST['email'] ?? '') ?>">

                <label class="login-label">Phone</label>
                <input class="form-control form-control-lg login-input" name="phone" value="<?= e($_POST['phone'] ?? '') ?>">

                <label class="login-label">Address</label>
                <input class="form-control form-control-lg login-input" name="address" value="<?= e($_POST['address'] ?? '') ?>">

                <label class="login-label">Password</label>
                <input class="form-control form-control-lg login-input" name="password" type="password" required>

                <label class="login-label">Confirm Password</label>
                <input class="form-control form-control-lg login-input" name="confirm_password" type="password" required>

                <button class="btn btn-primary btn-lg w-100 rounded-pill login-btn">Create Client Account</button>
            </form>

            <div class="text-center mt-3 small">
                Already have an account?
                <a href="login.php" style="font-weight:800;color:#2563eb;text-decoration:none">Login</a>
            </div>
        </div>
    </section>
</div>

<script>
const dogStage = document.getElementById("dogStage");
const dog = document.getElementById("dog");
const dogHead = document.getElementById("dogHead");
const rubHint = document.getElementById("rubHint");
let lastMove = 0, rubScore = 0, idleTimer = null;
function setDogMood(mood){dog.classList.remove("is-happy","is-excited","is-idle");dog.classList.add(mood);}
dogStage.addEventListener("mousemove",(event)=>{
    const rect=dogStage.getBoundingClientRect();
    const x=event.clientX-rect.left, y=event.clientY-rect.top;
    const dx=(x-rect.width/2)/(rect.width/2), dy=(y-rect.height/2)/(rect.height/2);
    dogHead.style.transform=`rotate(${dx*8}deg) translate(${dx*8}px, ${dy*4}px)`;
    const nearDog=Math.abs(dx)<.65&&Math.abs(dy)<.65;
    if(nearDog){rubScore++;rubHint.textContent="Aww, puppy likes it!";setDogMood(rubScore>15?"is-excited":"is-happy");}
    else{rubHint.textContent="Move closer to rub the puppy 🐶";setDogMood("is-idle");}
    clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>{rubScore=Math.max(0,rubScore-4);dogHead.style.transform="rotate(0deg)";rubHint.textContent="Rub near the puppy 🐶";setDogMood("is-idle");},650);
});
dogStage.addEventListener("mouseleave",()=>{dogHead.style.transform="rotate(0deg)";rubHint.textContent="Rub near the puppy 🐶";setDogMood("is-idle");});
dogStage.addEventListener("click",()=>{dog.classList.add("dog-jump");setDogMood("is-excited");setTimeout(()=>dog.classList.remove("dog-jump"),500);});
</script>

<?php include "includes/footer.php"; ?>
