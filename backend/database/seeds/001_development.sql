INSERT INTO users (email, password_hash, display_name, role)
VALUES
  (
    'owner@dragonview.ph',
    '__DEV_PASSWORD_HASH__',
    'Farm Owner',
    'OWNER_ADMIN'
  ),
  (
    'staff@dragonview.ph',
    '__DEV_PASSWORD_HASH__',
    'Farm Staff',
    'STAFF_FARMER'
  )
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  display_name = VALUES(display_name),
  role = VALUES(role),
  is_active = TRUE;

SET @owner_id = (SELECT id FROM users WHERE email = 'owner@dragonview.ph');
SET @staff_id = (SELECT id FROM users WHERE email = 'staff@dragonview.ph');

INSERT INTO fruit_prices
  (grade, size, price_per_kilogram, effective_from, is_active, configured_by)
SELECT seed.grade, seed.size, seed.price_per_kilogram, '2026-01-01', TRUE, @owner_id
FROM (
  SELECT 'A' AS grade, 'EXTRA_SMALL' AS size, 70.00 AS price_per_kilogram
  UNION ALL SELECT 'A', 'SMALL', 80.00
  UNION ALL SELECT 'A', 'MEDIUM', 100.00
  UNION ALL SELECT 'A', 'LARGE', 120.00
  UNION ALL SELECT 'A', 'JUMBO', 140.00
  UNION ALL SELECT 'B', 'EXTRA_SMALL', 60.00
  UNION ALL SELECT 'B', 'SMALL', 70.00
  UNION ALL SELECT 'B', 'MEDIUM', 85.00
  UNION ALL SELECT 'B', 'LARGE', 100.00
  UNION ALL SELECT 'B', 'JUMBO', 115.00
  UNION ALL SELECT 'C', NULL, 50.00
) AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM fruit_prices AS existing
  WHERE existing.grade = seed.grade
    AND existing.size <=> seed.size
    AND existing.is_active = TRUE
);

INSERT INTO harvest_batches (batch_number, harvest_date, recorded_by)
VALUES
  ('H-2026-041', '2026-07-12', @staff_id),
  ('H-2026-042', '2026-07-15', @staff_id),
  ('H-2026-043', '2026-07-18', @staff_id),
  ('H-2026-044', '2026-07-21', @staff_id),
  ('H-2026-045', '2026-07-23', @staff_id)
ON DUPLICATE KEY UPDATE harvest_date = VALUES(harvest_date);

INSERT INTO harvest_size_items (harvest_batch_id, size, grade, pieces)
SELECT hb.id, seed.size, seed.grade, seed.pieces
FROM (
  SELECT 'H-2026-041' AS batch_number, 'LARGE' AS size, 'A' AS grade, 48 AS pieces
  UNION ALL SELECT 'H-2026-042', 'MEDIUM', 'A', 64
  UNION ALL SELECT 'H-2026-043', 'LARGE', 'B', 35
  UNION ALL SELECT 'H-2026-044', 'SMALL', 'C', 72
  UNION ALL SELECT 'H-2026-045', 'JUMBO', 'A', 29
) AS seed
INNER JOIN harvest_batches AS hb ON hb.batch_number = seed.batch_number
ON DUPLICATE KEY UPDATE pieces = VALUES(pieces);

INSERT INTO inventory
  (harvest_batch_id, harvest_size_item_id, size, grade, available_pieces)
SELECT hsi.harvest_batch_id, hsi.id, hsi.size, hsi.grade, hsi.pieces
FROM harvest_size_items AS hsi
INNER JOIN harvest_batches AS hb ON hb.id = hsi.harvest_batch_id
WHERE hb.batch_number IN (
  'H-2026-041', 'H-2026-042', 'H-2026-043', 'H-2026-044', 'H-2026-045'
)
ON DUPLICATE KEY UPDATE
  harvest_size_item_id = VALUES(harvest_size_item_id);

INSERT INTO inventory_transactions
  (inventory_id, transaction_type, pieces, remarks, created_by)
SELECT i.id, 'HARVEST_IN', hsi.pieces, 'Development seed harvest', @staff_id
FROM inventory AS i
INNER JOIN harvest_size_items AS hsi ON hsi.id = i.harvest_size_item_id
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory_transactions AS tx
  WHERE tx.inventory_id = i.id
    AND tx.transaction_type = 'HARVEST_IN'
);

INSERT INTO planting_records
  (record_number, grafting_date, variety, location, number_of_plants, created_by)
VALUES
  ('P-101', '2026-07-20', 'Moroccan Red', 'Field A', 42, @staff_id),
  ('P-102', '2026-07-06', 'Moroccan Red', 'Field B', 36, @staff_id),
  ('P-103', '2026-06-16', 'Moroccan Red', 'Zone C', 28, @staff_id),
  ('P-104', '2026-06-09', 'Moroccan Red', 'Field D', 32, @staff_id)
ON DUPLICATE KEY UPDATE
  grafting_date = VALUES(grafting_date),
  location = VALUES(location),
  number_of_plants = VALUES(number_of_plants);
