-- Client Account Verification + One-Time OTP Update
-- Run this on an existing vet_clinic database if you do not want to re-import database.sql.

ALTER TABLE users
    ADD COLUMN approved_by INT NULL AFTER status,
    ADD COLUMN approved_at DATETIME NULL AFTER approved_by,
    ADD COLUMN rejected_at DATETIME NULL AFTER approved_at,
    ADD COLUMN otp_verified_at DATETIME NULL AFTER rejected_at;

CREATE TABLE IF NOT EXISTS account_verification_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    purpose ENUM('account_activation','password_reset') DEFAULT 'account_activation',
    status ENUM('active','used','expired') DEFAULT 'active',
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_outbox (
    id INT AUTO_INCREMENT PRIMARY KEY,
    to_email VARCHAR(160) NOT NULL,
    to_name VARCHAR(160),
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    email_type VARCHAR(80) DEFAULT 'system',
    status ENUM('queued','sent','failed') DEFAULT 'queued',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Existing demo/client accounts are marked as already verified so they can still log in.
UPDATE users
SET status='approved', approved_at=COALESCE(approved_at, NOW()), otp_verified_at=COALESCE(otp_verified_at, NOW())
WHERE role='client' AND account_source='system_seed';
