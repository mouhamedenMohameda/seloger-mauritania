# Guide d'Importation de Listings

Ce guide explique les deux méthodes disponibles pour ajouter des listings dans l'application :

1. **Via l'interface web** - Formulaire interactif
2. **Via un script en ligne de commande** - Import depuis un fichier JSON

## Méthode 1 : Via l'Interface Web

### Accès
- URL : `http://localhost:3000/post` (ou votre URL de production)
- Requiert une authentification (connexion nécessaire)

### Utilisation
1. Connectez-vous à votre compte
2. Allez sur la page "Créer une annonce" (`/post`)
3. Remplissez le formulaire :
   - Titre (obligatoire, min 5 caractères)
   - Prix (obligatoire, > 0)
   - Type d'opération : Location ou Vente
   - Coordonnées GPS (cliquez sur la carte)
   - Autres champs optionnels (pièces, surface, description, photos)
4. Cliquez sur "Publier"

### Avantages
- Interface conviviale
- Validation en temps réel
- Upload de photos directement
- Sélection visuelle de l'emplacement sur la carte

---

## Méthode 2 : Via Script en Ligne de Commande

### Prérequis

1. **Variables d'environnement** (dans `.env.local` à la racine ou dans `apps/web/.env.local`) :
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
   ```

   > ⚠️ **Important** : Le service role key bypass RLS. Gardez-le secret et ne le commitez jamais.

2. **Fonction RPC** : La fonction `create_listing_with_location` doit être créée dans votre base de données.
   - Appliquez la migration : `supabase/migrations/20240101000010_create_listing_rpc.sql`
   - Voir `APPLY_RPC_MIGRATION.md` pour plus de détails

### Format JSON Supporté

#### Option A : Format MongoDB (comme `mes-annonces.json`, `data.json`)

Utilisez le script `import-mongodb-data.ts` :

```bash
# Depuis un fichier
pnpm tsx scripts/import-mongodb-data.ts --file=mes-annonces.json

# Depuis stdin (pipe)
cat mes-annonces.json | pnpm tsx scripts/import-mongodb-data.ts
```

**Structure attendue :**
```json
{
  "collection": [
    {
      "publisher": {
        "userId": "...",
        "name": "...",
        "phoneNumber": "...",
        "email": "..."
      },
      "title": "...",
      "description": "...",
      "price": 100000,
      "contractType": "sale",  // ou "rent"
      "geometry": {
        "type": "Point",
        "coordinates": [-15.9582, 18.0735]  // [lng, lat]
      },
      "photos": ["url1", "url2"],
      "surface": 120,
      "rooms": 3,
      // ... autres champs MongoDB
    }
  ]
}
```

#### Option B : Format Simple (format API)

Utilisez le script `import-listings-json.ts` :

```bash
# Depuis un fichier
pnpm tsx scripts/import-listings-json.ts --file=listings.json

# Depuis stdin
cat listings.json | pnpm tsx scripts/import-listings-json.ts
```

**Structure attendue :**
```json
{
  "listings": [
    {
      "title": "Maison à vendre",
      "price": 5000000,
      "op_type": "sell",  // ou "rent"
      "lat": 18.0735,
      "lng": -15.9582,
      "rooms": 3,
      "surface": 120,
      "description": "Belle maison...",
      "owner_id": "uuid-optionnel"  // Si omis, utilise le premier profil trouvé
    }
  ]
}
```

Ou un tableau simple :
```json
[
  {
    "title": "Maison à vendre",
    "price": 5000000,
    "op_type": "sell",
    "lat": 18.0735,
    "lng": -15.9582
  }
]
```

### Exemples d'Utilisation

#### Exemple 1 : Import depuis un fichier MongoDB
```bash
pnpm tsx scripts/import-mongodb-data.ts --file=mes-annonces.json
```

#### Exemple 2 : Import depuis un fichier simple
```bash
pnpm tsx scripts/import-listings-json.ts --file=listings.json
```

#### Exemple 3 : Créer un fichier simple et l'importer
```bash
# Créer listings.json
cat > listings.json << EOF
{
  "listings": [
    {
      "title": "Appartement à louer",
      "price": 50000,
      "op_type": "rent",
      "lat": 18.0735,
      "lng": -15.9582,
      "rooms": 2,
      "surface": 80,
      "description": "Bel appartement dans un quartier calme"
    }
  ]
}
EOF

# Importer
pnpm tsx scripts/import-listings-json.ts --file=listings.json
```

### Champs Requis/Optionnels

#### Format Simple (API)
- **Requis** : `title`, `price`, `lat`, `lng`, `op_type`
- **Optionnels** : `rooms`, `surface`, `description`, `owner_id`

#### Format MongoDB
- **Requis** : `title`, `price`, `geometry.coordinates`, `contractType`
- **Optionnels** : Tous les autres champs MongoDB sont supportés

### Résultat

Le script affiche :
- Progression de l'importation
- Succès/échecs pour chaque listing
- Résumé final avec statistiques

Exemple de sortie :
```
📥 Importation des données MongoDB vers Supabase
============================================================
📄 Lecture du fichier: mes-annonces.json
📊 50 listings trouvés

[1/50] Maison à vendre
  ✅ Listing importé avec succès (ID: abc-123)
  📸 3 photo(s) importée(s)

...

============================================================
📊 Résumé de l'importation:
  Total: 50
  ✅ Réussis: 48
  ❌ Échoués: 2
  👥 Publishers uniques: 5
============================================================

🎉 Tous les listings ont été importés avec succès !
```

### Dépannage

#### Erreur : "Could not find the function public.create_listing_with_location"
- **Solution** : Appliquez la migration `supabase/migrations/20240101000010_create_listing_rpc.sql`
- Voir `APPLY_RPC_MIGRATION.md` pour les instructions

#### Erreur : "Variables d'environnement manquantes"
- **Solution** : Créez un fichier `.env.local` avec `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`

#### Erreur : "Invalid coordinates"
- **Solution** : Vérifiez que les coordonnées sont valides :
  - Latitude : entre -90 et 90
  - Longitude : entre -180 et 180
  - Format : nombres décimaux (pas de strings)

#### Erreur : "Validation failed"
- **Solution** : Vérifiez les champs requis :
  - `title` : minimum 5 caractères
  - `price` : doit être > 0
  - `op_type` : doit être "rent" ou "sell"

---

## Comparaison des Méthodes

| Caractéristique | Interface Web | Script CLI |
|----------------|---------------|------------|
| **Facilité d'utilisation** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Import en masse** | ❌ | ✅ |
| **Validation visuelle** | ✅ | ❌ |
| **Upload de photos** | ✅ | ✅ (via URLs) |
| **Automatisation** | ❌ | ✅ |
| **Requiert authentification** | ✅ | ❌ (avec service role) |
| **Supporte format MongoDB** | ❌ | ✅ |

---

## Recommandations

- **Pour un ou quelques listings** : Utilisez l'interface web
- **Pour beaucoup de listings** : Utilisez le script CLI
- **Pour migrer depuis MongoDB** : Utilisez `import-mongodb-data.ts`
- **Pour des données simples** : Utilisez `import-listings-json.ts`

---

## Notes Importantes

1. **Service Role Key** : Le script utilise la service role key qui bypass toutes les politiques RLS. Utilisez-la uniquement pour les imports et gardez-la secrète.

2. **Photos** : Les photos sont importées avec leurs URLs. Elles ne sont pas téléchargées et stockées localement - les URLs externes sont simplement enregistrées.

3. **Performance** : Pour de gros imports (1000+ listings), le script peut prendre du temps. Pensez à diviser les fichiers en lots plus petits.

4. **Idempotence** : Le script peut être exécuté plusieurs fois - il créera des doublons si vous importez les mêmes données. Pour éviter les doublons, ajoutez une logique de vérification basée sur un identifiant unique (ex: `_id` MongoDB).
