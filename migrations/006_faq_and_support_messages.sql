-- ==========================================================
-- Migration 006 : Centre d'aide éditable (FAQ) + Avis & Suggestions
-- (messages des clients reçus et traités par le staff/admin).
-- ==========================================================

CREATE TABLE faq_items (
  id VARCHAR(64) PRIMARY KEY,
  question VARCHAR(300) NOT NULL,
  answer TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE support_messages (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  reply TEXT NULL,
  replied_by VARCHAR(36) NULL,
  replied_by_name VARCHAR(150) NULL,
  replied_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_support_messages_user (user_id),
  INDEX idx_support_messages_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
