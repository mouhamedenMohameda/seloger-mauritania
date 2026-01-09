# Guide d'Application des Migrations - Phase 0

## Prérequis

1. **Supabase CLI installé** ✅ (déjà fait)
2. **Docker Desktop** (pour développement local) OU **Projet Supabase Cloud** (pour production)

---

## Option 1 : Migration sur Supabase Cloud (Production/Staging)

### Étape 1 : Se connecter à Supabase

```bash
cd /Users/mohameda/Desktop/Personal/seloger
supabase login
```

### Étape 2 : Lier votre projet (si pas déjà fait)

```bash
supabase link --project-ref votre-project-ref
```

Pour trouver votre `project-ref` :
- Allez sur https://supabase.com/dashboard
- Sélectionnez votre projet
- Allez dans Settings > General
- Le "Reference ID" est votre `project-ref`

### Étape 3 : Appliquer la migration

```bash
supabase db push
```

Cette commande appliquera toutes les migrations non appliquées, y compris `20240101000005_harden_listings.sql`.

---

## Option 2 : Migration sur Supabase Local (Développement)

### Étape 1 : Démarrer Docker Desktop

1. Ouvrez Docker Desktop sur macOS
2. Attendez que Docker soit complètement démarré (icône Docker dans la barre de menu)

### Étape 2 : Démarrer Supabase localement

```bash
cd /Users/mohameda/Desktop/Personal/seloger
supabase start
```

Cette commande va :
- Télécharger les images Docker nécessaires (première fois uniquement)
- Démarrer PostgreSQL, PostGIS, et tous les services Supabase
- Créer les bases de données locales

### Étape 3 : Appliquer la migration

```bash
supabase migration up
```

OU simplement :

```bash
supabase db reset
```

(`db reset` applique toutes les migrations depuis le début - utile pour développement)

---

## Vérification

Après avoir appliqué la migration, vérifiez que tout fonctionne :

```bash
# Vérifier le statut
supabase status

# Vérifier les migrations appliquées
supabase migration list
```

---

## Contenu de la Migration `20240101000005_harden_listings.sql`

Cette migration ajoute :

1. ✅ **Contraintes NOT NULL** sur `title` et `price`
2. ✅ **Contrainte `price > 0`** (au lieu de `>= 0`)
3. ✅ **Contrainte `surface > 0`** si fourni
4. ✅ **Index composite** sur `(status, op_type)`
5. ✅ **Index sur `created_at`** pour le tri
6. ✅ **Trigger automatique** pour `updated_at`
7. ✅ **Colonne `deleted_at`** pour soft delete (préparation)

---

## Commandes Utiles

```bash
# Voir les migrations appliquées
supabase migration list

# Créer une nouvelle migration
supabase migration new nom_de_la_migration

# Revenir en arrière (développement uniquement)
supabase migration down

# Voir les logs de la base de données
supabase db logs

# Arrêter Supabase local
supabase stop
```

---

## ⚠️ Important pour la Production

Avant d'appliquer sur la production :

1. **Sauvegardez votre base de données** :
   ```bash
   supabase db dump -f backup.sql
   ```

2. **Testez d'abord sur staging** si disponible

3. **Vérifiez les données existantes** :
   - La migration met `title = 'Untitled Listing'` pour les titres NULL
   - La migration met `price = 0` pour les prix NULL
   - Assurez-vous que ces valeurs par défaut sont acceptables

4. **Planifiez une fenêtre de maintenance** si nécessaire

---

## Problèmes Courants

### "Cannot connect to Docker daemon"
- **Solution** : Démarrez Docker Desktop et attendez qu'il soit complètement démarré

### "Migration already applied"
- **Solution** : C'est normal, la migration a déjà été appliquée

### "Permission denied"
- **Solution** : Vérifiez que vous êtes connecté avec `supabase login`

### "Project not linked"
- **Solution** : Liez votre projet avec `supabase link --project-ref votre-ref`

