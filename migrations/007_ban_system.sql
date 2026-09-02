-- ==========================================================
-- Migration 007 : Système de bannissement définitif + motif de
-- suspension/bannissement affiché au client concerné.
-- ==========================================================

ALTER TABLE users
  ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE AFTER status,
  ADD COLUMN status_reason VARCHAR(500) NULL AFTER is_banned;
