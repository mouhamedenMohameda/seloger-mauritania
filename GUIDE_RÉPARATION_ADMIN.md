# 🔧 Guide de Réparation : Permissions Administrateur

## Problème : "J'ai fait les migrations mais rien n'a changé"

Si vous avez appliqué les migrations mais que les permissions admin ne fonctionnent toujours pas, suivez ces étapes dans l'ordre.

---

## ✅ Étape 1 : Vérifier que vous êtes admin

### 1.1 Dans l'application web

1. **Connectez-vous** à votre application
2. Allez sur **`/account`** (votre page de compte)
3. Vérifiez le champ **"Type d'utilisateur"** :
   - ✅ Si vous voyez **"Administrateur"** → passez à l'Étape 2
   - ❌ Si vous voyez **"Utilisateur simple"** ou **"Agence"** → passez à 1.2

### 1.2 Si vous n'êtes pas admin, devenez admin

#### Option A : Via Supabase Dashboard (Recommandé)

1. Allez sur **Supabase Dashboard** → **SQL Editor**
2. Exécutez cette requête pour trouver votre email :

```sql
-- Trouver votre utilisateur par email
SELECT 
    u.id,
    u.email,
    p.role,
    p.full_name
FROM auth.users u
JOIN profiles p ON p.id = u.id
ORDER BY u.email;
```

3. Une fois que vous avez trouvé votre ID, exécutez :

```sql
-- REMPLACEZ 'VOTRE_EMAIL@example.com' par votre email réel
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'VOTRE_EMAIL@example.com'
);

-- Vérifier que ça a fonctionné
SELECT 
    u.email,
    p.role,
    CASE 
        WHEN p.role = 'admin' THEN '✅ Maintenant admin!'
        ELSE '❌ Toujours pas admin'
    END as "Résultat"
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email = 'VOTRE_EMAIL@example.com';
```

#### Option B : Via le fichier SQL fourni

1. Ouvrez le fichier **`VÉRIFIER_ET_CORRIGER_ADMIN.sql`**
2. Copiez le contenu de l'**Étape 6** (décommentez-le)
3. Remplacez `'VOTRE_EMAIL@example.com'` par votre email
4. Exécutez dans **Supabase Dashboard** → **SQL Editor**

### 1.3 Rafraîchir la session

1. **Déconnectez-vous** complètement de l'application
2. **Reconnectez-vous**
3. Allez sur **`/account`** et vérifiez que vous voyez maintenant **"Administrateur"**

---

## ✅ Étape 2 : Vérifier que les politiques RLS existent

### 2.1 Dans Supabase Dashboard

1. Allez sur **Supabase Dashboard** → **Database** → **Policies**
2. Sélectionnez la table **`listings`**
3. Vous devriez voir ces politiques admin (recherchez "admin" ou "Admin") :
   - ✅ `Admins can view all listings` (SELECT)
   - ✅ `Admins can update any listing` (UPDATE)
   - ✅ `Admins can delete any listing` (DELETE)

### 2.2 Si les politiques n'existent pas, créez-les

#### Option A : Exécuter le fichier SQL fourni (Recommandé)

1. Ouvrez le fichier **`VÉRIFIER_ET_CORRIGER_ADMIN.sql`**
2. **Copiez tout le contenu**
3. Collez dans **Supabase Dashboard** → **SQL Editor**
4. Cliquez sur **Run**
5. Vérifiez que vous voyez **3 politiques admin** dans les résultats de l'**Étape 5**

#### Option B : Utiliser la nouvelle migration

1. Ouvrez le fichier **`supabase/migrations/20240101000017_fix_admin_permissions.sql`**
2. **Copiez tout le contenu**
3. Collez dans **Supabase Dashboard** → **SQL Editor**
4. Cliquez sur **Run**

---

## ✅ Étape 3 : Rafraîchir le cache de schéma

Parfois, Supabase garde en cache l'ancien schéma. Pour le rafraîchir :

### 3.1 Via SQL (Force refresh)

1. Dans **Supabase Dashboard** → **SQL Editor**, exécutez :

```sql
-- Recréer une politique pour forcer le refresh
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

### 3.2 Redémarrer l'application

1. **Arrêtez** votre serveur Next.js (`Ctrl+C` dans le terminal)
2. **Redémarrez** avec `pnpm dev`
3. **Reconnectez-vous** à l'application

---

## ✅ Étape 4 : Tester les permissions

### 4.1 Test via l'API (Console du navigateur)

1. **Connectez-vous** avec un compte admin
2. Ouvrez la **console du navigateur** (F12)
3. Exécutez :

```javascript
// Vérifier votre profil
const profileRes = await fetch('/api/me');
const profileData = await profileRes.json();
console.log('Mon profil:', profileData.profile);
console.log('Je suis admin?', profileData.profile?.role === 'admin');

// Si vous êtes admin, vous devriez voir: Je suis admin? true
```

### 4.2 Test de suppression (si vous avez un listing d'un autre utilisateur)

1. Trouvez un **listing d'un autre utilisateur** (pas le vôtre)
2. Si vous avez une interface pour supprimer, essayez de le supprimer
3. Si ça fonctionne, les permissions sont correctes ✅

### 4.3 Test via SQL

1. Dans **Supabase Dashboard** → **SQL Editor**, exécutez :

```sql
-- Simuler une requête admin (remplacez USER_ID par votre ID)
-- Cette requête devrait retourner TOUS les listings, même les brouillons
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'USER_ID_ICI';

-- Tester la politique SELECT
SELECT COUNT(*) as "Total listings visibles (devrait être tous)"
FROM listings;

-- Tester la politique UPDATE
-- Note: Cette requête ne modifie rien, elle teste juste si c'est autorisé
SELECT COUNT(*) as "Listings modifiables (devrait être tous)"
FROM listings
WHERE EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = 'USER_ID_ICI'::uuid
    AND profiles.role = 'admin'
);
```

---

## ✅ Étape 5 : Vérification finale

Utilisez le script de diagnostic :

```bash
pnpm tsx scripts/check-admin-permissions.ts
```

Ce script va vérifier :
- ✅ Si les politiques RLS existent
- ✅ Si vous avez des utilisateurs admin
- ✅ Si les listings existent pour tester

---

## 🚨 Problèmes courants et solutions

### Problème 1 : "Je suis admin mais je ne peux toujours pas modifier/supprimer"

**Solution :**
- Vérifiez que vous avez bien **3 politiques admin** sur la table `listings`
- Vérifiez que les politiques utilisent bien `auth.uid()` et non un ID fixe
- Vérifiez que vous êtes bien **connecté** (pas anonyme)

### Problème 2 : "Les politiques existent mais ne fonctionnent pas"

**Solution :**
- Les politiques RLS sont évaluées dans un certain ordre. Essayez de **supprimer et recréer** les politiques admin :
  ```sql
  DROP POLICY IF EXISTS "Admins can view all listings" ON listings;
  DROP POLICY IF EXISTS "Admins can update any listing" ON listings;
  DROP POLICY IF EXISTS "Admins can delete any listing" ON listings;
  
  -- Puis recréer avec VÉRIFIER_ET_CORRIGER_ADMIN.sql
  ```

### Problème 3 : "Je ne vois pas les boutons modifier/supprimer dans l'interface"

**Note importante :** Les permissions RLS fonctionnent au niveau de la base de données. Si l'interface web ne montre pas de boutons pour modifier/supprimer, c'est normal si cette fonctionnalité n'a pas encore été implémentée dans le code frontend. Les permissions RLS permettront quand même aux admins de modifier/supprimer via l'API.

### Problème 4 : "Erreur: permission denied for table listings"

**Solution :**
- Vérifiez que **RLS est activé** sur la table :
  ```sql
  ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
  ```
- Vérifiez que vous êtes bien **authentifié** (pas en mode anonyme)

---

## 📝 Checklist finale

Avant de dire que ça ne fonctionne pas, vérifiez :

- [ ] J'ai vérifié que je suis admin dans `/account`
- [ ] J'ai déconnecté/reconnecté après avoir changé mon rôle
- [ ] Les 3 politiques admin existent dans Database > Policies > listings
- [ ] J'ai exécuté le script `VÉRIFIER_ET_CORRIGER_ADMIN.sql`
- [ ] J'ai redémarré mon application Next.js
- [ ] J'ai testé via la console du navigateur (Étape 4.1)

---

## 💡 Si rien ne fonctionne

Si après toutes ces étapes rien ne fonctionne :

1. **Partagez avec moi :**
   - Le résultat du script `check-admin-permissions.ts`
   - Les erreurs dans la console du navigateur (F12)
   - Les logs Supabase (Dashboard → Logs → API Logs)

2. **Vérifiez les logs :**
   - Console du navigateur (F12)
   - Terminal Next.js (où vous avez lancé `pnpm dev`)
   - Supabase Dashboard → Logs → API Logs

3. **Informations utiles :**
   - Votre email utilisateur
   - Le nombre de politiques admin trouvées (Étape 2.1)
   - Les erreurs exactes que vous voyez

---

**Note :** Les permissions RLS fonctionnent au niveau de la base de données. Même si l'interface web ne montre pas de boutons pour modifier/supprimer, les admins peuvent toujours le faire via l'API (par exemple, via Postman ou curl).
