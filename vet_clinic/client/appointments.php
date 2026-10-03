<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("client");
$uid=current_user_id();

if($_SERVER['REQUEST_METHOD']==='POST'){
    $pet_id=(int)($_POST['pet_id'] ?? 0);
    $requested=$_POST['requested_date'] ?? '';
    $reason=trim($_POST['reason'] ?? '');
    if(!$pet_id || !$requested || $reason===''){
        flash('error','Please complete the pet, date/time, and reason before submitting.');
        redirect_to('client/appointments.php');
    }
    $own=$conn->prepare("SELECT COUNT(*) c FROM pets WHERE id=? AND owner_id=? AND verification_status='approved'");
    $own->bind_param("ii",$pet_id,$uid);
    $own->execute();
    if((int)$own->get_result()->fetch_assoc()['c']===0){
        flash('error','Please select one of your approved pets. Pending, rejected, or in-person confirmation pets cannot book appointments yet.');
        redirect_to('client/appointments.php');
    }
    $conflict=$conn->prepare("SELECT COUNT(*) c FROM appointments WHERE requested_date BETWEEN DATE_SUB(?, INTERVAL 30 MINUTE) AND DATE_ADD(?, INTERVAL 30 MINUTE) AND status IN ('pending','approved')");
    $conflict->bind_param("ss",$requested,$requested);
    $conflict->execute();
    $c=(int)$conflict->get_result()->fetch_assoc()['c'];
    if($c>0){ flash('error','That time is close to another appointment. Please choose another time.'); redirect_to('client/appointments.php'); }
    $stmt=$conn->prepare("INSERT INTO appointments(owner_id,pet_id,requested_date,reason) VALUES(?,?,?,?)");
    $stmt->bind_param("iiss",$uid,$pet_id,$requested,$reason);
    $stmt->execute();
    log_action($conn,'Client requested appointment','appointment',$conn->insert_id,'Appointment request submitted.');
    flash('success','Your appointment request was sent. Please wait for the clinic approval.');
    redirect_to('client/appointments.php');
}

$title="Appointments";
include "../includes/header.php";
include "../includes/navbar.php";
$pets=$conn->query("SELECT id,name,species FROM pets WHERE owner_id=$uid AND verification_status='approved' ORDER BY name ASC");
$rows=$conn->query("SELECT a.*,p.name pet_name,p.species FROM appointments a JOIN pets p ON a.pet_id=p.id WHERE a.owner_id=$uid ORDER BY a.requested_date DESC");
$pending=$conn->query("SELECT COUNT(*) c FROM appointments WHERE owner_id=$uid AND status='pending'")->fetch_assoc()['c'];
$approved=$conn->query("SELECT COUNT(*) c FROM appointments WHERE owner_id=$uid AND status='approved'")->fetch_assoc()['c'];
$completed=$conn->query("SELECT COUNT(*) c FROM appointments WHERE owner_id=$uid AND status='completed'")->fetch_assoc()['c'];
?>
<div class="layout"><?php include "../includes/client_sidebar.php";?><main class="content">
<section class="hero client-hero-banner hero-friendly no-hero-bubbles mb-4">
    <div>
        <h1>Book a clinic visit</h1>
        <p>Choose your pet, pick a date and time, then tell the clinic the concern. The admin will approve or adjust the schedule.</p>
    </div>
</section>
<?php if($m=flash('success')):?><div class="alert alert-success friendly-alert">✅ <?=e($m)?></div><?php endif;?>
<?php if($m=flash('error')):?><div class="alert alert-danger friendly-alert">⚠️ <?=e($m)?></div><?php endif;?>

<div class="dashboard-metric-grid client-appointment-metric-grid mb-4">
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon">⏳</div>
        <div><div class="dashboard-metric-label">Waiting for approval</div><div class="dashboard-metric-value"><?=$pending?></div></div>
    </div>
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon">✅</div>
        <div><div class="dashboard-metric-label">Approved visits</div><div class="dashboard-metric-value"><?=$approved?></div></div>
    </div>
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon">📋</div>
        <div><div class="dashboard-metric-label">Completed visits</div><div class="dashboard-metric-value"><?=$completed?></div></div>
    </div>
</div>

<div class="appointment-layout">
    <div class="soft-card appointment-request-card">
        <div class="card-title-row"><h3>Request Appointment</h3><span>For pet owners</span></div>
        <p class="text-muted">No technical steps needed. Just fill in the form below.</p>
        <form method="POST" class="friendly-form">
            <label>1. Which pet needs a visit?</label>
            <select class="form-select" name="pet_id" required>
                <option value="">Select your pet</option>
                <?php $pets->data_seek(0); while($p=$pets->fetch_assoc()):?>
                    <option value="<?=$p['id']?>"><?=e($p['name'])?> <?= $p['species'] ? '('.e($p['species']).')' : '' ?></option>
                <?php endwhile;?>
            </select>
            <label>2. Preferred date and time</label>
            <input class="form-control" type="datetime-local" name="requested_date" required>
            <label>3. What is the reason?</label>
            <textarea class="form-control" name="reason" placeholder="Example: My dog is not eating, needs vaccine, follow-up checkup..." rows="4" required></textarea>
            <button class="btn btn-primary w-100 rounded-pill friendly-submit">Send Appointment Request</button>
            <div class="help-note">After sending, your status will be <b>Pending</b> until the clinic approves it.</div>
        </form>
    </div>

    <div class="soft-card">
        <div class="card-title-row"><h3>My Appointment Timeline</h3><span>Latest first</span></div>
        <div class="appointment-cards">
            <?php if($rows->num_rows===0): ?>
                <div class="empty-state"><div class="empty-icon">📅</div><h3>No appointments yet</h3><p class="text-muted">Your requested appointments will appear here.</p></div>
            <?php endif; ?>
            <?php while($r=$rows->fetch_assoc()): ?>
                <div class="friendly-appointment-card status-<?=e($r['status'])?>">
                    <div class="appointment-head">
                        <div><b><?=e($r['pet_name'])?></b><small><?=e($r['species'])?></small></div>
                        <?=badge($r['status'])?>
                    </div>
                    <div class="appointment-info-grid">
                        <div><span>Requested</span><b><?=e(date('M d, Y h:i A', strtotime($r['requested_date'])))?></b></div>
                        <div><span>Clinic Schedule</span><b><?= $r['scheduled_date'] ? e(date('M d, Y h:i A', strtotime($r['scheduled_date']))) : 'Waiting for admin' ?></b></div>
                    </div>
                    <p><?=e($r['reason'])?></p>
                    <?php if($r['admin_notes']): ?><div class="admin-note">Clinic note: <?=e($r['admin_notes'])?></div><?php endif;?>
                </div>
            <?php endwhile;?>
        </div>
    </div>
</div>
</main></div><?php include "../includes/footer.php";?>
