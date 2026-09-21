-- L'ENUM d'origine (`provider`) ne listait pas `moov` ni `celtiis` alors que
-- ces deux fournisseurs sont proposés au client depuis le début : tout
-- paiement réel via l'un d'eux aurait été rejeté par MySQL à l'enregistrement.
-- Ajout au passage de `fedapay`/`flutterwave` déjà utilisés côté code mais
-- jamais reflétés ici.
ALTER TABLE `payments`
  MODIFY COLUMN `provider` ENUM('mock', 'mtn', 'orange', 'moov', 'celtiis', 'cinetpay', 'fedapay', 'flutterwave') NOT NULL DEFAULT 'mock';

-- FedaPay renvoie le montant réel de ses frais et le montant net effectivement
-- viré sur le compte Mobile Money du marchand pour chaque transaction — on
-- les conserve tels quels plutôt que d'estimer un pourcentage, pour afficher
-- des chiffres exacts dans le Journal Financier.
ALTER TABLE `payments`
  ADD COLUMN `provider_fees` DECIMAL(12,2) NULL AFTER `amount`,
  ADD COLUMN `amount_transferred` DECIMAL(12,2) NULL AFTER `provider_fees`;
