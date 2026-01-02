-- RPC function to search listings within a bounding box
-- bbox is [minLng, minLat, maxLng, maxLat]
create or replace function search_listings(
  min_lng float,
  min_lat float,
  max_lng float,
  max_lat float,
  min_price numeric default null,
  max_price numeric default null,
  min_rooms int default null,
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
  photos_count bigint
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
    (select count(*) from listing_photos lp where lp.listing_id = l.id) as photos_count
  from listings l
  where 
    l.status = 'published'
    and l.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    and (min_price is null or l.price >= min_price)
    and (max_price is null or l.price <= max_price)
    and (min_rooms is null or l.rooms >= min_rooms)
  order by l.created_at desc
  limit limit_count
  offset offset_count;
end;
$$;
