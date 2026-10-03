USE vet_clinic;

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sku VARCHAR(60) NULL AFTER id;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER category;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

CREATE TABLE IF NOT EXISTS pos_transaction_items (
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

UPDATE inventory_items SET sale_price = 0 WHERE sale_price IS NULL;
