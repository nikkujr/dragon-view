CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role ENUM('OWNER_ADMIN', 'STAFF_FARMER') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE harvest_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_number VARCHAR(40) NOT NULL,
  harvest_date DATE NOT NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_harvest_batches_number (batch_number),
  KEY ix_harvest_batches_fifo (harvest_date, id),
  CONSTRAINT fk_harvest_batches_user
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE TABLE harvest_size_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  harvest_batch_id BIGINT UNSIGNED NOT NULL,
  size ENUM('EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'JUMBO') NOT NULL,
  grade ENUM('A', 'B', 'C') NOT NULL,
  pieces INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_harvest_item (harvest_batch_id, size, grade),
  CONSTRAINT ck_harvest_item_pieces CHECK (pieces > 0),
  CONSTRAINT fk_harvest_items_batch
    FOREIGN KEY (harvest_batch_id) REFERENCES harvest_batches(id)
);

CREATE TABLE inventory (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  harvest_batch_id BIGINT UNSIGNED NOT NULL,
  harvest_size_item_id BIGINT UNSIGNED NOT NULL,
  size ENUM('EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'JUMBO') NOT NULL,
  grade ENUM('A', 'B', 'C') NOT NULL,
  available_pieces INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_lot (harvest_batch_id, size, grade),
  KEY ix_inventory_match (size, grade, available_pieces),
  CONSTRAINT fk_inventory_batch
    FOREIGN KEY (harvest_batch_id) REFERENCES harvest_batches(id),
  CONSTRAINT fk_inventory_harvest_item
    FOREIGN KEY (harvest_size_item_id) REFERENCES harvest_size_items(id)
);

CREATE TABLE fruit_prices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  grade ENUM('A', 'B', 'C') NOT NULL,
  size ENUM('EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'JUMBO') NULL,
  price_per_kilogram DECIMAL(12, 2) NOT NULL,
  effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_to DATETIME NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  configured_by BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_fruit_prices_lookup (grade, size, is_active, effective_from),
  CONSTRAINT ck_fruit_price_positive CHECK (price_per_kilogram > 0),
  CONSTRAINT ck_grade_c_uniform_price CHECK (
    (grade = 'C' AND size IS NULL) OR
    (grade IN ('A', 'B') AND size IS NOT NULL)
  ),
  CONSTRAINT fk_fruit_prices_user
    FOREIGN KEY (configured_by) REFERENCES users(id)
);

CREATE TABLE sales (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_name VARCHAR(120) NOT NULL,
  customer_address VARCHAR(255) NOT NULL,
  customer_contact_number VARCHAR(30) NOT NULL,
  customer_email VARCHAR(190) NOT NULL,
  status ENUM('DRAFT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  payment_status ENUM('UNPAID', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
  payment_method ENUM('CASH', 'GCASH', 'MAYA', 'OTHER_E_WALLET', 'BANK_TRANSFER') NULL,
  amount_paid DECIMAL(12, 2) NULL,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  change_due DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_reference VARCHAR(100) NULL,
  other_ewallet_provider VARCHAR(80) NULL,
  refund_reference VARCHAR(100) NULL,
  cancellation_reason VARCHAR(255) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'PHP',
  created_by BIGINT UNSIGNED NULL,
  completed_by BIGINT UNSIGNED NULL,
  cancelled_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY ix_sales_status_date (status, completed_at),
  CONSTRAINT fk_sales_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_sales_completed_by FOREIGN KEY (completed_by) REFERENCES users(id),
  CONSTRAINT fk_sales_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id)
);

CREATE TABLE sales_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id BIGINT UNSIGNED NOT NULL,
  size ENUM('EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'JUMBO') NOT NULL,
  grade ENUM('A', 'B', 'C') NOT NULL,
  pieces INT UNSIGNED NOT NULL,
  total_weight_kilograms DECIMAL(10, 3) NOT NULL,
  price_per_kilogram DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_sales_items_sale (sale_id),
  CONSTRAINT ck_sales_item_pieces CHECK (pieces > 0),
  CONSTRAINT ck_sales_item_weight CHECK (total_weight_kilograms > 0),
  CONSTRAINT fk_sales_items_sale
    FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE TABLE sale_inventory_allocations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_item_id BIGINT UNSIGNED NOT NULL,
  inventory_id BIGINT UNSIGNED NOT NULL,
  pieces INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sale_inventory_allocation (sale_item_id, inventory_id),
  CONSTRAINT ck_sale_allocation_pieces CHECK (pieces > 0),
  CONSTRAINT fk_allocations_sale_item
    FOREIGN KEY (sale_item_id) REFERENCES sales_items(id),
  CONSTRAINT fk_allocations_inventory
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
);

CREATE TABLE inventory_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inventory_id BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM(
    'HARVEST_IN',
    'SALE_OUT',
    'MANUAL_ADJUSTMENT',
    'SPOILAGE',
    'SALE_CANCELLATION_RETURN',
    'REGRADING_OUT',
    'REGRADING_IN'
  ) NOT NULL,
  pieces INT NOT NULL,
  related_sale_id BIGINT UNSIGNED NULL,
  remarks VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_inventory_transactions_history (inventory_id, created_at),
  CONSTRAINT ck_inventory_transaction_nonzero CHECK (pieces <> 0),
  CONSTRAINT fk_inventory_transactions_inventory
    FOREIGN KEY (inventory_id) REFERENCES inventory(id),
  CONSTRAINT fk_inventory_transactions_sale
    FOREIGN KEY (related_sale_id) REFERENCES sales(id),
  CONSTRAINT fk_inventory_transactions_user
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE classification_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  grade ENUM('A', 'B', 'C') NOT NULL,
  confidence DECIMAL(5, 4) NOT NULL,
  image_reference VARCHAR(500) NOT NULL,
  classified_by BIGINT UNSIGNED NOT NULL,
  classified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_classification_history_date (classified_at),
  CONSTRAINT ck_classification_confidence CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT fk_classification_user
    FOREIGN KEY (classified_by) REFERENCES users(id)
);

CREATE TABLE planting_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_number VARCHAR(40) NOT NULL,
  grafting_date DATE NOT NULL,
  variety VARCHAR(100) NOT NULL,
  location VARCHAR(150) NOT NULL,
  number_of_plants INT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  deleted_at DATETIME NULL,
  deletion_reason VARCHAR(255) NULL,
  deleted_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_planting_record_number (record_number),
  KEY ix_planting_active (deleted_at, grafting_date),
  CONSTRAINT ck_planting_number_positive CHECK (number_of_plants > 0),
  CONSTRAINT fk_planting_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_planting_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id)
);

CREATE TABLE plant_monitoring (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  planting_record_id BIGINT UNSIGNED NOT NULL,
  notes VARCHAR(500) NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_plant_monitoring_record (planting_record_id, recorded_at),
  CONSTRAINT fk_monitoring_planting
    FOREIGN KEY (planting_record_id) REFERENCES planting_records(id),
  CONSTRAINT fk_monitoring_user
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);
