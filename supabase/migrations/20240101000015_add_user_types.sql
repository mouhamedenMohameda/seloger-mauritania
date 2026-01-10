-- Migration: Ajouter le type d'utilisateur 'agence' aux rôles disponibles
-- Types d'utilisateurs: 'user' (utilisateur simple), 'admin', 'agence'

-- Supprimer l'ancienne contrainte check
alter table profiles 
  drop constraint if exists profiles_role_check;

-- Ajouter la nouvelle contrainte avec les trois types
alter table profiles 
  add constraint profiles_role_check 
  check (role in ('user', 'admin', 'agence'));

-- Mettre à jour le type par défaut reste 'user' (pas besoin de changer)
-- Le trigger handle_new_user() créera toujours des utilisateurs avec role='user' par défaut

-- Optionnel: Ajouter un index sur le rôle pour améliorer les performances des requêtes
create index if not exists profiles_role_idx on profiles(role);

-- Commentaire pour documentation
comment on column profiles.role is 'Type d''utilisateur: user (utilisateur simple), admin (administrateur), agence (agence immobilière)';

-- Note: Les politiques RLS existantes pour les listings fonctionnent déjà pour tous les types d'utilisateurs
-- Les agences ont les mêmes permissions que les utilisateurs simples (user)
-- Les admins peuvent avoir des permissions supplémentaires définies dans d'autres migrations
