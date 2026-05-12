ALTER TABLE sales_items
  ADD COLUMN product_name_snapshot VARCHAR(150) NULL AFTER product_id,
  ADD COLUMN sku_snapshot VARCHAR(100) NULL AFTER product_name_snapshot;

UPDATE sales_items si
JOIN products p ON p.id = si.product_id
SET
  si.product_name_snapshot = COALESCE(si.product_name_snapshot, p.name),
  si.sku_snapshot = COALESCE(si.sku_snapshot, p.sku);
