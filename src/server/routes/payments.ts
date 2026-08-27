import { Router, Response } from 'express';
import { db } from '../dataStore.ts';
import {
  authenticateToken,
  AuthRequest,
  requireRole,
} from '../middleware/auth.ts';
import { getPaymentProvider } from '../services/payment.ts';
import {
  Payment,
  PaymentProviderType,
} from '../../types.ts';

const router = Router();

const PAYMENT_METHOD_NAMES: Record<
  PaymentProviderType,
  string
> = {
  mock: 'Paiement de démonstration',
  mtn: 'MTN Mobile Money',
  orange: 'Orange Money',
  moov: 'Moov Money',
  celtiis: 'Celtis Money',
  cinetpay: 'CinetPay',
  fedapay: 'FedaPay',
  flutterwave: 'Flutterwave',
};

// Numéro Mobile Money : chiffres, espaces, tirets, un "+" optionnel en tête.
const PHONE_REGEX = /^\+?[0-9][0-9\s-]{6,17}$/;

function isValidPhoneNumber(value: unknown): value is string {
  return typeof value === 'string' && PHONE_REGEX.test(value.trim());
}

// Anti-spam basique sur /initiate : évite qu'un compte ne martèle
// la route (et donc le provider Mobile Money) en boucle.
const INITIATE_RATE_LIMIT = 5;
const INITIATE_RATE_WINDOW_MS = 60_000;
const initiateAttempts = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const attempts = (initiateAttempts.get(userId) || []).filter(
    (t) => now - t < INITIATE_RATE_WINDOW_MS
  );

  attempts.push(now);
  initiateAttempts.set(userId, attempts);

  return attempts.length > INITIATE_RATE_LIMIT;
}

router.post(
  '/initiate',
  authenticateToken,
  async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {

    try {

      if (!req.user) {
        res.status(401).json({
          error: 'Non authentifié.',
        });
        return;
      }

      const {
        order_id,
        provider = 'mtn',
        phone_number,
        simulated_outcome = 'success',
      } = req.body;

      if (!order_id || !phone_number) {
        res.status(400).json({
          error:
            'Identifiant de commande et numéro de téléphone requis.',
        });
        return;
      }

      if (!isValidPhoneNumber(phone_number)) {
        res.status(400).json({
          error:
            'Numéro de téléphone invalide.',
        });
        return;
      }

      if (isRateLimited(req.user.id)) {
        res.status(429).json({
          error:
            'Trop de tentatives de paiement. Veuillez patienter avant de réessayer.',
        });
        return;
      }

      // En production, le client ne doit jamais pouvoir choisir le provider
      // "mock" lui-même : cela reviendrait à décider unilatéralement de la
      // réussite de son propre paiement (voir simulated_outcome ci-dessous).
      const validProviders: PaymentProviderType[] =
        process.env.NODE_ENV === 'production'
          ? ['mtn', 'orange', 'moov', 'celtiis']
          : ['mtn', 'orange', 'moov', 'celtiis', 'mock'];

      if (!validProviders.includes(provider)) {
        res.status(400).json({
          error:
            'Opérateur Mobile Money non pris en charge.',
        });
        return;
      }

      const order = db.orders.find(
        (o) => o.id === order_id
      );

      if (!order) {
        res.status(404).json({
          error: 'Commande introuvable.',
        });
        return;
      }

      if (
        order.client_id !== req.user.id &&
        req.user.role === 'client'
      ) {
        res.status(403).json({
          error:
            'Cette commande ne vous appartient pas.',
        });
        return;
      }

      if (order.status !== 'pending_payment') {
        res.status(409).json({
          error:
            'Cette commande a déjà été payée ou n’est plus en attente de paiement.',
        });
        return;
      }

      const alreadySuccessful = db.payments.some(
        (p) =>
          p.order_id === order.id &&
          p.status === 'success'
      );

      if (alreadySuccessful) {
        res.status(409).json({
          error:
            'Un paiement réussi existe déjà pour cette commande.',
        });
        return;
      }

      const paymentService =
        getPaymentProvider(
          provider as PaymentProviderType
        );

      const result =
        await paymentService.initiatePayment({
          orderId: order.id,
          orderNumber: order.order_number,
          amount: order.amount,
          currency: order.currency,
          phoneNumber: phone_number,
          provider:
            provider as PaymentProviderType,
          clientName: req.user.full_name,
          clientEmail: req.user.email,
          simulatedOutcome:
            simulated_outcome,
        });

      const now =
        new Date().toISOString();

      const paymentRecord: Payment = {
        id: result.transactionId,

        order_id: order.id,

        order_number:
          order.order_number,

        user_id: req.user.id,

        user_name:
          req.user.full_name,

        provider:
          result.provider,

        provider_reference:
          result.providerReference,

        amount:
          result.amount,

        currency:
          result.currency,

        status:
          result.status,

        phone_number,

        paid_at:
          result.status === 'success'
            ? now
            : undefined,

        created_at: now,

        updated_at: now,
      };

      db.payments.unshift(
        paymentRecord
      );

      if (
        result.status === 'success'
      ) {

        order.status = 'paid';

        order.payment_method =
          PAYMENT_METHOD_NAMES[
            provider as PaymentProviderType
          ] || 'Mobile Money';

        order.updated_at = now;

        db.notifications.unshift({
          id: `notif-${Date.now()}`,

          user_id:
            req.user.id,

          title:
            'Paiement confirmé ! 🎉',

          message:
            `Votre paiement de ${order.amount.toLocaleString()} ${order.currency} pour la commande ${order.order_number} via ${PAYMENT_METHOD_NAMES[provider as PaymentProviderType] || 'Mobile Money'} a été validé. Notre équipe commence la préparation !`,

          type: 'payment',

          is_read: false,

          link_url:
            `/account/orders/${order.id}`,

          created_at: now,
        });
      }

      res.json({
        message:
          result.message,

        transaction:
          paymentRecord,

        order,
      });

    } catch (error) {

      console.error(
        '[Payment] Erreur :',
        error
      );

      res.status(500).json({
        error:
          'Erreur lors de l’initialisation du paiement.',
      });
    }
  }
);

router.get(
  '/verify/:reference',
  authenticateToken,
  async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {

    if (!req.user) {
      res.status(401).json({
        error: 'Non authentifié.',
      });
      return;
    }

    const { reference } =
      req.params;

    const payment =
      db.payments.find(
        (p) =>
          p.provider_reference ===
            reference ||
          p.id === reference
      );

    if (!payment) {
      res.status(404).json({
        error:
          'Paiement introuvable.',
      });
      return;
    }

    if (
      payment.user_id !== req.user.id &&
      req.user.role === 'client'
    ) {
      res.status(403).json({
        error:
          'Ce paiement ne vous appartient pas.',
      });
      return;
    }

    // Déjà finalisé : on ne re-vérifie pas auprès du provider (idempotence).
    if (payment.status === 'success') {
      res.json({ payment });
      return;
    }

    try {
      const paymentService =
        getPaymentProvider(payment.provider);

      const verified =
        await paymentService.verifyPayment(
          payment.provider_reference
        );

      if (verified.amount !== payment.amount) {
        console.error(
          `[Payment] Montant incohérent pour ${payment.provider_reference} : ` +
          `attendu ${payment.amount}, reçu du provider ${verified.amount}.`
        );

        res.status(409).json({
          error:
            'Le montant vérifié ne correspond pas à la commande.',
        });
        return;
      }

      const now = new Date().toISOString();
      payment.status = verified.status;
      payment.updated_at = now;

      if (verified.status === 'success') {
        payment.paid_at = verified.paidAt || now;

        const order = db.orders.find(
          (o) => o.id === payment.order_id
        );

        if (order && order.status === 'pending_payment') {
          order.status = 'paid';
          order.updated_at = now;
        }
      }

      res.json({ payment });
    } catch (error) {
      console.error(
        '[Payment] Erreur de vérification :',
        error
      );

      res.status(502).json({
        error:
          'Impossible de vérifier ce paiement auprès du fournisseur.',
      });
    }
  }
);

router.post(
  '/webhook',
  (
    req,
    res: Response
  ): void => {

    // Le vrai fournisseur Mobile Money signera ses webhooks (HMAC) une fois
    // branché (Phase 3) ; en attendant, un secret partagé suffit à empêcher
    // n'importe qui d'appeler cette route pour se faire créditer un paiement.
    const expectedSecret = process.env.WEBHOOK_SECRET;

    if (!expectedSecret) {
      if (process.env.NODE_ENV === 'production') {
        // Fail-closed : sans secret configuré en production, la route est
        // désactivée plutôt que de rester ouverte à n'importe qui.
        console.error(
          '[Webhook] WEBHOOK_SECRET manquant en production : requête rejetée.'
        );
        res.status(503).json({
          error: 'Webhook temporairement indisponible.',
        });
        return;
      }

      console.warn(
        '[Webhook] WEBHOOK_SECRET non configuré : requête acceptée sans vérification (mode démo uniquement).'
      );
    } else {
      const providedSecret =
        req.headers['x-webhook-secret'];

      if (providedSecret !== expectedSecret) {
        res.status(401).json({
          error: 'Webhook non autorisé.',
        });
        return;
      }
    }

    const {
      provider_reference,
      status,
      amount,
    } = req.body;

    if (!provider_reference) {
      res.status(400).json({
        error:
          'Référence manquante.',
      });
      return;
    }

    const payment =
      db.payments.find(
        (p) =>
          p.provider_reference ===
          provider_reference
      );

    if (!payment) {
      res.status(404).json({
        error: 'Paiement introuvable.',
      });
      return;
    }

    // Idempotence : un paiement déjà finalisé ne doit plus être modifié
    // (évite qu'un webhook rejoué ou dupliqué ne recrée une notification).
    if (
      payment.status === 'success' ||
      payment.status === 'failed'
    ) {
      res.json({ received: true });
      return;
    }

    if (
      amount !== undefined &&
      Number(amount) !== Number(payment.amount)
    ) {
      console.error(
        `[Webhook] Montant incohérent pour ${provider_reference} : ` +
        `attendu ${payment.amount}, reçu ${amount}.`
      );

      res.status(409).json({
        error: 'Montant incohérent.',
      });
      return;
    }

    const normalizedStatus =
      typeof status === 'string'
        ? status.toUpperCase()
        : '';

    payment.status =
      normalizedStatus === 'SUCCESS'
        ? 'success'
        : 'failed';

    payment.updated_at =
      new Date().toISOString();

    const order =
      db.orders.find(
        (o) =>
          o.id ===
          payment.order_id
      );

    if (
      order &&
      normalizedStatus === 'SUCCESS' &&
      order.status === 'pending_payment'
    ) {

      payment.paid_at =
        payment.updated_at;

      order.status = 'paid';

      order.payment_method =
        PAYMENT_METHOD_NAMES[
          payment.provider
        ] || 'Mobile Money';

      order.updated_at =
        payment.updated_at;
    }

    res.json({
      received: true,
    });
  }
);

router.get(
  '/',
  authenticateToken,
  requireRole('admin', 'staff'),
  (
    req: AuthRequest,
    res: Response
  ): void => {

    res.json({
      payments: db.payments,
    });
  }
);

router.post(
  '/:id/refund',
  authenticateToken,
  requireRole('admin', 'staff'),
  (
    req: AuthRequest,
    res: Response
  ): void => {

    const { id } = req.params;

    const payment = db.payments.find(
      (p) => p.id === id
    );

    if (!payment) {
      res.status(404).json({
        error: 'Paiement introuvable.',
      });
      return;
    }

    if (payment.status !== 'success') {
      res.status(409).json({
        error:
          'Seul un paiement réussi peut être remboursé.',
      });
      return;
    }

    const order = db.orders.find(
      (o) => o.id === payment.order_id
    );

    if (!order) {
      res.status(404).json({
        error: 'Commande associée introuvable.',
      });
      return;
    }

    const now = new Date().toISOString();

    payment.status = 'refunded';
    payment.updated_at = now;

    order.status = 'refunded';
    order.updated_at = now;

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: payment.user_id,
      title: 'Remboursement effectué',
      message: `Votre paiement de ${payment.amount.toLocaleString()} ${payment.currency} pour la commande ${order.order_number} a été remboursé.`,
      type: 'payment',
      is_read: false,
      link_url: `/account/orders/${order.id}`,
      created_at: now,
    });

    res.json({
      message: 'Remboursement effectué.',
      payment,
      order,
    });
  }
);

export default router;