# 🚀 Quick Start - Phase 2.1 Migration

## Problème Actuel

Les tests échouent avec des erreurs HTTP 500 car la migration SQL n'a pas été appliquée.

## Solution Rapide (5 minutes)

### Étape 1 : Ouvrir Supabase Dashboard

1. Allez sur https://app.supabase.com
2. Connectez-vous
3. Sélectionnez votre projet **"seLoger"**

### Étape 2 : Ouvrir SQL Editor

1. Dans le menu de gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur **"New query"** (ou le bouton "+")

### Étape 3 : Copier le SQL

Ouvrez le fichier suivant dans votre éditeur :
```
supabase/migrations/20240101000006_advanced_search.sql
```

**Copiez TOUT le contenu** du fichier (Ctrl+A puis Ctrl+C / Cmd+A puis Cmd+C)

### Étape 4 : Coller et Exécuter

1. Collez le SQL dans l'éditeur Supabase
2. Cliquez sur **"Run"** (ou appuyez sur `Cmd+Enter` / `Ctrl+Enter`)

### Étape 5 : Vérifier

Vous devriez voir :
- ✅ **"Success. No rows returned"** (c'est normal)
- ❌ Pas d'erreur rouge

### Étape 6 : Tester

Relancez les tests :
```bash
pnpm test:phase2-1
```

Tous les tests devraient maintenant passer ! ✅

---

## Vérification Manuelle (Optionnel)

Pour vérifier que la migration a bien été appliquée, exécutez ce SQL dans Supabase :

```sql
-- Vérifier que la fonction existe avec les bons paramètres
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'search_listings';
```

Vous devriez voir les paramètres : `max_rooms`, `min_surface`, `max_surface`, `op_type_filter`, `sort_order`

---

## Si ça ne fonctionne toujours pas

1. **Vérifiez les logs Supabase** :
   - SQL Editor → Voir l'historique des requêtes
   - Vérifiez s'il y a des erreurs

2. **Vérifiez que vous êtes sur le bon projet** :
   - Le projet doit être "seLoger" ou celui que vous utilisez

3. **Essayez de supprimer et recréer la fonction** :
   - La migration utilise `CREATE OR REPLACE`, donc elle devrait fonctionner même si la fonction existe déjà

4. **Contactez-moi** avec :
   - Le message d'erreur exact
   - Une capture d'écran de l'erreur dans Supabase

---

## Contenu du fichier SQL à copier

Le fichier `supabase/migrations/20240101000006_advanced_search.sql` contient environ 80 lignes et commence par :

```sql
-- Phase 2.1: Advanced Search Filters and Sorting
-- Add support for surface filters, max rooms, op_type filter, and sorting

-- Drop existing function first
drop function if exists search_listings(...);
```

Si vous ne trouvez pas le fichier, je peux vous donner le contenu complet.

