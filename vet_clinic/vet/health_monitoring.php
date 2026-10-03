<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("veterinarian");
$title="Pet Health Monitoring";
include "../includes/header.php";
include "../includes/navbar.php";
$health_search = trim($_GET['q'] ?? '');
$health_where = '';
if ($health_search !== '') {
    $safeHealthSearch = $conn->real_escape_string($health_search);
    $health_where = "WHERE p.name LIKE '%$safeHealthSearch%' OR p.species LIKE '%$safeHealthSearch%' OR p.breed LIKE '%$safeHealthSearch%' OR p.color LIKE '%$safeHealthSearch%' OR p.allergies LIKE '%$safeHealthSearch%' OR p.critical_notes LIKE '%$safeHealthSearch%' OR p.notes LIKE '%$safeHealthSearch%' OR u.full_name LIKE '%$safeHealthSearch%' OR u.email LIKE '%$safeHealthSearch%' OR u.phone LIKE '%$safeHealthSearch%'";
}
$rows=$conn->query("SELECT p.*,u.full_name owner_name,u.phone,u.email FROM pets p JOIN users u ON p.owner_id=u.id $health_where ORDER BY p.updated_at DESC, p.created_at DESC");
$total=$conn->query("SELECT COUNT(*) c FROM pets")->fetch_assoc()['c'];
$approved=$conn->query("SELECT COUNT(*) c FROM pets WHERE verification_status='approved'")->fetch_assoc()['c'];
$pending=$conn->query("SELECT COUNT(*) c FROM pets WHERE verification_status='pending'")->fetch_assoc()['c'];
?>
<div class="layout"><?php include "../includes/vet_sidebar.php"; ?>
<main class="content">
<section class="hero admin-hero-banner mb-4"><h1>Pet Health Monitoring</h1><p>Review pet health notes, allergies, owner details, and AI-assisted monitoring reminders using the same clean clinic-card layout.</p></section>

<div class="reference-filter-bar" id="healthFilterBar">
    <button type="button" class="reference-filter-chip active" data-filter="all">All Pets <span class="count"><?=$total?></span></button>
    <button type="button" class="reference-filter-chip" data-filter="approved">Approved <span class="count"><?=$approved?></span></button>
    <button type="button" class="reference-filter-chip" data-filter="pending">Pending <span class="count"><?=$pending?></span></button>
</div>

<form class="admin-list-search" method="GET" action="health_monitoring.php">
    <input class="form-control" type="search" name="q" value="<?=e($health_search)?>" placeholder="Search pet, owner, allergy, critical note, or care note...">
    <button class="btn btn-primary" type="submit">Search</button>
    <a class="btn btn-light" href="health_monitoring.php">Clear</a>
</form>

<div class="reference-list">
<?php if($rows->num_rows===0): ?><div class="soft-card"><h3>No pets found</h3><p class="text-muted">Try another status filter or search term.</p></div><?php endif; ?>
<?php while($p=$rows->fetch_assoc()): ?>
    <details class="reference-expand-card" data-status="<?=e(strtolower($p['verification_status'] ?? 'registered'))?>">
        <summary class="reference-expand-summary">
            <div class="reference-icon reference-icon-sm">
                <?php if(!empty($p['pet_photo'])): ?><img src="<?=app_url(e($p['pet_photo']))?>" alt="Pet photo"><?php else: ?>PET<?php endif; ?>
            </div>
            <div class="reference-expand-head">
                <div class="reference-title-row compact"><h2><?=e($p['name'])?></h2><?=badge($p['verification_status'] ?? 'registered')?></div>
                <p class="reference-subtitle mb-0"><?=e($p['owner_name'])?> &middot; <?=e($p['email'] ?? '')?></p>
            </div>
            <div class="reference-quick-meta">
                <span>Pet Info</span>
                <strong><?=e($p['species'])?> &middot; <?=e($p['breed'] ?: 'Breed not set')?></strong>
            </div>
            <div class="reference-quick-meta hide-sm">
                <span>Health Alert</span>
                <strong><?=e($p['critical_notes'] ?: 'No critical notes')?></strong>
            </div>
            <span class="reference-expand-pill">View details</span>
        </summary>
        <div class="reference-expand-body">
            <div class="reference-expand-info">
                <div class="reference-tags">
                    <span class="reference-tag"><?=e($p['species'])?></span>
                    <span class="reference-tag"><?=e($p['breed'] ?: 'Breed not set')?></span>
                    <span class="reference-tag">Age: <?=e(pet_age($p['birth_date']))?></span>
                </div>
                <div class="reference-details">
                    <div class="reference-detail"><label>Owner Contact</label><strong><?=e($p['phone'] ?: 'No phone saved')?></strong></div>
                    <div class="reference-detail"><label>Weight</label><strong><?=e($p['weight'] ?: '0')?> kg</strong></div>
                    <div class="reference-detail"><label>Color / Markings</label><strong><?=e($p['color'] ?: 'Not specified')?></strong></div>
                    <div class="reference-detail"><label>Behavior / Habits</label><strong><?=e($p['notes'] ?: 'No notes saved.')?></strong></div>
                </div>
            </div>
            <aside class="reference-summary">
                <h3>Health Summary</h3>
                <p><b>Critical Notes:</b> <?=e($p['critical_notes'] ?: 'No critical notes.')?></p>
                <p><b>Allergies:</b> <?=e($p['allergies'] ?: 'No allergies saved.')?></p>
                <p><b>Last Updated:</b> <?=e(!empty($p['updated_at']) ? date('M d, Y h:i A', strtotime($p['updated_at'])) : 'Not updated')?></p>
                <p><b>AI-assisted status:</b> Use saved symptoms and consultation history as guide. Final diagnosis must still be confirmed by the veterinarian.</p>
                <a class="btn btn-primary rounded-pill w-100" href="<?=app_url('vet/pets.php?edit='.(int)$p['id'])?>">Edit Pet Details</a>
            </aside>
        </div>
    </details>
<?php endwhile; ?>
    <div class="soft-card reference-empty-filter" id="healthEmptyFilter" style="display:none;"><h3>No pets found for this filter</h3><p class="text-muted">Try selecting another pet status.</p></div>
</div>
<script>
document.addEventListener('DOMContentLoaded', function(){
    const filterBar = document.getElementById('healthFilterBar');
    const cards = Array.from(document.querySelectorAll('.reference-expand-card[data-status]'));
    const emptyState = document.getElementById('healthEmptyFilter');
    if(!filterBar || !cards.length) return;

    filterBar.addEventListener('click', function(event){
        const chip = event.target.closest('.reference-filter-chip');
        if(!chip) return;
        event.preventDefault();
        event.stopPropagation();

        const selected = (chip.dataset.filter || 'all').toLowerCase();
        filterBar.querySelectorAll('.reference-filter-chip').forEach(btn => btn.classList.remove('active'));
        chip.classList.add('active');

        let shown = 0;
        cards.forEach(card => {
            const status = (card.dataset.status || '').toLowerCase();
            const match = selected === 'all' || status === selected;
            card.style.display = match ? '' : 'none';
            if(!match) card.removeAttribute('open');
            if(match) shown++;
        });
        if(emptyState) emptyState.style.display = shown ? 'none' : '';
    });
});
</script>
</main></div><?php include "../includes/footer.php"; ?>
