<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("veterinarian");

$title = "Veterinarian Dashboard";
include "../includes/header.php";
include "../includes/navbar.php";

$uid = (int)current_user_id();
$records = (int)$conn->query("SELECT COUNT(*) c FROM medical_records")->fetch_assoc()['c'];
$vaccines = (int)$conn->query("SELECT COUNT(*) c FROM vaccinations")->fetch_assoc()['c'];
$pets = (int)$conn->query("SELECT COUNT(*) c FROM pets WHERE verification_status='approved'")->fetch_assoc()['c'];
$activeAppointments = (int)$conn->query("SELECT COUNT(*) c FROM appointments WHERE (assigned_vet_id=$uid OR assigned_vet_id IS NULL) AND status IN ('approved','pending')")->fetch_assoc()['c'];
$approvedToday = (int)$conn->query("SELECT COUNT(*) c FROM appointments WHERE (assigned_vet_id=$uid OR assigned_vet_id IS NULL) AND status='approved' AND DATE(COALESCE(scheduled_date, requested_date))=CURDATE()")->fetch_assoc()['c'];
$pendingAppointments = (int)$conn->query("SELECT COUNT(*) c FROM appointments WHERE (assigned_vet_id=$uid OR assigned_vet_id IS NULL) AND status='pending'")->fetch_assoc()['c'];
$dueSoon = (int)$conn->query("SELECT COUNT(*) c FROM vaccinations WHERE next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)")->fetch_assoc()['c'];
$criticalPets = (int)$conn->query("SELECT COUNT(*) c FROM pets WHERE verification_status='approved' AND TRIM(COALESCE(critical_notes,''))<>'' AND LOWER(TRIM(critical_notes))<>'none'")->fetch_assoc()['c'];

$careQueue = [
    ['Today', $approvedToday, 'Approved appointments scheduled or requested today.', 'vet/appointments.php?status=approved', 'ok'],
    ['Pending', $pendingAppointments, 'Appointments waiting for admin approval or schedule confirmation.', 'vet/appointments.php?status=pending', 'warn'],
    ['Due soon', $dueSoon, 'Vaccination follow-ups due within the next 14 days.', 'vet/vaccinations.php', 'ai'],
    ['Critical notes', $criticalPets, 'Approved pets with allergies or critical health reminders.', 'vet/health_monitoring.php', 'bad'],
];

$recentAppointments = $conn->query("SELECT a.*, u.full_name owner_name, p.name pet_name, p.species
    FROM appointments a
    JOIN users u ON a.owner_id=u.id
    JOIN pets p ON a.pet_id=p.id
    WHERE (a.assigned_vet_id=$uid OR a.assigned_vet_id IS NULL)
      AND a.status IN ('approved','pending','completed')
    ORDER BY FIELD(a.status,'approved','pending','completed'), COALESCE(a.scheduled_date,a.requested_date) ASC
    LIMIT 7");

$recentRecords = $conn->query("SELECT m.*, p.name pet_name
    FROM medical_records m
    JOIN pets p ON m.pet_id=p.id
    ORDER BY m.visit_date DESC, m.id DESC
    LIMIT 5");

$dueVaccines = $conn->query("SELECT v.*, p.name pet_name
    FROM vaccinations v
    JOIN pets p ON v.pet_id=p.id
    WHERE v.next_due_date IS NOT NULL
    ORDER BY v.next_due_date ASC
    LIMIT 5");

$statusClass = function ($status) {
    $status = strtolower((string)$status);
    if (in_array($status, ['approved', 'active', 'completed'], true)) return 'ok';
    if (in_array($status, ['pending', 'due soon'], true)) return 'warn';
    if (in_array($status, ['scheduled'], true)) return 'ai';
    if (in_array($status, ['cancelled', 'rejected', 'overdue'], true)) return 'bad';
    return 'neutral';
};
?>

<div class="layout ai-admin-shell">
    <?php include "../includes/vet_sidebar.php"; ?>

    <main class="content ai-main">
        <header class="ai-top">
            <div>
                <span class="ai-eyebrow">Clinical Care</span>
                <h1>Veterinarian Dashboard</h1>
                <p>Track assigned appointments, patient records, vaccination follow-ups, and pet health reminders from one clean workspace.</p>
            </div>
            <div class="ai-top-actions">
                <a href="<?= app_url('vet/appointments.php?status=approved') ?>">Review Appointments</a>
                <a class="ai-primary-action" href="<?= app_url('vet/records.php') ?>">Add Record</a>
            </div>
        </header>

        <section class="ai-kpis" aria-label="Veterinarian KPIs">
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Appointments</span><b>Active</b></div>
                <strong><?= $activeAppointments ?></strong>
                <p>Approved or pending appointments available for vet review.</p>
            </article>
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Patients</span><b>Approved</b></div>
                <strong><?= $pets ?></strong>
                <p>Verified pet profiles available for care workflows.</p>
            </article>
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Records</span><b>Medical</b></div>
                <strong><?= $records ?></strong>
                <p>Saved diagnoses, treatments, prescriptions, and notes.</p>
            </article>
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Vaccines</span><b>Due soon</b></div>
                <strong><?= $dueSoon ?></strong>
                <p>Vaccination follow-ups due within the next 14 days.</p>
            </article>
        </section>

        <section class="ai-grid">
            <article class="ai-insights">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">Needs Action</span>
                        <h2>Vet Workflow Queue</h2>
                    </div>
                    <span class="ai-live-dot">Real counts</span>
                </div>
                <div class="ai-insight-list">
                    <?php foreach ($careQueue as $item): ?>
                        <a class="ai-insight-row admin-action-queue-row" href="<?= app_url($item[3]) ?>">
                            <span class="ai-status <?= e($item[4]) ?>"><?= e($item[0]) ?></span>
                            <b><?= (int)$item[1] ?></b>
                            <p><?= e($item[2]) ?></p>
                        </a>
                    <?php endforeach; ?>
                </div>
            </article>

            <article class="ai-card">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">Quick Panel</span>
                        <h2>Quick Actions</h2>
                    </div>
                </div>
                <p class="ai-card-note">Common veterinarian workflows.</p>
                <div class="vet-quick-actions">
                    <a href="<?= app_url('vet/records.php') ?>">
                        <span class="ai-status ai">REC</span>
                        <b>Diagnosis and Treatment</b>
                        <p>Add medical records, treatment, prescriptions, and notes.</p>
                    </a>
                    <a href="<?= app_url('vet/vaccinations.php') ?>">
                        <span class="ai-status warn">DUE</span>
                        <b>Vaccination Records</b>
                        <p>Track vaccine dates and next due schedules.</p>
                    </a>
                    <a href="<?= app_url('vet/health_monitoring.php') ?>">
                        <span class="ai-status ok">PET</span>
                        <b>Pet Health Monitoring</b>
                        <p>Review allergies, critical notes, and care reminders.</p>
                    </a>
                </div>
            </article>
        </section>

        <section class="ai-workspace">
            <div class="ai-tabs" role="tablist" aria-label="Veterinarian workspace views">
                <button class="active" type="button" data-ai-tab="appointments">Appointments</button>
                <button type="button" data-ai-tab="records">Records</button>
                <button type="button" data-ai-tab="vaccines">Vaccines</button>
                <button type="button" data-ai-tab="monitoring">Monitoring</button>
            </div>

            <div class="ai-tab-panel active" id="ai-tab-appointments">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">Care Queue</span>
                        <h2>Recent Appointments</h2>
                    </div>
                    <a class="ai-text-link" href="<?= app_url('vet/appointments.php') ?>">View all</a>
                </div>
                <div class="ai-table-wrap">
                    <table class="ai-table">
                        <thead>
                            <tr>
                                <th>Owner</th>
                                <th>Patient</th>
                                <th>Species</th>
                                <th>Schedule</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if ($recentAppointments && $recentAppointments->num_rows > 0): ?>
                                <?php while ($a = $recentAppointments->fetch_assoc()): ?>
                                    <tr>
                                        <td><?= e($a['owner_name']) ?></td>
                                        <td><b><?= e($a['pet_name']) ?></b></td>
                                        <td><?= e($a['species'] ?: 'Unknown') ?></td>
                                        <td><?= e(date('M d, Y h:i A', strtotime($a['scheduled_date'] ?: $a['requested_date']))) ?></td>
                                        <td><span class="ai-status <?= e($statusClass($a['status'])) ?>"><?= e(ucfirst($a['status'])) ?></span></td>
                                    </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr><td colspan="5">No assigned appointments yet.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="ai-tab-panel" id="ai-tab-records">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">Clinical Notes</span>
                        <h2>Recent Medical Records</h2>
                    </div>
                    <a class="ai-text-link" href="<?= app_url('vet/records.php') ?>">Open records</a>
                </div>
                <div class="admin-card-list">
                    <?php if ($recentRecords && $recentRecords->num_rows > 0): ?>
                        <?php while ($r = $recentRecords->fetch_assoc()): ?>
                            <article class="admin-review-card">
                                <div class="admin-review-main">
                                    <div class="admin-row-title"><h3><?= e($r['pet_name']) ?></h3><span><?= e($r['visit_date'] ?: 'No date') ?></span></div>
                                    <p><?= e($r['diagnosis'] ?: 'No diagnosis saved.') ?></p>
                                </div>
                            </article>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <div class="admin-empty-state"><h3>No records yet</h3><p>Medical records will appear here after saving.</p></div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="ai-tab-panel" id="ai-tab-vaccines">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">Follow-ups</span>
                        <h2>Vaccination Schedule</h2>
                    </div>
                    <a class="ai-text-link" href="<?= app_url('vet/vaccinations.php') ?>">Open vaccinations</a>
                </div>
                <div class="admin-card-list">
                    <?php if ($dueVaccines && $dueVaccines->num_rows > 0): ?>
                        <?php while ($v = $dueVaccines->fetch_assoc()): ?>
                            <article class="admin-review-card">
                                <div class="admin-review-main">
                                    <div class="admin-row-title"><h3><?= e($v['vaccine_name']) ?></h3><span><?= e($v['next_due_date'] ?: 'No due date') ?></span></div>
                                    <p>Pet: <?= e($v['pet_name']) ?></p>
                                </div>
                            </article>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <div class="admin-empty-state"><h3>No vaccine schedules</h3><p>Vaccination follow-ups will appear here.</p></div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="ai-tab-panel" id="ai-tab-monitoring">
                <div class="ai-placeholder">
                    <h2>Pet Health Monitoring</h2>
                    <p><?= $criticalPets ?> approved pet(s) have critical notes or allergies that need careful review before consultation.</p>
                    <a href="<?= app_url('vet/health_monitoring.php') ?>">Open Monitoring</a>
                </div>
            </div>
        </section>
    </main>
</div>

<script>
document.querySelectorAll('[data-ai-tab]').forEach((button) => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-ai-tab]').forEach((btn) => btn.classList.remove('active'));
        document.querySelectorAll('.ai-tab-panel').forEach((panel) => panel.classList.remove('active'));
        button.classList.add('active');
        const panel = document.getElementById('ai-tab-' + button.dataset.aiTab);
        if (panel) panel.classList.add('active');
    });
});
</script>
<?php include "../includes/footer.php"; ?>
