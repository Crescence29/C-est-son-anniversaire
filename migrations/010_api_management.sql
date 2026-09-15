-- ==========================================================
-- Migration 010 : gestion réelle de l'API — clés API pour un accès
-- externe (v1), webhooks sortants, journal de livraison des webhooks.
-- ==========================================================

CREATE TABLE api_keys (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  scopes JSON NOT NULL,
  status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  created_by VARCHAR(36) COLLATE utf8mb4_unicode_ci NULL,
  last_used_at TIMESTAMP NULL,
  request_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_api_keys_hash (key_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE webhooks (
  id VARCHAR(36) PRIMARY KEY,
  url VARCHAR(500) NOT NULL,
  event VARCHAR(50) NOT NULL,
  secret VARCHAR(100) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_by VARCHAR(36) COLLATE utf8mb4_unicode_ci NULL,
  last_triggered_at TIMESTAMP NULL,
  last_status_code INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE webhook_deliveries (
  id VARCHAR(36) PRIMARY KEY,
  webhook_id VARCHAR(36) NOT NULL,
  event VARCHAR(50) NOT NULL,
  status_code INT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
  INDEX idx_webhook_deliveries_webhook (webhook_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
