<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

$title = "Admin Dashboard";
include "../includes/header.php";
include "../includes/navbar.php";

$todayAppointments = (int) $conn->query("SELECT COUNT(*) c FROM appointments WHERE DATE(COALESCE(scheduled_date, requested_date)) = CURDATE()")->fetch_assoc()['c'];
$pendingAppointments = (int) $conn->query("SELECT COUNT(*) c FROM appointments WHERE status='pending'")->fetch_assoc()['c'];
$pendingPets = (int) $conn->query("SELECT COUNT(*) c FROM pets WHERE verification_status='pending'")->fetch_assoc()['c'];
$pendingUsers = (int) $conn->query("SELECT COUNT(*) c FROM users WHERE status='pending'")->fetch_assoc()['c'];
$pendingEditRequests = (int) $conn->query("SELECT COUNT(*) c FROM edit_requests WHERE status='pending'")->fetch_assoc()['c'];
$lowStock = (int) $conn->query("SELECT COUNT(*) c FROM inventory_items WHERE status IN ('low_stock','out_of_stock')")->fetch_assoc()['c'];
$dueSoon = (int) $conn->query("SELECT COUNT(*) c FROM vaccinations WHERE next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)")->fetch_assoc()['c'];

$revenue = 0;
$revenueResult = $conn->query("SELECT COALESCE(SUM(total_amount),0) c FROM pos_transactions WHERE DATE(transaction_date) = CURDATE()");
if ($revenueResult) {
    $revenue = (float) $revenueResult->fetch_assoc()['c'];
}

$recentAppointments = $conn->query("SELECT a.*, u.full_name, p.name pet_name, p.species
    FROM appointments a
    JOIN users u ON a.owner_id=u.id
    JOIN pets p ON a.pet_id=p.id
    ORDER BY FIELD(a.status,'pending','approved','completed','cancelled'), a.created_at DESC
    LIMIT 7");
$recentLogs = $conn->query("SELECT l.*, u.full_name
    FROM audit_logs l
    LEFT JOIN users u ON l.actor_user_id=u.id
    ORDER BY l.created_at DESC
    LIMIT 6");
$topDiagnosis = $conn->query("SELECT COALESCE(NULLIF(TRIM(diagnosis), ''), 'Unspecified') diagnosis, COUNT(*) c
    FROM medical_records
    WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY COALESCE(NULLIF(TRIM(diagnosis), ''), 'Unspecified')
    ORDER BY c DESC
    LIMIT 4");

$statusClass = function ($status) {
    $status = strtolower((string) $status);
    if (in_array($status, ['approved', 'active', 'checked-in'], true)) return 'ok';
    if (in_array($status, ['pending', 'in_person_confirmation'], true)) return 'warn';
    if (in_array($status, ['completed'], true)) return 'ai';
    if (in_array($status, ['cancelled', 'rejected', 'low_stock', 'out_of_stock'], true)) return 'bad';
    return 'neutral';
};

$actionQueue = [
    ['Pending appointments', $pendingAppointments, 'Need schedule approval or veterinarian routing.', 'admin/appointments.php?status=pending', 'warn'],
    ['Pet verification', $pendingPets, 'Client pet profiles waiting for review.', 'admin/pets.php?verification=pending', 'warn'],
    ['Pet edit requests', $pendingEditRequests, 'Owner-requested profile edits to approve or reject.', 'admin/pet_edit_requests.php', 'neutral'],
    ['Low stock', $lowStock, 'Inventory items at or below reorder level.', 'admin/inventory.php', 'bad'],
    ['Due vaccinations', $dueSoon, 'Vaccines due within the next 60 days.', 'admin/vaccinations.php', 'ai'],
    ['Pending users', $pendingUsers, 'Accounts waiting for admin decision.', 'admin/users.php?filter=pending', 'neutral'],
];
?>

<div class="layout ai-admin-shell">
    <?php include "../includes/admin_sidebar.php"; ?>

    <main class="content ai-main">
        <header class="ai-top">
            <div>
                <span class="ai-eyebrow">Clinic Operations</span>
                <h1>Admin Dashboard</h1>
                <p>Track today's schedule, pending approvals, client records, inventory, and clinic revenue from one clean workspace.</p>
            </div>
            <div class="ai-top-actions">
                <a href="<?= app_url('admin/appointments.php?status=pending') ?>">Review Pending</a>
                <a class="ai-primary-action" href="<?= app_url('admin/chatbot.php') ?>">Ask Vetrix AI</a>
            </div>
        </header>

        <section class="ai-kpis" aria-label="Clinic KPIs">
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Appointments</span><b>Today</b></div>
                <strong><?= $todayAppointments ?></strong>
                <p>Total appointments scheduled or requested today.</p>
            </article>
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Appointments</span><b>Pending</b></div>
                <strong><?= $pendingAppointments ?></strong>
                <p>Requests waiting for admin confirmation.</p>
            </article>
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Vaccinations</span><b>Due soon</b></div>
                <strong><?= $dueSoon ?></strong>
                <p>Follow-ups due within the next 60 days.</p>
            </article>
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Revenue</span><b>Today</b></div>
                <strong>&#8369;<?= number_format($revenue, 0) ?></strong>
                <p>Paid POS transactions recorded today.</p>
            </article>
        </section>

        <section class="ai-grid">
            <article class="ai-insights">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">Needs Action</span>
                        <h2>Admin Workflow Queue</h2>
                    </div>
                    <span class="ai-live-dot">Real counts</span>
                </div>
                <div class="ai-insight-list">
                    <?php foreach ($actionQueue as $item): ?>
                        <a class="ai-insight-row admin-action-queue-row" href="<?= app_url($item[3]) ?>">
                            <span class="ai-status <?= e($item[4]) ?>"><?= e($item[0]) ?></span>
                            <b><?= (int) $item[1] ?></b>
                            <p><?= e($item[2]) ?></p>
                        </a>
                    <?php endforeach; ?>
                </div>
            </article>

            <article class="ai-card ai-diagnosis">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">30-Day Summary</span>
                        <h2>Top Diagnoses</h2>
                    </div>
                </div>
                <p class="ai-card-note">Most frequent diagnoses from recent medical records.</p>
                <div class="ai-diagnosis-list">
                    <?php if ($topDiagnosis && $topDiagnosis->num_rows > 0): ?>
                        <?php while ($d = $topDiagnosis->fetch_assoc()): ?>
                            <div>
                                <span><?= e($d['diagnosis']) ?></span>
                                <b><?= (int) $d['c'] ?></b>
                            </div>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <p class="ai-empty">No diagnosis records in the last 30 days.</p>
                    <?php endif; ?>
                </div>
            </article>
        </section>

        <section class="ai-workspace">
            <div class="ai-tabs" role="tablist" aria-label="Workspace views">
                <button class="active" type="button" data-ai-tab="records">Records</button>
                <button type="button" data-ai-tab="activity">Activity</button>
                <button type="button" data-ai-tab="billing">Billing</button>
                <button type="button" data-ai-tab="inventory">Inventory</button>
            </div>

            <div class="ai-tab-panel active" id="ai-tab-records">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">Operations Queue</span>
                        <h2>Recent Appointments</h2>
                    </div>
                    <a class="ai-text-link" href="<?= app_url('admin/appointments.php') ?>">View all</a>
                </div>
                <div class="ai-table-wrap">
                    <table class="ai-table">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Patient</th>
                                <th>Species</th>
                                <th>Requested</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if ($recentAppointments && $recentAppointments->num_rows > 0): ?>
                                <?php while ($a = $recentAppointments->fetch_assoc()): ?>
                                    <tr>
                                        <td><?= e($a['full_name']) ?></td>
                                        <td><b><?= e($a['pet_name']) ?></b></td>
                                        <td><?= e($a['species'] ?: 'Unknown') ?></td>
                                        <td><?= e(date('M d, Y h:i A', strtotime($a['scheduled_date'] ?: $a['requested_date']))) ?></td>
                                        <td><span class="ai-status <?= e($statusClass($a['status'])) ?>"><?= e(ucfirst($a['status'])) ?></span></td>
                                    </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr><td colspan="5">No appointments yet.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="ai-tab-panel" id="ai-tab-activity">
                <div class="ai-consult">
                    <div class="ai-consult-log">
                        <div class="ai-section-head">
                            <div>
                                <span class="ai-eyebrow">Recent System Activity</span>
                                <h2>Activity Logs</h2>
                            </div>
                        </div>
                        <?php if ($recentLogs && $recentLogs->num_rows > 0): ?>
                            <?php while ($l = $recentLogs->fetch_assoc()): ?>
                                <div class="ai-log-row">
                                    <b><?= e($l['action']) ?></b>
                                    <p><?= e(($l['full_name'] ?: 'System') . ' - ' . date('M d, Y h:i A', strtotime($l['created_at']))) ?></p>
                                </div>
                            <?php endwhile; ?>
                        <?php else: ?>
                            <p class="ai-empty">No activity logs yet.</p>
                        <?php endif; ?>
                    </div>
                    <aside class="ai-chat-panel">
                        <span class="ai-eyebrow">Assistant</span>
                        <h2>Vetrix AI</h2>
                        <div class="ai-chat-bubble">Summarize active cases, flag vaccination deadlines, and prepare safe clinic guidance for staff review.</div>
                        <div class="ai-chat-bubble user">Generate today's admin risk summary.</div>
                        <button type="button" onclick="window.location.href='<?= app_url('admin/chatbot.php') ?>'">Open AI Chatbot</button>
                    </aside>
                </div>
            </div>

            <div class="ai-tab-panel" id="ai-tab-billing">
                <div class="ai-placeholder">
                    <h2>Billing Overview</h2>
                    <p>Today's POS revenue is <b>&#8369;<?= number_format($revenue, 2) ?></b>. Open POS reports for the full ledger.</p>
                    <a href="<?= app_url('admin/pos.php') ?>">Open POS</a>
                </div>
            </div>

            <div class="ai-tab-panel" id="ai-tab-inventory">
                <div class="ai-placeholder">
                    <h2>Inventory Control</h2>
                    <p><?= $lowStock ?> inventory item(s) are low or out of stock. Manage stock levels, product categories, and cashier-ready clinic supplies.</p>
                    <a href="<?= app_url('admin/inventory.php') ?>">Open Inventory</a>
                </div>
            </div>
        </section>
    </main>
</div>

<script>
document.querySelectorAll('[data-ai-tab]').forEach((button) => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-ai-tab]').forEach((item) => item.classList.remove('active'));
        document.querySelectorAll('.ai-tab-panel').forEach((panel) => panel.classList.remove('active'));
        button.classList.add('active');
        const panel = document.getElementById('ai-tab-' + button.dataset.aiTab);
        if (panel) panel.classList.add('active');
    });
});
</script>

<?php include "../includes/footer.php"; ?>
