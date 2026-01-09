# Guide de Test - Phase 2.1 : Recherche Avancée

Ce guide vous permet de tester manuellement toutes les fonctionnalités de recherche avancée (filtres et tri).

## Prérequis

1. **Migration SQL appliquée** :
   - Exécuter `supabase/migrations/20240101000006_advanced_search.sql` via Supabase Dashboard ou psql
   - Vérifier que la fonction `search_listings` a été mise à jour

2. **Serveur Next.js en cours d'exécution** :
   ```bash
   cd apps/web
   pnpm dev
   ```

## Tests Automatisés

### Exécuter le script de test

```bash
# Depuis la racine du projet
pnpm test:phase2-1
```

Le script teste automatiquement :
- ✅ Structure de la migration SQL
- ✅ Schémas de validation
- ✅ Routes API avec nouveaux paramètres
- ✅ Composant SearchFilters
- ✅ Intégration frontend
- ✅ Traductions

## Tests Manuels

### 1. Migration SQL

#### 1.1 Vérifier la fonction search_listings

1. Ouvrez Supabase Dashboard → SQL Editor
2. Exécutez :
   ```sql
   SELECT proname, proargnames, proargtypes 
   FROM pg_proc 
   WHERE proname = 'search_listings';
   ```

**Résultat attendu** :
- La fonction doit avoir les paramètres : `max_rooms`, `min_surface`, `max_surface`, `op_type_filter`, `sort_order`

#### 1.2 Tester la fonction directement

```sql
SELECT * FROM search_listings(
  -17.0, 16.0, -14.0, 20.0,  -- bbox
  10000,                       -- min_price
  100000,                      -- max_price
  2,                           -- min_rooms
  5,                           -- max_rooms
  50,                          -- min_surface
  200,                         -- max_surface
  'rent',                      -- op_type_filter
  'price_asc',                -- sort_order
  10,                          -- limit_count
  0                            -- offset_count
);
```

**Résultat attendu** :
- Résultats filtrés par prix, pièces, surface, type
- Triés par prix croissant
- Maximum 10 résultats

### 2. Interface de Filtres

#### 2.1 Ouvrir les filtres

1. Allez sur la page d'accueil (`/`)
2. Cliquez sur le bouton **"Filtres"** dans la barre d'outils (à côté du compteur d'annonces)

**Résultat attendu** :
- Une modal s'ouvre avec tous les filtres
- Interface claire et organisée

#### 2.2 Tester le filtre Type

1. Dans la modal de filtres, cliquez sur **"À louer"**
2. Observez la carte et la liste

**Résultat attendu** :
- Seules les annonces de location sont affichées
- Le bouton "À louer" est surligné en bleu
- Le compteur d'annonces se met à jour

3. Cliquez sur **"À vendre"**

**Résultat attendu** :
- Seules les annonces de vente sont affichées
- Le bouton "À vendre" est surligné en vert

4. Cliquez à nouveau sur le bouton pour le désélectionner

**Résultat attendu** :
- Toutes les annonces sont affichées (location + vente)

#### 2.3 Tester le filtre Prix

1. Dans les champs **Prix**, entrez :
   - Min : `20000`
   - Max : `100000`
2. Observez les résultats

**Résultat attendu** :
- Seules les annonces entre 20,000 et 100,000 MRU sont affichées
- Les marqueurs sur la carte se mettent à jour
- La liste se met à jour

3. Testez avec des valeurs invalides :
   - Min > Max
   - Valeurs négatives

**Résultat attendu** :
- Les filtres sont validés côté client
- Pas d'erreur serveur

#### 2.4 Tester le filtre Pièces

1. Dans les champs **Pièces**, entrez :
   - Min : `2`
   - Max : `4`
2. Observez les résultats

**Résultat attendu** :
- Seules les annonces avec 2 à 4 pièces sont affichées

#### 2.5 Tester le filtre Surface

1. Dans les champs **Surface**, entrez :
   - Min : `50`
   - Max : `150`
2. Observez les résultats

**Résultat attendu** :
- Seules les annonces entre 50 et 150 m² sont affichées

#### 2.6 Tester les combinaisons de filtres

1. Activez plusieurs filtres simultanément :
   - Type : Location
   - Prix : 20,000 - 100,000 MRU
   - Pièces : 2 - 4
   - Surface : 50 - 150 m²
2. Observez les résultats

**Résultat attendu** :
- Seules les annonces correspondant à TOUS les critères sont affichées
- Les filtres fonctionnent en combinaison (ET logique)

### 3. Tri

#### 3.1 Tester le tri par prix

1. Ouvrez les filtres
2. Dans **"Trier par"**, sélectionnez **"Prix croissant"**
3. Observez la liste des annonces

**Résultat attendu** :
- Les annonces sont triées du prix le plus bas au plus élevé
- La première annonce a le prix le plus bas

4. Sélectionnez **"Prix décroissant"**

**Résultat attendu** :
- Les annonces sont triées du prix le plus élevé au plus bas
- La première annonce a le prix le plus élevé

#### 3.2 Tester le tri par date

1. Sélectionnez **"Plus récent"**

**Résultat attendu** :
- Les annonces les plus récentes apparaissent en premier

2. Sélectionnez **"Plus ancien"**

**Résultat attendu** :
- Les annonces les plus anciennes apparaissent en premier

#### 3.3 Tester le tri par surface

1. Sélectionnez **"Surface décroissante"**

**Résultat attendu** :
- Les annonces avec la plus grande surface apparaissent en premier

2. Sélectionnez **"Surface croissante"**

**Résultat attendu** :
- Les annonces avec la plus petite surface apparaissent en premier

### 4. Réinitialisation

#### 4.1 Tester le bouton Réinitialiser

1. Activez plusieurs filtres
2. Cliquez sur **"Réinitialiser"**

**Résultat attendu** :
- Tous les filtres sont réinitialisés
- Le tri revient à "Plus récent"
- Toutes les annonces sont affichées

### 5. API Directe

#### 5.1 Tester l'API avec filtres

1. Ouvrez la console du navigateur (F12)
2. Exécutez :
   ```javascript
   // Test avec tous les filtres
   fetch('/api/search/markers?bbox=-17.0,16.0,-14.0,20.0&minPrice=20000&maxPrice=100000&minRooms=2&maxRooms=4&minSurface=50&maxSurface=150&opType=rent&sortBy=price_asc&limit=20')
     .then(r => r.json())
     .then(d => console.log('Filtered results:', d));
   ```

**Résultat attendu** :
- Réponse contient `{ data: [...], pagination: {...} }`
- Les résultats sont filtrés et triés correctement

#### 5.2 Tester différents tris

```javascript
// Tri par prix croissant
fetch('/api/search/markers?bbox=-17.0,16.0,-14.0,20.0&sortBy=price_asc&limit=10')
  .then(r => r.json())
  .then(d => {
    const prices = d.data.map(item => item.price).filter(p => p !== null);
    console.log('Prices sorted:', prices);
    // Vérifier que prices[i] <= prices[i+1]
  });

// Tri par date décroissante
fetch('/api/search/markers?bbox=-17.0,16.0,-14.0,20.0&sortBy=date_desc&limit=10')
  .then(r => r.json())
  .then(d => console.log('Newest first:', d.data));
```

**Résultat attendu** :
- Les résultats sont triés selon le paramètre `sortBy`
- Les prix sont dans l'ordre croissant/décroissant selon le tri

### 6. Performance

#### 6.1 Temps de réponse avec filtres

1. Ouvrez les DevTools → Network
2. Activez plusieurs filtres
3. Observez le temps de réponse de la requête `/api/search/markers`

**Résultat attendu** :
- Temps de réponse < 500ms même avec plusieurs filtres
- Pas de dégradation de performance

#### 6.2 Cache React Query

1. Activez des filtres
2. Changez les bounds de la carte (déplacez la carte)
3. Observez les requêtes réseau

**Résultat attendu** :
- Les requêtes sont mises en cache par React Query
- Pas de requêtes redondantes pour les mêmes filtres

### 7. Traductions

#### 7.1 Tester en français

1. Assurez-vous que la langue est en français
2. Ouvrez les filtres

**Résultat attendu** :
- Tous les labels sont en français
- "Filtres", "Réinitialiser", "Trier par", etc.

#### 7.2 Tester en arabe

1. Changez la langue en arabe
2. Ouvrez les filtres

**Résultat attendu** :
- Tous les labels sont en arabe
- Interface RTL fonctionne correctement

## Checklist de Validation

- [ ] Migration SQL appliquée avec succès
- [ ] Fonction `search_listings` accepte tous les nouveaux paramètres
- [ ] Bouton "Filtres" visible sur la page d'accueil
- [ ] Modal de filtres s'ouvre correctement
- [ ] Filtre Type (Location/Vente) fonctionne
- [ ] Filtre Prix (Min/Max) fonctionne
- [ ] Filtre Pièces (Min/Max) fonctionne
- [ ] Filtre Surface (Min/Max) fonctionne
- [ ] Combinaisons de filtres fonctionnent (ET logique)
- [ ] Tri par prix fonctionne (croissant/décroissant)
- [ ] Tri par date fonctionne (récent/ancien)
- [ ] Tri par surface fonctionne (croissant/décroissant)
- [ ] Bouton Réinitialiser fonctionne
- [ ] API accepte tous les nouveaux paramètres
- [ ] Résultats filtrés correctement côté serveur
- [ ] Résultats triés correctement côté serveur
- [ ] Traductions françaises complètes
- [ ] Traductions arabes complètes
- [ ] Performance acceptable (< 500ms)
- [ ] Cache React Query fonctionne

## Problèmes Courants

### "Function search_listings does not exist"
- **Solution** : Appliquer la migration SQL `20240101000006_advanced_search.sql`

### "Invalid filters" dans l'API
- **Solution** : Vérifier que les paramètres sont bien formatés (nombres pour prix/surface/pièces)

### "Filtres ne s'appliquent pas"
- **Solution** : Vérifier que React Query invalide le cache après changement de filtres

### "Tri ne fonctionne pas"
- **Solution** : Vérifier que le paramètre `sortBy` est bien passé à l'API

## Résultats Attendus

Après avoir complété tous les tests, vous devriez avoir :

✅ **Filtres fonctionnels** : Tous les filtres (type, prix, pièces, surface) fonctionnent individuellement et en combinaison
✅ **Tri fonctionnel** : Tous les modes de tri (prix, date, surface) fonctionnent correctement
✅ **API robuste** : L'API accepte et traite tous les nouveaux paramètres
✅ **UX fluide** : Interface intuitive avec feedback visuel clair
✅ **Performance** : Temps de réponse acceptable même avec plusieurs filtres
✅ **Traductions** : Interface complète en français et arabe

---

**Note** : Si vous rencontrez des problèmes, vérifiez les logs du serveur et de la console du navigateur pour plus de détails.

