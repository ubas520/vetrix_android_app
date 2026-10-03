USE vet_clinic;

ALTER TABLE users MODIFY role ENUM('admin','veterinarian','staff','client') NOT NULL DEFAULT 'client';
ALTER TABLE users MODIFY status ENUM('pending','approved','active','inactive','rejected') NOT NULL DEFAULT 'pending';

ALTER TABLE appointments ADD COLUMN assigned_vet_id INT NULL AFTER scheduled_date;
ALTER TABLE appointments ADD COLUMN confirmation_code VARCHAR(40) NULL AFTER assigned_vet_id;
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_assigned_vet FOREIGN KEY (assigned_vet_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS pos_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NULL,
    handled_by INT NULL,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) DEFAULT 0,
    payment_status ENUM('pending','paid','cancelled') DEFAULT 'paid',
    notes TEXT,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(120) NOT NULL,
    category VARCHAR(80),
    stock_qty INT DEFAULT 0,
    unit VARCHAR(40),
    reorder_level INT DEFAULT 5,
    status ENUM('available','low_stock','out_of_stock','inactive') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    movement_type ENUM('stock_in','stock_out') NOT NULL,
    quantity INT NOT NULL,
    remarks TEXT,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT IGNORE INTO users (full_name, email, phone, emergency_contact, address, password, role, account_source, created_by, status) VALUES
('Dr. Reyes', 'vet@vetclinic.test', '09170000004', 'Clinic Front Desk', 'Vetrix Main Clinic', '$2y$12$.irI8.gJsrDeEyde9oebEOpepfR1llMqC3QvBxcB9wxXdw/b.hP8G', 'veterinarian', 'system_seed', NULL, 'active'),
('Front Desk Staff', 'staff@vetclinic.test', '09170000005', 'Clinic Front Desk', 'Vetrix Main Clinic', '$2y$12$.irI8.gJsrDeEyde9oebEOpepfR1llMqC3QvBxcB9wxXdw/b.hP8G', 'staff', 'system_seed', NULL, 'active');
