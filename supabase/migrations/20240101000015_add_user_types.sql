-- Migration: Ajouter le type d'utilisateur 'agence' aux rôles disponibles
-- Types d'utilisateurs: 'user' (utilisateur simple), 'admin' (administrateur), 'agence' (agence immobilière)

-- Supprimer l'ancienne contrainte check (si elle existe)
alter table profiles 
  drop constraint if exists profiles_role_check;

-- Ajouter la nouvelle contrainte avec les trois types
alter table profiles 
  add constraint profiles_role_check 
  check (role in ('user', 'admin', 'agence'));

-- Mettre à jour le type par défaut reste 'user' (pas besoin de changer)
-- Le trigger handle_new_user() créera toujours des utilisateurs avec role='user' par défaut

-- Ajouter un index sur le rôle pour améliorer les performances des requêtes
create index if not exists profiles_role_idx on profiles(role);

-- Commentaire pour documentation
comment on column profiles.role is 'Type d''utilisateur: user (utilisateur simple), admin (administrateur), agence (agence immobilière)';

-- Note sur les permissions RLS:
-- 1. Les politiques RLS existantes pour les listings fonctionnent déjà pour tous les types d'utilisateurs
--    car elles utilisent 'auth.uid() = owner_id' qui s'applique à tous les utilisateurs authentifiés
-- 2. Les agences ont les mêmes permissions que les utilisateurs simples (user):
--    - Peuvent créer/modifier/supprimer leurs propres listings
--    - Peuvent voir tous les listings publiés
--    - Peuvent signaler des listings
-- 3. Les admins ont des permissions supplémentaires (définies dans 20240101000004_moderation.sql):
--    - Peuvent modifier n'importe quel listing
--    - Peuvent voir et gérer tous les reports
--    - Ont accès au panneau d'administration
