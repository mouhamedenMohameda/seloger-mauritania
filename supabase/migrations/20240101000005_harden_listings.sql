-- Phase 0.4: Database Hardening
-- Add NOT NULL constraints, indexes, triggers, and soft delete support

-- Step 1: Update existing NULL values (if any) before adding constraints
-- Set default values for any NULL titles/prices
-- NOTE: For price, we use 1 instead of 0 because the new constraint requires price > 0
UPDATE listings
SET title = 'Untitled Listing'
WHERE title IS NULL;

UPDATE listings
SET price = 1
WHERE price IS NULL;

-- Step 2: Add NOT NULL constraints on critical fields
ALTER TABLE listings
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN price SET NOT NULL;

-- Step 3: Update price constraint to ensure it's positive (not just >= 0)
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_price_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_price_check CHECK (price > 0);

-- Step 4: Update surface constraint to ensure it's positive if provided
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_surface_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_surface_check CHECK (surface IS NULL OR surface > 0);

-- Step 5: Add composite index for common query patterns (status + op_type)
CREATE INDEX IF NOT EXISTS listings_status_op_type_idx 
  ON listings(status, op_type);

-- Step 6: Add index on created_at for sorting
CREATE INDEX IF NOT EXISTS listings_created_at_idx 
  ON listings(created_at DESC);

-- Step 7: Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Add deleted_at column for soft delete (preparation for future)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Step 10: Add index on deleted_at for soft delete queries
CREATE INDEX IF NOT EXISTS listings_deleted_at_idx 
  ON listings(deleted_at)
  WHERE deleted_at IS NULL;

-- Step 11: Update RLS policies to exclude soft-deleted listings
-- Note: This requires updating existing policies to check deleted_at IS NULL
-- We'll do this in a separate migration to avoid breaking existing queries

-- Comment: For now, we keep the existing RLS policies.
-- When implementing soft delete, we'll need to update policies to:
--   using (status = 'published' AND deleted_at IS NULL)
--   using (auth.uid() = owner_id AND deleted_at IS NULL)

