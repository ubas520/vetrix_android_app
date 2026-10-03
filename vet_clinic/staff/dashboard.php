<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("staff");

$title = "Staff Dashboard";
include "../includes/header.php";
include "../includes/navbar.php";

$pending = (int)$conn->query("SELECT COUNT(*) c FROM appointments WHERE status='pending'")->fetch_assoc()['c'];
$today = (int)$conn->query("SELECT COUNT(*) c FROM appointments WHERE DATE(COALESCE(scheduled_date,requested_date))=CURDATE()")->fetch_assoc()['c'];
$low = (int)$conn->query("SELECT COUNT(*) c FROM inventory_items WHERE status IN ('low_stock','out_of_stock')")->fetch_assoc()['c'];
$clients = (int)$conn->query("SELECT COUNT(*) c FROM users WHERE role='client'")->fetch_assoc()['c'];

$recentAppointments = $conn->query("SELECT a.*, u.full_name owner_name, p.name pet_name, p.species, v.full_name vet_name
    FROM appointments a
    JOIN users u ON a.owner_id=u.id
    JOIN pets p ON a.pet_id=p.id
    LEFT JOIN users v ON a.assigned_vet_id=v.id
    ORDER BY FIELD(a.status,'pending','approved','completed','cancelled'), COALESCE(a.scheduled_date,a.requested_date) ASC
    LIMIT 7");

$recentSales = $conn->query("SELECT t.*, c.full_name client_name
    FROM pos_transactions t
    LEFT JOIN users c ON t.client_id=c.id
    ORDER BY t.transaction_date DESC
    LIMIT 6");

$actionQueue = [
    ['Pending appointments', $pending, 'Requests waiting for schedule confirmation or client update.', 'staff/appointments.php?status=pending', 'warn'],
    ['Today schedule', $today, 'Appointments scheduled or requested today.', 'staff/appointments.php', 'ok'],
    ['Low stock', $low, 'Inventory items that need staff attention.', 'staff/inventory.php', 'bad'],
    ['Client accounts', $clients, 'Client profiles available for front desk support.', 'staff/clients.php', 'neutral'],
];

$statusClass = function ($status) {
    $status = strtolower((string)$status);
    if (in_array($status, ['approved', 'active', 'paid', 'completed'], true)) return 'ok';
    if (in_array($status, ['pending'], true)) return 'warn';
    if (in_array($status, ['scheduled'], true)) return 'ai';
    if (in_array($status, ['cancelled', 'rejected', 'low_stock', 'out_of_stock'], true)) return 'bad';
    return 'neutral';
};
?>

<div class="layout ai-admin-shell">
    <?php include "../includes/staff_sidebar.php"; ?>

    <main class="content ai-main">
        <header class="ai-top">
            <div>
                <span class="ai-eyebrow">Front Desk Operations</span>
                <h1>Staff Dashboard</h1>
                <p>Manage appointment assistance, walk-in clients, POS transactions, inventory updates, and QR record access from one clean workspace.</p>
            </div>
            <div class="ai-top-actions">
                <a href="<?= app_url('staff/appointments.php?status=pending') ?>">Review Pending</a>
                <a class="ai-primary-action" href="<?= app_url('staff/pos.php') ?>">Open POS</a>
            </div>
        </header>

        <section class="ai-kpis" aria-label="Staff KPIs">
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Appointments</span><b>Pending</b></div>
                <strong><?= $pending ?></strong>
                <p>Requests waiting for front desk action.</p>
            </article>
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Schedule</span><b>Today</b></div>
                <strong><?= $today ?></strong>
                <p>Appointments scheduled or requested today.</p>
            </article>
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Inventory</span><b>Low Stock</b></div>
                <strong><?= $low ?></strong>
                <p>Products or supplies at reorder level.</p>
            </article>
            <article class="ai-kpi-card">
                <div class="ai-card-head"><span>Clients</span><b>Accounts</b></div>
                <strong><?= $clients ?></strong>
                <p>Client profiles available for assistance.</p>
            </article>
        </section>

        <section class="ai-grid">
            <article class="ai-insights">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">Needs Action</span>
                        <h2>Staff Workflow Queue</h2>
                    </div>
                    <span class="ai-live-dot">Real counts</span>
                </div>
                <div class="ai-insight-list">
                    <?php foreach ($actionQueue as $item): ?>
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
                        <h2>Front Desk Tools</h2>
                    </div>
                </div>
                <p class="ai-card-note">Common staff workflows for daily clinic operations.</p>
                <div class="vet-quick-actions">
                    <a href="<?= app_url('staff/appointments.php') ?>">
                        <span class="ai-status warn">APT</span>
                        <b>Appointments</b>
                        <p>Confirm requests, assign veterinarians, and notify clients.</p>
                    </a>
                    <a href="<?= app_url('staff/clients.php') ?>">
                        <span class="ai-status neutral">CLI</span>
                        <b>Client Assistance</b>
                        <p>Create walk-in accounts and support owner records.</p>
                    </a>
                    <a href="<?= app_url('staff/qr.php') ?>">
                        <span class="ai-status ai">QR</span>
                        <b>QR Access</b>
                        <p>Retrieve pet records through secure QR lookup.</p>
                    </a>
                </div>
            </article>
        </section>

        <section class="ai-workspace">
            <div class="ai-tabs" role="tablist" aria-label="Staff workspace views">
                <button class="active" type="button" data-ai-tab="appointments">Appointments</button>
                <button type="button" data-ai-tab="sales">POS Sales</button>
                <button type="button" data-ai-tab="inventory">Inventory</button>
            </div>

            <div class="ai-tab-panel active" id="ai-tab-appointments">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">Front Desk Queue</span>
                        <h2>Recent Appointments</h2>
                    </div>
                    <a class="ai-text-link" href="<?= app_url('staff/appointments.php') ?>">View all</a>
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
                                <tr><td colspan="5">No appointments yet.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="ai-tab-panel" id="ai-tab-sales">
                <div class="ai-section-head">
                    <div>
                        <span class="ai-eyebrow">Cashier Desk</span>
                        <h2>Recent POS Sales</h2>
                    </div>
                    <a class="ai-text-link" href="<?= app_url('staff/pos.php') ?>">Open POS</a>
                </div>
                <div class="ai-table-wrap">
                    <table class="ai-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Client</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if ($recentSales && $recentSales->num_rows > 0): ?>
                                <?php while ($s = $recentSales->fetch_assoc()): ?>
                                    <tr>
                                        <td><?= e(date('M d, Y h:i A', strtotime($s['transaction_date']))) ?></td>
                                        <td><?= e($s['client_name'] ?: 'Walk-in') ?></td>
                                        <td><b>&#8369;<?= number_format((float)$s['total_amount'], 2) ?></b></td>
                                        <td><span class="ai-status <?= e($statusClass($s['payment_status'])) ?>"><?= e(ucfirst($s['payment_status'])) ?></span></td>
                                    </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr><td colspan="4">No POS transactions yet.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="ai-tab-panel" id="ai-tab-inventory">
                <div class="ai-placeholder">
                    <h2>Inventory Updates</h2>
                    <p><?= $low ?> inventory item(s) are low or out of stock. Record daily stock movement or open the full inventory desk.</p>
                    <a href="<?= app_url('staff/inventory.php') ?>">Open Inventory</a>
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
