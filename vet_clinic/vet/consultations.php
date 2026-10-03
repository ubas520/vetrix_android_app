<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("veterinarian");

$consult_search = trim($_GET['q'] ?? '');
$consult_where = '';
if ($consult_search !== '') {
    $safeConsultSearch = $conn->real_escape_string($consult_search);
    $consult_where = "WHERE p.name LIKE '%$safeConsultSearch%' OR u.full_name LIKE '%$safeConsultSearch%' OR m.veterinarian LIKE '%$safeConsultSearch%' OR m.diagnosis LIKE '%$safeConsultSearch%' OR m.treatment LIKE '%$safeConsultSearch%' OR m.prescription LIKE '%$safeConsultSearch%' OR m.notes LIKE '%$safeConsultSearch%'";
}

$summary = $conn->query("SELECT COUNT(*) total_consults, SUM(visit_date=CURDATE()) today_consults, COUNT(DISTINCT pet_id) pets_seen FROM medical_records")->fetch_assoc();
$rows = $conn->query("SELECT m.*, p.name pet_name, u.full_name owner_name
    FROM medical_records m
    JOIN pets p ON m.pet_id=p.id
    JOIN users u ON p.owner_id=u.id
    $consult_where
    ORDER BY m.visit_date DESC, m.id DESC");

$title = "Consultation Management";
include "../includes/header.php";
include "../includes/navbar.php";
?>
<div class="layout"><?php include "../includes/vet_sidebar.php"; ?>
<main class="content">
    <section class="hero admin-hero-banner mb-4">
        <h1>Consultation Summaries</h1>
        <p>Review previous consultations in a searchable card feed with diagnosis, treatment, prescription, and notes.</p>
    </section>

    <section class="admin-summary-grid mb-4">
        <div class="admin-summary-card"><span>Total Consults</span><b><?= (int)($summary['total_consults'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Today</span><b><?= (int)($summary['today_consults'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Pets Seen</span><b><?= (int)($summary['pets_seen'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Visible Results</span><b><?= (int)$rows->num_rows ?></b></div>
    </section>

    <section class="admin-filter-panel mb-4">
        <form class="admin-list-search" method="GET" action="consultations.php">
            <input class="form-control" type="search" name="q" value="<?= e($consult_search) ?>" placeholder="Search pet, owner, diagnosis, treatment, prescription...">
            <button class="btn btn-primary" type="submit">Search</button>
            <a class="btn btn-light" href="consultations.php">Clear</a>
        </form>
    </section>

    <section class="admin-workflow-card">
        <div class="section-head mb-3">
            <div>
                <h3>Consultation Feed</h3>
                <p class="text-muted mb-0">Latest completed records shown first.</p>
            </div>
        </div>

        <?php if($rows->num_rows === 0): ?>
            <div class="admin-empty-state">
                <h3>No consultations found</h3>
                <p>Try another search term or add a medical record first.</p>
            </div>
        <?php else: ?>
            <div class="admin-card-list">
                <?php while($r = $rows->fetch_assoc()): ?>
                    <article class="admin-review-card">
                        <div class="admin-review-main">
                            <div class="admin-row-title">
                                <h3><?= e($r['pet_name']) ?></h3>
                                <span><?= e($r['visit_date'] ?: 'No date') ?></span>
                            </div>
                            <p><?= e($r['diagnosis'] ?: 'No diagnosis saved.') ?></p>
                            <div class="admin-meta-row">
                                <span>Owner: <?= e($r['owner_name']) ?></span>
                                <span>Vet: <?= e($r['veterinarian'] ?: 'Not specified') ?></span>
                            </div>
                            <div class="admin-compare-grid">
                                <div><span>Treatment</span><p><?= e($r['treatment'] ?: 'No treatment saved.') ?></p></div>
                                <div><span>Prescription</span><p><?= e($r['prescription'] ?: 'No prescription saved.') ?></p></div>
                            </div>
                            <?php if(!empty($r['notes'])): ?>
                                <div class="admin-note-box"><?= e($r['notes']) ?></div>
                            <?php endif; ?>
                        </div>
                    </article>
                <?php endwhile; ?>
            </div>
        <?php endif; ?>
    </section>
</main>
</div>
<?php include "../includes/footer.php"; ?>
