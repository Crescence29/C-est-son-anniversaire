-- ==========================================================
-- Migration 005 : Réglages du site (contenu de la page d'accueil,
-- blocs activables/désactivables, réseaux sociaux) éditables sans code.
-- ==========================================================

CREATE TABLE site_settings (
  id VARCHAR(10) PRIMARY KEY,
  data JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
