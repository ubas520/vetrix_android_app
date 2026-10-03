<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_once "../includes/report_helpers.php";
require_role("admin");

$from = $_GET['from'] ?? date('Y-m-01');
$to = $_GET['to'] ?? date('Y-m-t');
$title = "Appointment Report";
include "../includes/header.php";
echo report_actions();

$stmt = $conn->prepare("SELECT a.*,u.full_name,p.name pet_name FROM appointments a JOIN users u ON a.owner_id=u.id JOIN pets p ON a.pet_id=p.id WHERE DATE(a.requested_date) BETWEEN ? AND ? ORDER BY a.requested_date");
$stmt->bind_param("ss",$from,$to);
$stmt->execute();
$rows = $stmt->get_result();
?>
<div class="print-page">
<?= report_header("Appointment Report", clean_report($from) . " to " . clean_report($to)) ?>
<div class="print-section">
<table class="print-table">
<tr><th>Date Requested</th><th>Scheduled</th><th>Client</th><th>Pet</th><th>Reason</th><th>Status</th><th>Admin Notes</th></tr>
<?php while($r=$rows->fetch_assoc()): ?>
<tr>
<td><?= e($r['requested_date']) ?></td>
<td><?= e($r['scheduled_date']) ?></td>
<td><?= e($r['full_name']) ?></td>
<td><?= e($r['pet_name']) ?></td>
<td><?= e($r['reason']) ?></td>
<td><?= e($r['status']) ?></td>
<td><?= e($r['admin_notes']) ?></td>
</tr>
<?php endwhile; ?>
</table>
</div>
</div>
<?php include "../includes/footer.php"; ?>
