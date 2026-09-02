-- ==========================================================
-- Migration 008 : Invalidation immédiate des sessions actives
-- lors d'un changement de mot de passe (self-service ou admin).
-- ==========================================================

ALTER TABLE users
  ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER status_reason;
