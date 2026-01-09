# Guide d'Application de la Migration Phase 2.1

## ⚠️ IMPORTANT

Avant de tester la Phase 2.1, vous **DEVEZ** appliquer la migration SQL suivante :

`supabase/migrations/20240101000006_advanced_search.sql`

## Méthode 1 : Via Supabase Dashboard (Recommandé)

1. **Connectez-vous à Supabase Dashboard**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet "seLoger"

2. **Ouvrez le SQL Editor**
   - Cliquez sur "SQL Editor" dans le menu de gauche
   - Cliquez sur "New query"

3. **Copiez le contenu de la migration**
   - Ouvrez le fichier `supabase/migrations/20240101000006_advanced_search.sql`
   - Copiez tout le contenu

4. **Collez et exécutez**
   - Collez le SQL dans l'éditeur
   - Cliquez sur "Run" ou appuyez sur `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

5. **Vérifiez le résultat**
   - Vous devriez voir "Success. No rows returned"
   - Pas d'erreur dans les logs

## Méthode 2 : Via psql (Ligne de commande)

Si vous avez accès à psql et à votre connexion Supabase :

```bash
# Récupérez votre connection string depuis Supabase Dashboard
# Settings → Database → Connection string (URI)

# Exécutez la migration
psql "votre-connection-string" -f supabase/migrations/20240101000006_advanced_search.sql
```

## Vérification

Après avoir appliqué la migration, vérifiez que la fonction a été mise à jour :

```sql
-- Dans Supabase SQL Editor
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'search_listings';
```

Vous devriez voir les nouveaux paramètres :
- `max_rooms`
- `min_surface`
- `max_surface`
- `op_type_filter`
- `sort_order`

## Test Rapide

Testez la fonction directement :

```sql
SELECT * FROM search_listings(
  -17.0, 16.0, -14.0, 20.0,  -- bbox Mauritanie
  NULL,                        -- min_price
  NULL,                        -- max_price
  NULL,                        -- min_rooms
  NULL,                        -- max_rooms
  NULL,                        -- min_surface
  NULL,                        -- max_surface
  NULL,                        -- op_type_filter
  'date_desc',                 -- sort_order
  10,                          -- limit_count
  0                            -- offset_count
);
```

Si cette requête fonctionne, la migration est appliquée correctement.

## Problèmes Courants

### "function search_listings already exists"
- **Solution** : C'est normal, la migration utilise `CREATE OR REPLACE FUNCTION`, donc elle remplace la fonction existante.

### "syntax error"
- **Solution** : Vérifiez que vous avez copié tout le contenu du fichier SQL, y compris les commentaires.

### "permission denied"
- **Solution** : Assurez-vous d'utiliser un compte avec les permissions nécessaires (généralement le compte admin du projet).

## Après l'Application

Une fois la migration appliquée :

1. **Relancez les tests** :
   ```bash
   pnpm test:phase2-1
   ```

2. **Testez manuellement** :
   - Suivez le guide `GUIDE_TEST_PHASE2-1.md`
   - Vérifiez que les filtres fonctionnent dans l'interface

3. **Vérifiez les logs** :
   - Si des erreurs persistent, vérifiez les logs Supabase
   - Vérifiez les logs du serveur Next.js

---

**Note** : La migration est idempotente (peut être exécutée plusieurs fois sans problème).

