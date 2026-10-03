USE vet_clinic;

CREATE TABLE IF NOT EXISTS pet_update_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    updated_by INT NOT NULL,
    changes_summary TEXT,
    old_values TEXT NULL,
    new_values TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pet_update_logs_pet_id (pet_id),
    INDEX idx_pet_update_logs_updated_by (updated_by)
);
