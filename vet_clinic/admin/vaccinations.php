<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

if (isset($_POST['send_reminder'])) {
    $vaccination_id = (int)($_POST['vaccination_id'] ?? 0);
    $stmt = $conn->prepare("SELECT v.*, p.name AS pet_name, p.owner_id, u.full_name AS owner_name FROM vaccinations v JOIN pets p ON v.pet_id=p.id JOIN users u ON p.owner_id=u.id WHERE v.id=?");
    $stmt->bind_param("i", $vaccination_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if ($row) {
        $due = $row['next_due_date'] ? date('M d, Y', strtotime($row['next_due_date'])) : 'the scheduled due date';
        notify_user($conn, $row['owner_id'], 'Vaccination Reminder', 'Reminder: ' . $row['pet_name'] . ' has a vaccination due on ' . $due . '.', 'vaccine');
        log_action($conn, 'Admin sent vaccination reminder', 'vaccination', $vaccination_id, 'Reminder sent for ' . $row['pet_name']);
        flash('success', 'Vaccination reminder sent to the client.');
    }
    redirect_to('admin/vaccinations.php');
}

$title="Vaccination Monitoring";
include "../includes/header.php";
include "../includes/navbar.php";

$totalVaccines = $conn->query("SELECT COUNT(*) c FROM vaccinations")->fetch_assoc()['c'];
$monitoredPets = $conn->query("SELECT COUNT(DISTINCT pet_id) c FROM vaccinations")->fetch_assoc()['c'];
$dueSoon = $conn->query("SELECT COUNT(*) c FROM vaccinations WHERE next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)")->fetch_assoc()['c'];
$overdue = $conn->query("SELECT COUNT(*) c FROM vaccinations WHERE next_due_date < CURDATE()")->fetch_assoc()['c'];
$completedShots = $conn->query("SELECT COUNT(*) c FROM vaccinations WHERE date_given IS NOT NULL")->fetch_assoc()['c'];
$rows = $conn->query("SELECT v.*, p.name AS pet_name, p.species, u.full_name AS owner_name, u.phone FROM vaccinations v JOIN pets p ON v.pet_id=p.id JOIN users u ON p.owner_id=u.id ORDER BY CASE WHEN v.next_due_date IS NULL THEN 1 ELSE 0 END, v.next_due_date ASC");
?>
<div class="layout"><?php include "../includes/admin_sidebar.php"; ?>
<main class="content">
    <section class="hero mb-4">
        <div class="hero-text">
            <h1>Vaccination Monitoring</h1>
            <p>Live overview of vaccine records, monitored pets, upcoming due dates, and overdue schedules.</p>
        </div>
    </section>

    <?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>

    <div class="row mb-4">
        <div class="col-md"><div class="stat-card"><div class="kpi-mini"><div class="kpi-icon">VAC</div><div><div class="text-muted">Vaccine Records</div><div class="stat-value"><?=$totalVaccines?></div></div></div></div></div>
        <div class="col-md"><div class="stat-card"><div class="kpi-mini"><div class="kpi-icon">PET</div><div><div class="text-muted">Monitored Pets</div><div class="stat-value"><?=$monitoredPets?></div></div></div></div></div>
        <div class="col-md"><div class="stat-card"><div class="kpi-mini"><div class="kpi-icon status-warn-token">DUE</div><div><div class="text-muted">Due Soon</div><div class="stat-value"><?=$dueSoon?></div></div></div></div></div>
        <div class="col-md"><div class="stat-card"><div class="kpi-mini"><div class="kpi-icon status-bad-token">LATE</div><div><div class="text-muted">Overdue</div><div class="stat-value"><?=$overdue?></div></div></div></div></div>
    </div>

    <div class="table-card">
        <div class="section-head mb-3">
            <div>
                <h3>Vaccination Schedule List</h3>
                <p class="text-muted mb-0">Admin can view due dates and send reminders, while vets record the medical/vaccine details.</p>
            </div>
            <a class="btn btn-light rounded-pill" href="reports.php">Open Reports</a>
        </div>
        <div class="table-responsive">
            <table class="table align-middle">
                <tr><th>Pet</th><th>Owner</th><th>Vaccine</th><th>Date Given</th><th>Next Due</th><th>Administered By</th><th>Status</th><th>Action</th></tr>
                <?php if($rows->num_rows===0): ?>
                    <tr><td colspan="8" class="text-center text-muted py-4">No vaccination records yet. Vets can add records from the Vet side.</td></tr>
                <?php endif; ?>
                <?php while($r=$rows->fetch_assoc()):
                    $status = 'No due date';
                    $statusClass = 'secondary';
                    if (!empty($r['next_due_date'])) {
                        $today = strtotime(date('Y-m-d'));
                        $dueTs = strtotime($r['next_due_date']);
                        if ($dueTs < $today) { $status = 'Overdue'; $statusClass = 'danger'; }
                        elseif ($dueTs <= strtotime('+60 days')) { $status = 'Due soon'; $statusClass = 'warning'; }
                        else { $status = 'Scheduled'; $statusClass = 'success'; }
                    }
                ?>
                    <tr>
                        <td><b><?=e($r['pet_name'])?></b><br><small class="text-muted"><?=e($r['species'])?></small></td>
                        <td><?=e($r['owner_name'])?><br><small class="text-muted"><?=e($r['phone'] ?: 'No phone saved')?></small></td>
                        <td><?=e($r['vaccine_name'])?></td>
                        <td><?= $r['date_given'] ? e(date('M d, Y', strtotime($r['date_given']))) : 'N/A' ?></td>
                        <td><?= $r['next_due_date'] ? e(date('M d, Y', strtotime($r['next_due_date']))) : 'N/A' ?></td>
                        <td><?=e($r['administered_by'] ?: 'N/A')?></td>
                        <td><span class="badge text-bg-<?=$statusClass?>"><?=e($status)?></span></td>
                        <td>
                            <form method="POST" class="m-0">
                                <input type="hidden" name="vaccination_id" value="<?=$r['id']?>">
                                <button class="btn btn-sm btn-primary rounded-pill" name="send_reminder">Send Reminder</button>
                            </form>
                        </td>
                    </tr>
                <?php endwhile;?>
            </table>
        </div>
    </div>
</main>
</div>
<?php include "../includes/footer.php"; ?>
