# 🧪 Guide de Test Manuel - Phase 0

Ce guide vous explique comment tester manuellement toutes les fonctionnalités de sécurité et validation implémentées dans la Phase 0.

---

## 📋 Prérequis

1. **Serveur Next.js démarré** :
   ```bash
   cd /Users/mohameda/Desktop/Personal/seloger
   pnpm dev
   ```
   Le serveur devrait être accessible sur `http://localhost:3000`

2. **Compte utilisateur créé** :
   - Allez sur `/login`
   - Créez un compte ou connectez-vous

---

## ✅ Test 1 : Validation des Champs Obligatoires

### 1.1 Test : Title obligatoire

1. **Aller sur** : `http://localhost:3000/post`
2. **Remplir le formulaire** :
   - ❌ Laisser `title` **VIDE**
   - ✅ Remplir `price` : `1000`
   - ✅ Remplir `lat` : `18.0735`
   - ✅ Remplir `lng` : `-15.9582`
   - ✅ Sélectionner un type : `Location`
3. **Cliquer sur "Publier"**

**✅ Résultat attendu** :
- Le formulaire ne se soumet pas
- Message d'erreur : "Title is required" ou équivalent
- Le champ `title` est surligné en rouge

---

### 1.2 Test : Price obligatoire

1. **Sur la même page** `/post`
2. **Remplir le formulaire** :
   - ✅ Remplir `title` : `Appartement à Nouakchott`
   - ❌ Laisser `price` **VIDE**
   - ✅ Remplir `lat` : `18.0735`
   - ✅ Remplir `lng` : `-15.9582`
3. **Cliquer sur "Publier"**

**✅ Résultat attendu** :
- Erreur de validation
- Message : "Price is required"

---

### 1.3 Test : Price doit être > 0

1. **Sur `/post`**
2. **Remplir** :
   - ✅ `title` : `Test`
   - ❌ `price` : `0` (ou nombre négatif)
   - ✅ `lat` : `18.0735`
   - ✅ `lng` : `-15.9582`
3. **Cliquer sur "Publier"**

**✅ Résultat attendu** :
- Erreur de validation
- Message indiquant que le prix doit être supérieur à 0

---

## ✅ Test 2 : Validation des Coordonnées Géographiques

### 2.1 Test : Coordonnées invalides (lat > 90)

1. **Sur `/post`**
2. **Remplir** :
   - ✅ `title` : `Test`
   - ✅ `price` : `1000`
   - ❌ `lat` : `91` (invalide, doit être ≤ 90)
   - ✅ `lng` : `-15.9582`
3. **Cliquer sur "Publier"**

**✅ Résultat attendu** :
- Erreur : "Invalid coordinates" ou "lat must be in [-90, 90]"

---

### 2.2 Test : Coordonnées invalides (lng > 180)

1. **Sur `/post`**
2. **Remplir** :
   - ✅ `title` : `Test`
   - ✅ `price` : `1000`
   - ✅ `lat` : `18.0735`
   - ❌ `lng` : `181` (invalide, doit être ≤ 180)
3. **Cliquer sur "Publier"**

**✅ Résultat attendu** :
- Erreur : "Invalid coordinates" ou "lng must be in [-180, 180]"

---

## ✅ Test 3 : Upload de Fichiers

### 3.1 Test : Type de fichier non autorisé

1. **Sur `/post`**
2. **Remplir les champs obligatoires**
3. **Dans la section "Photos"** :
   - Cliquer sur "Upload File"
   - Sélectionner un fichier **non-image** (ex: `.pdf`, `.txt`, `.doc`)
4. **Essayer de continuer**

**✅ Résultat attendu** :
- Message d'erreur : "Type de fichier non autorisé. Types acceptés: JPEG, PNG, WEBP"
- Le fichier n'est pas ajouté à la liste

---

### 3.2 Test : Fichier trop volumineux (> 5MB)

1. **Sur `/post`**
2. **Dans la section "Photos"** :
   - Sélectionner une image de **plus de 5MB**
3. **Essayer d'ajouter**

**✅ Résultat attendu** :
- Message d'erreur : "Fichier trop volumineux. Taille maximale: 5MB"
- Le fichier n'est pas ajouté

---

### 3.3 Test : Nombre maximum de fichiers (10 max)

1. **Sur `/post`**
2. **Dans la section "Photos"** :
   - Ajouter **10 images** (devrait fonctionner)
   - Essayer d'ajouter une **11ème image**

**✅ Résultat attendu** :
- Message : "Maximum 10 photos autorisées"
- La 11ème image n'est pas ajoutée

---

### 3.4 Test : Retry automatique et feedback

1. **Sur `/post`**
2. **Remplir tous les champs**
3. **Ajouter quelques photos**
4. **Cliquer sur "Publier"**

**✅ Résultat attendu** :
- Pendant l'upload, vous voyez :
  - Indicateur de progression par photo (0%, 50%, 75%, 100%)
  - Messages de succès/erreur visuels
- Si une photo échoue, retry automatique (3 tentatives)

---

## ✅ Test 4 : Sanitization HTML (Prévention XSS)

### 4.1 Test : Scripts supprimés

1. **Sur `/post`**
2. **Remplir les champs obligatoires**
3. **Dans "Description"**, entrer :
   ```
   <script>alert('XSS Attack!')</script>
   Bonjour, voici mon appartement.
   ```
4. **Publier l'annonce**
5. **Voir l'annonce publiée** (sur `/listings/[id]`)

**✅ Résultat attendu** :
- Le `<script>` est **supprimé** de la description
- Seul le texte "Bonjour, voici mon appartement." est visible
- **Aucune alerte JavaScript** ne s'affiche

---

### 4.2 Test : Tags HTML autorisés conservés

1. **Sur `/post`**
2. **Dans "Description"**, entrer :
   ```
   <p>Paragraphe</p>
   <strong>Texte en gras</strong>
   <em>Texte en italique</em>
   ```
3. **Publier et voir l'annonce**

**✅ Résultat attendu** :
- Les tags `<p>`, `<strong>`, `<em>` sont **conservés**
- Le texte s'affiche avec le formatage

---

## ✅ Test 5 : Rate Limiting

### 5.1 Test : Rate limiting sur les routes API

1. **Ouvrir la console du navigateur** (F12 → Console)
2. **Copier-coller ce code** :

```javascript
// Test rate limiting - Faire 15 requêtes rapides
async function testRateLimit() {
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test ' + i,
          price: 1000,
          lat: 18.0735,
          lng: -15.9582
        })
      });
      console.log(`Requête ${i + 1}:`, res.status, res.statusText);
      
      // Afficher les headers de rate limit
      const limit = res.headers.get('X-RateLimit-Limit');
      const remaining = res.headers.get('X-RateLimit-Remaining');
      if (limit) {
        console.log(`  → Rate Limit: ${remaining}/${limit}`);
      }
    } catch (error) {
      console.error(`Requête ${i + 1} échouée:`, error);
    }
  }
}

testRateLimit();
```

3. **Exécuter le code** (Entrée)

**✅ Résultat attendu** :
- Les **10 premières requêtes** : `401 Unauthorized` (normal, pas connecté) ou `400 Bad Request`
- Après la **10ème requête** : `429 Too Many Requests`
- Headers présents : `X-RateLimit-Limit: 10`, `X-RateLimit-Remaining: 0`
- Message : "Rate limit exceeded. Please try again later."

---

### 5.2 Test : Rate limiting avec authentification

1. **Se connecter** sur `/login`
2. **Dans la console**, exécuter le même code que ci-dessus
3. **Observer les résultats**

**✅ Résultat attendu** :
- Même comportement : 10 requêtes max par minute
- Après 10 requêtes, erreur 429

---

## ✅ Test 6 : Contraintes Base de Données

### 6.1 Test : Title NOT NULL

1. **Aller sur Supabase Dashboard** :
   - https://supabase.com/dashboard/project/naiviubpfsepdordekyf
   - Cliquer sur "SQL Editor"
2. **Exécuter cette requête** :

```sql
-- Essayer d'insérer avec title NULL
INSERT INTO listings (owner_id, price, op_type, status)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  1000,
  'rent',
  'published'
);
```

**✅ Résultat attendu** :
- Erreur : `null value in column "title" violates not-null constraint`
- L'insertion échoue

---

### 6.2 Test : Price NOT NULL

```sql
-- Essayer d'insérer avec price NULL
INSERT INTO listings (owner_id, title, op_type, status)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  'Test Listing',
  'rent',
  'published'
);
```

**✅ Résultat attendu** :
- Erreur : `null value in column "price" violates not-null constraint`

---

### 6.3 Test : Price > 0

```sql
-- Essayer d'insérer avec price = 0
INSERT INTO listings (owner_id, title, price, op_type, status)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  'Test Listing',
  0,  -- Invalide, doit être > 0
  'rent',
  'published'
);
```

**✅ Résultat attendu** :
- Erreur : `new row for relation "listings" violates check constraint "listings_price_check"`

---

### 6.4 Test : Trigger updated_at automatique

```sql
-- Vérifier qu'un UPDATE met à jour updated_at automatiquement
SELECT id, title, updated_at 
FROM listings 
LIMIT 1;

-- Noter la valeur de updated_at, puis :
UPDATE listings 
SET title = 'Updated Title' 
WHERE id = 'votre-id-ici';

-- Vérifier que updated_at a changé
SELECT id, title, updated_at 
FROM listings 
WHERE id = 'votre-id-ici';
```

**✅ Résultat attendu** :
- La colonne `updated_at` est automatiquement mise à jour avec la date/heure actuelle
- Pas besoin de la mettre à jour manuellement

---

## ✅ Test 7 : Sécurité PostGIS (Injection SQL)

### 7.1 Test : Format sécurisé des points

1. **Dans Supabase SQL Editor**, exécuter :

```sql
-- Vérifier qu'un listing a bien un point géographique sécurisé
SELECT 
  id,
  title,
  ST_AsText(location) as location_text,
  ST_X(location::geometry) as longitude,
  ST_Y(location::geometry) as latitude
FROM listings
LIMIT 1;
```

**✅ Résultat attendu** :
- Le format est `POINT(longitude latitude)` avec SRID 4326
- Pas de construction SQL manuelle dangereuse visible

---

### 7.2 Test : Coordonnées validées avant insertion

1. **Essayer d'insérer avec coordonnées invalides via l'API** :
   - Utiliser Postman ou curl avec `lat=91` ou `lng=181`
   - L'API devrait rejeter avant même d'atteindre la base de données

**✅ Résultat attendu** :
- Erreur 400 avant insertion en DB
- Message : "Invalid coordinates"

---

## ✅ Test 8 : Vérification de Propriété

### 8.1 Test : Impossible de modifier l'annonce d'un autre

1. **Créer une annonce** (utilisateur A)
2. **Se déconnecter**
3. **Se connecter avec un autre compte** (utilisateur B)
4. **Essayer de modifier l'annonce de l'utilisateur A** :
   - Aller sur `/listings/[id-de-l-annonce-A]/edit`
   - Modifier quelque chose
   - Sauvegarder

**✅ Résultat attendu** :
- Erreur 403 Forbidden
- Message : "Forbidden" ou "You don't have permission"
- L'annonce n'est pas modifiée

---

## 📊 Checklist de Validation

Cochez chaque test au fur et à mesure :

### Validation Frontend
- [ ] Title obligatoire → erreur si vide
- [ ] Price obligatoire → erreur si vide
- [ ] Price > 0 → erreur si 0 ou négatif
- [ ] Coordonnées invalides → erreur si lat > 90 ou lng > 180

### Upload de Fichiers
- [ ] Type non autorisé → rejeté
- [ ] Fichier > 5MB → rejeté
- [ ] Plus de 10 fichiers → rejeté
- [ ] Retry automatique fonctionne
- [ ] Feedback visuel (progression, erreur, succès)

### Sécurité
- [ ] Scripts HTML supprimés (XSS)
- [ ] Tags autorisés conservés
- [ ] Rate limiting actif (429 après 10 req/min)
- [ ] Headers rate limit présents

### Base de Données
- [ ] Title NOT NULL → erreur si NULL
- [ ] Price NOT NULL → erreur si NULL
- [ ] Price > 0 → erreur si 0
- [ ] Trigger updated_at fonctionne

### Autorisation
- [ ] Impossible de modifier l'annonce d'un autre → 403

---

## 🐛 Dépannage

### Les tests API échouent
**Solution** : Vérifiez que le serveur Next.js est démarré (`pnpm dev`)

### Les tests DB échouent
**Solution** : Vérifiez que vous êtes connecté au bon projet Supabase

### Rate limiting ne fonctionne pas
**Solution** : 
- Vérifiez que vous faites les requêtes rapidement (< 1 minute)
- Attendez 1 minute entre les tests pour réinitialiser le compteur

### Les erreurs ne s'affichent pas
**Solution** : 
- Ouvrez la console du navigateur (F12)
- Vérifiez les erreurs réseau dans l'onglet "Network"

---

## ✅ Une fois tous les tests validés

Vous pouvez passer à la **Phase 1 - Performance & Stabilité** ! 🚀

