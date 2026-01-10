-- Create RPC function for inserting listings with PostGIS geography points
-- This fixes the "string did not match expected pattern" error

CREATE OR REPLACE FUNCTION create_listing_with_location(
    p_title text,
    p_op_type text,
    p_price numeric,
    p_lat double precision,
    p_lng double precision,
    p_owner_id uuid,
    p_rooms integer DEFAULT NULL,
    p_surface numeric DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_status text DEFAULT 'published'
)
RETURNS TABLE (
    id uuid,
    title text,
    op_type text,
    price numeric,
    rooms integer,
    surface numeric,
    description text,
    status text,
    owner_id uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing_id uuid;
BEGIN
    -- Insert the listing with PostGIS geography point
    INSERT INTO listings (
        title,
        op_type,
        price,
        rooms,
        surface,
        description,
        location,
        owner_id,
        status
    ) VALUES (
        p_title,
        p_op_type::listing_op_type,
        p_price,
        p_rooms,
        p_surface,
        p_description,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_owner_id,
        p_status::listing_status
    )
    RETURNING
        listings.id,
        listings.title,
        listings.op_type,
        listings.price,
        listings.rooms,
        listings.surface,
        listings.description,
        listings.status,
        listings.owner_id,
        listings.created_at,
        listings.updated_at
    INTO
        id,
        title,
        op_type,
        price,
        rooms,
        surface,
        description,
        status,
        owner_id,
        created_at,
        updated_at;

    RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_listing_with_location TO authenticated;
