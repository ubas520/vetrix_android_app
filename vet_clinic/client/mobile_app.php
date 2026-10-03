<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("client");

$uid = current_user_id();

$pets_stmt = $conn->prepare("SELECT * FROM pets WHERE owner_id=? AND verification_status='approved' ORDER BY name ASC");
$pets_stmt->bind_param("i", $uid);
$pets_stmt->execute();
$pets = $pets_stmt->get_result();

$apps_stmt = $conn->prepare("SELECT a.*, p.name pet_name FROM appointments a JOIN pets p ON a.pet_id=p.id WHERE a.owner_id=? ORDER BY a.created_at DESC LIMIT 6");
$apps_stmt->bind_param("i", $uid);
$apps_stmt->execute();
$appointments = $apps_stmt->get_result();

$records_stmt = $conn->prepare("SELECT mr.*, p.name pet_name FROM medical_records mr JOIN pets p ON mr.pet_id=p.id WHERE p.owner_id=? ORDER BY mr.visit_date DESC LIMIT 6");
$records_stmt->bind_param("i", $uid);
$records_stmt->execute();
$records = $records_stmt->get_result();

$qr_stmt = $conn->prepare("SELECT q.*, p.name pet_name FROM qr_tokens q JOIN pets p ON q.pet_id=p.id WHERE p.owner_id=? AND p.verification_status='approved' AND q.status='active' ORDER BY q.created_at DESC LIMIT 1");
$qr_stmt->bind_param("i", $uid);
$qr_stmt->execute();
$qr = $qr_stmt->get_result()->fetch_assoc();

$notif_stmt = $conn->prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 5");
$notif_stmt->bind_param("i", $uid);
$notif_stmt->execute();
$notifications = $notif_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$notification_count = count($notifications);

$next_stmt = $conn->prepare("SELECT a.*, p.name pet_name FROM appointments a JOIN pets p ON a.pet_id=p.id WHERE a.owner_id=? AND a.status IN ('pending','approved') ORDER BY a.requested_date ASC LIMIT 1");
$next_stmt->bind_param("i", $uid);
$next_stmt->execute();
$next_appt = $next_stmt->get_result()->fetch_assoc();

$title = "Mobile App Simulation";
include "../includes/header.php";
include "../includes/navbar.php";
?>
<div class="layout">
<?php include "../includes/client_sidebar.php"; ?>
<main class="content">
<section class="hero client-hero-banner hero-friendly mobile-hero no-hero-bubbles mb-4">
    <div>
        <h1>Mobile App Simulation</h1>
        <p>A simple phone-style version made for pet owners who are not techy. Big buttons, clear labels, and step-by-step actions.</p>
    </div>
</section>

<div class="mobile-sim-wrap upgraded-mobile-wrap">
    <div class="mobile-info-panel">
        <div class="soft-card guide-card">
            <div class="card-title-row"><h3>For non-techy users</h3><span>Simple Mode</span></div>
            <p class="text-muted">The app avoids confusing menus. The most important actions are visible immediately.</p>
            <div class="simple-feature-list">
                <div><span>📅</span><b>Book Visit</b><small>Request an appointment in one tap.</small></div>
                <div><span>🐾</span><b>My Pets</b><small>View pets with easy labels.</small></div>
                <div><span>📋</span><b>Records</b><small>See medical history clearly.</small></div>
                <div><span>▦</span><b>QR Code</b><small>Show during clinic retrieval.</small></div>
            </div>
        </div>
        <div class="soft-card guide-card">
            <div class="card-title-row"><h3>How the app works</h3><span>Client flow</span></div>
            <div class="simulation-flow big-flow">
                <div><b>1</b><span>Client checks dashboard and alerts</span></div>
                <div><b>2</b><span>Client books or views appointment status</span></div>
                <div><b>3</b><span>Admin updates the schedule</span></div>
                <div><b>4</b><span>Client receives notification</span></div>
            </div>
        </div>
        <div class="soft-card api-status-card">
            <h3>Live Data API Check</h3>
            <p class="text-muted">This checks if the phone preview can read your live client data.</p>
            <button class="btn btn-primary rounded-pill" type="button" onclick="loadMobileApiSummary()">Check live summary</button>
            <div id="mobileApiResult" class="api-result mt-3">Tap the button to test the API connection.</div>
        </div>
    </div>

    <div class="phone-frame upgraded-phone">
        <div class="phone-speaker"></div>
        <div class="phone-screen upgraded-screen">
            <div class="phone-statusbar"><span>9:41</span><span>●●● WiFi 🔋</span></div>
            <div class="app-top upgraded-app-top mobile-app-topbar">
                <div>
                    <small>Vetrix Mobile</small>
                    <h4>Hi, <?= e(explode(' ', $_SESSION['full_name'])[0] ?? 'Client') ?> 👋</h4>
                </div>
                <div class="mobile-top-actions">
                    <button type="button" class="mobile-bell" id="mobileBellBtn" onclick="toggleMobileNotifications(event)" aria-label="Open notifications">
                        <span class="mobile-bell-icon">🔔</span>
                        <?php if($notification_count > 0): ?>
                            <span class="mobile-bell-badge"><?= $notification_count ?></span>
                        <?php endif; ?>
                    </button>
                    <div class="app-avatar">🐾</div>
                </div>
            </div>
            <div class="mobile-notification-panel" id="mobileNotificationPanel">
                <div class="mobile-panel-head">
                    <div>
                        <small>Notifications</small>
                        <b>Recent alerts</b>
                    </div>
                    <button type="button" class="mobile-panel-close" onclick="toggleMobileNotifications(event, false)" aria-label="Close notifications">×</button>
                </div>
                <?php if($notification_count === 0): ?>
                    <div class="empty-mobile compact-empty">No notifications yet.</div>
                <?php else: ?>
                    <?php foreach($notifications as $n): ?>
                        <div class="mobile-list-item notification-item compact-notification-item">
                            <div class="mobile-icon">🔔</div>
                            <div><b><?= e($n['title']) ?></b><small><?= e($n['message']) ?></small></div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>

            <div class="mobile-view active" id="view-home">
                <div class="mobile-card gradient-card friendly-mobile-card">
                    <span>Today</span>
                    <h3>Your pet care is ready</h3>
                    <p>Check schedule, pets, records, and QR without confusion.</p>
                    <button type="button" onclick="switchMobileView('appointments', document.querySelector('[data-mobile-tab=appointments]'))">Book or Check Appointment</button>
                </div>
                <div class="mobile-stats upgraded-stats">
                    <div><b><?= $pets->num_rows ?></b><span>Pets</span></div>
                    <div><b><?= $appointments->num_rows ?></b><span>Visits</span></div>
                    <div><b><?= $notification_count ?></b><span>Alerts</span></div>
                </div>
                <?php if($next_appt): ?>
                    <div class="next-visit-card">
                        <small>Next important appointment</small>
                        <b><?=e($next_appt['pet_name'])?> · <?=e(ucfirst($next_appt['status']))?></b>
                        <span><?=e(date('M d, Y h:i A', strtotime($next_appt['scheduled_date'] ?: $next_appt['requested_date'])))?></span>
                    </div>
                <?php else: ?>
                    <div class="next-visit-card calm"><small>No upcoming appointment</small><b>Need a visit?</b><span>Tap Book below to request one.</span></div>
                <?php endif; ?>
                <div class="notification-summary-card download-mobile-card">
                    <div>
                        <small>Client App Download</small>
                        <b>Scan QR to download</b>
                        <span>This is a temporary QR while the real mobile app is not yet available.</span>
                    </div>
                    <button type="button" onclick="switchMobileView('download', document.querySelector('[data-mobile-tab=download]'))">Open QR</button>
                </div>
                <div class="notification-summary-card">
                    <div>
                        <small>Notifications</small>
                        <b><?= $notification_count ?> recent alert<?= $notification_count == 1 ? '' : 's' ?></b>
                        <span>Tap the bell above to view appointment updates, reminders, and alerts without crowding the screen.</span>
                    </div>
                    <button type="button" onclick="toggleMobileNotifications(event, true)">Open bell</button>
                </div>
            </div>

            <div class="mobile-view" id="view-pets">
                <div class="mobile-section-title"><h5>My Pets</h5><small>Tap a card in the real app to view full details.</small></div>
                <?php $pets->data_seek(0); if($pets->num_rows==0): ?>
                    <div class="empty-mobile">No pet profile found. Ask the clinic to register your pet.</div>
                <?php endif; ?>
                <?php while($p=$pets->fetch_assoc()): ?>
                    <div class="pet-mobile-card upgraded-pet-card">
                        <div class="pet-emoji"><?= strtolower($p['species'])==='cat' ? '🐱' : '🐶' ?></div>
                        <div>
                            <h4><?= e($p['name']) ?></h4>
                            <p><?= e($p['species'] ?: 'Pet') ?><?= $p['breed'] ? ' · '.e($p['breed']) : '' ?></p>
                            <small><?= e($p['sex'] ?: 'No sex saved') ?> · <?= e($p['weight'] ?: '0') ?> kg</small>
                            <?php if($p['critical_notes']): ?><em>Important: <?=e($p['critical_notes'])?></em><?php endif; ?>
                        </div>
                    </div>
                <?php endwhile; ?>
            </div>

            <div class="mobile-view" id="view-appointments">
                <div class="mobile-section-title"><h5>Appointments</h5><small>Clear status for every request.</small></div>
                <div class="mobile-action-card">
                    <b>Need to visit the clinic?</b>
                    <span>In the real app, this opens the appointment form.</span>
                    <a href="appointments.php">Open Booking Page</a>
                </div>
                <?php $appointments->data_seek(0); if($appointments->num_rows==0): ?>
                    <div class="empty-mobile">No appointment yet.</div>
                <?php endif; ?>
                <?php while($a=$appointments->fetch_assoc()): ?>
                    <div class="appointment-mobile-card upgraded-appt-card">
                        <div class="d-flex justify-content-between gap-2"><b><?= e($a['pet_name']) ?></b><?= badge($a['status']) ?></div>
                        <small><?= e(date('M d, Y h:i A', strtotime($a['scheduled_date'] ?: $a['requested_date']))) ?></small>
                        <p><?= e($a['reason']) ?></p>
                        <?php if($a['admin_notes']): ?><em>Clinic note: <?=e($a['admin_notes'])?></em><?php endif; ?>
                    </div>
                <?php endwhile; ?>
            </div>

            <div class="mobile-view" id="view-records">
                <div class="mobile-section-title"><h5>Medical Records</h5><small>Simple history view.</small></div>
                <?php if($records->num_rows==0): ?>
                    <div class="empty-mobile">No medical record yet.</div>
                <?php endif; ?>
                <?php while($r=$records->fetch_assoc()): ?>
                    <div class="mobile-list-item record-item upgraded-record-item">
                        <div class="mobile-icon">📋</div>
                        <div>
                            <b><?= e($r['pet_name']) ?></b>
                            <small><?= e(date('M d, Y', strtotime($r['visit_date']))) ?> · Dr./Vet: <?= e($r['veterinarian']) ?></small>
                            <span><?= e($r['diagnosis'] ?: 'No diagnosis saved') ?></span>
                        </div>
                    </div>
                <?php endwhile; ?>
            </div>

            <div class="mobile-view" id="view-qr">
                <div class="mobile-section-title"><h5>QR Pet Retrieval</h5><small>Show this at the clinic or during retrieval.</small></div>
                <?php if($qr): ?>
                    <div class="qr-phone-card upgraded-qr-card">
                        <div class="fake-qr">
                            <span></span><span></span><span></span><span></span>
                            <span></span><span></span><span></span><span></span>
                            <span></span><span></span><span></span><span></span>
                        </div>
                        <h4><?= e($qr['pet_name']) ?></h4>
                        <p><?= e($qr['token']) ?></p>
                        <small>Use this QR during emergency or clinic retrieval.</small>
                    </div>
                <?php else: ?>
                    <div class="empty-mobile">No active QR token found.</div>
                <?php endif; ?>
            </div>

            <div class="mobile-view" id="view-download">
                <div class="mobile-section-title"><h5>Download App</h5><small>Temporary scannable QR code.</small></div>
                <div class="qr-phone-card upgraded-qr-card app-download-phone-card">
                    <img class="phone-download-qr" src="<?= app_url('assets/images/client_app_download_qr.png') ?>" alt="Temporary QR code for downloading the mobile app">
                    <h4>Vetrix Client App</h4>
                    <p>vetrix-clinic.example.com/download-app</p>
                    <small>This is a mockup QR until the real app link is ready.</small>
                </div>
                <a class="mobile-primary-link" href="download_app.php">Open full download page</a>
            </div>

            <div class="mobile-view" id="view-ai">
                <div class="mobile-section-title"><h5>Vetrix Chatbot Preview</h5><small>Guidance only, not a replacement for a vet.</small></div>
                <div class="ai-mobile-chat" id="mobileAiChat">
                    <div class="ai-bubble bot">Hi! Tap a sample concern below. I will answer in simple words.</div>
                </div>
                <div class="ai-chip-row upgraded-ai-chips">
                    <button type="button" onclick="simulateMobileAI('My dog is vomiting')">Dog vomiting</button>
                    <button type="button" onclick="simulateMobileAI('My cat is sneezing')">Cat sneezing</button>
                    <button type="button" onclick="simulateMobileAI('Vaccine side effects')">Vaccine</button>
                </div>
            </div>
        </div>

        <div class="mobile-toast" id="mobileToast">Simulation action</div>

        <div class="phone-nav upgraded-phone-nav">
            <button class="active" data-mobile-tab="home" type="button" onclick="switchMobileView('home', this)">🏠<span>Home</span></button>
            <button data-mobile-tab="pets" type="button" onclick="switchMobileView('pets', this)">🐾<span>Pets</span></button>
            <button data-mobile-tab="appointments" type="button" onclick="switchMobileView('appointments', this)">📅<span>Book</span></button>
            <button data-mobile-tab="records" type="button" onclick="switchMobileView('records', this)">📋<span>Records</span></button>
            <button data-mobile-tab="qr" type="button" onclick="switchMobileView('qr', this)">▦<span>QR</span></button>
            <button data-mobile-tab="download" type="button" onclick="switchMobileView('download', this)">📱<span>App</span></button>
            <button data-mobile-tab="ai" type="button" onclick="switchMobileView('ai', this)">💬<span>Chat</span></button>
        </div>
    </div>
</div>
</main>
</div>
<?php include "../includes/footer.php"; ?>
