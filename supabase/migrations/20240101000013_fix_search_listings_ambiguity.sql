-- Migration: Corriger l'ambiguïté de la fonction search_listings
-- Cette migration supprime TOUTES les versions existantes et crée une seule version complète
-- avec sub_polygon et sub_polygon_color

-- Supprimer TOUTES les versions existantes de search_listings pour éviter les conflits
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    -- Find and drop all search_listings function signatures
    FOR func_record IN 
        SELECT oid, proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc
        WHERE proname = 'search_listings'
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.search_listings(%s) CASCADE', func_record.argtypes);
    END LOOP;
END $$;

-- Créer UNE SEULE version de la fonction search_listings avec TOUS les paramètres
CREATE OR REPLACE FUNCTION search_listings(
    min_lng float,
    min_lat float,
    max_lng float,
    max_lat float,
    min_price numeric DEFAULT NULL,
    max_price numeric DEFAULT NULL,
    min_rooms int DEFAULT NULL,
    max_rooms int DEFAULT NULL,
    min_surface numeric DEFAULT NULL,
    max_surface numeric DEFAULT NULL,
    op_type_filter listing_op_type DEFAULT NULL,
    sort_order text DEFAULT 'date_desc',
    limit_count int DEFAULT 500,
    offset_count int DEFAULT 0,
    query_text text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    owner_id uuid,
    title text,
    price numeric,
    op_type listing_op_type,
    status listing_status,
    rooms int,
    surface numeric,
    lat float,
    lng float,
    photos_count bigint,
    created_at timestamp with time zone,
    sub_polygon jsonb,
    sub_polygon_color text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.owner_id,
        l.title,
        l.price,
        l.op_type,
        l.status,
        l.rooms,
        l.surface,
        ST_Y(l.location::geometry) as lat,
        ST_X(l.location::geometry) as lng,
        (SELECT COUNT(*) FROM listing_photos lp WHERE lp.listing_id = l.id) as photos_count,
        l.created_at,
        l.sub_polygon,  -- Include sub_polygon (format: [[lng, lat], [lng, lat], ...])
        l.sub_polygon_color  -- Include sub_polygon_color
    FROM listings l
    WHERE 
        l.status = 'published'
        AND l.deleted_at IS NULL
        AND l.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
        AND (min_price IS NULL OR l.price >= min_price)
        AND (max_price IS NULL OR l.price <= max_price)
        AND (min_rooms IS NULL OR l.rooms >= min_rooms)
        AND (max_rooms IS NULL OR l.rooms <= max_rooms)
        AND (min_surface IS NULL OR l.surface >= min_surface)
        AND (max_surface IS NULL OR l.surface <= max_surface)
        AND (op_type_filter IS NULL OR l.op_type = op_type_filter)
        AND (query_text IS NULL OR 
             l.title ILIKE '%' || query_text || '%' OR 
             l.description ILIKE '%' || query_text || '%')
    ORDER BY
        CASE WHEN sort_order = 'price_asc' THEN l.price END ASC,
        CASE WHEN sort_order = 'price_desc' THEN l.price END DESC,
        CASE WHEN sort_order = 'date_asc' THEN l.created_at END ASC,
        CASE WHEN sort_order = 'date_desc' THEN l.created_at END DESC,
        CASE WHEN sort_order = 'surface_asc' THEN l.surface END ASC NULLS LAST,
        CASE WHEN sort_order = 'surface_desc' THEN l.surface END DESC NULLS LAST,
        l.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Comment pour documentation
COMMENT ON FUNCTION search_listings IS 'Search listings within a bounding box with filters. Returns listings with sub_polygon and sub_polygon_color if available. Uses subPolygon center for location coordinates.';
