import {
  PaymentProviderType,
  PaymentStatus,
} from '../../types.ts';

export interface PaymentInitiateRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  provider: PaymentProviderType;
  clientName: string;
  clientEmail?: string;
  simulatedOutcome?: 'success' | 'failed' | 'pending';
}

export interface PaymentInitiateResponse {
  success: boolean;
  transactionId: string;
  providerReference: string;
  status: PaymentStatus;
  paymentUrl?: string;
  message: string;
  amount: number;
  currency: string;
  provider: PaymentProviderType;
}

export interface PaymentVerifyResponse {
  transactionId: string;
  providerReference: string;
  status: PaymentStatus;
  amount: number;
  paidAt?: string;
  rawResponse?: Record<string, unknown>;
}

export interface IPaymentProvider {
  name: PaymentProviderType;

  initiatePayment(
    req: PaymentInitiateRequest
  ): Promise<PaymentInitiateResponse>;

  verifyPayment(
    providerReference: string
  ): Promise<PaymentVerifyResponse>;
}

// Mémorise le montant réel de chaque transaction initiée, pour que
// verifyPayment() ne renvoie jamais un montant inventé (ex-bug: 45000 fixe).
const initiatedTransactions = new Map<
  string,
  { amount: number; currency: string }
>();

export const PAYMENT_PROVIDER_NAMES: Record<
  string,
  string
> = {
  mtn: 'MTN Mobile Money',
  orange: 'Orange Money',
  moov: 'Moov Money',
  celtiis: 'Celtis Money',
  mock: 'Paiement de démonstration',
};

const PAYMENT_PROVIDER_PREFIXES: Record<
  string,
  string
> = {
  mtn: 'MTN-CI',
  orange: 'OM-CI',
  moov: 'MOOV-CI',
  celtiis: 'CELTIS-CI',
  mock: 'MOCK-CI',
};

export class MockPaymentProvider
  implements IPaymentProvider
{
  name: PaymentProviderType = 'mock';

  async initiatePayment(
    req: PaymentInitiateRequest
  ): Promise<PaymentInitiateResponse> {

    const providerPrefix =
      PAYMENT_PROVIDER_PREFIXES[req.provider] ||
      'MOBILE-CI';

    const randomRef = `${providerPrefix}-${Math.floor(
      10000000 + Math.random() * 90000000
    )}`;

    const outcome =
      req.simulatedOutcome || 'success';

    let status: PaymentStatus = 'pending';

    let message =
      'Transaction en cours de traitement...';

    if (outcome === 'success') {
      status = 'success';

      message = `Paiement ${
        PAYMENT_PROVIDER_NAMES[req.provider] ||
        'Mobile Money'
      } validé avec succès.`;
    }

    else if (outcome === 'failed') {
      status = 'failed';

      message =
        'Échec du paiement : solde insuffisant ou refus de l’opérateur.';
    }

    else {
      status = 'pending';

      message =
        'Paiement en attente de confirmation USSD sur votre téléphone.';
    }

    initiatedTransactions.set(randomRef, {
      amount: req.amount,
      currency: req.currency,
    });

    return {
      success: outcome === 'success',
      transactionId: `tx-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 7)}`,
      providerReference: randomRef,
      status,
      message,
      amount: req.amount,
      currency: req.currency,
      provider: req.provider,
    };
  }

  async verifyPayment(
    providerReference: string
  ): Promise<PaymentVerifyResponse> {

    const known =
      initiatedTransactions.get(providerReference);

    if (!known) {
      throw new Error(
        `Référence de transaction inconnue : ${providerReference}`
      );
    }

    return {
      transactionId: `tx-${Date.now()}`,
      providerReference,
      status: 'success',
      amount: known.amount,
      paidAt: new Date().toISOString(),
    };
  }
}

export class MobileMoneyProvider
  implements IPaymentProvider
{
  name: PaymentProviderType;

  private apiKey: string;
  private secretKey: string;
  private callbackUrl: string;

  constructor(
    provider: PaymentProviderType = 'mtn'
  ) {
    this.name = provider;

    this.apiKey =
      process.env.MOBILE_MONEY_API_KEY || '';

    this.secretKey =
      process.env.MOBILE_MONEY_SECRET || '';

    this.callbackUrl =
      process.env.MOBILE_MONEY_CALLBACK_URL ||
      `${process.env.APP_URL || ''}/api/payments/webhook`;
  }

  async initiatePayment(
    req: PaymentInitiateRequest
  ): Promise<PaymentInitiateResponse> {

    if (!this.apiKey || !this.secretKey) {
      console.log(
        `[MobileMoneyProvider] API keys absentes du .env. ` +
        `Utilisation du moteur Mock pour ${req.provider}.`
      );

      const mock =
        new MockPaymentProvider();

      return mock.initiatePayment(req);
    }

    const reference =
      `${req.provider.toUpperCase()}-${Date.now()}-${Math.floor(
        Math.random() * 10000
      )}`;

    const providerName =
      PAYMENT_PROVIDER_NAMES[req.provider] ||
      'Mobile Money';

    console.log(
      `[MobileMoneyProvider] Initialisation ${providerName}`
    );

    console.log(
      `[MobileMoneyProvider] Téléphone : ${req.phoneNumber}`
    );

    console.log(
      `[MobileMoneyProvider] Montant : ${req.amount} ${req.currency}`
    );

    console.log(
      `[MobileMoneyProvider] Callback : ${this.callbackUrl}`
    );

    initiatedTransactions.set(reference, {
      amount: req.amount,
      currency: req.currency,
    });

    return {
      success: true,

      transactionId:
        `tx-mm-${Date.now()}`,

      providerReference:
        reference,

      status: 'pending',

      paymentUrl:
        `https://checkout.${req.provider}.com/pay/${reference}`,

      message:
        `Demande de débit ${providerName} envoyée au ${req.phoneNumber}. Composez votre code secret.`,

      amount: req.amount,

      currency: req.currency,

      provider: req.provider,
    };
  }

  async verifyPayment(
    providerReference: string
  ): Promise<PaymentVerifyResponse> {

    // TODO(Phase 3): une fois un agrégateur réel choisi (CinetPay/FedaPay/
    // Flutterwave), remplacer ce bloc par un vrai appel à son API de
    // vérification de transaction (GET /transaction/{reference}).
    const known =
      initiatedTransactions.get(providerReference);

    if (!known) {
      throw new Error(
        `Référence de transaction inconnue : ${providerReference}`
      );
    }

    return {
      transactionId:
        `tx-verify-${Date.now()}`,

      providerReference,

      status: 'success',

      amount: known.amount,

      paidAt: new Date().toISOString(),
    };
  }
}

export function getPaymentProvider(
  providerType: PaymentProviderType = 'mock'
): IPaymentProvider {

  const envProvider =
    process.env.PAYMENT_PROVIDER;

  if (
    envProvider === 'mock' ||
    providerType === 'mock'
  ) {
    return new MockPaymentProvider();
  }

  const supportedProviders: PaymentProviderType[] = [
    'mtn',
    'orange',
    'moov',
    'celtiis',
  ];

  if (
    !supportedProviders.includes(providerType)
  ) {
    console.warn(
      `[PaymentProvider] Fournisseur "${providerType}" non reconnu. Utilisation de Mock.`
    );

    return new MockPaymentProvider();
  }

  return new MobileMoneyProvider(
    providerType
  );
}