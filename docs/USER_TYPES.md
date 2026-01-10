# Guide des Types d'Utilisateurs

## Types d'utilisateurs disponibles

L'application supporte **trois types d'utilisateurs** :

1. **`user`** (Utilisateur simple) - Type par défaut
2. **`admin`** (Administrateur) - Permissions étendues
3. **`agence`** (Agence immobilière) - Permissions similaires aux utilisateurs simples

## Permissions par type

### 1. Utilisateur simple (`user`)

**Permissions :**
- ✅ Créer ses propres listings
- ✅ Modifier ses propres listings
- ✅ Supprimer ses propres listings
- ✅ Voir tous les listings publiés
- ✅ Voir ses propres listings (publiés ou non)
- ✅ Signaler des listings
- ❌ Modifier les listings d'autres utilisateurs
- ❌ Accéder au panneau d'administration

**Type par défaut :** Oui - Tous les nouveaux utilisateurs sont créés avec ce type

### 2. Administrateur (`admin`)

**Permissions :**
- ✅ Toutes les permissions d'un utilisateur simple
- ✅ Modifier **n'importe quel** listing (même ceux d'autres utilisateurs)
- ✅ Voir tous les reports (signalisations)
- ✅ Résoudre/mettre à jour les reports
- ✅ Accéder au panneau d'administration
- ✅ Dépublier des listings
- ✅ Voir toutes les statistiques

**Utilisation :** Pour les administrateurs de la plateforme

### 3. Agence immobilière (`agence`)

**Permissions :**
- ✅ Créer ses propres listings (comme les utilisateurs simples)
- ✅ Modifier ses propres listings
- ✅ Supprimer ses propres listings
- ✅ Voir tous les listings publiés
- ✅ Voir ses propres listings (publiés ou non)
- ✅ Signaler des listings
- ❌ Modifier les listings d'autres utilisateurs
- ❌ Accéder au panneau d'administration

**Utilisation :** Pour les agences immobilières professionnelles qui peuvent avoir besoin de créer beaucoup de listings

## Application de la migration

### Étape 1 : Vérifier si la migration existe

La migration `20240101000015_add_user_types.sql` existe déjà dans le projet.

### Étape 2 : Appliquer la migration

**Via Supabase Dashboard (Recommandé) :**

1. Allez sur **https://app.supabase.com**
2. Sélectionnez votre projet
3. Cliquez sur **"SQL Editor"** dans le menu de gauche
4. Cliquez sur **"New query"**
5. Ouvrez le fichier : `supabase/migrations/20240101000015_add_user_types.sql`
6. Copiez **tout** le contenu
7. Collez dans l'éditeur SQL
8. Cliquez sur **"Run"** ou appuyez sur `Cmd+Enter` / `Ctrl+Enter`

**Vérification :**

Après avoir appliqué la migration, vérifiez que la contrainte a été mise à jour :

```sql
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname = 'profiles_role_check';
```

Vous devriez voir : `role IN ('user', 'admin', 'agence')`

### Étape 3 : Mettre à jour un utilisateur existant (optionnel)

Pour changer le type d'un utilisateur existant :

```sql
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

## Politiques RLS (Row Level Security)

Les politiques RLS existantes fonctionnent déjà pour tous les types d'utilisateurs :

### Listings

- **`user` et `agence`** : Peuvent créer/modifier/supprimer leurs propres listings
- **`admin`** : Peuvent modifier **n'importe quel** listing (politique ajoutée dans `20240101000004_moderation.sql`)

### Reports (Signalisations)

- Tous les utilisateurs authentifiés peuvent créer des reports
- Seuls les **`admin`** peuvent voir et gérer tous les reports

### Photos

- **`user` et `agence`** : Peuvent ajouter/supprimer des photos pour leurs propres listings
- **`admin`** : Peut gérer les photos de tous les listings (via la capacité de modifier tous les listings)

## Interface utilisateur

### Affichage du type d'utilisateur

Le type d'utilisateur est affiché dans :
- Page de compte (`/account`) - En lecture seule
- Potentiellement dans la navbar pour les admins

### Modification du type

⚠️ **Important** : Le type d'utilisateur ne peut **pas** être modifié par l'utilisateur lui-même via l'interface web. Seul un administrateur de la base de données peut modifier le type via SQL.

## Utilisation dans le code

### TypeScript

```typescript
import { UserRole } from '@seloger/identity';

type UserRole = 'user' | 'admin' | 'agence';

interface Profile {
    id: string;
    role: UserRole;
    full_name: string | null;
    phone: string | null;
    created_at: string;
}
```

### Vérifier le type d'utilisateur

```typescript
// Dans une API route
const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

if (profile?.role === 'admin') {
    // Permissions admin
} else if (profile?.role === 'agence') {
    // Permissions agence
} else {
    // Permissions utilisateur simple
}
```

### Dans les composants React

```typescript
import { useProfile } from '@/hooks/use-profile'; // Si vous avez un hook

const { profile } = useProfile();

if (profile?.role === 'admin') {
    // Afficher le menu admin
}
```

## Migration de données existantes

Si vous avez des utilisateurs existants, ils garderont leur type actuel (`user` ou `admin`). Pour ajouter des agences :

```sql
-- Mettre à jour des utilisateurs existants pour devenir des agences
UPDATE profiles 
SET role = 'agence' 
WHERE id IN ('user-id-1', 'user-id-2', ...);
```

## Vérification

Pour vérifier que tout fonctionne correctement :

```sql
-- Vérifier les types d'utilisateurs
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role;

-- Vérifier qu'un utilisateur peut créer un listing
-- (tester avec un utilisateur user ou agence)

-- Vérifier qu'un admin peut modifier n'importe quel listing
-- (tester avec un utilisateur admin)
```

## Notes importantes

1. **Type par défaut** : Les nouveaux utilisateurs sont toujours créés avec le type `user`
2. **Modification** : Seuls les administrateurs de la base de données peuvent modifier le type d'un utilisateur
3. **Permissions** : Les agences ont les mêmes permissions que les utilisateurs simples pour créer/modifier leurs listings
4. **Sécurité** : Les politiques RLS garantissent que chaque utilisateur ne peut modifier que ses propres listings (sauf les admins)

---

**Fichier de migration** : `supabase/migrations/20240101000015_add_user_types.sql`
