# 🚨 SOLUTION IMMÉDIATE : Appliquer la fonction RPC

## Le problème

Vous voyez cette erreur :
```
Could not find the function public.create_listing_with_location(...) in the schema cache
```

Cela signifie que la fonction RPC n'existe pas encore dans votre base de données Supabase.

## ✅ SOLUTION : Appliquer la migration (2 minutes)

### Étape 1 : Ouvrir Supabase Dashboard

1. Allez sur **https://app.supabase.com**
2. Connectez-vous à votre compte
3. Sélectionnez votre projet

### Étape 2 : Ouvrir le SQL Editor

1. Cliquez sur **"SQL Editor"** dans le menu de gauche
2. Cliquez sur **"New query"** (ou le bouton **"+"**)

### Étape 3 : Copier le contenu de la migration

**Le contenu à copier est ci-dessous** (tout le bloc) :

```sql
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
```

### Étape 4 : Coller et exécuter

1. **Collez** tout le contenu SQL ci-dessus dans l'éditeur SQL
2. Vérifiez qu'il n'y a pas d'erreurs (tout doit être copié)
3. Cliquez sur **"Run"** ou appuyez sur `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### Étape 5 : Vérifier le succès

Vous devriez voir :
- ✅ **"Success. No rows returned"** (c'est normal pour une fonction)
- ✅ Pas d'erreurs rouges

Si vous voyez une erreur, vérifiez que :
- Vous avez copié **TOUT** le contenu SQL
- Il n'y a pas de caractères étranges
- Vous êtes connecté avec un compte ayant les permissions nécessaires

### Étape 6 : Rafraîchir l'application

1. **Rafraîchissez** votre page web (F5 ou Cmd+R)
2. **Réessayez** de créer un listing

## ✅ Vérification rapide

Pour vérifier que la fonction existe maintenant, exécutez ceci dans le SQL Editor :

```sql
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'create_listing_with_location';
```

Vous devriez voir la fonction listée avec ses paramètres.

## 🔍 Si ça ne fonctionne toujours pas

1. **Rafraîchissez le cache de schéma** :
   - Dans Supabase Dashboard, allez dans **Settings** → **API**
   - Cliquez sur **"Refresh Schema Cache"** (si disponible)

2. **Attendez quelques secondes** après avoir créé la fonction

3. **Vérifiez que vous êtes sur le bon projet** Supabase

4. **Vérifiez les variables d'environnement** :
   - `NEXT_PUBLIC_SUPABASE_URL` doit pointer vers votre projet
   - Vérifiez dans `.env.local` ou `apps/web/.env.local`

## 💡 Alternative : Utiliser un script SQL

Si vous préférez, vous pouvez aussi copier le contenu du fichier :
- `supabase/migrations/20240101000010_create_listing_rpc.sql`

Le contenu est identique.

---

**Une fois que vous avez appliqué la migration, réessayez de créer un listing et dites-moi si ça fonctionne !** 🎉
