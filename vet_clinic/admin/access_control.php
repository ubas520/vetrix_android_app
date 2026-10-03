<?php require_once "../config/database.php"; require_once "../includes/functions.php"; require_role("admin"); $title="Role Access Matrix"; include "../includes/header.php"; include "../includes/navbar.php"; ?>
<div class="layout"><?php include "../includes/admin_sidebar.php"; ?><main class="content">
<section class="hero admin-hero-banner mb-4"><h1>User Levels and Access</h1><p>Panel-suggested role distribution for Admin, Veterinarian, Staff, and Client.</p></section>
<div class="analytics-grid">
<?php
$cards = [
['Admin','Overall system operations, approvals, monitoring, scheduling, reports, POS reporting, inventory oversight, and vaccination reminders.','User Management, Verification, Appointments, Dashboard and Analytics, POS Reports, Inventory Management, Reports, Notifications, QR access, Activity Logs','Cannot process daily POS transactions, create medical records, or record actual vaccine details; these are handled by Staff and Veterinarian roles.'],
['Veterinarian','Medical records, diagnosis, treatment, vaccination, and pet health monitoring.','Assigned Appointments, Medical Records, Diagnosis and Treatment, Vaccination Records, Pet Health Monitoring, Consultation Management','Cannot manage system settings, administrative accounts, inventory/POS configuration, or staff approval.'],
['Staff','Front desk operations, appointment assistance, POS/cashier processing, inventory stock updates, and client support.','Front Desk Management, Scheduling, POS Management, Inventory Updates, Payment Processing, QR Scan Access','Cannot assign roles, manage system configuration, access full analytics, create admin inventory products, or modify veterinarian diagnosis.'],
['Client','Pet owner using the mobile application.','Pet Profiles, Appointment Booking, Notifications, Medical Records, Feedback System, AI Chatbot, QR record retrieval','Cannot modify approved medical records, access reports/analytics, view other accounts, or manage schedules/settings.']
];
foreach($cards as $c): ?>
<div class="soft-card"><h3><?=e($c[0])?></h3><p><?=e($c[1])?></p><hr><b>Modules</b><p class="text-muted"><?=e($c[2])?></p><b>Restrictions</b><p class="text-muted mb-0"><?=e($c[3])?></p></div>
<?php endforeach; ?>
</div>
</main></div><?php include "../includes/footer.php"; ?>
