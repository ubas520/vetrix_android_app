<?php require_once "../config/database.php"; require_once "../includes/functions.php"; require_role("admin");
$title='Export Tools'; include "../includes/header.php"; include "../includes/navbar.php"; ?>
<div class="layout"><?php include "../includes/admin_sidebar.php"; ?><main class="content">
<section class="hero mb-4"><h1>Backup & Export Tools</h1><p>Export clinic data as CSV files for backup, spreadsheet review, or documentation.</p></section>
<div class="report-grid">
<div class="report-card"><h3>Clients CSV</h3><p class="text-muted">Export all client contact details.</p><a class="btn btn-primary w-100" href="../api/export_csv.php?type=clients">Download</a></div>
<div class="report-card"><h3>Pets CSV</h3><p class="text-muted">Export all pet profile data.</p><a class="btn btn-primary w-100" href="../api/export_csv.php?type=pets">Download</a></div>
<div class="report-card"><h3>Appointments CSV</h3><p class="text-muted">Export appointment list.</p><a class="btn btn-primary w-100" href="../api/export_csv.php?type=appointments">Download</a></div>
<div class="report-card"><h3>Medical Records CSV</h3><p class="text-muted">Export medical records.</p><a class="btn btn-primary w-100" href="../api/export_csv.php?type=records">Download</a></div>
</div>
</main></div><?php include "../includes/footer.php"; ?>
