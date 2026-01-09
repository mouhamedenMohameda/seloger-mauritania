# Guide de Test - Phase 2.3 : UX Essentielle

Ce guide vous permet de tester manuellement toutes les améliorations UX (états, confirmations, feedback visuel).

## Prérequis

1. **Serveur Next.js en cours d'exécution** :
   ```bash
   cd apps/web
   pnpm dev
   ```

## Tests Automatisés

### Exécuter le script de test

```bash
# Depuis la racine du projet
pnpm test:phase2-3
```

Le script teste automatiquement :
- ✅ Composants UI (LoadingState, EmptyState, ErrorState, ConfirmDialog, Toast)
- ✅ Système de Toast (useToast, ToastContainer)
- ✅ Intégration dans les pages
- ✅ Remplacement de confirm() par ConfirmDialog
- ✅ Traductions

## Tests Manuels

### 1. États Loading

#### 1.1 Page d'accueil

1. Allez sur la page d'accueil (`/`)
2. Déplacez rapidement la carte (changez les bounds)

**Résultat attendu** :
- Un indicateur de chargement apparaît pendant la recherche
- Message "Recherche..." affiché
- Spinner animé visible

#### 1.2 Page Mes Annonces

1. Allez sur `/my-listings`
2. Rechargez la page (F5)

**Résultat attendu** :
- État de chargement avec spinner
- Message "Chargement..." affiché
- Pas de contenu affiché pendant le chargement

#### 1.3 Page de détail

1. Allez sur `/listings/[id]` (remplacez [id] par un ID valide)
2. Rechargez la page

**Résultat attendu** :
- État de chargement plein écran
- Spinner centré
- Message de chargement affiché

### 2. États Empty

#### 2.1 Page d'accueil sans résultats

1. Allez sur la page d'accueil
2. Déplacez la carte vers une zone sans annonces (ex: océan)

**Résultat attendu** :
- État vide avec icône
- Message "Aucune annonce"
- Message secondaire "Déplacez la carte pour explorer les annonces"

#### 2.2 Page Mes Annonces vide

1. Connectez-vous avec un compte sans annonces
2. Allez sur `/my-listings`

**Résultat attendu** :
- État vide avec icône
- Message "Aucune annonce"
- Bouton "Créer une annonce" visible

### 3. États Error

#### 3.1 Erreur de chargement

1. Coupez temporairement votre connexion internet
2. Allez sur `/my-listings`
3. Attendez que l'erreur apparaisse

**Résultat attendu** :
- État d'erreur avec icône d'alerte
- Message d'erreur clair
- Bouton "Réessayer" visible
- Clic sur "Réessayer" recharge la page

#### 3.2 Erreur de carte

1. Allez sur `/post`
2. Si la carte ne charge pas (erreur réseau), vérifiez l'état d'erreur

**Résultat attendu** :
- Message d'erreur affiché dans LocationPicker
- Icône d'erreur visible

### 4. Confirmations

#### 4.1 Suppression d'annonce

1. Allez sur `/my-listings`
2. Cliquez sur "Supprimer" pour une annonce
3. Observez la modal de confirmation

**Résultat attendu** :
- Modal de confirmation s'ouvre (pas de `confirm()` natif)
- Titre : "Confirmer la suppression"
- Message avec le titre de l'annonce
- Boutons "Annuler" et "Supprimer" (rouge)
- Clic sur "Annuler" ferme la modal sans supprimer
- Clic sur "Supprimer" supprime l'annonce

#### 4.2 Suppression de photo

1. Allez sur `/listings/[id]/edit`
2. Cliquez sur le bouton de suppression d'une photo existante
3. Observez la modal de confirmation

**Résultat attendu** :
- Modal de confirmation s'ouvre
- Message : "Êtes-vous sûr de vouloir supprimer cette photo ?"
- Boutons "Annuler" et "Supprimer"
- Clic sur "Supprimer" supprime la photo

### 5. Feedback Visuel (Toasts)

#### 5.1 Création d'annonce

1. Allez sur `/post`
2. Remplissez le formulaire et soumettez

**Résultat attendu** :
- Toast vert "Annonce créée avec succès" apparaît en haut à droite
- Toast disparaît automatiquement après 3 secondes
- Si photos uploadées : Toast "Photos téléchargées avec succès"

#### 5.2 Mise à jour d'annonce

1. Allez sur `/listings/[id]/edit`
2. Modifiez des champs et sauvegardez

**Résultat attendu** :
- Toast vert "Annonce mise à jour avec succès"
- Toast disparaît automatiquement

#### 5.3 Suppression d'annonce

1. Supprimez une annonce depuis `/my-listings`

**Résultat attendu** :
- Toast vert "Annonce supprimée avec succès"
- L'annonce disparaît de la liste

#### 5.4 Erreurs

1. Essayez de créer une annonce avec des données invalides

**Résultat attendu** :
- Toast rouge avec le message d'erreur
- Toast reste visible jusqu'à fermeture manuelle ou timeout

#### 5.5 Suppression de photo

1. Supprimez une photo depuis la page d'édition

**Résultat attendu** :
- Toast vert "Photo supprimée avec succès"
- La photo disparaît de la liste

### 6. Feedback Visuel Général

#### 6.1 Boutons désactivés pendant chargement

1. Créez une annonce (`/post`)
2. Cliquez sur "Publier"
3. Observez le bouton pendant le chargement

**Résultat attendu** :
- Bouton désactivé (opacity réduite, cursor not-allowed)
- Texte change pour "Publication..." ou équivalent
- Pas de double soumission possible

#### 6.2 Transitions visuelles

1. Naviguez entre les pages
2. Observez les transitions

**Résultat attendu** :
- Transitions fluides
- Pas de flash de contenu blanc
- États de chargement apparaissent rapidement

#### 6.3 Feedback sur actions

1. Testez toutes les actions (créer, modifier, supprimer)

**Résultat attendu** :
- Chaque action réussie affiche un toast
- Chaque erreur affiche un toast d'erreur
- Pas d'alertes natives (`alert()`)

## Checklist de Validation

- [ ] LoadingState utilisé dans toutes les pages qui chargent des données
- [ ] EmptyState utilisé quand aucune donnée n'est disponible
- [ ] ErrorState utilisé pour les erreurs avec bouton "Réessayer"
- [ ] ConfirmDialog remplace tous les `confirm()` natifs
- [ ] ToastContainer intégré dans le layout
- [ ] Toasts apparaissent pour toutes les actions (création, modification, suppression)
- [ ] Toasts d'erreur pour les échecs
- [ ] Toasts disparaissent automatiquement
- [ ] Boutons désactivés pendant les actions
- [ ] Pas d'alertes natives (`alert()`) dans le code
- [ ] Traductions françaises complètes
- [ ] Traductions arabes complètes
- [ ] UX cohérente sur toutes les pages

## Problèmes Courants

### "Toast ne s'affiche pas"
- **Solution** : Vérifier que ToastContainer est dans layout.tsx
- Vérifier que useToast est bien appelé dans le composant

### "ConfirmDialog ne s'ouvre pas"
- **Solution** : Vérifier que `isOpen` est bien défini à `true`
- Vérifier que l'état `deleteConfirm` est bien géré

### "États loading/empty/error ne s'affichent pas"
- **Solution** : Vérifier que les composants sont bien importés
- Vérifier que les conditions `isLoading`, `error`, `data.length === 0` sont correctes

### "confirm() encore utilisé"
- **Solution** : Rechercher tous les `confirm(` dans le code et les remplacer par ConfirmDialog

## Résultats Attendus

Après avoir complété tous les tests, vous devriez avoir :

✅ **États UX complets** : Loading, Empty, Error présents partout
✅ **Confirmations modernes** : Tous les `confirm()` remplacés par ConfirmDialog
✅ **Feedback visuel** : Toasts pour toutes les actions importantes
✅ **UX cohérente** : Expérience utilisateur fluide et professionnelle
✅ **Accessibilité** : Messages clairs, boutons désactivés pendant actions
✅ **Traductions** : Interface complète en français et arabe

---

**Note** : Si vous rencontrez des problèmes, vérifiez les logs du serveur et de la console du navigateur pour plus de détails.

