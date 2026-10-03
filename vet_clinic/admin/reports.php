<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

$title = "Reports";
include "../includes/header.php";
include "../includes/navbar.php";

$totalPets = $conn->query("SELECT COUNT(*) c FROM pets WHERE verification_status='approved'")->fetch_assoc()['c'];
$totalClients = $conn->query("SELECT COUNT(*) c FROM users WHERE role='client'")->fetch_assoc()['c'];
$totalRecords = $conn->query("SELECT COUNT(*) c FROM medical_records")->fetch_assoc()['c'];
$totalAppointments = $conn->query("SELECT COUNT(*) c FROM appointments")->fetch_assoc()['c'];
?>
<div class="layout">
<?php include "../includes/admin_sidebar.php"; ?>
<main class="content">
<section class="hero admin-hero-banner mb-4">
    <h1>Clinic Reporting Center</h1>
    <p>Generate printable reports and save them as PDF using your browser. Works fully on XAMPP localhost.</p>
</section>

<div class="row g-3 mb-4">
    <div class="col-lg-3 col-md-6">
        <div class="stat-card report-stat-card">
            <div class="report-stat-top">
                <span class="report-stat-icon">CL</span>
                <span class="report-stat-title">Clients</span>
            </div>
            <div class="report-stat-number"><?= $totalClients ?></div>
            <div class="report-stat-note">Registered client accounts in the system</div>
        </div>
    </div>
    <div class="col-lg-3 col-md-6">
        <div class="stat-card report-stat-card">
            <div class="report-stat-top">
                <span class="report-stat-icon">PT</span>
                <span class="report-stat-title">Pets</span>
            </div>
            <div class="report-stat-number"><?= $totalPets ?></div>
            <div class="report-stat-note">Pet profiles available for reporting</div>
        </div>
    </div>
    <div class="col-lg-3 col-md-6">
        <div class="stat-card report-stat-card">
            <div class="report-stat-top">
                <span class="report-stat-icon">MR</span>
                <span class="report-stat-title">Records</span>
            </div>
            <div class="report-stat-number"><?= $totalRecords ?></div>
            <div class="report-stat-note">Medical records saved in the clinic database</div>
        </div>
    </div>
    <div class="col-lg-3 col-md-6">
        <div class="stat-card report-stat-card">
            <div class="report-stat-top">
                <span class="report-stat-icon">AP</span>
                <span class="report-stat-title">Appointments</span>
            </div>
            <div class="report-stat-number"><?= $totalAppointments ?></div>
            <div class="report-stat-note">Appointment entries included in reports</div>
        </div>
    </div>
</div>

<div class="report-grid">
    <div class="report-card">
        <h3>Pet Medical Report</h3>
        <p class="text-muted">Complete pet profile, owner details, medical history, vaccination records, and QR emergency notes.</p>
        <form action="report_pet.php" method="GET">
            <select class="form-select mb-2" name="pet_id" required>
                <option value="">Select pet</option>
                <?php $pets=$conn->query("SELECT p.id,p.name,u.full_name FROM pets p JOIN users u ON p.owner_id=u.id WHERE p.verification_status='approved' ORDER BY p.name"); while($p=$pets->fetch_assoc()): ?>
                    <option value="<?= $p['id'] ?>"><?= e($p['name']) ?> - <?= e($p['full_name']) ?></option>
                <?php endwhile; ?>
            </select>
            <button class="btn btn-primary w-100">Open Printable Report</button>
        </form>
    </div>

    <div class="report-card">
        <h3>Appointment Report</h3>
        <p class="text-muted">Daily, weekly, or custom date-range appointment summary with statuses.</p>
        <form action="report_appointments.php" method="GET">
            <label class="small fw-bold">From</label>
            <input class="form-control mb-2" type="date" name="from" value="<?= date('Y-m-01') ?>">
            <label class="small fw-bold">To</label>
            <input class="form-control mb-2" type="date" name="to" value="<?= date('Y-m-t') ?>">
            <button class="btn btn-primary w-100">Open Printable Report</button>
        </form>
    </div>

    <div class="report-card">
        <h3>Vaccination Due Report</h3>
        <p class="text-muted">Pets with vaccines due soon, useful for reminders and follow-ups.</p>
        <form action="report_vaccinations.php" method="GET">
            <label class="small fw-bold">Due within days</label>
            <select class="form-select mb-2" name="days">
                <option value="30">30 days</option>
                <option value="60" selected>60 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
            </select>
            <button class="btn btn-primary w-100">Open Printable Report</button>
        </form>
    </div>

    <div class="report-card">
        <h3>Client & Pet Directory</h3>
        <p class="text-muted">Printable directory of clients, contact details, and registered pets.</p>
        <div class="report-actions">
            <a class="btn btn-primary w-100" href="report_clients.php">Open Printable Report</a>
        </div>
    </div>

    <div class="report-card">
        <h3>QR Emergency Report</h3>
        <p class="text-muted">Emergency printable profile from QR token, including contact, allergies, and critical notes.</p>
        <form action="report_emergency.php" method="GET">
            <input class="form-control mb-2" name="token" placeholder="Paste QR token">
            <button class="btn btn-primary w-100">Open Emergency Report</button>
        </form>
    </div>

    <div class="report-card">
        <h3>Clinic Analytics Report</h3>
        <p class="text-muted">Summary of appointments, species, records, vaccinations, feedback, and clinic activity.</p>
        <a class="btn btn-primary w-100" href="report_analytics.php">Open Analytics Report</a>
    </div>
</div>

</main>
</div>
<?php include "../includes/footer.php"; ?>
