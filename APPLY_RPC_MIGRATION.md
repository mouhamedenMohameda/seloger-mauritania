# Apply RPC Migration for Listing Creation

## Problem

You're seeing this error when trying to create a listing:
```
Could not find the function public.create_listing_with_location(...) in the schema cache
```

This means the database function hasn't been created yet. You need to apply the migration.

## Solution: Apply the Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy the Migration SQL**
   - Open the file: `supabase/migrations/20240101000010_create_listing_rpc.sql`
   - Copy **ALL** the content

4. **Paste and Execute**
   - Paste the SQL into the SQL Editor
   - Click "Run" or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

5. **Verify Success**
   - You should see "Success. No rows returned" (this is normal for function creation)
   - No errors should appear

### Option 2: Via Supabase CLI (If Installed)

```bash
# Make sure you're in the project root
cd /Users/mohameda/Desktop/Personal/seloger

# Link to your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## Verify the Function Exists

After applying the migration, verify the function was created:

```sql
-- Run this in Supabase SQL Editor
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'create_listing_with_location';
```

You should see the function with all its parameters listed.

## Test the Function

You can test the function directly:

```sql
-- This is just a test - you'll need a valid user_id
SELECT * FROM create_listing_with_location(
    'Test Listing'::text,
    'rent'::text,
    100000::numeric,
    3::integer,
    120::numeric,
    'Test description'::text,
    18.0735::double precision,
    -15.9582::double precision,
    'YOUR_USER_ID_HERE'::uuid,
    'published'::text
);
```

**Note:** Replace `YOUR_USER_ID_HERE` with an actual user ID from your `auth.users` table.

## After Applying

Once the migration is applied:

1. **Refresh your application** (if it's running)
2. **Try creating a listing again** - it should work now
3. **Check the browser console** if any errors persist

## Troubleshooting

### "function already exists"
- This is fine - it means the migration was already applied
- The function should work now, try creating a listing

### "permission denied"
- Make sure you're using an admin account or a user with the right permissions
- The migration includes `GRANT EXECUTE ON FUNCTION ... TO authenticated;` which should give permissions to authenticated users

### "syntax error"
- Make sure you copied the entire file content
- Check for any typos or missing parts

---

**The migration file location:** `supabase/migrations/20240101000010_create_listing_rpc.sql`
