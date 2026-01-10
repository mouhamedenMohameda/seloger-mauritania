-- Migration: Créer une fonction helper pour extraire les coordonnées depuis location
-- Utile pour le fallback quand search_listings a des problèmes d'ambiguïté

CREATE OR REPLACE FUNCTION extract_listing_coords(listing_id_param uuid)
RETURNS TABLE (
    lat float,
    lng float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ST_Y(l.location::geometry) as lat,
        ST_X(l.location::geometry) as lng
    FROM listings l
    WHERE l.id = listing_id_param
    LIMIT 1;
END;
$$;
