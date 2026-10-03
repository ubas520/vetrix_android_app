<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("client");

$title = "Download Mobile App";
include "../includes/header.php";
include "../includes/navbar.php";
?>
<div class="layout">
    <?php include "../includes/client_sidebar.php"; ?>
    <main class="content">
        <section class="hero client-hero-banner hero-friendly no-hero-bubbles mb-4">
            <div>
                <h1>Download Mobile App</h1>
                <p>Scan the QR code to download the client mobile app. This is a temporary QR code while the real app link is not yet available.</p>
            </div>
        </section>

        <div class="download-app-layout">
            <section class="soft-card download-app-card">
                <div class="download-app-label">Client Side</div>
                <h2>Scan to Download App</h2>
                <p class="text-muted">Use your phone camera or QR scanner. For now, this QR uses a placeholder app download link until the final mobile app is created.</p>
                <div class="download-qr-frame">
                    <img src="<?= app_url('assets/images/client_app_download_qr.png') ?>" alt="Temporary QR code for downloading the client mobile app">
                </div>
                <div class="download-app-note">
                    <strong>Temporary link:</strong>
                    <span>vetrix-clinic.example.com/download-app</span>
                </div>
            </section>

            <section class="soft-card download-instructions-card">
                <div class="card-title-row"><h3>How to use</h3><span>Simple guide</span></div>
                <div class="download-steps">
                    <div><b>1</b><span>Open your phone camera or QR scanner.</span></div>
                    <div><b>2</b><span>Point it at the QR code on the left.</span></div>
                    <div><b>3</b><span>Tap the link that appears on your phone.</span></div>
                    <div><b>4</b><span>Download the app once the real app file or store link is ready.</span></div>
                </div>
                <div class="download-placeholder-warning">
                    <b>Note:</b> This QR is only a mockup/placeholder. Replace the QR data later with your real APK, Play Store, or app download URL.
                </div>
            </section>
        </div>
    </main>
</div>
<?php include "../includes/footer.php"; ?>
