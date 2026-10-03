<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

if (isset($_GET['mark_read'])) {
    $notificationId = (int)$_GET['mark_read'];
    if ($notificationId > 0) {
        $stmt = $conn->prepare("UPDATE notifications SET status='read' WHERE id=? AND status='unread'");
        $stmt->bind_param("i", $notificationId);
        $stmt->execute();
    }

    $redirectQuery = $_GET;
    unset($redirectQuery['mark_read']);
    $queryString = http_build_query($redirectQuery);
    redirect_to('admin/notifications.php' . ($queryString !== '' ? '?' . $queryString : ''));
}

$title = "Notification Management";
include "../includes/header.php";
include "../includes/navbar.php";

$q = trim($_GET['q'] ?? '');
$statusFilter = trim($_GET['status'] ?? 'all');
$typeFilter = trim($_GET['type'] ?? 'all');
$dateFilter = trim($_GET['date'] ?? 'all');
$allowedStatuses = ['all', 'unread', 'read'];
$allowedTypes = ['all', 'system', 'appointment', 'vaccine', 'record', 'qr', 'feedback'];
$allowedDates = ['all', 'today', 'week', 'month'];
if (!in_array($statusFilter, $allowedStatuses, true)) $statusFilter = 'all';
if (!in_array($typeFilter, $allowedTypes, true)) $typeFilter = 'all';
if (!in_array($dateFilter, $allowedDates, true)) $dateFilter = 'all';
$baseNotificationQuery = $_GET;
unset($baseNotificationQuery['mark_read']);

$where = [];
$types = '';
$params = [];
if ($q !== '') {
    $like = '%' . $q . '%';
    $where[] = "(n.title LIKE ? OR n.message LIKE ? OR n.type LIKE ? OR u.full_name LIKE ?)";
    $types .= 'ssss';
    array_push($params, $like, $like, $like, $like);
}
if ($statusFilter !== 'all') {
    $where[] = "n.status=?";
    $types .= 's';
    $params[] = $statusFilter;
}
if ($typeFilter !== 'all') {
    $where[] = "n.type=?";
    $types .= 's';
    $params[] = $typeFilter;
}
if ($dateFilter === 'today') {
    $where[] = "DATE(n.created_at)=CURDATE()";
} elseif ($dateFilter === 'week') {
    $where[] = "n.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
} elseif ($dateFilter === 'month') {
    $where[] = "n.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "SELECT n.*, u.full_name
    FROM notifications n
    LEFT JOIN users u ON n.user_id=u.id
    $whereSql
    ORDER BY n.created_at DESC
    LIMIT 100";
$stmt = $conn->prepare($sql);
if ($types !== '') $stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result();

$countSql = "SELECT COUNT(*) c FROM notifications n LEFT JOIN users u ON n.user_id=u.id $whereSql";
$countStmt = $conn->prepare($countSql);
if ($types !== '') $countStmt->bind_param($types, ...$params);
$countStmt->execute();
$visibleCount = (int)($countStmt->get_result()->fetch_assoc()['c'] ?? 0);

$summary = $conn->query("SELECT
    COUNT(*) total_notifications,
    SUM(status='unread') unread_notifications,
    SUM(DATE(created_at)=CURDATE()) today_notifications,
    SUM(type='vaccine') vaccine_notifications
    FROM notifications")->fetch_assoc();
?>

<div class="layout"><?php include "../includes/admin_sidebar.php"; ?>
<main class="content">
    <section class="hero admin-hero-banner mb-4">
        <h1>Notification Management</h1>
        <p>Monitor client notices, reminders, appointment updates, and notification read status.</p>
    </section>

    <section class="admin-summary-grid mb-4">
        <div class="admin-summary-card"><span>Total Sent</span><b><?= (int)($summary['total_notifications'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Unread</span><b><?= (int)($summary['unread_notifications'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Today</span><b><?= (int)($summary['today_notifications'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Visible Results</span><b><?= $visibleCount ?></b></div>
    </section>

    <section class="admin-filter-panel mb-4">
        <form method="GET" class="admin-filter-form admin-filter-form-wide">
            <input class="form-control" name="q" value="<?= e($q) ?>" placeholder="Search client, title, message, or type">
            <select class="form-select" name="status">
                <option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>All statuses</option>
                <option value="unread" <?= $statusFilter === 'unread' ? 'selected' : '' ?>>Unread</option>
                <option value="read" <?= $statusFilter === 'read' ? 'selected' : '' ?>>Read</option>
            </select>
            <select class="form-select" name="type">
                <?php foreach ($allowedTypes as $type): ?>
                    <option value="<?= e($type) ?>" <?= $typeFilter === $type ? 'selected' : '' ?>><?= $type === 'all' ? 'All types' : e(ucfirst($type)) ?></option>
                <?php endforeach; ?>
            </select>
            <select class="form-select" name="date">
                <option value="all" <?= $dateFilter === 'all' ? 'selected' : '' ?>>All dates</option>
                <option value="today" <?= $dateFilter === 'today' ? 'selected' : '' ?>>Today</option>
                <option value="week" <?= $dateFilter === 'week' ? 'selected' : '' ?>>Last 7 days</option>
                <option value="month" <?= $dateFilter === 'month' ? 'selected' : '' ?>>Last 30 days</option>
            </select>
            <button class="btn btn-primary">Apply</button>
            <a class="btn btn-light" href="notifications.php">Reset</a>
        </form>
    </section>

    <section class="admin-workflow-card">
        <div class="section-head mb-3">
            <div>
                <h3>Notification Feed</h3>
                <p class="text-muted mb-0">Showing up to 100 latest matching notifications.</p>
            </div>
        </div>

        <?php if ($rows->num_rows === 0): ?>
            <div class="admin-empty-state">
                <h3>No notifications found</h3>
                <p>Try another type, status, date range, or search term.</p>
            </div>
        <?php else: ?>
            <div class="admin-card-list">
                <?php while ($r = $rows->fetch_assoc()): ?>
                    <?php
                    $isUnread = $r['status'] === 'unread';
                    $cardTag = $isUnread ? 'a' : 'article';
                    $markQuery = $baseNotificationQuery;
                    $markQuery['mark_read'] = (int)$r['id'];
                    $markHref = 'notifications.php?' . http_build_query($markQuery);
                    ?>
                    <<?= $cardTag ?> class="admin-review-card admin-notification-card <?= $isUnread ? 'is-priority is-clickable' : '' ?>"<?= $isUnread ? ' href="' . e($markHref) . '" title="Mark notification as read"' : '' ?>>
                        <div class="admin-review-main">
                            <div class="admin-row-title">
                                <h3><?= e($r['title'] ?: 'Untitled notification') ?></h3>
                                <?= badge($r['status']) ?>
                            </div>
                            <p><?= e($r['message'] ?: 'No message saved.') ?></p>
                            <div class="admin-meta-row">
                                <span>Client: <?= e($r['full_name'] ?: 'Unknown') ?></span>
                                <span>Type: <?= e(ucfirst($r['type'] ?: 'system')) ?></span>
                                <span><?= e(date('M d, Y h:i A', strtotime($r['created_at']))) ?></span>
                                <?php if ($isUnread): ?><span>Click to mark read</span><?php endif; ?>
                            </div>
                        </div>
                    </<?= $cardTag ?>>
                <?php endwhile; ?>
            </div>
        <?php endif; ?>
    </section>
</main>
</div>
<?php include "../includes/footer.php"; ?>
