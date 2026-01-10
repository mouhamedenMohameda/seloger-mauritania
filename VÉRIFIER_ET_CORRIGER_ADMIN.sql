-- =====================================================
-- SCRIPT DE VÉRIFICATION ET CORRECTION DES PERMISSIONS ADMIN
-- =====================================================
-- Exécutez ce script dans Supabase Dashboard > SQL Editor
-- Ce script va :
-- 1. Vérifier si les politiques admin existent
-- 2. Vérifier si vous avez des utilisateurs admin
-- 3. Créer/corriger les politiques si nécessaire
-- =====================================================

-- ÉTAPE 1: Vérifier les politiques admin existantes
SELECT 
    p.polname as "Nom de la politique",
    CASE p.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE p.polcmd::text
    END as "Commande",
    pg_get_expr(p.polqual, p.polrelid) as "Condition"
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'listings'
AND (p.polname LIKE '%admin%' OR p.polname LIKE '%Admin%')
ORDER BY p.polname;

-- ÉTAPE 2: Vérifier les utilisateurs et leurs rôles
SELECT 
    u.id as "ID Utilisateur",
    u.email as "Email",
    p.role as "Rôle",
    p.full_name as "Nom complet",
    CASE 
        WHEN p.role = 'admin' THEN '✅ Admin'
        WHEN p.role = 'agence' THEN '🏢 Agence'
        WHEN p.role = 'user' THEN '👤 Utilisateur'
        ELSE '❓ Inconnu'
    END as "Statut"
FROM auth.users u
JOIN profiles p ON p.id = u.id
ORDER BY p.role DESC, u.email;

-- ÉTAPE 3: Supprimer les anciennes politiques admin (pour éviter les doublons)
DROP POLICY IF EXISTS "Admins can view all listings" ON listings;
DROP POLICY IF EXISTS "Admins can update any listing" ON listings;
DROP POLICY IF EXISTS "Admins can delete any listing" ON listings;

-- ÉTAPE 4: Créer les politiques admin correctes
-- 4a. Politique SELECT: Admins peuvent voir TOUS les listings (publiés, brouillons, archivés)
CREATE POLICY "Admins can view all listings"
  ON listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4b. Politique UPDATE: Admins peuvent modifier n'importe quel listing
CREATE POLICY "Admins can update any listing"
  ON listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4c. Politique DELETE: Admins peuvent supprimer n'importe quel listing
CREATE POLICY "Admins can delete any listing"
  ON listings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ÉTAPE 5: Vérifier que les politiques ont été créées correctement
SELECT 
    p.polname as "Nom de la politique",
    CASE p.polcmd
        WHEN 'r' THEN 'SELECT ✅'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE ✅'
        WHEN 'd' THEN 'DELETE ✅'
        ELSE p.polcmd::text
    END as "Commande",
    '✅ Créée' as "Statut"
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'listings'
AND (p.polname LIKE '%admin%' OR p.polname LIKE '%Admin%')
ORDER BY p.polname;

-- ÉTAPE 6: Si vous n'avez pas d'admin, vous pouvez en créer un ici
-- REMPLACEZ 'VOTRE_EMAIL@example.com' par l'email de l'utilisateur à promouvoir admin
/*
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'VOTRE_EMAIL@example.com'
);

-- Vérifier que la mise à jour a fonctionné
SELECT 
    u.email,
    p.role,
    CASE 
        WHEN p.role = 'admin' THEN '✅ Maintenant admin!'
        ELSE '❌ Toujours pas admin'
    END as "Résultat"
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email = 'VOTRE_EMAIL@example.com';
*/

-- =====================================================
-- RÉSUMÉ
-- =====================================================
-- Si vous voyez 3 politiques admin dans l'étape 5, tout est correct ✅
-- Si vous voyez moins de 3, il y a un problème ❌
-- 
-- PROCHAINES ÉTAPES:
-- 1. Déconnectez-vous et reconnectez-vous dans l'application
-- 2. Allez sur /account pour vérifier que votre rôle est "Administrateur"
-- 3. Testez en essayant de modifier/supprimer un listing d'un autre utilisateur
-- =====================================================
