# Guide de Test - Phase 1 : Performance & Stabilité

Ce guide vous permet de tester manuellement toutes les améliorations de la Phase 1.

## Prérequis

1. **Serveur Next.js en cours d'exécution** :
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **Authentification** : Pour tester certaines routes, vous devez être connecté.

## Tests Automatisés

### Exécuter le script de test

```bash
# Depuis la racine du projet
pnpm test:phase1
```

Le script teste automatiquement :
- ✅ Pagination sur toutes les routes API
- ✅ Configuration React Query
- ✅ Optimisation des images (next/image)
- ✅ Debounce dans MapSearch
- ✅ Lazy loading des composants

## Tests Manuels

### 1. Pagination

#### 1.1 Pagination sur `/api/listings`

1. Connectez-vous à l'application
2. Ouvrez la console du navigateur (F12)
3. Exécutez :
   ```javascript
   // Test avec limit=10, offset=0
   fetch('/api/listings?limit=10&offset=0', { credentials: 'include' })
     .then(r => r.json())
     .then(d => console.log('Page 1:', d));
   
   // Test avec limit=10, offset=10 (page 2)
   fetch('/api/listings?limit=10&offset=10', { credentials: 'include' })
     .then(r => r.json())
     .then(d => console.log('Page 2:', d));
   ```

**Résultat attendu** :
- Réponse contient `{ data: [...], pagination: { limit: 10, offset: 0, count: ..., total: ... } }`
- Les données de la page 2 sont différentes de la page 1
- `pagination.count` correspond au nombre d'éléments retournés

#### 1.2 Pagination sur `/api/search/markers`

1. Ouvrez la page d'accueil (carte)
2. Ouvrez la console du navigateur
3. Exécutez :
   ```javascript
   // Test avec bbox de la Mauritanie
   fetch('/api/search/markers?bbox=-17.0,16.0,-14.0,20.0&limit=20&offset=0')
     .then(r => r.json())
     .then(d => console.log('Markers page 1:', d));
   
   fetch('/api/search/markers?bbox=-17.0,16.0,-14.0,20.0&limit=20&offset=20')
     .then(r => r.json())
     .then(d => console.log('Markers page 2:', d));
   ```

**Résultat attendu** :
- Réponse contient `{ data: [...], pagination: { limit: 20, offset: 0, count: ... } }`
- Les marqueurs de la page 2 sont différents

#### 1.3 Pagination sur `/api/search/listings`

1. Ouvrez la console du navigateur
2. Exécutez :
   ```javascript
   fetch('/api/search/listings?q=mauritanie&limit=5&offset=0')
     .then(r => r.json())
     .then(d => console.log('Search page 1:', d));
   ```

**Résultat attendu** :
- Réponse contient `{ data: [...], pagination: { limit: 5, offset: 0, count: ... } }`

#### 1.4 Pagination sur la page "Mes Annonces"

1. Connectez-vous
2. Allez sur `/my-listings`
3. Si vous avez plus de 20 annonces, vous devriez voir :
   - Un bouton "Suivant" en bas de page
   - Un compteur "Page X sur Y"
   - Les annonces changent quand vous cliquez sur "Suivant"

**Résultat attendu** :
- Pagination fonctionnelle avec contrôles visuels
- Navigation entre pages fonctionne

### 2. React Query Cache

#### 2.1 Cache des requêtes

1. Ouvrez la page d'accueil
2. Ouvrez l'onglet "Network" dans les DevTools
3. Attendez que la carte charge les marqueurs
4. **Déplacez la carte** (changez les bounds)
5. Observez les requêtes réseau

**Résultat attendu** :
- Les requêtes sont mises en cache (pas de nouvelle requête si les bounds sont identiques)
- Les requêtes sont invalidées après mutations (création/modification d'annonce)

#### 2.2 Invalidation automatique

1. Connectez-vous
2. Allez sur `/my-listings`
3. Notez les annonces affichées
4. Créez une nouvelle annonce (`/post`)
5. Retournez sur `/my-listings`

**Résultat attendu** :
- La nouvelle annonce apparaît automatiquement (sans refresh)
- Le cache a été invalidé et les données rechargées

### 3. Optimisation des Images

#### 3.1 next/image dans PhotoCarousel

1. Allez sur une page de détail d'annonce (`/listings/[id]`)
2. Ouvrez les DevTools → Network → Img
3. Observez les requêtes d'images

**Résultat attendu** :
- Les images sont servies via Next.js Image Optimization (`/_next/image`)
- Les images sont lazy loaded (sauf la première)
- Les tailles d'images sont optimisées

#### 3.2 Configuration Supabase

1. Vérifiez que les images Supabase se chargent correctement
2. Les URLs Supabase doivent être autorisées dans `next.config.ts`

**Résultat attendu** :
- Les images Supabase s'affichent sans erreur
- Pas d'erreur "External image not allowed" dans la console

### 4. Debounce

#### 4.1 Debounce dans MapSearch

1. Allez sur la page d'accueil
2. Cliquez sur la barre de recherche
3. Tapez rapidement plusieurs caractères (ex: "nouakchott")
4. Ouvrez l'onglet Network dans les DevTools

**Résultat attendu** :
- Une seule requête est envoyée après avoir arrêté de taper (pas une requête par caractère)
- Le délai de debounce est d'environ 300ms

### 5. Lazy Loading

#### 5.1 Map Component

1. Allez sur la page d'accueil
2. Ouvrez l'onglet Network dans les DevTools
3. Rechargez la page

**Résultat attendu** :
- Le composant Map n'est chargé qu'après le rendu initial
- Le bundle Map n'est pas dans le bundle initial

#### 5.2 LocationPicker

1. Allez sur `/post` (création d'annonce)
2. Ouvrez l'onglet Network dans les DevTools
3. Rechargez la page

**Résultat attendu** :
- Le composant LocationPicker n'est chargé qu'après le rendu initial
- Un placeholder de chargement s'affiche pendant le chargement

### 6. Performance Générale

#### 6.1 Temps de chargement

1. Ouvrez les DevTools → Performance
2. Enregistrez le chargement de la page d'accueil
3. Analysez les métriques

**Résultat attendu** :
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3.5s

#### 6.2 Bundle Size

1. Build l'application :
   ```bash
   cd apps/web
   pnpm build
   ```
2. Vérifiez la taille des bundles dans `.next/analyze` (si configuré)

**Résultat attendu** :
- Bundle principal < 200KB (gzipped)
- Pas de dépendances inutiles

## Checklist de Validation

- [ ] Pagination fonctionne sur toutes les routes API
- [ ] Les réponses API contiennent `{ data, pagination }`
- [ ] React Query cache les requêtes correctement
- [ ] L'invalidation automatique fonctionne après mutations
- [ ] Les images utilisent `next/image` avec optimisation
- [ ] Le debounce fonctionne dans MapSearch (300ms)
- [ ] Les composants lourds sont lazy loaded
- [ ] Les performances sont améliorées (FCP, LCP, TTI)
- [ ] Pas d'erreurs dans la console
- [ ] Le build fonctionne sans erreurs

## Problèmes Courants

### "Authentication required"
- **Solution** : Connectez-vous avant de tester les routes protégées

### "Server not running"
- **Solution** : Lancez `pnpm dev` dans `apps/web`

### "Images not loading"
- **Solution** : Vérifiez que `next.config.ts` contient la configuration Supabase

### "Pagination not working"
- **Solution** : Vérifiez que les paramètres `limit` et `offset` sont bien passés dans l'URL

## Résultats Attendus

Après avoir complété tous les tests, vous devriez avoir :

✅ **Pagination** : Toutes les routes API retournent des réponses paginées
✅ **Cache** : React Query gère efficacement le cache et l'invalidation
✅ **Images** : Optimisées avec next/image
✅ **Performance** : Temps de chargement améliorés
✅ **UX** : Navigation fluide sans rechargements inutiles

---

**Note** : Si vous rencontrez des problèmes, vérifiez les logs du serveur et de la console du navigateur pour plus de détails.

