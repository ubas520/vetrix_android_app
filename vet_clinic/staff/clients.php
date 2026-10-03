<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("staff");

if($_SERVER['REQUEST_METHOD']==='POST'){
    $hash=password_hash($_POST['password'] ?: 'password123', PASSWORD_DEFAULT);
    $role='client';
    $source='admin_created';
    $created_by=current_user_id();
    $status='active';

    $stmt=$conn->prepare("INSERT INTO users(full_name,email,phone,address,password,role,account_source,created_by,status) VALUES(?,?,?,?,?,?,?,?,?)");
    $stmt->bind_param("sssssssis",$_POST['full_name'],$_POST['email'],$_POST['phone'],$_POST['address'],$hash,$role,$source,$created_by,$status);
    $stmt->execute();

    $new_id = $conn->insert_id;
    log_action($conn,'Admin created client account','user',$new_id,'Walk-in/manual client onboarding.');
    flash('success','Client added. This account is marked as admin-created.');
    redirect_to('staff/clients.php');
}

$title="Clients";
include "../includes/header.php";
include "../includes/navbar.php";
$clientSummary=$conn->query("SELECT COUNT(*) total_clients,
    SUM(status IN ('approved','active')) verified_clients,
    SUM(status='pending') pending_clients,
    SUM(account_source='admin_created') walkin_clients
    FROM users WHERE role='client'")->fetch_assoc();
?>
<div class="layout">
<?php include "../includes/staff_sidebar.php"; ?>
<main class="content staff-clients-page">
<section class="hero staff-light-hero admin-hero-banner mb-4">
    <h1>Clients</h1>
    <p>Hybrid account model: clients may self-register, while admin may create walk-in client accounts when needed.</p>
</section>

<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>

<div class="dashboard-metric-grid staff-client-metrics mb-4">
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon">CL</div>
        <div><div class="dashboard-metric-label">Client Accounts</div><div class="dashboard-metric-value"><?= (int)$clientSummary['total_clients'] ?></div></div>
    </div>
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon status-ok-token">OK</div>
        <div><div class="dashboard-metric-label">Verified / Active</div><div class="dashboard-metric-value"><?= (int)$clientSummary['verified_clients'] ?></div></div>
    </div>
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon status-warn-token">PN</div>
        <div><div class="dashboard-metric-label">Pending Review</div><div class="dashboard-metric-value"><?= (int)$clientSummary['pending_clients'] ?></div></div>
    </div>
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon">WI</div>
        <div><div class="dashboard-metric-label">Walk-in Created</div><div class="dashboard-metric-value"><?= (int)$clientSummary['walkin_clients'] ?></div></div>
    </div>
</div>

<div class="row g-4 staff-clients-workspace">
<div class="col-lg-4">
    <div class="soft-card staff-client-form-card">
        <div class="staff-card-heading">
            <h3>Add Walk-in Client</h3>
            <p class="text-muted small">Create a clinic-assisted account for clients who visit before registering online.</p>
        </div>
        <form method="POST" class="staff-client-form">
            <label>Full Name</label>
            <input class="form-control" name="full_name" placeholder="Client full name" required>
            <label>Email</label>
            <input class="form-control" type="email" name="email" placeholder="client@email.com" required>
            <label>Phone</label>
            <input class="form-control" name="phone" placeholder="Phone number">
            <label>Address</label>
            <input class="form-control" name="address" placeholder="Complete address">
            <label>Password</label>
            <input class="form-control" name="password" placeholder="Leave blank for password123">
            <button class="btn btn-primary w-100 rounded-pill">Create Client</button>
        </form>
    </div>
</div>

<div class="col-lg-8">
    <div class="table-card staff-clients-card staff-client-list-card">
        <div class="section-head staff-client-list-head">
            <div>
                <h3>Client Accounts</h3>
                <p class="text-muted mb-0">View account source, approval status, and linked pet count.</p>
            </div>
        </div>
        <div class="staff-clients-table-wrap">
            <table class="table align-middle staff-clients-table">
                <thead><tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Pets</th>
                </tr></thead>
                <tbody>
                <?php
                $rows=$conn->query("SELECT u.*, creator.full_name created_by_name, COALESCE(pc.pet_count,0) pet_count
                    FROM users u
                    LEFT JOIN users creator ON u.created_by=creator.id
                    LEFT JOIN (SELECT owner_id, COUNT(*) pet_count FROM pets GROUP BY owner_id) pc ON pc.owner_id=u.id
                    WHERE u.role='client'
                    ORDER BY u.created_at DESC");
                if($rows->num_rows===0):
                ?>
                <tr><td colspan="5" class="text-center text-muted py-4">No client accounts yet.</td></tr>
                <?php endif; ?>
                <?php
                while($r=$rows->fetch_assoc()):
                ?>
                <tr>
                    <td><b><?=e($r['full_name'])?></b><br><span class="small text-muted"><?=e($r['address'])?></span></td>
                    <td><?=e($r['phone'])?><br><?=e($r['email'])?></td>
                    <td>
                        <?= badge($r['account_source']) ?><br>
                        <span class="small text-muted">
                            <?= $r['created_by_name'] ? 'By: '.e($r['created_by_name']) : 'Owner/system' ?>
                        </span>
                    </td>
                    <td><?=badge($r['status'])?></td>
                    <td><?= (int)$r['pet_count'] ?></td>
                </tr>
                <?php endwhile;?>
                </tbody>
            </table>
        </div>
    </div>
</div>
</div>
</main>
</div>
<?php include "../includes/footer.php"; ?>
