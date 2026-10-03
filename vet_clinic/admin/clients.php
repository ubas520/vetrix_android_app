<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

$clientRows = [];
$clients = $conn->query("SELECT u.*, creator.full_name AS created_by_name, approver.full_name AS approved_by_name,
    (SELECT COUNT(*) FROM pets p WHERE p.owner_id=u.id) AS pet_count
    FROM users u
    LEFT JOIN users creator ON u.created_by=creator.id
    LEFT JOIN users approver ON u.approved_by=approver.id
    WHERE u.role='client'
    ORDER BY FIELD(u.status,'pending','approved','active','inactive','rejected'), u.created_at DESC");
while($row = $clients->fetch_assoc()){
    $clientRows[] = $row;
}

$client_filter = $_GET['filter'] ?? 'all';
$client_search = trim($_GET['q'] ?? '');
$allowed_client_filters = ['all','pending','approved','active','inactive','rejected','otp_needed','clients'];
if(!in_array($client_filter, $allowed_client_filters, true)) $client_filter = 'all';

$totalClients = count($clientRows);
$statusCounts = ['pending'=>0,'approved'=>0,'active'=>0,'inactive'=>0,'rejected'=>0];
$pendingClients = 0;
$approvedClients = 0;
$activeClients = 0;
$otpNeeded = 0;
foreach($clientRows as $client){
    $status = $client['status'] ?? '';
    if(isset($statusCounts[$status])) $statusCounts[$status]++;
    if($status === 'pending') $pendingClients++;
    if($status === 'approved') $approvedClients++;
    if($status === 'active') $activeClients++;
    if($status === 'approved' && empty($client['otp_verified_at'])) $otpNeeded++;
}

$visibleClientRows = array_values(array_filter($clientRows, function($client) use ($client_filter, $client_search){
    $status = $client['status'] ?? '';
    if($client_filter === 'all' || $client_filter === 'clients') {
        $matchesFilter = true;
    } elseif($client_filter === 'otp_needed') {
        $matchesFilter = $status === 'approved' && empty($client['otp_verified_at']);
    } else {
        $matchesFilter = $status === $client_filter;
    }
    if(!$matchesFilter || $client_search === '') return $matchesFilter;
    $haystack = implode(' ', [
        $client['full_name'] ?? '',
        $client['email'] ?? '',
        $client['phone'] ?? '',
        $client['address'] ?? '',
        $client['status'] ?? '',
        $client['account_source'] ?? '',
        $client['created_by_name'] ?? '',
        $client['approved_by_name'] ?? '',
        (string)($client['pet_count'] ?? ''),
    ]);
    return stripos($haystack, $client_search) !== false;
}));
$client_search_param = $client_search !== '' ? '&q='.urlencode($client_search) : '';
$client_all_search_param = $client_search !== '' ? '?q='.urlencode($client_search) : '';

$title="Client Accounts";
include "../includes/header.php";
include "../includes/navbar.php";
?>
<div class="layout">
<?php include "../includes/admin_sidebar.php"; ?>
<main class="content">
<section class="hero admin-hero-banner mb-4">
    <h1>Client Accounts</h1>
    <p>View registered clients, account source, verification status, and linked pet count. Account creation is handled in User Management.</p>
</section>

<style>
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
.client-account-header-card{margin-bottom:18px !important;}
.pet-list-header,.user-list-header{margin-bottom:14px !important;}
@media(max-width:540px){
    a.admin-filter-pill{width:100% !important;justify-content:space-between !important;}
}
</style>

<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>

<?php if($m=flash('error')):?><div class="alert alert-danger"><?=e($m)?></div><?php endif;?>
<?php include '../includes/admin_password_reset_requests.php'; ?>

<div class="user-admin-shell client-account-shell client-account-view-only">
    <section class="user-admin-list-card">
        <div class="user-list-header client-account-header-card">
            <div>
                <h3>Accounts and Verification</h3>
                <p>Monitor client roles, approval status, and OTP verification using a clean card layout.</p>
            </div>
            <div class="user-status-summary">
                <span><b><?=e($totalClients)?></b> Total</span>
                <span><b><?=e($pendingClients)?></b> Pending</span>
                <span><b><?=e($otpNeeded)?></b> OTP Needed</span>
                <span><b><?=e($totalClients)?></b> Clients</span>
            </div>
        </div>

        <div class="admin-filter-pills user-filter-pills client-account-filter-pills">
            <a class="admin-filter-pill <?=$client_filter==='all'?'active':''?>" href="clients.php<?=$client_all_search_param?>">All <b><?=e($totalClients)?></b></a>
            <a class="admin-filter-pill <?=$client_filter==='pending'?'active':''?>" href="clients.php?filter=pending<?=$client_search_param?>">Pending <b><?=e($statusCounts['pending'] ?? 0)?></b></a>
            <a class="admin-filter-pill <?=$client_filter==='approved'?'active':''?>" href="clients.php?filter=approved<?=$client_search_param?>">Approved <b><?=e($statusCounts['approved'] ?? 0)?></b></a>
            <a class="admin-filter-pill <?=$client_filter==='active'?'active':''?>" href="clients.php?filter=active<?=$client_search_param?>">Active <b><?=e($statusCounts['active'] ?? 0)?></b></a>
            <a class="admin-filter-pill <?=$client_filter==='inactive'?'active':''?>" href="clients.php?filter=inactive<?=$client_search_param?>">Inactive <b><?=e($statusCounts['inactive'] ?? 0)?></b></a>
            <a class="admin-filter-pill <?=$client_filter==='rejected'?'active':''?>" href="clients.php?filter=rejected<?=$client_search_param?>">Rejected <b><?=e($statusCounts['rejected'] ?? 0)?></b></a>
            <a class="admin-filter-pill <?=$client_filter==='otp_needed'?'active':''?>" href="clients.php?filter=otp_needed<?=$client_search_param?>">OTP Needed <b><?=e($otpNeeded)?></b></a>
            <a class="admin-filter-pill <?=$client_filter==='clients'?'active':''?>" href="clients.php?filter=clients<?=$client_search_param?>">Clients <b><?=e($totalClients)?></b></a>
        </div>

        <form class="admin-list-search" method="GET" action="clients.php">
            <?php if($client_filter !== 'all'): ?><input type="hidden" name="filter" value="<?=e($client_filter)?>"><?php endif; ?>
            <input class="form-control" type="search" name="q" value="<?=e($client_search)?>" placeholder="Search client name, email, phone, address, status...">
            <button class="btn btn-primary" type="submit">Search</button>
            <a class="btn btn-light" href="clients.php<?= $client_filter !== 'all' ? '?filter='.urlencode($client_filter) : '' ?>">Clear</a>
        </form>

        <div class="user-card-list">
        <?php if(empty($visibleClientRows)): ?>
            <div class="admin-empty-card">No client accounts found for this filter or search.</div>
        <?php endif; foreach($visibleClientRows as $r): ?>
            <article class="user-review-card client-account-card">
                <div class="user-main-info">
                    <div class="user-avatar-wrap">
                        <span><?=e(strtoupper(substr(trim($r['full_name'] ?: $r['email']),0,1)))?></span>
                    </div>
                    <div class="user-title-block">
                        <div class="user-name-row">
                            <h4><?=e($r['full_name'])?></h4>
                            <?=badge($r['status'])?>
                        </div>
                        <p class="user-email"><?=e($r['email'])?></p>
                        <div class="user-detail-chips">
                            <span>Client Account</span>
                            <span><?=e(ucwords(str_replace('_',' ', $r['account_source'] ?: 'self registered')))?></span>
                            <?php if(!empty($r['otp_verified_at'])): ?><span class="chip-success">OTP Used</span>
                            <?php elseif(($r['status'] ?? '')==='approved'): ?><span class="chip-warning">OTP Needed</span>
                            <?php else: ?><span>Verification monitored</span><?php endif; ?>
                        </div>
                        <div class="user-mini-details">
                            <p><b>Phone:</b> <?=e($r['phone'] ?: 'Not provided')?></p>
                            <p><b>Address:</b> <?=e($r['address'] ?: 'Not provided')?></p>
                            <p><b>Created by:</b> <?=e($r['created_by_name'] ?: 'Owner/system')?></p>
                            <p><b>Approved by:</b> <?=e($r['approved_by_name'] ?: 'N/A')?></p>
                            <p><b>Created:</b> <?=e(!empty($r['created_at']) ? date('M d, Y', strtotime($r['created_at'])) : 'N/A')?></p>
                            <p><b>Linked Pets:</b> <?=e($r['pet_count'] ?? 0)?></p>
                        </div>
                    </div>
                </div>

                <div class="user-management-panel client-account-view-panel">
                    <h5>Account Summary</h5>
                    <p><b>Status:</b> <?=e(ucwords($r['status'] ?: 'N/A'))?></p>
                    <p><b>Source:</b> <?=e(ucwords(str_replace('_',' ', $r['account_source'] ?: 'self registered')))?></p>
                    <p><b>Pets Registered:</b> <?=e($r['pet_count'] ?? 0)?></p>
                    <p><b>OTP:</b>
                        <?php if(!empty($r['otp_verified_at'])): ?>Verified
                        <?php elseif(($r['status'] ?? '')==='approved'): ?>Waiting for client
                        <?php else: ?>Not required yet<?php endif; ?>
                    </p>
                    <a class="btn btn-sm btn-outline-primary mt-2" href="users.php?filter=clients">Manage in User Management</a>
                </div>
            </article>
        <?php endforeach; ?>
        </div>
    </section>
</div>
</main>
</div>
<?php include "../includes/footer.php"; ?>
