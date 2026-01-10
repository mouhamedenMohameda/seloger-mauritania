-- Migration: Ajout des champs MongoDB à la table listings
-- Ne casse pas les champs existants, ajoute seulement les nouveaux champs

-- Champs métier
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS visit_count integer DEFAULT 0 CHECK (visit_count >= 0),
  ADD COLUMN IF NOT EXISTS sold boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS professional boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_real_location boolean DEFAULT true;

-- Informations client (publisher/client)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_phone_number text;

-- Catégorisation
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS region text;

-- Informations géographiques détaillées (lotissement, lot, etc.)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS lotissement text,
  ADD COLUMN IF NOT EXISTS lot text[], -- Array de strings pour les lots (ex: ["180"])
  ADD COLUMN IF NOT EXISTS index text, -- Index du lotissement (ex: "93")
  ADD COLUMN IF NOT EXISTS ilot_size text, -- Taille de l'îlot (ex: "246")
  ADD COLUMN IF NOT EXISTS polygone_area text, -- Aire du polygone (ex: "502.75 m²")
  ADD COLUMN IF NOT EXISTS elevation text, -- Élévation (ex: "+6 m")
  ADD COLUMN IF NOT EXISTS sides_length text; -- Longueurs des côtés (ex: " 20m 25m 20m 25m")

-- Géométrie avancée
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS sub_polygon jsonb, -- Géométrie complexe du sous-polygone
  ADD COLUMN IF NOT EXISTS sub_polygon_color text; -- Couleur du sous-polygone pour affichage

-- Liens externes
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS matterport_link text; -- Lien Matterport pour visite virtuelle

-- Index pour améliorer les performances des requêtes fréquentes
-- Index sur region (filtrage par région très fréquent)
CREATE INDEX IF NOT EXISTS listings_region_idx 
  ON listings(region) 
  WHERE region IS NOT NULL;

-- Index sur category (filtrage par catégorie)
CREATE INDEX IF NOT EXISTS listings_category_idx 
  ON listings(category) 
  WHERE category IS NOT NULL;

-- Index composite category + sub_category (filtrage combiné)
CREATE INDEX IF NOT EXISTS listings_category_sub_category_idx 
  ON listings(category, sub_category) 
  WHERE category IS NOT NULL AND sub_category IS NOT NULL;

-- Index sur professional (filtrage par type de client)
CREATE INDEX IF NOT EXISTS listings_professional_idx 
  ON listings(professional);

-- Index sur visit_count (tri par popularité)
CREATE INDEX IF NOT EXISTS listings_visit_count_idx 
  ON listings(visit_count DESC) 
  WHERE visit_count > 0;

-- Index sur lotissement (recherche par lotissement)
CREATE INDEX IF NOT EXISTS listings_lotissement_idx 
  ON listings(lotissement) 
  WHERE lotissement IS NOT NULL;

-- Index GIN sur lot (recherche dans le tableau)
CREATE INDEX IF NOT EXISTS listings_lot_gin_idx 
  ON listings USING GIN(lot) 
  WHERE lot IS NOT NULL;

-- Index GIN sur sub_polygon (recherche dans le JSONB)
CREATE INDEX IF NOT EXISTS listings_sub_polygon_gin_idx 
  ON listings USING GIN(sub_polygon) 
  WHERE sub_polygon IS NOT NULL;

-- Index sur sold (filtrage par statut vendu)
CREATE INDEX IF NOT EXISTS listings_sold_idx 
  ON listings(sold) 
  WHERE sold = false; -- Index partiel car on cherche surtout les non-vendus

-- Commentaires pour documentation
COMMENT ON COLUMN listings.visit_count IS 'Nombre de vues/visites du listing';
COMMENT ON COLUMN listings.sold IS 'Indique si le bien est vendu (gardé pour compatibilité MongoDB)';
COMMENT ON COLUMN listings.professional IS 'Indique si le listing provient d''un client professionnel';
COMMENT ON COLUMN listings.is_real_location IS 'Indique si la localisation est réelle ou approximative';
COMMENT ON COLUMN listings.client_name IS 'Nom du client/publisher (peut être différent du owner_id)';
COMMENT ON COLUMN listings.client_phone_number IS 'Numéro de téléphone du client/publisher';
COMMENT ON COLUMN listings.category IS 'Catégorie principale (ex: realEstate)';
COMMENT ON COLUMN listings.sub_category IS 'Sous-catégorie (ex: land, house, apartment)';
COMMENT ON COLUMN listings.region IS 'Région/quartier (ex: tevragh-zeina, arafat)';
COMMENT ON COLUMN listings.lotissement IS 'Nom du lotissement (ex: Nord Campus Universitaire)';
COMMENT ON COLUMN listings.lot IS 'Tableau des numéros de lots (ex: ["180"])';
COMMENT ON COLUMN listings.index IS 'Index du lotissement (ex: "93")';
COMMENT ON COLUMN listings.ilot_size IS 'Taille de l''îlot (ex: "246")';
COMMENT ON COLUMN listings.polygone_area IS 'Aire du polygone formatée (ex: "502.75 m²")';
COMMENT ON COLUMN listings.elevation IS 'Élévation formatée (ex: "+6 m")';
COMMENT ON COLUMN listings.sides_length IS 'Longueurs des côtés formatées (ex: " 20m 25m 20m 25m")';
COMMENT ON COLUMN listings.sub_polygon IS 'Géométrie complexe du sous-polygone au format JSONB';
COMMENT ON COLUMN listings.sub_polygon_color IS 'Couleur du sous-polygone pour affichage visuel';
COMMENT ON COLUMN listings.matterport_link IS 'Lien Matterport pour visite virtuelle 3D';
