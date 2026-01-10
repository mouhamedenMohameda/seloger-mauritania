# 🔧 Dépannage : Permissions Administrateur

## Problème : Les migrations ont été appliquées mais rien n'a changé

Si vous avez appliqué les migrations mais que les permissions admin ne fonctionnent pas, voici les étapes de diagnostic :

## 🔍 Étape 1 : Vérifier que les politiques RLS existent

### Dans Supabase Dashboard

1. Allez sur **Supabase Dashboard** → **Database** → **Policies**
2. Sélectionnez la table **`listings`**
3. Vous devriez voir ces politiques pour les admins :
   - ✅ `Admins can view all listings` (SELECT)
   - ✅ `Admins can update any listing` (UPDATE)
   - ✅ `Admins can delete any listing` (DELETE)

**Si ces politiques n'existent pas**, appliquez la migration :

### SQL à exécuter dans SQL Editor

```sql
-- Vérifier si les politiques existent
SELECT 
    p.polname as policy_name,
    CASE p.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE p.polcmd::text
    END as command,
    pg_get_expr(p.polqual, p.polrelid) as using_expression
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'listings'
AND (p.polname LIKE '%admin%' OR p.polname LIKE '%Admin%')
ORDER BY p.polname;
```

**Si aucune politique admin n'apparaît**, exécutez cette migration :

```sql
-- Migration complète pour les permissions admin
-- Politique RLS pour permettre aux admins de voir TOUS les listings (publiés ou non)
CREATE POLICY IF NOT EXISTS "Admins can view all listings"
  ON listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Politique RLS pour permettre aux admins de supprimer n'importe quel listing
CREATE POLICY IF NOT EXISTS "Admins can delete any listing"
  ON listings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

## 🔍 Étape 2 : Vérifier qu'un utilisateur est admin

### Vérifier votre rôle

Exécutez dans SQL Editor :

```sql
-- Trouver votre utilisateur par email
SELECT 
    u.id,
    u.email,
    p.role,
    p.full_name
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email = 'VOTRE_EMAIL@example.com';
```

### Mettre à jour un utilisateur pour devenir admin

```sql
-- Remplacez USER_ID_HERE par l'ID de votre utilisateur
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'USER_ID_HERE'::uuid;

-- Vérifier que la mise à jour a fonctionné
SELECT id, email, role 
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.id = 'USER_ID_HERE'::uuid;
```

## 🔍 Étape 3 : Rafraîchir le cache de schéma

Le cache de schéma Supabase peut être obsolète. Pour le rafraîchir :

### Méthode 1 : Via Supabase Dashboard

1. Allez dans **Settings** → **API**
2. Cherchez une option **"Refresh Schema Cache"** ou **"Reload Schema"**
3. Cliquez dessus

### Méthode 2 : Via SQL

Parfois, exécuter une requête simple force le rafraîchissement :

```sql
-- Forcer le rafraîchissement en exécutant une requête simple
SELECT 1;

-- Ou recréer une politique existante pour forcer le refresh
DROP POLICY IF EXISTS "Admins can view all listings" ON listings;
CREATE POLICY "Admins can view all listings"
  ON listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

## 🔍 Étape 4 : Vérifier via l'API

Testez si un admin peut vraiment voir tous les listings :

### Test manuel dans le navigateur

1. Connectez-vous avec un compte **admin**
2. Ouvrez la console du navigateur (F12)
3. Exécutez :

```javascript
// Récupérer tous les listings (devrait fonctionner pour un admin)
const response = await fetch('/api/listings?limit=10');
const data = await response.json();
console.log('Listings:', data);

// Vérifier votre profil
const profile = await fetch('/api/me');
const profileData = await profile.json();
console.log('Mon profil:', profileData);
console.log('Je suis admin?', profileData.profile?.role === 'admin');
```

## 🔍 Étape 5 : Vérifier les erreurs dans la console

Si les permissions ne fonctionnent toujours pas, vérifiez :

1. **Console du navigateur** (F12) - Y a-t-il des erreurs ?
2. **Logs Supabase** - Dashboard → Logs → API Logs
3. **Logs Next.js** - Terminal où vous avez lancé `pnpm dev`

## 🔧 Solutions possibles

### Solution 1 : Réappliquer les migrations

Si les politiques n'existent pas, réappliquez-les :

```sql
-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Admins can view all listings" ON listings;
DROP POLICY IF EXISTS "Admins can update any listing" ON listings;
DROP POLICY IF EXISTS "Admins can delete any listing" ON listings;

-- Recréer les politiques
CREATE POLICY "Admins can view all listings"
  ON listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update any listing"
  ON listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete any listing"
  ON listings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### Solution 2 : Vérifier que vous êtes connecté comme admin

1. Déconnectez-vous complètement
2. Reconnectez-vous
3. Vérifiez dans `/account` que votre type est "Administrateur"
4. Si ce n'est pas le cas, mettez à jour votre profil en SQL (voir Étape 2)

### Solution 3 : Redémarrer l'application

```bash
# Arrêter le serveur
# Puis redémarrer
pnpm dev
```

### Solution 4 : Vérifier les variables d'environnement

Assurez-vous que `.env.local` contient :
```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
```

Et que c'est bien le même projet que celui où vous avez appliqué les migrations.

## ✅ Test final

Pour tester que tout fonctionne :

1. **Connectez-vous avec un compte admin**
2. **Allez sur un listing d'un autre utilisateur** (`/listings/SOME_ID`)
3. **Vous devriez pouvoir** :
   - Voir le listing même s'il est en brouillon
   - Voir des boutons pour modifier/supprimer (si l'interface les affiche)

## 💡 Script de diagnostic

Exécutez le script de vérification :

```bash
pnpm tsx scripts/check-admin-permissions.ts
```

Ce script vérifiera :
- ✅ Si les politiques RLS existent
- ✅ Si vous avez des utilisateurs admin
- ✅ Si les listings existent pour tester

---

**Si rien ne fonctionne après ces étapes, partagez :**
1. Les erreurs dans la console du navigateur
2. Le résultat du script de diagnostic
3. Les logs Supabase (Dashboard → Logs)
