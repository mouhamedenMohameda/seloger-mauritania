# 🔧 Appliquer la Migration des Types d'Utilisateurs

## Migration : Ajouter les trois types d'utilisateurs

Cette migration ajoute le type **`agence`** (agence immobilière) aux types d'utilisateurs existants (`user` et `admin`).

## Types d'utilisateurs disponibles

Après la migration, vous aurez **trois types** :

1. **`user`** - Utilisateur simple (type par défaut)
2. **`admin`** - Administrateur
3. **`agence`** - Agence immobilière

## Permissions

### Utilisateur simple (`user`) et Agence (`agence`)
- ✅ Créer/modifier/supprimer leurs propres listings
- ✅ Voir tous les listings publiés
- ✅ Signaler des listings

### Administrateur (`admin`)
- ✅ Toutes les permissions ci-dessus
- ✅ Modifier **n'importe quel** listing
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
-- Migration: Ajouter le type d'utilisateur 'agence' aux rôles disponibles
-- Types d'utilisateurs: 'user' (utilisateur simple), 'admin' (administrateur), 'agence' (agence immobilière)

-- Supprimer l'ancienne contrainte check (si elle existe)
alter table profiles 
  drop constraint if exists profiles_role_check;

-- Ajouter la nouvelle contrainte avec les trois types
alter table profiles 
  add constraint profiles_role_check 
  check (role in ('user', 'admin', 'agence'));

-- Mettre à jour le type par défaut reste 'user' (pas besoin de changer)
-- Le trigger handle_new_user() créera toujours des utilisateurs avec role='user' par défaut

-- Ajouter un index sur le rôle pour améliorer les performances des requêtes
create index if not exists profiles_role_idx on profiles(role);

-- Commentaire pour documentation
comment on column profiles.role is 'Type d''utilisateur: user (utilisateur simple), admin (administrateur), agence (agence immobilière)';

-- Note sur les permissions RLS:
-- 1. Les politiques RLS existantes pour les listings fonctionnent déjà pour tous les types d'utilisateurs
--    car elles utilisent 'auth.uid() = owner_id' qui s'applique à tous les utilisateurs authentifiés
-- 2. Les agences ont les mêmes permissions que les utilisateurs simples (user):
--    - Peuvent créer/modifier/supprimer leurs propres listings
--    - Peuvent voir tous les listings publiés
--    - Peuvent signaler des listings
-- 3. Les admins ont des permissions supplémentaires (définies dans 20240101000004_moderation.sql):
--    - Peuvent modifier n'importe quel listing
--    - Peuvent voir et gérer tous les reports
--    Ont accès au panneau d'administration
```

### Étape 4 : Coller et exécuter

1. **Collez** tout le contenu SQL ci-dessus dans l'éditeur SQL
2. Vérifiez qu'il n'y a pas d'erreurs (tout doit être copié)
3. Cliquez sur **"Run"** ou appuyez sur `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### Étape 5 : Vérifier le succès

Vous devriez voir :
- ✅ **"Success. No rows returned"** (c'est normal)
- ✅ Pas d'erreurs rouges

Si vous voyez une erreur, vérifiez que :
- Vous avez copié **TOUT** le contenu SQL
- Il n'y a pas de caractères étranges
- Vous êtes connecté avec un compte ayant les permissions nécessaires

### Étape 6 : Vérification

Pour vérifier que la migration a été appliquée, exécutez ceci dans le SQL Editor :

```sql
-- Vérifier la contrainte
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass 
AND conname = 'profiles_role_check';
```

Vous devriez voir : `role IN ('user', 'admin', 'agence')`

Ou vérifier les types d'utilisateurs existants :

```sql
-- Voir la répartition des types d'utilisateurs
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role;
```

## Changer le type d'un utilisateur

Pour mettre à jour le type d'un utilisateur existant :

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

-- Mettre à jour un utilisateur pour devenir agence
UPDATE profiles 
SET role = 'agence' 
WHERE id = 'USER_ID_HERE'::uuid;

-- Remettre un utilisateur en simple user
UPDATE profiles 
SET role = 'user' 
WHERE id = 'USER_ID_HERE'::uuid;
```

## Après la migration

Une fois la migration appliquée :

1. ✅ Les utilisateurs peuvent toujours créer des listings (user, admin, agence)
2. ✅ Les agences ont les mêmes permissions que les utilisateurs simples
3. ✅ Les admins peuvent toujours modifier n'importe quel listing
4. ✅ Le type d'utilisateur est affiché dans la page de compte (`/account`)

## Dépannage

### Erreur : "constraint already exists"
- **Solution** : C'est normal si la migration a déjà été appliquée. Vous pouvez ignorer cette erreur ou la supprimer d'abord.

### Erreur : "permission denied"
- **Solution** : Assurez-vous d'utiliser un compte avec les permissions nécessaires (généralement le compte admin du projet).

### Erreur : "relation profiles does not exist"
- **Solution** : Assurez-vous d'avoir d'abord appliqué la migration `20240101000000_profiles.sql`.

## Notes importantes

1. **Type par défaut** : Les nouveaux utilisateurs sont toujours créés avec le type `user`
2. **Permissions** : Les agences ont les mêmes permissions que les utilisateurs simples pour créer/modifier leurs listings
3. **Modification** : Seuls les administrateurs de la base de données peuvent modifier le type d'un utilisateur
4. **Sécurité** : Les politiques RLS garantissent que chaque utilisateur ne peut modifier que ses propres listings (sauf les admins)

---

**Fichier de migration** : `supabase/migrations/20240101000015_add_user_types.sql`  
**Guide complet** : `docs/USER_TYPES.md`
