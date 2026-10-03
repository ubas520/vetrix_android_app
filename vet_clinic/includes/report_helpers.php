<?php
function report_header($title, $subtitle='') {
    $date = date('F d, Y h:i A');
    return "
    <div class='print-header'>
        <div>
            <div class='print-title'>🐾 Vetrix</div>
            <div>Veterinary Clinic Management System</div>
            <div class='small text-muted'>Localhost / XAMPP Development Report</div>
        </div>
        <div style='text-align:right'>
            <h2 style='margin:0'>$title</h2>
            <div>$subtitle</div>
            <div class='small text-muted'>Generated: $date</div>
        </div>
    </div>";
}

function report_actions() {
    return "<div class='no-print-actions'>
        <button onclick='window.print()' class='btn btn-primary'>Print / Save as PDF</button>
        <button onclick='history.back()' class='btn btn-light'>Back</button>
    </div>";
}

function clean_report($value) {
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}
?>
