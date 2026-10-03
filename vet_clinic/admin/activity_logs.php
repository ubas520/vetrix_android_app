<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

$title = "Activity Logs";
include "../includes/header.php";
include "../includes/navbar.php";

$q = trim($_GET['q'] ?? '');
$entityFilter = trim($_GET['entity'] ?? 'all');
$dateFilter = trim($_GET['date'] ?? 'all');
$allowedDates = ['all', 'today', 'week', 'month'];
if (!in_array($dateFilter, $allowedDates, true)) $dateFilter = 'all';

$entityOptions = [];
$entityResult = $conn->query("SELECT DISTINCT entity_type FROM audit_logs WHERE entity_type IS NOT NULL AND entity_type<>'' ORDER BY entity_type");
while ($entityResult && $row = $entityResult->fetch_assoc()) {
    $entityOptions[] = $row['entity_type'];
}
if ($entityFilter !== 'all' && !in_array($entityFilter, $entityOptions, true)) $entityFilter = 'all';

$where = [];
$types = '';
$params = [];
if ($q !== '') {
    $like = '%' . $q . '%';
    $where[] = "(a.action LIKE ? OR a.details LIKE ? OR a.entity_type LIKE ? OR u.full_name LIKE ?)";
    $types .= 'ssss';
    array_push($params, $like, $like, $like, $like);
}
if ($entityFilter !== 'all') {
    $where[] = "a.entity_type=?";
    $types .= 's';
    $params[] = $entityFilter;
}
if ($dateFilter === 'today') {
    $where[] = "DATE(a.created_at)=CURDATE()";
} elseif ($dateFilter === 'week') {
    $where[] = "a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
} elseif ($dateFilter === 'month') {
    $where[] = "a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "SELECT a.*, u.full_name
    FROM audit_logs a
    LEFT JOIN users u ON a.actor_user_id=u.id
    $whereSql
    ORDER BY a.created_at DESC
    LIMIT 100";
$stmt = $conn->prepare($sql);
if ($types !== '') $stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result();

$countSql = "SELECT COUNT(*) c FROM audit_logs a LEFT JOIN users u ON a.actor_user_id=u.id $whereSql";
$countStmt = $conn->prepare($countSql);
if ($types !== '') $countStmt->bind_param($types, ...$params);
$countStmt->execute();
$visibleCount = (int)($countStmt->get_result()->fetch_assoc()['c'] ?? 0);

$summary = $conn->query("SELECT
    COUNT(*) total_logs,
    SUM(DATE(created_at)=CURDATE()) today_logs,
    SUM(actor_user_id IS NULL) system_logs,
    COUNT(DISTINCT actor_user_id) active_users
    FROM audit_logs")->fetch_assoc();
?>

<div class="layout"><?php include "../includes/admin_sidebar.php"; ?>
<main class="content">
    <section class="hero admin-hero-banner mb-4">
        <h1>Activity Logs</h1>
        <p>Review account changes, approvals, record updates, inventory changes, and system events with search and filters.</p>
    </section>

    <section class="admin-summary-grid mb-4">
        <div class="admin-summary-card"><span>Total Logs</span><b><?= (int)($summary['total_logs'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Today</span><b><?= (int)($summary['today_logs'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>System Events</span><b><?= (int)($summary['system_logs'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Visible Results</span><b><?= $visibleCount ?></b></div>
    </section>

    <section class="admin-filter-panel mb-4">
        <form method="GET" class="admin-filter-form">
            <input class="form-control" name="q" value="<?= e($q) ?>" placeholder="Search user, action, entity, or details">
            <select class="form-select" name="entity">
                <option value="all">All entities</option>
                <?php foreach ($entityOptions as $entity): ?>
                    <option value="<?= e($entity) ?>" <?= $entityFilter === $entity ? 'selected' : '' ?>><?= e(ucfirst(str_replace('_', ' ', $entity))) ?></option>
                <?php endforeach; ?>
            </select>
            <select class="form-select" name="date">
                <option value="all" <?= $dateFilter === 'all' ? 'selected' : '' ?>>All dates</option>
                <option value="today" <?= $dateFilter === 'today' ? 'selected' : '' ?>>Today</option>
                <option value="week" <?= $dateFilter === 'week' ? 'selected' : '' ?>>Last 7 days</option>
                <option value="month" <?= $dateFilter === 'month' ? 'selected' : '' ?>>Last 30 days</option>
            </select>
            <button class="btn btn-primary">Apply</button>
            <a class="btn btn-light" href="activity_logs.php">Reset</a>
        </form>
    </section>

    <section class="admin-workflow-card">
        <div class="section-head mb-3">
            <div>
                <h3>Recent Activity</h3>
                <p class="text-muted mb-0">Showing up to 100 latest matching events.</p>
            </div>
        </div>

        <?php if ($rows->num_rows === 0): ?>
            <div class="admin-empty-state">
                <h3>No activity found</h3>
                <p>Try changing the search term, entity type, or date filter.</p>
            </div>
        <?php else: ?>
            <div class="admin-timeline-list">
                <?php while ($r = $rows->fetch_assoc()): ?>
                    <article class="admin-timeline-item">
                        <div class="admin-timeline-marker"></div>
                        <div>
                            <div class="admin-row-title">
                                <h3><?= e($r['action']) ?></h3>
                                <span><?= e(date('M d, Y h:i A', strtotime($r['created_at']))) ?></span>
                            </div>
                            <p><?= e($r['details'] ?: 'No details saved.') ?></p>
                            <div class="admin-meta-row">
                                <span>Actor: <?= e($r['full_name'] ?: 'System') ?></span>
                                <span>Entity: <?= e($r['entity_type'] ?: 'General') ?><?= $r['entity_id'] ? ' #' . e($r['entity_id']) : '' ?></span>
                            </div>
                        </div>
                    </article>
                <?php endwhile; ?>
            </div>
        <?php endif; ?>
    </section>
</main>
</div>
<?php include "../includes/footer.php"; ?>
