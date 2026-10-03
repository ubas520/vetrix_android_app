CREATE DATABASE IF NOT EXISTS vet_clinic;
USE vet_clinic;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS email_outbox;
DROP TABLE IF EXISTS account_verification_tokens;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS qr_tokens;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS vaccinations;
DROP TABLE IF EXISTS medical_records;
DROP TABLE IF EXISTS edit_requests;
DROP TABLE IF EXISTS pet_update_logs;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS inventory_movements;
DROP TABLE IF EXISTS pos_transaction_items;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS pos_transactions;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(30),
    emergency_contact VARCHAR(120),
    address VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','veterinarian','staff','client') NOT NULL DEFAULT 'client',
    account_source ENUM('self_registered','admin_created','system_seed') DEFAULT 'self_registered',
    created_by INT NULL,
    status ENUM('pending','approved','active','inactive','rejected') NOT NULL DEFAULT 'pending',
    approved_by INT NULL,
    approved_at DATETIME NULL,
    rejected_at DATETIME NULL,
    otp_verified_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE account_verification_tokens (
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

CREATE TABLE email_outbox (
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

CREATE TABLE pets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50),
    breed VARCHAR(80),
    sex VARCHAR(20),
    birth_date DATE,
    weight DECIMAL(6,2),
    color VARCHAR(50),
    allergies TEXT,
    critical_notes TEXT,
    notes TEXT,
    pet_photo VARCHAR(255) NULL,
    verification_status ENUM('pending','approved','rejected','in_person_confirmation') DEFAULT 'pending',
    verification_notes TEXT NULL,
    verified_by INT NULL,
    verified_at TIMESTAMP NULL DEFAULT NULL,
    last_updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE pet_update_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    updated_by INT NOT NULL,
    changes_summary TEXT,
    old_values TEXT NULL,
    new_values TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE edit_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    client_id INT NOT NULL,
    field_name VARCHAR(80),
    old_value TEXT,
    new_value TEXT,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    veterinarian VARCHAR(120),
    visit_date DATE NOT NULL,
    symptoms TEXT,
    diagnosis TEXT,
    treatment TEXT,
    prescription TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE TABLE vaccinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    vaccine_name VARCHAR(120) NOT NULL,
    date_given DATE,
    next_due_date DATE,
    administered_by VARCHAR(120),
    remarks TEXT,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    pet_id INT NOT NULL,
    requested_date DATETIME NOT NULL,
    scheduled_date DATETIME NULL,
    assigned_vet_id INT NULL,
    confirmation_code VARCHAR(40) NULL,
    reason TEXT,
    status ENUM('pending','approved','completed','cancelled') DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_vet_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE qr_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    token VARCHAR(120) UNIQUE NOT NULL,
    expires_at DATETIME,
    status ENUM('active','revoked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(160),
    message TEXT,
    type ENUM('system','appointment','vaccine','record','qr','feedback') DEFAULT 'system',
    status ENUM('unread','read') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    appointment_id INT NULL,
    rating INT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY feedback_appointment_unique (appointment_id),
    CONSTRAINT feedback_appointment_fk FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE pos_transactions (
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

CREATE TABLE inventory_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(60) NULL,
    item_name VARCHAR(120) NOT NULL,
    category VARCHAR(80),
    sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_qty INT DEFAULT 0,
    unit VARCHAR(40),
    reorder_level INT DEFAULT 5,
    status ENUM('available','low_stock','out_of_stock','inactive') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE pos_transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    item_id INT NULL,
    item_name VARCHAR(160) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 1,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE SET NULL
);

CREATE TABLE inventory_movements (
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

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT,
    action VARCHAR(160),
    entity_type VARCHAR(80),
    entity_id INT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (full_name, email, phone, emergency_contact, address, password, role, account_source, created_by, status, approved_at, otp_verified_at) VALUES
('Clinic Administrator', 'admin@vetclinic.test', '09170000001', 'Clinic Front Desk', 'Vetrix Main Clinic', '$2y$12$.irI8.gJsrDeEyde9oebEOpepfR1llMqC3QvBxcB9wxXdw/b.hP8G', 'admin', 'system_seed', NULL, 'active', NOW(), NOW()),
('Dr. Reyes', 'vet@vetclinic.test', '09170000004', 'Clinic Front Desk', 'Vetrix Main Clinic', '$2y$12$.irI8.gJsrDeEyde9oebEOpepfR1llMqC3QvBxcB9wxXdw/b.hP8G', 'veterinarian', 'system_seed', NULL, 'active', NOW(), NOW()),
('Front Desk Staff', 'staff@vetclinic.test', '09170000005', 'Clinic Front Desk', 'Vetrix Main Clinic', '$2y$12$.irI8.gJsrDeEyde9oebEOpepfR1llMqC3QvBxcB9wxXdw/b.hP8G', 'staff', 'system_seed', NULL, 'active', NOW(), NOW()),
('Maria Santos', 'client@vetclinic.test', '09170000002', 'Juan Santos - 09179999999', 'Ramon, Isabela', '$2y$12$.irI8.gJsrDeEyde9oebEOpepfR1llMqC3QvBxcB9wxXdw/b.hP8G', 'client', 'system_seed', NULL, 'approved', NOW(), NOW()),
('Juan Dela Cruz', 'juan@vetclinic.test', '09170000003', 'Ana Dela Cruz - 09178888888', 'Cauayan City', '$2y$12$.irI8.gJsrDeEyde9oebEOpepfR1llMqC3QvBxcB9wxXdw/b.hP8G', 'client', 'system_seed', NULL, 'approved', NOW(), NOW());

INSERT INTO pets (owner_id, name, species, breed, sex, birth_date, weight, color, allergies, critical_notes, notes, verification_status, verified_by, verified_at, last_updated_by, updated_at) VALUES
(4, 'Buddy', 'Dog', 'Shih Tzu', 'Male', '2021-04-15', 6.50, 'White/Brown', 'No known allergies', 'Gets anxious during injections', 'Friendly but anxious during grooming.', 'approved', 1, NOW(), 4, NOW()),
(4, 'Mingming', 'Cat', 'Puspin', 'Female', '2022-08-03', 3.20, 'Gray', 'Fish sensitivity', 'Indoor cat only', 'Indoor cat, shy around strangers.', 'approved', 1, NOW(), 4, NOW()),
(5, 'Max', 'Dog', 'Aspin', 'Male', '2020-11-20', 14.30, 'Brown', 'None', 'Can be aggressive with other dogs', 'Outdoor dog.', 'approved', 1, NOW(), 5, NOW());

INSERT INTO medical_records (pet_id, veterinarian, visit_date, symptoms, diagnosis, treatment, prescription, notes) VALUES
(1, 'Dr. Reyes', '2026-04-05', 'Vomiting, reduced appetite', 'Mild gastroenteritis', 'Hydration support and bland diet', 'Probiotic for 5 days', 'Monitor vomiting and appetite.'),
(2, 'Dr. Reyes', '2026-04-10', 'Routine visit', 'Routine wellness check', 'General examination', 'None', 'Healthy condition.'),
(3, 'Dr. Cruz', '2026-04-18', 'Scratching and red skin', 'Possible dermatitis', 'Medicated bath and observation', 'Topical cream for 7 days', 'Check for fleas.');

INSERT INTO vaccinations (pet_id, vaccine_name, date_given, next_due_date, administered_by, remarks) VALUES
(1, 'Rabies Vaccine', '2026-01-12', '2027-01-12', 'Dr. Reyes', 'Annual booster.'),
(1, '5-in-1 Vaccine', '2026-02-20', '2027-02-20', 'Dr. Reyes', 'No adverse reaction.'),
(2, 'Anti-Rabies', '2026-03-18', '2027-03-18', 'Dr. Reyes', 'Annual vaccination.'),
(3, 'Rabies Vaccine', '2025-06-10', '2026-06-10', 'Dr. Cruz', 'Due soon.');

INSERT INTO appointments (owner_id, pet_id, requested_date, scheduled_date, reason, status, admin_notes) VALUES
(4, 1, '2026-05-08 10:00:00', '2026-05-08 10:30:00', 'Follow-up after vomiting episode', 'approved', 'Bring previous prescription.'),
(4, 2, '2026-05-12 14:00:00', NULL, 'Annual wellness check', 'pending', NULL),
(5, 3, '2026-05-13 09:00:00', '2026-05-13 09:00:00', 'Skin irritation check', 'approved', 'Prepare dermatology notes.');

INSERT INTO qr_tokens (pet_id, token, expires_at, status) VALUES
(1, 'BUDDY-SECURE-QR-2026', '2027-01-01 00:00:00', 'active'),
(2, 'MINGMING-SECURE-QR-2026', '2027-01-01 00:00:00', 'active'),
(3, 'MAX-SECURE-QR-2026', '2027-01-01 00:00:00', 'active');

INSERT INTO notifications (user_id, title, message, type) VALUES
(4, 'Appointment Approved', 'Buddy has an approved appointment on May 8, 2026.', 'appointment'),
(4, 'Vaccination Reminder', 'Buddy rabies vaccine is due on January 12, 2027.', 'vaccine'),
(5, 'Upcoming Vaccine', 'Max rabies vaccine is due on June 10, 2026.', 'vaccine');

INSERT INTO feedback (user_id, rating, comment) VALUES
(4, 5, 'The clinic staff were helpful and the pet records are easy to view.'),
(5, 4, 'Appointment request is convenient.');

INSERT INTO inventory_items (item_name, category, sale_price, stock_qty, unit, reorder_level, status) VALUES
('Rabies Vaccine', 'Vaccines', 350.00, 25, 'vial', 8, 'available'),
('5-in-1 Vaccine', 'Vaccines', 500.00, 12, 'vial', 5, 'available'),
('Pet Shampoo', 'Grooming', 250.00, 4, 'bottle', 5, 'low_stock');

INSERT INTO pos_transactions (client_id, handled_by, total_amount, payment_status, notes) VALUES
(4, 3, 750.00, 'paid', 'Consultation and vaccine demo transaction.');

INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES
(1, 'Seeded system data', 'system', 1, 'Initial demo data installed.');
