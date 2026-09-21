// Intégration réelle avec FedaPay (agrégateur MTN MoMo / Moov Money / carte
// bancaire) via leur SDK Node officiel — voir https://docs.fedapay.com.
// Configuré une seule fois au démarrage à partir des variables d'environnement.
import { FedaPay, Transaction, Webhook } from 'fedapay';

let configured = false;

function ensureConfigured(): boolean {
  const secretKey = process.env.FEDAPAY_SECRET_KEY;
  if (!secretKey) return false;
  if (!configured) {
    FedaPay.setApiKey(secretKey);
    FedaPay.setEnvironment(process.env.FEDAPAY_ENVIRONMENT || 'sandbox');
    configured = true;
  }
  return true;
}

export function isFedaPayConfigured(): boolean {
  return Boolean(process.env.FEDAPAY_SECRET_KEY);
}

// Découpe grossièrement "Jean Dupont" en prénom/nom — FedaPay exige les deux
// séparément, alors que le reste de l'app ne connaît qu'un nom complet.
function splitFullName(fullName: string): { firstname: string; lastname: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstname: parts[0], lastname: parts[0] };
  return { firstname: parts[0], lastname: parts.slice(1).join(' ') };
}

// Ne garde que les chiffres et retire l'indicatif Bénin (+229 / 229) si
// présent, pour obtenir le numéro local attendu par FedaPay.
function parseLocalPhoneNumber(raw: string): number | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('229') && digits.length > 8) digits = digits.slice(3);
  const n = Number(digits);
  return Number.isFinite(n) && digits.length >= 6 ? n : null;
}

export interface CreateFedaPayTransactionParams {
  description: string;
  amount: number;
  currency: string;
  callbackUrl: string;
  clientName: string;
  clientEmail?: string;
  phoneNumber: string;
}

export interface FedaPayCheckout {
  transactionId: number;
  reference: string;
  status: string;
  paymentUrl: string;
}

export async function createFedaPayCheckout(params: CreateFedaPayTransactionParams): Promise<FedaPayCheckout> {
  if (!ensureConfigured()) {
    throw new Error('FEDAPAY_SECRET_KEY manquant : le paiement FedaPay n’est pas configuré sur ce serveur.');
  }

  const { firstname, lastname } = splitFullName(params.clientName);
  const localNumber = parseLocalPhoneNumber(params.phoneNumber);

  const transaction = await Transaction.create({
    description: params.description,
    // FedaPay attend un montant entier (XOF n'a pas de centimes) ; on
    // arrondit par sécurité si jamais un montant décimal remontait.
    amount: Math.round(params.amount),
    currency: { iso: params.currency || 'XOF' },
    callback_url: params.callbackUrl,
    customer: {
      firstname,
      lastname,
      email: params.clientEmail,
      ...(localNumber ? { phone_number: { number: localNumber, country: 'bj' } } : {}),
    },
  });

  const tokenResult = await transaction.generateToken();

  return {
    transactionId: transaction.id,
    reference: transaction.reference,
    status: transaction.status,
    paymentUrl: tokenResult.url,
  };
}

export interface FedaPayTransactionState {
  id: number;
  status: string;
  amount: number;
  wasPaid: boolean;
  updatedAt: string;
  // Frais réels prélevés par FedaPay et montant net effectivement viré au
  // marchand pour cette transaction — renvoyés tels quels par leur API,
  // plutôt qu'estimés via un pourcentage théorique.
  fees: number;
  amountTransferred: number;
}

export async function retrieveFedaPayTransaction(transactionId: number | string): Promise<FedaPayTransactionState> {
  if (!ensureConfigured()) {
    throw new Error('FEDAPAY_SECRET_KEY manquant : impossible de vérifier ce paiement.');
  }
  const transaction = await Transaction.retrieve(Number(transactionId));
  return {
    id: transaction.id,
    status: transaction.status,
    amount: transaction.amount,
    wasPaid: transaction.wasPaid(),
    updatedAt: transaction.updated_at,
    fees: Number(transaction.fees) || 0,
    amountTransferred: Number(transaction.amount_transferred) || 0,
  };
}

// Vérifie la signature d'un webhook FedaPay — `rawBody` doit être le corps
// brut de la requête (avant tout JSON.parse), sans quoi la signature ne
// correspondra jamais (voir express.raw() monté sur cette route dans server.ts).
export function verifyFedaPayWebhookSignature(rawBody: string | Buffer, signatureHeader: string | undefined, secret: string): any {
  if (!signatureHeader) throw new Error('En-tête de signature manquant.');
  return Webhook.constructEvent(rawBody, signatureHeader, secret);
}
