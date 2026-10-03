<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("client");

$uid = current_user_id();
$pets = (int) $conn->query("SELECT COUNT(*) c FROM pets WHERE owner_id=$uid AND verification_status='approved'")->fetch_assoc()['c'];
$apps = (int) $conn->query("SELECT COUNT(*) c FROM appointments WHERE owner_id=$uid")->fetch_assoc()['c'];
$notif = (int) $conn->query("SELECT COUNT(*) c FROM notifications WHERE user_id=$uid AND status='unread'")->fetch_assoc()['c'];
$records = (int) $conn->query("SELECT COUNT(*) c FROM medical_records mr JOIN pets p ON p.id = mr.pet_id WHERE p.owner_id=$uid")->fetch_assoc()['c'];

$petRows = $conn->query("SELECT id, name, species, breed, sex, birth_date, weight, verification_status FROM pets WHERE owner_id=$uid AND verification_status='approved' ORDER BY created_at DESC LIMIT 3");
$appointmentRows = $conn->query("SELECT a.*, p.name AS pet_name FROM appointments a JOIN pets p ON p.id = a.pet_id WHERE a.owner_id=$uid ORDER BY COALESCE(a.scheduled_date, a.requested_date) ASC LIMIT 4");
$notificationRows = $conn->query("SELECT title, message, type, status, created_at FROM notifications WHERE user_id=$uid ORDER BY created_at DESC LIMIT 4");

$title = "Client Dashboard";
include "../includes/header.php";
include "../includes/navbar.php";
?>
<div class="layout">
    <?php include "../includes/client_sidebar.php"; ?>
    <main class="content">
        <section class="hero client-hero-banner mb-4">
            <div class="dashboard-hero-grid">
                <div>
                    <h1>Welcome, <?= e($_SESSION['full_name']) ?></h1>
                    <p>Manage your pets, keep track of appointments, and stay updated with your latest clinic notifications.</p>
                </div>
                <div class="dashboard-hero-actions">
                    <a class="btn btn-light rounded-pill" href="pets.php">My Pets</a>
                    <a class="btn btn-light rounded-pill" href="appointments.php">Book Appointment</a>
                    <a class="btn btn-light rounded-pill" href="records.php">View Records</a>
                </div>
            </div>
        </section>

        <div class="dashboard-metric-grid mb-4">
            <div class="dashboard-metric-card">
                <div class="dashboard-metric-icon">🐾</div>
                <div><div class="dashboard-metric-label">My Pets</div><div class="dashboard-metric-value"><?= $pets ?></div></div>
            </div>
            <div class="dashboard-metric-card">
                <div class="dashboard-metric-icon">📅</div>
                <div><div class="dashboard-metric-label">Appointments</div><div class="dashboard-metric-value"><?= $apps ?></div></div>
            </div>
            <div class="dashboard-metric-card">
                <div class="dashboard-metric-icon">📋</div>
                <div><div class="dashboard-metric-label">Records</div><div class="dashboard-metric-value"><?= $records ?></div></div>
            </div>
            <div class="dashboard-metric-card">
                <div class="dashboard-metric-icon">🔔</div>
                <div><div class="dashboard-metric-label">Unread Alerts</div><div class="dashboard-metric-value"><?= $notif ?></div></div>
            </div>
        </div>


        <div class="soft-card client-download-banner client-app-ad mb-4" id="clientAppAd">
            <button class="client-app-ad-close" type="button" onclick="toggleClientAppAd(true)" aria-label="Minimize download app ad">×</button>
            <div class="client-download-copy">
                <span class="download-pill">📱 Client App</span>
                <h3>Download the mobile app</h3>
                <p>Scan the temporary QR code to open the app download page. The real download link can be replaced once the mobile app is ready.</p>
                <a class="btn btn-primary rounded-pill" href="download_app.php">Open QR Download</a>
            </div>
            <div class="client-download-qr-mini">
                <img src="<?= app_url('assets/images/client_app_download_qr.png') ?>" alt="Temporary app download QR code">
                <small>Scan me</small>
            </div>
        </div>

        <button class="client-app-ad-tab" id="clientAppAdTab" type="button" onclick="toggleClientAppAd(false)" aria-label="Open download app ad">
            <span>📱</span>
            <b>Download App</b>
        </button>

        <div class="row g-4 mb-4">
            <div class="col-lg-7">
                <div class="soft-card h-100">
                    <div class="section-head mb-3">
                        <div>
                            <h3>Upcoming Appointments</h3>
                            <p class="text-muted mb-0">Your latest appointment requests and schedules.</p>
                        </div>
                        <a class="btn btn-outline-primary btn-sm rounded-pill" href="appointments.php">View all</a>
                    </div>

                    <?php if ($appointmentRows && $appointmentRows->num_rows > 0): ?>
                        <div class="dashboard-stack">
                            <?php while ($a = $appointmentRows->fetch_assoc()): ?>
                                <div class="dashboard-list-card">
                                    <div>
                                        <strong><?= e($a['pet_name']) ?></strong>
                                        <div class="text-muted small"><?= e($a['reason']) ?></div>
                                    </div>
                                    <div class="dashboard-list-meta text-end">
                                        <div><?= e(date('M d, Y h:i A', strtotime($a['scheduled_date'] ?: $a['requested_date']))) ?></div>
                                        <div><?= badge($a['status']) ?></div>
                                    </div>
                                </div>
                            <?php endwhile; ?>
                        </div>
                    <?php else: ?>
                        <div class="empty-state">
                            <div class="empty-icon">📅</div>
                            <h3>No appointments yet</h3>
                            <p class="text-muted mb-3">You have no appointment requests at the moment.</p>
                            <a class="btn btn-primary rounded-pill" href="appointments.php">Request Appointment</a>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="col-lg-5">
                <div class="soft-card h-100">
                    <div class="section-head mb-3">
                        <div>
                            <h3>My Pets Overview</h3>
                            <p class="text-muted mb-0">A quick look at your registered pets.</p>
                        </div>
                        <a class="btn btn-outline-primary btn-sm rounded-pill" href="pets.php">Manage</a>
                    </div>

                    <?php if ($petRows && $petRows->num_rows > 0): ?>
                        <div class="dashboard-stack">
                            <?php while ($pet = $petRows->fetch_assoc()): ?>
                                <div class="dashboard-list-card pet-row-card">
                                    <div>
                                        <strong><?= e($pet['name']) ?></strong>
                                        <div class="text-muted small"><?= e($pet['species']) ?><?= $pet['breed'] ? ' · ' . e($pet['breed']) : '' ?></div>
                                    </div>
                                    <div class="dashboard-list-meta text-end">
                                        <div><?= e($pet['sex'] ?: '—') ?></div>
                                        <div class="text-muted small"><?= $pet['weight'] ? e(number_format((float)$pet['weight'], 2)) . ' kg' : 'No weight' ?></div>
                                    </div>
                                </div>
                            <?php endwhile; ?>
                        </div>
                    <?php else: ?>
                        <div class="empty-state">
                            <div class="empty-icon">🐾</div>
                            <h3>No pets added yet</h3>
                            <p class="text-muted mb-3">Start by adding your first pet profile.</p>
                            <a class="btn btn-primary rounded-pill" href="pets.php">Add My Pet</a>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="row g-4">
            <div class="col-lg-7">
                <div class="soft-card h-100">
                    <div class="section-head mb-3">
                        <div>
                            <h3>Recent Notifications</h3>
                            <p class="text-muted mb-0">Latest alerts from the clinic.</p>
                        </div>
                        <a class="btn btn-outline-primary btn-sm rounded-pill" href="notifications.php">Open</a>
                    </div>

                    <?php if ($notificationRows && $notificationRows->num_rows > 0): ?>
                        <div class="dashboard-stack">
                            <?php while ($n = $notificationRows->fetch_assoc()): ?>
                                <div class="dashboard-list-card notification-row-card <?= $n['status'] === 'unread' ? 'is-unread' : '' ?>">
                                    <div>
                                        <strong><?= e($n['title']) ?></strong>
                                        <div class="text-muted small"><?= e($n['message']) ?></div>
                                    </div>
                                    <div class="dashboard-list-meta text-end">
                                        <div><?= badge($n['type']) ?></div>
                                        <div class="text-muted small mt-1"><?= e(date('M d, Y', strtotime($n['created_at']))) ?></div>
                                    </div>
                                </div>
                            <?php endwhile; ?>
                        </div>
                    <?php else: ?>
                        <div class="empty-state">
                            <div class="empty-icon">🔔</div>
                            <h3>No notifications</h3>
                            <p class="text-muted mb-0">You are all caught up right now.</p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="col-lg-5">
                <div class="soft-card h-100">
                    <div class="section-head mb-3">
                        <div>
                            <h3>Quick Actions</h3>
                            <p class="text-muted mb-0">Easy shortcuts for the most used pages.</p>
                        </div>
                    </div>
                    <div class="quick-actions-grid">
                        <a class="quick-action-card" href="pets.php">
                            <span>🐾</span>
                            <b>Manage Pets</b>
                            <small>Add or update pet details</small>
                        </a>
                        <a class="quick-action-card" href="appointments.php">
                            <span>📅</span>
                            <b>Appointments</b>
                            <small>Request and check schedules</small>
                        </a>
                        <a class="quick-action-card" href="records.php">
                            <span>📄</span>
                            <b>Medical Records</b>
                            <small>View visit and treatment history</small>
                        </a>
                        <a class="quick-action-card" href="qr.php">
                            <span>🔳</span>
                            <b>QR Code</b>
                            <small>Open your pet QR code page</small>
                        </a>
                        <a class="quick-action-card" href="download_app.php">
                            <span>📱</span>
                            <b>Download App</b>
                            <small>Scan the mobile app QR code</small>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </main>
</div>

<script>
function toggleClientAppAd(minimize) {
    const ad = document.getElementById('clientAppAd');
    const tab = document.getElementById('clientAppAdTab');
    if (!ad || !tab) return;
    ad.classList.toggle('is-minimized', minimize);
    tab.classList.toggle('is-visible', minimize);
    try { localStorage.setItem('clientAppAdMinimized', minimize ? '1' : '0'); } catch (e) {}
}
document.addEventListener('DOMContentLoaded', function () {
    try {
        if (localStorage.getItem('clientAppAdMinimized') === '1') {
            toggleClientAppAd(true);
        }
    } catch (e) {}
});
</script>
<?php include "../includes/footer.php"; ?>
