-- SQL query to insert 200 houses in Nouakchott with random locations
-- Run this in your Supabase SQL editor

-- First, get or use an existing user_id (replace with your actual user_id if needed)
-- If you don't have a user, you'll need to create one first via auth

WITH test_user AS (
  -- Use the first available user_id, or replace with a specific UUID
  SELECT id FROM profiles LIMIT 1
),
nouakchott_bounds AS (
  SELECT 
    18.0 AS min_lat,   -- Southern boundary
    18.15 AS max_lat,  -- Northern boundary
    -16.0 AS min_lng,  -- Western boundary
    -15.9 AS max_lng   -- Eastern boundary
),
random_listings AS (
  SELECT
    (SELECT id FROM test_user) AS owner_id,
    'Maison à ' || 
    CASE (random() * 4)::int
      WHEN 0 THEN 'Tevragh Zeina'
      WHEN 1 THEN 'Arafat'
      WHEN 2 THEN 'El Mina'
      WHEN 3 THEN 'Ksar'
      ELSE 'Nouakchott'
    END AS title,
    'Belle propriété située dans un quartier calme de Nouakchott. ' ||
    CASE (random() * 2)::int
      WHEN 0 THEN 'Proche des commerces et des écoles.'
      ELSE 'Avec jardin et parking.'
    END AS description,
    -- Random price: 50000-500000 MRU for rent, 5000000-50000000 for sell
    CASE (random() * 2)::int
      WHEN 0 THEN 50000 + (random() * 450000)::numeric  -- Rent: 50k-500k
      ELSE 5000000 + (random() * 45000000)::numeric     -- Sell: 5M-50M
    END AS price,
    CASE (random() * 2)::int
      WHEN 0 THEN 'rent'::listing_op_type
      ELSE 'sell'::listing_op_type
    END AS op_type,
    'published'::listing_status AS status,
    -- Random rooms: 1-5
    (1 + (random() * 4)::int) AS rooms,
    -- Random surface: 50-300 m²
    (50 + (random() * 250))::numeric AS surface,
    -- Random location within Nouakchott bounds
    ST_SetSRID(
      ST_MakePoint(
        (SELECT min_lng FROM nouakchott_bounds) + 
        (random() * ((SELECT max_lng FROM nouakchott_bounds) - (SELECT min_lng FROM nouakchott_bounds))),
        (SELECT min_lat FROM nouakchott_bounds) + 
        (random() * ((SELECT max_lat FROM nouakchott_bounds) - (SELECT min_lat FROM nouakchott_bounds)))
      ),
      4326
    )::geography AS location
  FROM generate_series(1, 200)
)
INSERT INTO listings (
  owner_id,
  title,
  description,
  price,
  op_type,
  status,
  rooms,
  surface,
  location,
  created_at,
  updated_at
)
SELECT 
  owner_id,
  title,
  description,
  price,
  op_type,
  status,
  rooms,
  surface,
  location,
  NOW() - (random() * INTERVAL '30 days') AS created_at,  -- Random creation date in last 30 days
  NOW() AS updated_at
FROM random_listings;

-- Verify the insert
SELECT 
  COUNT(*) as total_inserted,
  COUNT(*) FILTER (WHERE op_type = 'rent') as for_rent,
  COUNT(*) FILTER (WHERE op_type = 'sell') as for_sell,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM listings
WHERE status = 'published';


