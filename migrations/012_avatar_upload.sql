-- Permet de stocker une photo de profil importée/prise par l'utilisateur
-- (image redimensionnée et encodée en base64 côté navigateur) directement
-- dans la colonne, faute de service de stockage de fichiers externe.
-- VARCHAR(500) ne suffit plus pour une image encodée ; MEDIUMTEXT (jusqu'à
-- 16 Mo) est large marge pour une photo redimensionnée à quelques dizaines
-- de Ko.
ALTER TABLE `users`
  MODIFY COLUMN `avatar_url` MEDIUMTEXT NULL;
