# Guide de Test - Phase 2.2 : Géolocalisation

Ce guide vous permet de tester manuellement toutes les fonctionnalités de géolocalisation.

## Prérequis

1. **Migration SQL appliquée** :
   - Exécuter `supabase/migrations/20240101000007_radius_search.sql` via Supabase Dashboard
   - Vérifier que la fonction `search_listings_by_radius` existe

2. **Serveur Next.js en cours d'exécution** :
   ```bash
   cd apps/web
   pnpm dev
   ```

## Tests Automatisés

### Exécuter le script de test

```bash
# Depuis la racine du projet
pnpm test:phase2-2
```

Le script teste automatiquement :
- ✅ Structure de la migration SQL
- ✅ Utilitaires de géocodage
- ✅ Schémas de service
- ✅ Routes API (reverse geocoding, neighborhoods, radius search)
- ✅ Composants frontend

## Tests Manuels

### 1. Reverse Geocoding (Coordonnées → Adresse)

#### 1.1 Via l'API

1. Ouvrez la console du navigateur (F12)
2. Exécutez :
   ```javascript
   // Test avec coordonnées de Nouakchott
   fetch('/api/geocoding/reverse?lat=18.07&lng=-15.95')
     .then(r => r.json())
     .then(d => console.log('Adresse:', d));
   ```

**Résultat attendu** :
- Réponse contient `{ display_name: "...", address: {...} }`
- `display_name` contient une adresse lisible
- `address` contient les détails (road, neighbourhood, city, etc.)

#### 1.2 Via l'interface (LocationPicker)

1. Allez sur `/post` (création d'annonce)
2. Cliquez sur la carte pour placer un marqueur
3. Observez si l'adresse s'affiche (si intégré dans LocationPicker)

**Résultat attendu** :
- L'adresse correspondant aux coordonnées s'affiche
- Format lisible et compréhensible

### 2. Suggestions de Quartiers

#### 2.1 Via l'API

1. Ouvrez la console du navigateur
2. Exécutez :
   ```javascript
   // Récupérer tous les quartiers
   fetch('/api/geocoding/neighborhoods')
     .then(r => r.json())
     .then(d => console.log('Quartiers:', d.neighborhoods));
   
   // Rechercher un quartier
   fetch('/api/geocoding/neighborhoods?q=tevragh')
     .then(r => r.json())
     .then(d => console.log('Résultats:', d.neighborhoods));
   ```

**Résultat attendu** :
- Liste de 10 quartiers de Nouakchott
- Recherche retourne les quartiers correspondants
- Chaque quartier a `name`, `lat`, `lng`, `displayName`

#### 2.2 Via le composant NeighborhoodSuggestions

1. Intégrez le composant dans une page (ex: page d'accueil)
2. Tapez "Tevragh" dans le champ de recherche
3. Observez les suggestions

**Résultat attendu** :
- Suggestions filtrées en temps réel
- Clic sur un quartier centre la carte sur ce quartier

### 3. Recherche par Rayon

#### 3.1 Via l'API

1. Ouvrez la console du navigateur
2. Exécutez :
   ```javascript
   // Recherche dans un rayon de 5km autour de Nouakchott
   fetch('/api/search/radius?lat=18.07&lng=-15.95&radius=5&limit=10')
     .then(r => r.json())
     .then(d => {
       console.log('Résultats:', d.data);
       console.log('Distances:', d.data.map(item => item.distance_km));
     });
   ```

**Résultat attendu** :
- Réponse contient `{ data: [...], pagination: {...} }`
- Chaque résultat a un champ `distance_km`
- Les résultats sont triés par distance (plus proche en premier)

#### 3.2 Test avec différents rayons

```javascript
// Rayon de 1km
fetch('/api/search/radius?lat=18.07&lng=-15.95&radius=1&limit=10')
  .then(r => r.json())
  .then(d => console.log('1km:', d.data.length));

// Rayon de 10km
fetch('/api/search/radius?lat=18.07&lng=-15.95&radius=10&limit=10')
  .then(r => r.json())
  .then(d => console.log('10km:', d.data.length));
```

**Résultat attendu** :
- Plus le rayon est grand, plus il y a de résultats
- Tous les résultats sont dans le rayon spécifié

#### 3.3 Test avec filtres combinés

```javascript
// Recherche par rayon + filtres
fetch('/api/search/radius?lat=18.07&lng=-15.95&radius=5&minPrice=20000&maxPrice=100000&opType=rent&limit=10')
  .then(r => r.json())
  .then(d => {
    console.log('Résultats filtrés:', d.data);
    // Vérifier que tous les résultats respectent les filtres
    d.data.forEach(item => {
      if (item.price < 20000 || item.price > 100000) {
        console.error('Prix hors limites:', item);
      }
      if (item.op_type !== 'rent') {
        console.error('Type incorrect:', item);
      }
    });
  });
```

**Résultat attendu** :
- Les filtres sont appliqués correctement
- Tous les résultats respectent les critères

### 4. Utilitaires de Géocodage

#### 4.1 Test de calculateDistance

1. Ouvrez la console du navigateur
2. Exécutez :
   ```javascript
   // Importer la fonction (si disponible dans le bundle)
   // Ou tester via l'API
   
   // Distance entre deux points de Nouakchott
   // Tevragh Zeina (18.086, -15.975) et Arafat (18.045, -15.970)
   // Distance attendue: ~4.5 km
   ```

**Résultat attendu** :
- La distance calculée est cohérente avec la réalité

### 5. Intégration dans l'Interface

#### 5.1 Suggestions de quartiers dans MapSearch

1. Allez sur la page d'accueil
2. Cliquez sur la barre de recherche
3. Tapez "Tevragh" ou "Arafat"

**Résultat attendu** :
- Les quartiers apparaissent dans les suggestions
- Clic sur un quartier centre la carte

#### 5.2 Recherche par rayon (si intégrée)

1. Si un contrôle de recherche par rayon existe dans l'interface
2. Sélectionnez un point sur la carte
3. Définissez un rayon (ex: 5km)
4. Lancez la recherche

**Résultat attendu** :
- Seules les annonces dans le rayon sont affichées
- La distance est affichée pour chaque résultat

## Checklist de Validation

- [ ] Migration SQL appliquée avec succès
- [ ] Fonction `search_listings_by_radius` existe dans Supabase
- [ ] API `/api/geocoding/reverse` fonctionne
- [ ] API `/api/geocoding/neighborhoods` retourne les quartiers
- [ ] API `/api/search/radius` fonctionne avec coordonnées et rayon
- [ ] Reverse geocoding retourne des adresses lisibles
- [ ] Suggestions de quartiers fonctionnent (recherche fuzzy)
- [ ] Recherche par rayon retourne `distance_km` pour chaque résultat
- [ ] Les filtres fonctionnent avec la recherche par rayon
- [ ] Composant `NeighborhoodSuggestions` existe et fonctionne
- [ ] Traductions françaises complètes
- [ ] Traductions arabes complètes
- [ ] Performance acceptable (< 500ms pour reverse geocoding)

## Problèmes Courants

### "function search_listings_by_radius does not exist"
- **Solution** : Appliquer la migration SQL `20240101000007_radius_search.sql`

### "Reverse geocoding returns null"
- **Solution** : Vérifier que Nominatim est accessible (pas de blocage réseau)
- **Alternative** : Utiliser un service de géocodage alternatif si nécessaire

### "No neighborhoods returned"
- **Solution** : Vérifier que `NOUAKCHOTT_NEIGHBORHOODS` est bien exporté dans `geocoding.ts`

### "Radius search returns 0 results"
- **Solution** : Vérifier que vous avez des annonces dans la base de données
- Vérifier que les coordonnées sont correctes (lat/lng dans les bonnes limites)

## Résultats Attendus

Après avoir complété tous les tests, vous devriez avoir :

✅ **Reverse Geocoding** : Coordonnées converties en adresses lisibles
✅ **Suggestions Quartiers** : 10 quartiers de Nouakchott disponibles avec recherche
✅ **Recherche par Rayon** : Fonctionne avec PostGIS, retourne la distance
✅ **API Robuste** : Toutes les routes API fonctionnent avec validation
✅ **Performance** : Temps de réponse acceptable même avec calculs de distance

---

**Note** : Si vous rencontrez des problèmes, vérifiez les logs du serveur et de la console du navigateur pour plus de détails.

