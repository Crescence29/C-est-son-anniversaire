-- Authentification à deux facteurs (TOTP) pour les comptes internes et
-- développeur. `totp_secret` et `totp_backup_codes` ne quittent jamais le
-- serveur en clair une fois enregistrés (les codes de secours sont hachés) ;
-- voir src/server/totp.ts et src/server/routes/developer.ts (/security/totp/*).
ALTER TABLE `users`
  ADD COLUMN `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `permissions`,
  ADD COLUMN `totp_secret` VARCHAR(64) NULL AFTER `totp_enabled`,
  ADD COLUMN `totp_backup_codes` JSON NULL AFTER `totp_secret`;
