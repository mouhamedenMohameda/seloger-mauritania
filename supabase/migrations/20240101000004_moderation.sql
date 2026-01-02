create table reports (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references listings(id) on delete cascade not null,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  resolved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table reports enable row level security;

create policy "Authenticated users can create reports"
  on reports for insert
  with check ( auth.role() = 'authenticated' );

create policy "Admins can view all reports"
  on reports for select
  using ( 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can update reports"
  on reports for update
  using ( 
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Admin Policy for Listings (Allow admins to update ANY listing)
-- We need to add a policy to the listings table to allow admins to update.
-- Note: This appends to the existing policies.
create policy "Admins can update any listing"
  on listings for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
