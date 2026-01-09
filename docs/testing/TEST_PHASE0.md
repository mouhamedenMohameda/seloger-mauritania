# Guide de Test - Phase 0

## 🧪 Script de Test Automatique

Un script de test complet a été créé pour valider toutes les fonctionnalités de la Phase 0.

### Exécution Rapide

```bash
# Test complet (sans serveur)
pnpm test:phase0

# Test avec serveur Next.js démarré (dans un autre terminal)
pnpm dev  # Terminal 1
pnpm test:phase0  # Terminal 2
```

### Résultat Attendu

**Sans serveur Next.js** :
- ✅ 20 tests passent (validations, sanitization, sécurité PostGIS, fichiers)
- ⏭️ 4 tests ignorés (tests API nécessitant le serveur)

**Avec serveur Next.js démarré** :
- ✅ Tous les 24 tests passent

---

## 📋 Tests Manuels Recommandés

### 1. Test de Validation (Frontend)

1. **Aller sur `/post`**
2. **Essayer de créer une annonce sans titre** :
   - Laisser `title` vide
   - Remplir `price`, `lat`, `lng`
   - Cliquer sur "Publier"
   - ✅ **Attendu** : Erreur de validation, impossible de soumettre

3. **Essayer de créer une annonce sans prix** :
   - Remplir `title`, laisser `price` vide
   - ✅ **Attendu** : Erreur de validation

4. **Essayer avec prix = 0** :
   - Remplir tous les champs, mettre `price = 0`
   - ✅ **Attendu** : Erreur de validation (prix doit être > 0)

5. **Tester coordonnées invalides** :
   - Mettre `lat = 91` ou `lng = 181`
   - ✅ **Attendu** : Erreur de validation

### 2. Test Upload de Fichiers

1. **Aller sur `/post`**
2. **Essayer d'uploader un fichier non-image** :
   - Sélectionner un fichier `.pdf` ou `.txt`
   - ✅ **Attendu** : Message d'erreur "Type de fichier non autorisé"

3. **Essayer d'uploader un fichier trop gros** :
   - Sélectionner une image > 5MB
   - ✅ **Attendu** : Message d'erreur "Fichier trop volumineux"

4. **Uploader plusieurs fichiers** :
   - Sélectionner plus de 10 images
   - ✅ **Attendu** : Message "Maximum 10 photos autorisées"

5. **Tester le retry automatique** :
   - Uploader une image (le retry se fait automatiquement en cas d'erreur réseau)
   - ✅ **Attendu** : Progression visible, retry automatique si échec

### 3. Test Rate Limiting

1. **Ouvrir la console du navigateur (F12)**
2. **Exécuter cette commande plusieurs fois rapidement** :

```javascript
// Dans la console du navigateur
for (let i = 0; i < 15; i++) {
  fetch('/api/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test ' + i,
      price: 1000,
      lat: 18.0735,
      lng: -15.9582
    })
  }).then(r => console.log('Request', i, ':', r.status));
}
```

3. ✅ **Attendu** : 
   - Les 10 premières requêtes peuvent passer (401 Unauthorized si pas connecté)
   - Après 10 requêtes, vous devriez recevoir **429 Too Many Requests**
   - Les headers `X-RateLimit-Limit`, `X-RateLimit-Remaining` sont présents

### 4. Test Sanitization HTML

1. **Créer une annonce avec du HTML dans la description** :
   - Description : `<script>alert('XSS')</script>Hello <strong>World</strong>`
   - ✅ **Attendu** : 
     - Le `<script>` est supprimé
     - Le `<strong>` est conservé (tag autorisé)
     - Le texte "Hello World" est visible

### 5. Test Contraintes Base de Données

1. **Via le SQL Editor de Supabase** :

```sql
-- Test 1: Essayer d'insérer avec title NULL
INSERT INTO listings (owner_id, price, op_type, status)
VALUES ('00000000-0000-0000-0000-000000000000', 1000, 'rent', 'published');
-- ✅ Attendu : Erreur "null value in column 'title' violates not-null constraint"

-- Test 2: Essayer d'insérer avec price NULL
INSERT INTO listings (owner_id, title, op_type, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Test', 'rent', 'published');
-- ✅ Attendu : Erreur "null value in column 'price' violates not-null constraint"

-- Test 3: Essayer d'insérer avec price = 0
INSERT INTO listings (owner_id, title, price, op_type, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Test', 0, 'rent', 'published');
-- ✅ Attendu : Erreur "new row for relation 'listings' violates check constraint 'listings_price_check'"

-- Test 4: Vérifier que le trigger updated_at fonctionne
UPDATE listings SET title = 'Updated' WHERE id = 'un-id-existant';
-- ✅ Attendu : La colonne updated_at est automatiquement mise à jour
```

### 6. Test Sécurité PostGIS

1. **Vérifier qu'il n'y a pas d'injection SQL** :
   - Les coordonnées sont validées avant d'être utilisées
   - Le format `SRID=4326;POINT(...)` est utilisé (pas de concaténation SQL directe)
   - ✅ **Vérifié automatiquement** par le script de test

---

## ✅ Checklist de Validation

- [ ] Script de test automatique exécuté avec succès
- [ ] Validation frontend (title/price obligatoires) fonctionne
- [ ] Upload de fichiers validé (type, taille, nombre)
- [ ] Rate limiting actif (testé avec 15 requêtes rapides)
- [ ] Sanitization HTML fonctionne (scripts supprimés)
- [ ] Contraintes DB appliquées (NOT NULL, price > 0)
- [ ] Trigger `updated_at` fonctionne
- [ ] Index créés (vérifier dans Supabase Dashboard > Database > Indexes)

---

## 🐛 Dépannage

### Le script de test échoue sur les tests API

**Solution** : Démarrez le serveur Next.js dans un autre terminal :
```bash
pnpm dev
```

### Les tests de base de données sont ignorés

**Solution** : Ajoutez les variables d'environnement :
```bash
export NEXT_PUBLIC_SUPABASE_URL="https://votre-projet.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="votre-anon-key"
pnpm test:phase0
```

### Rate limiting ne fonctionne pas

**Vérifiez** :
1. Le serveur Next.js est bien démarré
2. Vous faites les requêtes rapidement (< 1 minute)
3. Les headers `X-RateLimit-*` sont présents dans la réponse

---

## 📊 Résultats Attendus

### Tests Automatiques
- **20/24 tests** passent sans serveur
- **24/24 tests** passent avec serveur

### Tests Manuels
- Toutes les validations fonctionnent
- Rate limiting bloque après 10 requêtes/min
- Upload de fichiers validé correctement
- Contraintes DB empêchent les données invalides

---

Une fois tous ces tests validés, vous pouvez passer à la **Phase 1 - Performance & Stabilité** ! 🚀

