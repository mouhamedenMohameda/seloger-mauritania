-- Phase 2.1: Advanced Search Filters and Sorting
-- Add support for surface filters, max rooms, op_type filter, and sorting

-- Drop existing function first
drop function if exists search_listings(float, float, float, float, numeric, numeric, int, int, int, numeric, numeric, listing_op_type, text, int, int);

-- Update search_listings function to support all filters and sorting
create or replace function search_listings(
  min_lng float,
  min_lat float,
  max_lng float,
  max_lat float,
  min_price numeric default null,
  max_price numeric default null,
  min_rooms int default null,
  max_rooms int default null,
  min_surface numeric default null,
  max_surface numeric default null,
  op_type_filter listing_op_type default null,
  sort_order text default 'date_desc',
  limit_count int default 500,
  offset_count int default 0
)
returns table (
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
  created_at timestamp with time zone
)
language plpgsql
as $$
begin
  return query
  select
    l.id,
    l.owner_id,
    l.title,
    l.price,
    l.op_type,
    l.status,
    l.rooms,
    l.surface,
    st_y(l.location::geometry) as lat,
    st_x(l.location::geometry) as lng,
    (select count(*) from listing_photos lp where lp.listing_id = l.id) as photos_count,
    l.created_at
  from listings l
  where 
    l.status = 'published'
    and l.deleted_at is null
    and l.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    and (min_price is null or l.price >= min_price)
    and (max_price is null or l.price <= max_price)
    and (min_rooms is null or l.rooms >= min_rooms)
    and (max_rooms is null or l.rooms <= max_rooms)
    and (min_surface is null or l.surface >= min_surface)
    and (max_surface is null or l.surface <= max_surface)
    and (op_type_filter is null or l.op_type = op_type_filter)
  order by
    case when sort_order = 'price_asc' then l.price end asc,
    case when sort_order = 'price_desc' then l.price end desc,
    case when sort_order = 'date_asc' then l.created_at end asc,
    case when sort_order = 'date_desc' then l.created_at end desc,
    case when sort_order = 'surface_asc' then l.surface end asc nulls last,
    case when sort_order = 'surface_desc' then l.surface end desc nulls last,
    l.created_at desc -- fallback default
  limit limit_count
  offset offset_count;
end;
$$;

