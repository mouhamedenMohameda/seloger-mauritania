-- Enable PostGIS
create extension if not exists postgis with schema extensions;

create type listing_status as enum ('draft', 'published', 'archived');
create type listing_op_type as enum ('rent', 'sell');

create table listings (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade not null,
  title text,
  description text,
  price numeric check (price >= 0),
  op_type listing_op_type not null default 'rent',
  status listing_status not null default 'draft',
  rooms int check (rooms >= 0),
  surface numeric check (surface >= 0),
  location geography(Point, 4326),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes
create index listings_owner_id_idx on listings(owner_id);
create index listings_location_idx on listings using GIST(location);
create index listings_status_idx on listings(status);

-- RLS
alter table listings enable row level security;

create policy "Public can view published listings."
  on listings for select
  using ( status = 'published' );

create policy "Owners can view all their listings."
  on listings for select
  using ( auth.uid() = owner_id );

create policy "Owners can insert their own listings."
  on listings for insert
  with check ( auth.uid() = owner_id );

create policy "Owners can update their own listings."
  on listings for update
  using ( auth.uid() = owner_id );

-- No delete for now, maybe archive only?
create policy "Owners can delete their own listings."
  on listings for delete
  using ( auth.uid() = owner_id );
