# Scripts de Test - Phase 0

## Test Phase 0 - Hardening Technique

Ce script teste toutes les fonctionnalités de sécurité et validation implémentées dans la Phase 0.

### Prérequis

1. **Variables d'environnement** (optionnel pour certains tests) :
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL="https://votre-projet.supabase.co"
   export NEXT_PUBLIC_SUPABASE_ANON_KEY="votre-anon-key"
   ```

2. **Serveur Next.js** (optionnel pour les tests API) :
   ```bash
   pnpm dev
   ```

### Exécution

```bash
# Méthode 1: Via le script npm
pnpm test:phase0

# Méthode 2: Directement avec tsx
pnpm tsx scripts/test-phase0.ts

# Méthode 3: Avec variables d'environnement
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... pnpm test:phase0
```

### Ce qui est testé

#### ✅ Phase 0.1: Validation & Sanitization
- Validation des coordonnées géographiques (lat/lng)
- Sanitization HTML (prévention XSS)
- Validation téléphone mauritanien

#### ✅ Phase 0.2: Sécurité Backend
- Sécurité PostGIS (pas d'injection SQL)
- Format sécurisé des points géographiques

#### ✅ Phase 0.3: Validation des fichiers
- Types de fichiers autorisés (JPEG, PNG, WEBP)
- Taille maximale (5MB)
- Validation des fichiers vides

#### ✅ Phase 0.4: Contraintes Base de Données
- Contrainte NOT NULL sur `title` et `price`
- Contrainte `price > 0`
- Existence des index

#### ✅ Phase 0.2: Routes API
- Validation des données (title/price obligatoires)
- Rejet des coordonnées invalides
- Headers de rate limiting

### Résultat attendu

Si tous les tests passent, vous verrez :
```
🎉 Tous les tests sont passés ! Phase 0 validée ✅
```

Si certains tests échouent, les détails seront affichés avec les erreurs.

### Notes

- Les tests qui nécessitent une connexion à Supabase ou au serveur Next.js seront ignorés si ces services ne sont pas disponibles
- Les tests de validation et sanitization fonctionnent toujours, même sans connexion
- Pour tester le rate limiting complet, vous devrez faire plusieurs requêtes rapides manuellement

