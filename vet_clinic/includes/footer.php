<?php if (($_SESSION['role'] ?? '') === 'admin'): ?>
    <?php $adminDarkVersion = file_exists(__DIR__ . "/../assets/css/admin-dark.css") ? filemtime(__DIR__ . "/../assets/css/admin-dark.css") : time(); ?>
    <link href="<?= app_url('assets/css/admin-dark.css') ?>?v=<?= e($adminDarkVersion) ?>" rel="stylesheet">
<?php endif; ?>

<?php if (is_logged_in()): ?>
<div class="floating-ai" id="floatingAi">
    <button class="floating-ai-button" type="button" onclick="toggleFloatingChat()" aria-label="Open Vetrix chatbot">
        <span>AI</span>
        <b>Vetrix</b>
    </button>
    <section class="floating-ai-panel" id="floatingAiPanel" aria-label="Floating Vetrix Chatbot">
        <div class="floating-ai-head">
            <div>
                <b>Vetrix Chatbot</b>
                <small>Simple pet help, anytime</small>
            </div>
            <button type="button" onclick="toggleFloatingChat(false)">&times;</button>
        </div>
        <div class="floating-ai-body" id="floatingAiBody">
            <div class="float-msg bot">Hi! I can help explain appointments, pet records, QR retrieval, or basic pet symptoms.</div>
        </div>
        <div class="floating-ai-chips">
            <button type="button" onclick="askFloatingAI('How do appointments work?')">Appointments</button>
            <button type="button" onclick="askFloatingAI('My dog is vomiting')">Dog vomiting</button>
            <button type="button" onclick="askFloatingAI('How to use QR retrieval?')">QR help</button>
        </div>
        <div class="floating-ai-input">
            <input id="floatingAiInput" placeholder="Type your question..." onkeydown="if(event.key==='Enter')sendFloatingAI()">
            <button type="button" onclick="sendFloatingAI()">Send</button>
        </div>
        <small class="floating-ai-note">For emergency symptoms, contact the clinic or veterinarian right away.</small>
    </section>
</div>
<?php endif; ?>
<script>
window.VETRIX_BASE = document.body?.dataset?.appBase || '/vet_clinic/';
</script>
<script src="<?= app_url('assets/js/app.js') ?>"></script>
</body>
</html>
