-- ==========================================================
-- Migration 004 : Indicateur "Diffusion en direct (bientôt disponible)"
-- ==========================================================

ALTER TABLE services
  ADD COLUMN is_live_broadcast BOOLEAN NOT NULL DEFAULT FALSE AFTER is_featured;
