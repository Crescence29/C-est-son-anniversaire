-- ==========================================================
-- Migration 003: Compte développeur protégé + journal d'activité
-- ==========================================================

ALTER TABLE users
  ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE AFTER status;

CREATE TABLE activity_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NULL,
  actor_name VARCHAR(150) NULL,
  actor_role VARCHAR(20) NULL,
  action VARCHAR(60) NOT NULL,
  target_type VARCHAR(50) NULL,
  target_id VARCHAR(64) NULL,
  details VARCHAR(500) NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_created_at (created_at),
  INDEX idx_activity_actor (actor_id),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
