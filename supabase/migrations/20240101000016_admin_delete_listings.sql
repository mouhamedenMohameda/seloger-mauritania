-- Migration: Permettre aux administrateurs de supprimer et voir tous les listings
-- Les admins peuvent maintenant modifier, supprimer et voir n'importe quel listing

-- Politique RLS pour permettre aux admins de voir TOUS les listings (publiés ou non)
create policy "Admins can view all listings"
  on listings for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Politique RLS pour permettre aux admins de supprimer n'importe quel listing
create policy "Admins can delete any listing"
  on listings for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Note: Ces politiques s'ajoutent aux politiques existantes
-- 1. Les propriétaires peuvent toujours voir/supprimer leurs propres listings (politiques existantes)
-- 2. Le public peut voir les listings publiés (politique existante)
-- 3. Les admins peuvent maintenant voir, modifier et supprimer n'importe quel listing (nouvelles politiques)
