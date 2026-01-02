create table listing_photos (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references listings(id) on delete cascade not null,
  storage_path text not null,
  rank int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index listing_photos_listing_id_idx on listing_photos(listing_id);

alter table listing_photos enable row level security;

create policy "Public can view photos of published listings"
  on listing_photos for select
  using ( exists (
    select 1 from listings l
    where l.id = listing_photos.listing_id
    and l.status = 'published'
  ));

create policy "Owners can view photos of their own listings"
  on listing_photos for select
  using ( exists (
    select 1 from listings l
    where l.id = listing_photos.listing_id
    and l.owner_id = auth.uid()
  ));

create policy "Owners can insert photos for their own listings"
  on listing_photos for insert
  with check ( exists (
    select 1 from listings l
    where l.id = listing_photos.listing_id
    and l.owner_id = auth.uid()
  ));

create policy "Owners can delete photos of their own listings"
  on listing_photos for delete
  using ( exists (
    select 1 from listings l
    where l.id = listing_photos.listing_id
    and l.owner_id = auth.uid()
  ));

-- Storage Bucket Policy (Must be run manually in dashboard usually, but here is SQL attempt)
insert into storage.buckets (id, name, public) 
values ('listings', 'listings', true)
on conflict (id) do nothing;

-- Storage RLS
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'listings' );

create policy "Auth users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'listings' and auth.role() = 'authenticated' );

create policy "Owners can delete"
  on storage.objects for delete
  using ( bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1] );
