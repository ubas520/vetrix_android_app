<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

$roles = ['admin'=>'Admin','veterinarian'=>'Veterinarian','staff'=>'Staff','client'=>'Client'];
$statuses = ['pending'=>'Pending Approval','approved'=>'Approved','active'=>'Active','inactive'=>'Inactive','rejected'=>'Rejected'];

function fetch_user_for_admin($conn, $id) {
    $stmt = $conn->prepare("SELECT * FROM users WHERE id=? LIMIT 1");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    return $stmt->get_result()->fetch_assoc();
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    if (isset($_POST['create_user'])) {
        $hash = password_hash($_POST['password'] ?: 'password123', PASSWORD_DEFAULT);
        $created_by = current_user_id();
        $source = 'admin_created';
        $status = $_POST['status'];
        $otp_verified_at = null;

        if ($_POST['role'] === 'client' && $status === 'approved') {
            // Approved client accounts still need the one-time OTP before opening.
            $otp_verified_at = null;
        }

        $stmt = $conn->prepare("INSERT INTO users(full_name,email,phone,address,password,role,account_source,created_by,status,approved_by,approved_at,otp_verified_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)");
        $approved_by = ($status === 'approved' || $status === 'active') ? $created_by : null;
        $approved_at = ($status === 'approved' || $status === 'active') ? date('Y-m-d H:i:s') : null;
        $stmt->bind_param("sssssssisiss", $_POST['full_name'], $_POST['email'], $_POST['phone'], $_POST['address'], $hash, $_POST['role'], $source, $created_by, $status, $approved_by, $approved_at, $otp_verified_at);
        $stmt->execute();
        $newId = $conn->insert_id;
        log_action($conn, 'Admin created user account', 'user', $newId, 'Role: '.$_POST['role']);

        if ($_POST['role'] === 'client' && $status === 'approved') {
            $user = fetch_user_for_admin($conn, $newId);
            $otp = create_client_otp($conn, $newId);
            $mailOk = send_client_approval_email($conn, $user, $otp);
            flash_mail_result('OTP email sent to client Gmail.', 'The OTP was generated and saved, but');
            log_action($conn, 'Admin generated client OTP', 'user', $newId, $mailOk ? 'OTP sent to client email.' : 'OTP generated but email sending failed.');
        }
        flash('success','User account created successfully.');
    }

    if (isset($_POST['update_user'])) {
        $userBefore = fetch_user_for_admin($conn, (int)$_POST['id']);
        $newStatus = $_POST['status'];
        $approvedBy = $userBefore['approved_by'] ?? null;
        $approvedAt = $userBefore['approved_at'] ?? null;
        $rejectedAt = $userBefore['rejected_at'] ?? null;

        if ($newStatus === 'approved' && ($userBefore['status'] ?? '') !== 'approved') {
            $approvedBy = current_user_id();
            $approvedAt = date('Y-m-d H:i:s');
            $rejectedAt = null;
        }
        if ($newStatus === 'rejected' && ($userBefore['status'] ?? '') !== 'rejected') {
            $rejectedAt = date('Y-m-d H:i:s');
        }

        $stmt = $conn->prepare("UPDATE users SET full_name=?, phone=?, address=?, role=?, status=?, approved_by=?, approved_at=?, rejected_at=? WHERE id=?");
        $stmt->bind_param("sssssissi", $_POST['full_name'], $_POST['phone'], $_POST['address'], $_POST['role'], $newStatus, $approvedBy, $approvedAt, $rejectedAt, $_POST['id']);
        $stmt->execute();
        log_action($conn, 'Admin updated user account', 'user', $_POST['id'], 'Role/status updated.');

        $userAfter = fetch_user_for_admin($conn, (int)$_POST['id']);
        if ($userAfter && $userAfter['role'] === 'client' && $newStatus === 'approved' && ($userBefore['status'] ?? '') !== 'approved') {
            $otp = create_client_otp($conn, $userAfter['id']);
            $mailOk = send_client_approval_email($conn, $userAfter, $otp);
            flash_mail_result('OTP email sent to client Gmail.', 'The OTP was generated and saved, but');
            notify_user($conn, $userAfter['id'], 'Account Approved', 'Your account was approved. Please check your Gmail for the one-time OTP.', 'system');
            log_action($conn, 'Admin approved client account and sent OTP', 'user', $userAfter['id'], $mailOk ? 'One-time OTP was generated and emailed.' : 'OTP generated but email sending failed.');
        }
        if ($userAfter && $userAfter['role'] === 'client' && $newStatus === 'rejected' && ($userBefore['status'] ?? '') !== 'rejected') {
            $mailOk = send_client_rejection_email($conn, $userAfter);
            flash_mail_result('Rejection email sent to client Gmail.', 'The account was rejected, but');
            log_action($conn, 'Admin rejected client account', 'user', $userAfter['id'], $mailOk ? 'Rejection email sent.' : 'Rejection email failed.');
        }
        flash('success','User account updated.');
    }

    if (isset($_POST['approve_client'])) {
        $id = (int)$_POST['id'];
        $now = date('Y-m-d H:i:s');
        $adminId = current_user_id();
        $stmt = $conn->prepare("UPDATE users SET status='approved', approved_by=?, approved_at=?, rejected_at=NULL WHERE id=? AND role='client'");
        $stmt->bind_param("isi", $adminId, $now, $id);
        $stmt->execute();
        $user = fetch_user_for_admin($conn, $id);
        if ($user) {
            $otp = create_client_otp($conn, $id);
            $mailOk = send_client_approval_email($conn, $user, $otp);
            flash_mail_result('Client approved and OTP email sent to client Gmail.', 'Client was approved and OTP was generated, but');
            notify_user($conn, $id, 'Account Approved', 'Your account was approved. Please check your Gmail for the one-time OTP.', 'system');
            log_action($conn, 'Admin approved client account and sent OTP', 'user', $id, $mailOk ? 'One-time OTP was generated and emailed.' : 'OTP generated but email sending failed.');
        }
    }

    if (isset($_POST['reject_client'])) {
        $id = (int)$_POST['id'];
        $now = date('Y-m-d H:i:s');
        $stmt = $conn->prepare("UPDATE users SET status='rejected', rejected_at=?, otp_verified_at=NULL WHERE id=? AND role='client'");
        $stmt->bind_param("si", $now, $id);
        $stmt->execute();
        $user = fetch_user_for_admin($conn, $id);
        if ($user) {
            $mailOk = send_client_rejection_email($conn, $user);
            flash_mail_result('Rejection email sent to client Gmail.', 'Client was rejected, but');
            log_action($conn, 'Admin rejected client account', 'user', $id, $mailOk ? 'Rejection email sent.' : 'Rejection email failed.');
        }
    }

    if (isset($_POST['resend_otp'])) {
        $id = (int)$_POST['id'];
        $user = fetch_user_for_admin($conn, $id);
        if ($user && $user['role'] === 'client' && $user['status'] === 'approved' && empty($user['otp_verified_at'])) {
            $otp = create_client_otp($conn, $id);
            $mailOk = send_client_approval_email($conn, $user, $otp);
            log_action($conn, 'Admin resent client OTP', 'user', $id, $mailOk ? 'New one-time OTP was generated and emailed.' : 'New OTP generated but email sending failed.');
            flash_mail_result('A new OTP was sent to the client Gmail.', 'A new OTP was generated, but');
        } else {
            flash('success','OTP can only be resent to approved client accounts that are not yet verified.');
        }
    }
    redirect_to('admin/users.php');
}

$user_filter = $_GET['filter'] ?? 'all';
$user_search = trim($_GET['q'] ?? '');
$allowed_user_filters = ['all','pending','approved','active','inactive','rejected','otp_needed','clients'];
if (!in_array($user_filter, $allowed_user_filters, true)) $user_filter = 'all';
$user_conditions = [];
if (in_array($user_filter, ['pending','approved','active','inactive','rejected'], true)) {
    $user_conditions[] = "u.status='".$conn->real_escape_string($user_filter)."'";
} elseif ($user_filter === 'otp_needed') {
    $user_conditions[] = "u.role='client' AND u.status='approved' AND u.otp_verified_at IS NULL";
} elseif ($user_filter === 'clients') {
    $user_conditions[] = "u.role='client'";
}
if ($user_search !== '') {
    $safeUserSearch = $conn->real_escape_string($user_search);
    $user_conditions[] = "(u.full_name LIKE '%$safeUserSearch%' OR u.email LIKE '%$safeUserSearch%' OR u.phone LIKE '%$safeUserSearch%' OR u.address LIKE '%$safeUserSearch%' OR u.role LIKE '%$safeUserSearch%' OR u.status LIKE '%$safeUserSearch%' OR u.account_source LIKE '%$safeUserSearch%' OR creator.full_name LIKE '%$safeUserSearch%')";
}
$whereUser = $user_conditions ? 'WHERE '.implode(' AND ', $user_conditions) : '';
$user_search_param = $user_search !== '' ? '&q='.urlencode($user_search) : '';
$user_all_search_param = $user_search !== '' ? '?q='.urlencode($user_search) : '';

$title='User Management'; include "../includes/header.php"; include "../includes/navbar.php";
$allUsers=$conn->query("SELECT * FROM users");
$roleCounts=array_fill_keys(array_keys($roles),0);
$statusCounts=array_fill_keys(array_keys($statuses),0);
$pendingClients=0;
$otpNeeded=0;
$totalUsers=0;
while($countRow=$allUsers->fetch_assoc()){
    $totalUsers++;
    if(isset($roleCounts[$countRow['role']])) $roleCounts[$countRow['role']]++;
    if(isset($statusCounts[$countRow['status']])) $statusCounts[$countRow['status']]++;
    if($countRow['role']==='client' && $countRow['status']==='pending') $pendingClients++;
    if($countRow['role']==='client' && $countRow['status']==='approved' && empty($countRow['otp_verified_at'])) $otpNeeded++;
}
$users=$conn->query("SELECT u.*, creator.full_name AS approved_by_name FROM users u LEFT JOIN users creator ON creator.id=u.approved_by $whereUser ORDER BY FIELD(u.role,'admin','veterinarian','staff','client'), FIELD(u.status,'pending','approved','active','inactive','rejected'), u.created_at DESC");
$userRows=[];
while($row=$users->fetch_assoc()){
    $userRows[]=$row;
}
?>
<div class="layout"><?php include "../includes/admin_sidebar.php"; ?><main class="content">
<section class="hero admin-hero-banner mb-4"><h1>User Management</h1><p>Create, update, deactivate, approve or reject accounts, assign roles, and send one-time OTP verification for client accounts.</p></section>

<style>
/* Page-safe filter pill styling: prevents browser cache or link defaults from making filters look like blue text links */
.admin-filter-pills{
    display:flex !important;
    flex-wrap:wrap !important;
    gap:10px !important;
    margin:0 0 18px !important;
    align-items:center !important;
}
a.admin-filter-pill,
a.admin-filter-pill:visited{
    display:inline-flex !important;
    align-items:center !important;
    gap:7px !important;
    text-decoration:none !important;
    background:#fff !important;
    border:1px solid #dbeafe !important;
    color:#1e293b !important;
    border-radius:999px !important;
    padding:10px 14px !important;
    font-weight:900 !important;
    line-height:1 !important;
    box-shadow:0 10px 24px rgba(15,23,42,.05) !important;
    transition:.18s ease !important;
}
a.admin-filter-pill:hover{
    transform:translateY(-1px) !important;
    border-color:#bfdbfe !important;
    color:#1d4ed8 !important;
    text-decoration:none !important;
}
a.admin-filter-pill b{
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
    background:#eff6ff !important;
    color:#1d4ed8 !important;
    border-radius:999px !important;
    padding:3px 8px !important;
    min-width:24px !important;
    font-size:.82rem !important;
    margin-left:2px !important;
}
a.admin-filter-pill.active,
a.admin-filter-pill.active:visited{
    background:#2563eb !important;
    color:#fff !important;
    border-color:#2563eb !important;
}
a.admin-filter-pill.active b{
    background:rgba(255,255,255,.18) !important;
    color:#fff !important;
}
.pet-list-header,.user-list-header{margin-bottom:14px !important;}
@media(max-width:540px){
    a.admin-filter-pill{width:100% !important;justify-content:space-between !important;}
}
</style>

<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>
<?php if($m=flash('error')):?><div class="alert alert-danger"><?=e($m)?></div><?php endif;?>

<?php include '../includes/admin_password_reset_requests.php'; ?>

<div class="user-admin-shell">
    <aside class="user-admin-form-card">
        <div class="user-section-heading">
            <span class="user-icon">👤</span>
            <div>
                <h3>Create Account</h3>
                <p>Add clinic users or client accounts without crowding the account list.</p>
            </div>
        </div>
        <form method="POST" class="user-create-form">
            <label class="form-label">Full Name</label><input class="form-control" name="full_name" required>
            <label class="form-label">Email</label><input class="form-control" name="email" type="email" required>
            <div class="user-two-col">
                <div><label class="form-label">Phone</label><input class="form-control" name="phone"></div>
                <div><label class="form-label">Password</label><input class="form-control" name="password" placeholder="Default: password123"></div>
            </div>
            <label class="form-label">Address</label><input class="form-control" name="address">
            <div class="user-two-col">
                <div><label class="form-label">Role</label><select class="form-select" name="role"><?php foreach($roles as $k=>$v): ?><option value="<?=$k?>"><?=$v?></option><?php endforeach;?></select></div>
                <div><label class="form-label">Status</label><select class="form-select" name="status"><?php foreach($statuses as $k=>$v): ?><option value="<?=$k?>" <?=$k==='active'?'selected':''?>><?=$v?></option><?php endforeach;?></select></div>
            </div>
            <button class="btn btn-primary w-100 mt-2" name="create_user">Create User</button>
        </form>
    </aside>

    <section class="user-admin-list-card">
        <div class="user-list-header">
            <div>
                <h3>Accounts and Verification</h3>
                <p>Manage roles, approval status, and client OTP verification using a card layout like the Pets tab.</p>
            </div>
            <div class="user-status-summary">
                <span><b><?=e($totalUsers)?></b> Total</span>
                <span><b><?=e($pendingClients)?></b> Pending</span>
                <span><b><?=e($otpNeeded)?></b> OTP Needed</span>
                <span><b><?=e($roleCounts['client'] ?? 0)?></b> Clients</span>
            </div>
        </div>

        <div class="admin-filter-pills user-filter-pills">
            <a class="admin-filter-pill <?=$user_filter==='all'?'active':''?>" href="users.php<?=$user_all_search_param?>">All <b><?=e($totalUsers)?></b></a>
            <a class="admin-filter-pill <?=$user_filter==='pending'?'active':''?>" href="users.php?filter=pending<?=$user_search_param?>">Pending <b><?=e($statusCounts['pending'] ?? 0)?></b></a>
            <a class="admin-filter-pill <?=$user_filter==='approved'?'active':''?>" href="users.php?filter=approved<?=$user_search_param?>">Approved <b><?=e($statusCounts['approved'] ?? 0)?></b></a>
            <a class="admin-filter-pill <?=$user_filter==='active'?'active':''?>" href="users.php?filter=active<?=$user_search_param?>">Active <b><?=e($statusCounts['active'] ?? 0)?></b></a>
            <a class="admin-filter-pill <?=$user_filter==='inactive'?'active':''?>" href="users.php?filter=inactive<?=$user_search_param?>">Inactive <b><?=e($statusCounts['inactive'] ?? 0)?></b></a>
            <a class="admin-filter-pill <?=$user_filter==='rejected'?'active':''?>" href="users.php?filter=rejected<?=$user_search_param?>">Rejected <b><?=e($statusCounts['rejected'] ?? 0)?></b></a>
            <a class="admin-filter-pill <?=$user_filter==='otp_needed'?'active':''?>" href="users.php?filter=otp_needed<?=$user_search_param?>">OTP Needed <b><?=e($otpNeeded)?></b></a>
            <a class="admin-filter-pill <?=$user_filter==='clients'?'active':''?>" href="users.php?filter=clients<?=$user_search_param?>">Clients <b><?=e($roleCounts['client'] ?? 0)?></b></a>
        </div>

        <form class="admin-list-search" method="GET" action="users.php">
            <?php if($user_filter !== 'all'): ?><input type="hidden" name="filter" value="<?=e($user_filter)?>"><?php endif; ?>
            <input class="form-control" type="search" name="q" value="<?=e($user_search)?>" placeholder="Search user name, email, phone, role, status...">
            <button class="btn btn-primary" type="submit">Search</button>
            <a class="btn btn-light" href="users.php<?= $user_filter !== 'all' ? '?filter='.urlencode($user_filter) : '' ?>">Clear</a>
        </form>

        <div class="user-card-list">
        <?php if(empty($userRows)): ?>
            <div class="admin-empty-card">No user accounts found for this filter or search.</div>
        <?php endif; foreach($userRows as $u): ?>
            <article class="user-review-card">
                <div class="user-main-info">
                    <div class="user-avatar-wrap">
                        <span><?=e(strtoupper(substr(trim($u['full_name'] ?: $u['email']),0,1)))?></span>
                    </div>
                    <div class="user-title-block">
                        <div class="user-name-row">
                            <h4><?=e($u['full_name'])?></h4>
                            <?=badge($u['status'])?>
                        </div>
                        <p class="user-email"><?=e($u['email'])?></p>
                        <div class="user-detail-chips">
                            <span><?=e($roles[$u['role']] ?? $u['role'])?></span>
                            <?php if($u['role']==='client'): ?>
                                <?php if(!empty($u['otp_verified_at'])): ?><span class="chip-success">OTP Used</span>
                                <?php elseif($u['status']==='approved'): ?><span class="chip-warning">OTP Needed</span>
                                <?php else: ?><span>Client verification</span><?php endif; ?>
                            <?php else: ?>
                                <span>Clinic account</span>
                            <?php endif; ?>
                        </div>
                        <div class="user-mini-details">
                            <p><b>Phone:</b> <?=e($u['phone'] ?: 'Not provided')?></p>
                            <p><b>Address:</b> <?=e($u['address'] ?: 'Not provided')?></p>
                            <p><b>Approved by:</b> <?=e($u['approved_by_name'] ?: 'N/A')?></p>
                            <p><b>Created:</b> <?=e(date('M d, Y', strtotime($u['created_at'] ?? 'now')))?></p>
                        </div>
                    </div>
                </div>

                <form method="POST" class="user-management-panel">
                    <input type="hidden" name="id" value="<?=$u['id']?>">
                    <input type="hidden" name="phone" value="<?=e($u['phone'])?>">
                    <input type="hidden" name="address" value="<?=e($u['address'])?>">
                    <label class="form-label">Full name</label>
                    <input class="form-control form-control-sm" name="full_name" value="<?=e($u['full_name'])?>" required>
                    <div class="user-two-col tight">
                        <div>
                            <label class="form-label">Role</label>
                            <select class="form-select form-select-sm" name="role">
                                <?php foreach($roles as $k=>$v): ?><option value="<?=$k?>" <?=$u['role']===$k?'selected':''?>><?=$v?></option><?php endforeach;?>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Status</label>
                            <select class="form-select form-select-sm" name="status">
                                <?php foreach($statuses as $k=>$v): ?><option value="<?=$k?>" <?=$u['status']===$k?'selected':''?>><?=$v?></option><?php endforeach;?>
                            </select>
                        </div>
                    </div>
                    <div class="user-action-row">
                        <button class="btn btn-sm btn-primary" name="update_user">Save</button>
                        <?php if($u['role']==='client' && $u['status']==='pending'): ?>
                            <button class="btn btn-sm btn-success" name="approve_client">Approve + OTP</button>
                            <button class="btn btn-sm btn-danger" name="reject_client">Reject</button>
                        <?php endif; ?>
                        <?php if($u['role']==='client' && $u['status']==='approved' && empty($u['otp_verified_at'])): ?>
                            <button class="btn btn-sm btn-outline-primary" name="resend_otp">Resend OTP</button>
                        <?php endif; ?>
                    </div>
                </form>
            </article>
        <?php endforeach; ?>
        </div>
    </section>
</div></main></div><?php include "../includes/footer.php"; ?>
