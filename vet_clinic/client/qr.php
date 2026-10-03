<?php require_once "../config/database.php"; require_once "../includes/pet_qr.php"; require_role("client");$uid=(int)current_user_id();$title="QR"; include "../includes/header.php"; include "../includes/navbar.php";?>
<div class="layout"><?php include "../includes/client_sidebar.php";?>
<main class="content">
    <section class="hero client-hero-banner mb-4">
        <h1>My QR Codes</h1>
        <p>Show your pet QR code at the clinic so staff can quickly check the correct pet record and retrieval details.</p>
    </section>

    <div class="row g-3">
        <?php $rows=$conn->query("SELECT q.*,p.name pet_name FROM qr_tokens q JOIN pets p ON q.pet_id=p.id WHERE p.owner_id=$uid AND p.verification_status='approved' AND q.status='active' AND (q.expires_at IS NULL OR q.expires_at>NOW())");while($r=$rows->fetch_assoc()): $qrUrl=pet_qr_url($r['token']); ?>
            <div class="col-md-6">
                <div class="qr-card">
                    <h2><?=e($r['pet_name'])?></h2>
                    <img width="220" height="220" alt="Scannable QR for <?=e($r['pet_name'])?>" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&qzone=4&data=<?=urlencode($qrUrl)?>">
                    <p><b>Token:</b> <?=e($r['token'])?></p>
                    <p>Scan with a phone camera, then sign in to view this pet's protected web record.</p>
                    <a class="btn btn-primary" href="<?=e(app_url(pet_qr_path($r['token'])))?>">Open web record</a>
                </div>
            </div>
        <?php endwhile;?>
        <?php if (!$rows->num_rows): ?><p>No active QR codes yet. QR access is available after clinic approval.</p><?php endif; ?>
    </div>
</main>
</div><?php include "../includes/footer.php";?>
