-- Phase 3.1: Favorites & Alerts System
-- Create tables for user favorites and search alerts

-- Favorites table
create table if not exists favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  listing_id uuid references listings(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, listing_id) -- Prevent duplicate favorites
);

-- Indexes for favorites
create index if not exists favorites_user_id_idx on favorites(user_id);
create index if not exists favorites_listing_id_idx on favorites(listing_id);
create index if not exists favorites_created_at_idx on favorites(created_at desc);

-- RLS for favorites
alter table favorites enable row level security;

create policy "Users can view their own favorites"
  on favorites for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own favorites"
  on favorites for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own favorites"
  on favorites for delete
  using ( auth.uid() = user_id );

-- Search Alerts table
create table if not exists search_alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null, -- User-friendly name for the alert
  -- Search criteria
  min_price numeric,
  max_price numeric,
  min_rooms int,
  max_rooms int,
  min_surface numeric,
  max_surface numeric,
  op_type listing_op_type,
  -- Location filters (neighborhood or radius)
  neighborhood text, -- Name of neighborhood (e.g., "Tevragh Zeina")
  center_lat float,
  center_lng float,
  radius_km float default 5.0, -- Search radius in km
  -- Notification settings
  email_notifications boolean default true,
  push_notifications boolean default false, -- For future PWA
  last_notified_at timestamp with time zone,
  -- Status
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for search_alerts
create index if not exists search_alerts_user_id_idx on search_alerts(user_id);
create index if not exists search_alerts_active_idx on search_alerts(active) where active = true;
create index if not exists search_alerts_created_at_idx on search_alerts(created_at desc);

-- RLS for search_alerts
alter table search_alerts enable row level security;

create policy "Users can view their own alerts"
  on search_alerts for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own alerts"
  on search_alerts for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own alerts"
  on search_alerts for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own alerts"
  on search_alerts for delete
  using ( auth.uid() = user_id );

-- Function to automatically update updated_at
create or replace function update_search_alerts_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create trigger update_search_alerts_updated_at
  before update on search_alerts
  for each row
  execute function update_search_alerts_updated_at();

