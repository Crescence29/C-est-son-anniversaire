-- ==========================================================
-- Migration 009 : Sépare le compte développeur des rôles métier,
-- introduit la hiérarchie interne à 4 niveaux, les permissions
-- granulaires par compte, et le suivi des sessions/appareils.
-- ==========================================================

-- 'developer' devient un rôle à part entière : un compte développeur ne
-- passe plus par les mêmes contrôles d'accès que 'admin', donc n'a plus
-- automatiquement accès aux données métier (clients, commandes, paiements).
ALTER TABLE users
  MODIFY COLUMN role ENUM('client', 'staff', 'admin', 'developer') NOT NULL DEFAULT 'client';

-- Hiérarchie interne (Super Admin / Administrateur / Manager / Utilisateur),
-- affichée en plus du rôle technique existant (staff/admin) : elle ne
-- remplace pas les contrôles d'accès actuels, elle les affine.
ALTER TABLE users
  ADD COLUMN admin_level ENUM('super_admin', 'administrateur', 'manager', 'utilisateur') NULL AFTER role,
  ADD COLUMN permissions JSON NULL AFTER admin_level;

-- Migre le(s) compte(s) développeur existant(s) (identifiés par
-- is_super_admin) hors du rôle 'admin' : ils perdent immédiatement l'accès
-- à toutes les routes /api/admin/* réservées au rôle métier, et gagnent
-- l'accès aux nouvelles routes /api/developer/*.
UPDATE users SET role = 'developer', admin_level = NULL WHERE is_super_admin = TRUE;

-- Sessions de connexion (une ligne par connexion réussie), pour la vue
-- "appareils actifs" du tableau de bord développeur et le motif du
-- dernier accès. La déconnexion forcée reste globale (token_version) :
-- il n'existe pas encore de révocation par session individuelle.
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  device_label VARCHAR(150) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
