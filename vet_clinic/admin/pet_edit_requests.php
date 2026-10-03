<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

$editableFields = [
    'name' => 'Pet Name',
    'species' => 'Species',
    'breed' => 'Breed',
    'sex' => 'Sex',
    'birth_date' => 'Birth Date',
    'weight' => 'Weight',
    'color' => 'Color / Markings',
    'allergies' => 'Allergies',
    'critical_notes' => 'Critical Notes',
    'notes' => 'Care Notes',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf_or_fail();
    $id = (int)($_POST['request_id'] ?? 0);
    $status = $_POST['status'] ?? '';
    $notes = trim($_POST['admin_notes'] ?? '');
    if (!in_array($status, ['approved', 'rejected'], true)) {
        flash('error', 'Invalid review action.');
        redirect_to('admin/pet_edit_requests.php');
    }

    $stmt = $conn->prepare("SELECT er.*, p.owner_id, p.name AS pet_name FROM edit_requests er JOIN pets p ON er.pet_id=p.id WHERE er.id=? LIMIT 1");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();

    if ($req && $req['status'] === 'pending') {
        $field = $req['field_name'];
        if ($status === 'approved') {
            if (!array_key_exists($field, $editableFields)) {
                flash('error', 'This pet field is not approved for client edit requests.');
                redirect_to('admin/pet_edit_requests.php');
            }
            $newValue = $req['new_value'];
            $petId = (int)$req['pet_id'];
            $currentValueStmt = $conn->prepare("SELECT `$field` AS current_value FROM pets WHERE id=? LIMIT 1");
            $currentValueStmt->bind_param("i", $petId);
            $currentValueStmt->execute();
            $currentValue = $currentValueStmt->get_result()->fetch_assoc()['current_value'] ?? null;
            if ((string)$currentValue !== (string)$req['old_value']) {
                flash('error', 'This pet detail changed after the request was submitted. Ask the client to submit a new request.');
                redirect_to('admin/pet_edit_requests.php');
            }
            $admin = current_user_id();
            $sql = "UPDATE pets SET `$field`=?, last_updated_by=?, updated_at=NOW() WHERE id=?";
            $update = $conn->prepare($sql);
            $update->bind_param("sii", $newValue, $admin, $petId);
            $update->execute();
            notify_user($conn, $req['client_id'], 'Pet Edit Approved', 'Your requested change for ' . ($editableFields[$field] ?? $field) . ' was approved.', 'record');
            log_action($conn, 'Approved pet edit request', 'pet', $petId, ($editableFields[$field] ?? $field) . ' updated.');
        } else {
            notify_user($conn, $req['client_id'], 'Pet Edit Rejected', 'Your requested change for ' . ($editableFields[$field] ?? $field) . ' was rejected.', 'record');
            log_action($conn, 'Rejected pet edit request', 'pet', $req['pet_id'], ($editableFields[$field] ?? $field) . ' rejected.');
        }

        $review = $conn->prepare("UPDATE edit_requests SET status=?, admin_notes=?, reviewed_at=NOW() WHERE id=?");
        $review->bind_param("ssi", $status, $notes, $id);
        $review->execute();
        flash('success', 'Pet edit request reviewed.');
    }
    redirect_to('admin/pet_edit_requests.php');
}

$statusFilter = trim($_GET['status'] ?? 'all');
$q = trim($_GET['q'] ?? '');
$allowedStatuses = ['all', 'pending', 'approved', 'rejected'];
if (!in_array($statusFilter, $allowedStatuses, true)) $statusFilter = 'all';

$where = [];
$types = '';
$params = [];
if ($statusFilter !== 'all') {
    $where[] = "er.status=?";
    $types .= 's';
    $params[] = $statusFilter;
}
if ($q !== '') {
    $like = '%' . $q . '%';
    $where[] = "(u.full_name LIKE ? OR p.name LIKE ? OR er.field_name LIKE ? OR er.old_value LIKE ? OR er.new_value LIKE ?)";
    $types .= 'sssss';
    array_push($params, $like, $like, $like, $like, $like);
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "SELECT er.*, p.name pet_name, u.full_name
    FROM edit_requests er
    JOIN pets p ON er.pet_id=p.id
    JOIN users u ON er.client_id=u.id
    $whereSql
    ORDER BY FIELD(er.status,'pending','approved','rejected'), er.created_at DESC";
$stmt = $conn->prepare($sql);
if ($types !== '') $stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result();

$countSql = "SELECT COUNT(*) c FROM edit_requests er JOIN pets p ON er.pet_id=p.id JOIN users u ON er.client_id=u.id $whereSql";
$countStmt = $conn->prepare($countSql);
if ($types !== '') $countStmt->bind_param($types, ...$params);
$countStmt->execute();
$visibleCount = (int)($countStmt->get_result()->fetch_assoc()['c'] ?? 0);

$summary = ['pending' => 0, 'approved' => 0, 'rejected' => 0];
$sumResult = $conn->query("SELECT status, COUNT(*) total FROM edit_requests GROUP BY status");
while ($sumResult && $row = $sumResult->fetch_assoc()) {
    if (isset($summary[$row['status']])) $summary[$row['status']] = (int)$row['total'];
}
$totalRequests = array_sum($summary);

$title = "Pet Edit Requests";
include "../includes/header.php";
include "../includes/navbar.php";
?>

<div class="layout"><?php include "../includes/admin_sidebar.php"; ?>
<main class="content">
    <section class="hero admin-hero-banner mb-4">
        <h1>Pet Edit Requests</h1>
        <p>Review client-submitted profile changes before they update approved pet records.</p>
    </section>

    <?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>
    <?php if($m=flash('error')):?><div class="alert alert-danger"><?=e($m)?></div><?php endif;?>

    <section class="admin-summary-grid mb-4">
        <div class="admin-summary-card"><span>Total Requests</span><b><?= $totalRequests ?></b></div>
        <div class="admin-summary-card"><span>Pending Review</span><b><?= $summary['pending'] ?></b></div>
        <div class="admin-summary-card"><span>Approved</span><b><?= $summary['approved'] ?></b></div>
        <div class="admin-summary-card"><span>Visible Results</span><b><?= $visibleCount ?></b></div>
    </section>

    <section class="admin-filter-panel mb-4">
        <form method="GET" class="admin-filter-form">
            <input class="form-control" name="q" value="<?= e($q) ?>" placeholder="Search client, pet, field, or value">
            <select class="form-select" name="status">
                <option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>All statuses</option>
                <option value="pending" <?= $statusFilter === 'pending' ? 'selected' : '' ?>>Pending</option>
                <option value="approved" <?= $statusFilter === 'approved' ? 'selected' : '' ?>>Approved</option>
                <option value="rejected" <?= $statusFilter === 'rejected' ? 'selected' : '' ?>>Rejected</option>
            </select>
            <button class="btn btn-primary">Apply</button>
            <a class="btn btn-light" href="pet_edit_requests.php">Reset</a>
        </form>
    </section>

    <section class="admin-workflow-card">
        <div class="section-head mb-3">
            <div>
                <h3>Request Review Queue</h3>
                <p class="text-muted mb-0">Compare the old and requested values before saving a decision.</p>
            </div>
        </div>

        <?php if ($rows->num_rows === 0): ?>
            <div class="admin-empty-state">
                <h3>No pet edit requests found</h3>
                <p>Try another status filter or search term.</p>
            </div>
        <?php else: ?>
            <div class="admin-card-list">
                <?php while ($r = $rows->fetch_assoc()): ?>
                    <?php
                        $fieldLabel = $editableFields[$r['field_name']] ?? ucwords(str_replace('_', ' ', $r['field_name']));
                    ?>
                    <article class="admin-review-card <?= $r['status'] === 'pending' ? 'is-priority' : '' ?>">
                        <div class="admin-review-main">
                            <div class="admin-row-title">
                                <h3><?= e($fieldLabel) ?> Change</h3>
                                <?= badge($r['status']) ?>
                            </div>
                            <div class="admin-meta-row">
                                <span>Client: <?= e($r['full_name']) ?></span>
                                <span>Pet: <?= e($r['pet_name']) ?></span>
                                <span><?= e(date('M d, Y h:i A', strtotime($r['created_at']))) ?></span>
                            </div>
                            <div class="admin-compare-grid">
                                <div>
                                    <span>Current Value</span>
                                    <p><?= e($r['old_value'] ?: 'Blank') ?></p>
                                </div>
                                <div>
                                    <span>Requested Value</span>
                                    <p><?= e($r['new_value'] ?: 'Blank') ?></p>
                                </div>
                            </div>
                            <?php if (!empty($r['admin_notes'])): ?>
                                <div class="admin-note-box"><b>Admin note:</b> <?= e($r['admin_notes']) ?></div>
                            <?php endif; ?>
                        </div>

                        <aside class="admin-review-actions">
                            <?php if ($r['status'] === 'pending'): ?>
                                <form method="POST">
                                    <?= csrf_field() ?>
                                    <input type="hidden" name="request_id" value="<?= (int)$r['id'] ?>">
                                    <label class="form-label">Admin note optional</label>
                                    <textarea class="form-control" name="admin_notes" placeholder="Add a short reason or instruction"></textarea>
                                    <div class="admin-action-row">
                                        <button class="btn btn-primary" name="status" value="approved">Approve</button>
                                        <button class="btn btn-light" name="status" value="rejected">Reject</button>
                                    </div>
                                </form>
                            <?php else: ?>
                                <div class="admin-reviewed-box">Reviewed</div>
                            <?php endif; ?>
                        </aside>
                    </article>
                <?php endwhile; ?>
            </div>
        <?php endif; ?>
    </section>
</main>
</div>
<?php include "../includes/footer.php"; ?>
