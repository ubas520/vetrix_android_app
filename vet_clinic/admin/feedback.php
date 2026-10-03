<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

$title = "Feedback";
include "../includes/header.php";
include "../includes/navbar.php";

$q = trim($_GET['q'] ?? '');
$ratingFilter = trim($_GET['rating'] ?? 'all');
$allowedRatings = ['all', '5', '4', '3', '2', '1', 'low'];
if (!in_array($ratingFilter, $allowedRatings, true)) $ratingFilter = 'all';

$where = [];
$types = '';
$params = [];
if ($q !== '') {
    $like = '%' . $q . '%';
    $where[] = "(u.full_name LIKE ? OR f.comment LIKE ?)";
    $types .= 'ss';
    array_push($params, $like, $like);
}
if ($ratingFilter === 'low') {
    $where[] = "f.rating <= 2";
} elseif ($ratingFilter !== 'all') {
    $where[] = "f.rating=?";
    $types .= 'i';
    $params[] = (int)$ratingFilter;
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$hasVisitFeedback = $conn->query("SHOW COLUMNS FROM feedback LIKE 'appointment_id'")->num_rows > 0;
$visitSelect = $hasVisitFeedback ? 'a.id AS visit_id, p.name AS pet_name, COALESCE(a.scheduled_date,a.requested_date) AS visit_date' : 'NULL AS visit_id, NULL AS pet_name, NULL AS visit_date';
$visitJoin = $hasVisitFeedback ? 'LEFT JOIN appointments a ON a.id=f.appointment_id LEFT JOIN pets p ON p.id=a.pet_id' : '';
$sql = "SELECT f.*, u.full_name, $visitSelect
    FROM feedback f
    JOIN users u ON f.user_id=u.id
    $visitJoin
    $whereSql
    ORDER BY f.created_at DESC";
$stmt = $conn->prepare($sql);
if ($types !== '') $stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result();

$summary = $conn->query("SELECT
    COUNT(*) total_feedback,
    ROUND(AVG(rating),1) average_rating,
    SUM(rating >= 4) positive_feedback,
    SUM(rating <= 2) low_feedback
    FROM feedback")->fetch_assoc();
?>

<div class="layout"><?php include "../includes/admin_sidebar.php"; ?>
<main class="content">
    <section class="hero admin-hero-banner mb-4">
        <h1>Feedback Insights</h1>
        <p>Review client ratings, spot low-rating concerns, and use recent comments to improve clinic experience.</p>
    </section>

    <section class="admin-summary-grid mb-4">
        <div class="admin-summary-card"><span>Total Feedback</span><b><?= (int)($summary['total_feedback'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Average Rating</span><b><?= e($summary['average_rating'] ?: '0') ?>/5</b></div>
        <div class="admin-summary-card"><span>Positive Ratings</span><b><?= (int)($summary['positive_feedback'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Low-Rating Alerts</span><b><?= (int)($summary['low_feedback'] ?? 0) ?></b></div>
    </section>

    <section class="admin-filter-panel mb-4">
        <form method="GET" class="admin-filter-form">
            <input class="form-control" name="q" value="<?= e($q) ?>" placeholder="Search client or comment">
            <select class="form-select" name="rating">
                <option value="all" <?= $ratingFilter === 'all' ? 'selected' : '' ?>>All ratings</option>
                <option value="5" <?= $ratingFilter === '5' ? 'selected' : '' ?>>5 stars</option>
                <option value="4" <?= $ratingFilter === '4' ? 'selected' : '' ?>>4 stars</option>
                <option value="3" <?= $ratingFilter === '3' ? 'selected' : '' ?>>3 stars</option>
                <option value="2" <?= $ratingFilter === '2' ? 'selected' : '' ?>>2 stars</option>
                <option value="1" <?= $ratingFilter === '1' ? 'selected' : '' ?>>1 star</option>
                <option value="low" <?= $ratingFilter === 'low' ? 'selected' : '' ?>>Low ratings</option>
            </select>
            <button class="btn btn-primary">Apply</button>
            <a class="btn btn-light" href="feedback.php">Reset</a>
        </form>
    </section>

    <section class="admin-workflow-card">
        <div class="section-head mb-3">
            <div>
                <h3>Client Feedback</h3>
                <p class="text-muted mb-0">Recent ratings and written comments submitted by clients.</p>
            </div>
        </div>

        <?php if ($rows->num_rows === 0): ?>
            <div class="admin-empty-state">
                <h3>No feedback found</h3>
                <p>Try changing the search or rating filter.</p>
            </div>
        <?php else: ?>
            <div class="admin-card-list">
                <?php while ($r = $rows->fetch_assoc()): ?>
                    <article class="admin-review-card admin-feedback-card <?= ((int)$r['rating'] <= 2) ? 'is-priority' : '' ?>">
                        <div class="admin-review-main">
                            <div class="admin-row-title">
                                <h3><?= e($r['full_name']) ?></h3>
                                <span class="admin-rating-token"><?= e($r['rating']) ?> / 5</span>
                            </div>
                            <p><?= e($r['comment'] ?: 'No written comment.') ?></p>
                            <?php if ($r['visit_id']): ?>
                                <p class="text-muted">Visit #<?= (int)$r['visit_id'] ?> &middot; <?= e($r['pet_name']) ?><?php if ($r['visit_date']): ?> &middot; <?= e(date('M d, Y', strtotime($r['visit_date']))) ?><?php endif; ?></p>
                            <?php endif; ?>
                            <div class="admin-meta-row">
                                <span><?= e(date('M d, Y h:i A', strtotime($r['created_at']))) ?></span>
                                <span><?= ((int)$r['rating'] <= 2) ? 'Needs attention' : 'Reviewed signal' ?></span>
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
