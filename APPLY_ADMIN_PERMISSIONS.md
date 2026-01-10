# 🔧 Appliquer les Permissions Administrateur

## Migration : Permettre aux admins de modifier et supprimer n'importe quel listing

Cette migration ajoute les permissions suivantes pour les administrateurs :
- ✅ Voir **tous** les listings (publiés ou non)
- ✅ Modifier **n'importe quel** listing
- ✅ Supprimer **n'importe quel** listing

## Permissions Administrateur

Après cette migration, les administrateurs auront :

### Permissions complètes sur les listings
- ✅ Voir tous les listings (même les brouillons et archivés)
- ✅ Modifier n'importe quel listing (même ceux d'autres utilisateurs)
- ✅ Supprimer n'importe quel listing (même ceux d'autres utilisateurs)
- ✅ Créer leurs propres listings
- ✅ Gérer tous les reports (signalisations)

### Permissions sur les autres entités
- ✅ Voir et gérer tous les reports
- ✅ Accéder au panneau d'administration

## Application de la migration

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
-- Migration: Permettre aux administrateurs de supprimer et voir tous les listings
-- Les admins peuvent maintenant modifier, supprimer et voir n'importe quel listing

-- Politique RLS pour permettre aux admins de voir TOUS les listings (publiés ou non)
create policy "Admins can view all listings"
  on listings for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Politique RLS pour permettre aux admins de supprimer n'importe quel listing
create policy "Admins can delete any listing"
  on listings for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Note: Ces politiques s'ajoutent aux politiques existantes
-- 1. Les propriétaires peuvent toujours voir/supprimer leurs propres listings (politiques existantes)
-- 2. Le public peut voir les listings publiés (politique existante)
-- 3. Les admins peuvent maintenant voir, modifier et supprimer n'importe quel listing (nouvelles politiques)
```

### Étape 4 : Coller et exécuter

1. **Collez** tout le contenu SQL ci-dessus dans l'éditeur SQL
2. Vérifiez qu'il n'y a pas d'erreurs
3. Cliquez sur **"Run"** ou appuyez sur `Cmd+Enter` / `Ctrl+Enter`

### Étape 5 : Vérifier le succès

Vous devriez voir :
- ✅ **"Success. No rows returned"** (c'est normal)

### Étape 6 : Vérification

Pour vérifier que les politiques ont été créées, exécutez :

```sql
-- Vérifier les politiques sur listings
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'listings' 
AND policyname LIKE '%admin%' OR policyname LIKE '%Admin%';
```

Vous devriez voir au moins trois politiques admin :
- `Admins can update any listing` (existe déjà)
- `Admins can view all listings` (nouvelle)
- `Admins can delete any listing` (nouvelle)

## Après la migration

Une fois la migration appliquée :

1. ✅ Les administrateurs peuvent voir tous les listings (publiés, brouillons, archivés)
2. ✅ Les administrateurs peuvent modifier n'importe quel listing
3. ✅ Les administrateurs peuvent supprimer n'importe quel listing
4. ✅ Les propriétaires peuvent toujours gérer leurs propres listings
5. ✅ Le public peut toujours voir les listings publiés

## Utilisation dans l'interface

Les admins pourront :
- Voir tous les listings dans la liste
- Modifier n'importe quel listing depuis la page de détail
- Supprimer n'importe quel listing depuis la page de détail

## Vérifier qu'un utilisateur est admin

Pour vérifier qu'un utilisateur est admin :

```sql
-- Trouver un utilisateur par email
SELECT id, email, role 
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE email = 'email@example.com';

-- Mettre à jour un utilisateur pour devenir admin
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'USER_ID_HERE'::uuid;
```

## Sécurité

Les politiques RLS garantissent que :
- ✅ Seuls les admins peuvent modifier/supprimer les listings d'autres utilisateurs
- ✅ Les utilisateurs simples ne peuvent modifier que leurs propres listings
- ✅ Les agences ne peuvent modifier que leurs propres listings
- ✅ Les propriétaires peuvent toujours gérer leurs propres listings

---

**Fichier de migration** : `supabase/migrations/20240101000016_admin_delete_listings.sql`
