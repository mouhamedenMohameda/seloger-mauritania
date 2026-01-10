-- Migration: Vérifier et corriger les permissions administrateur
-- Cette migration s'assure que les politiques admin existent et fonctionnent correctement

-- Supprimer les anciennes politiques admin si elles existent (pour éviter les doublons)
DROP POLICY IF EXISTS "Admins can view all listings" ON listings;
DROP POLICY IF EXISTS "Admins can update any listing" ON listings;
DROP POLICY IF EXISTS "Admins can delete any listing" ON listings;

-- 1. Politique RLS pour permettre aux admins de voir TOUS les listings (publiés ou non)
CREATE POLICY "Admins can view all listings"
  ON listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. Politique RLS pour permettre aux admins de modifier n'importe quel listing
-- (Cette politique devrait déjà exister dans 20240101000004_moderation.sql, mais on la recrée pour être sûr)
CREATE POLICY "Admins can update any listing"
  ON listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. Politique RLS pour permettre aux admins de supprimer n'importe quel listing
CREATE POLICY "Admins can delete any listing"
  ON listings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Vérification : Afficher toutes les politiques sur listings
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname = 'listings'
    AND (p.polname LIKE '%admin%' OR p.polname LIKE '%Admin%');
    
    RAISE NOTICE 'Nombre de politiques admin sur listings: %', policy_count;
    
    IF policy_count < 3 THEN
        RAISE WARNING 'Attention: Moins de 3 politiques admin trouvées. Certaines peuvent manquer.';
    ELSE
        RAISE NOTICE '✅ Toutes les politiques admin sont en place!';
    END IF;
END $$;

-- Commentaire pour documentation
COMMENT ON POLICY "Admins can view all listings" ON listings IS 
    'Permet aux administrateurs de voir tous les listings (publiés, brouillons, archivés)';
COMMENT ON POLICY "Admins can update any listing" ON listings IS 
    'Permet aux administrateurs de modifier n''importe quel listing, même ceux d''autres utilisateurs';
COMMENT ON POLICY "Admins can delete any listing" ON listings IS 
    'Permet aux administrateurs de supprimer n''importe quel listing, même ceux d''autres utilisateurs';
