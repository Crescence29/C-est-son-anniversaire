import crypto from 'crypto';
import { db } from './dataStore.ts';
import { WebhookEvent } from '../types.ts';

// Fire-and-forget by design: dispatching a webhook must never delay or
// break the request that triggered it (an order being created shouldn't
// fail because a partner's endpoint is down). Every attempt — success or
// failure — is still recorded so it's visible in the developer dashboard.
export function dispatchWebhookEvent(event: WebhookEvent, payload: Record<string, unknown>): void {
  const targets = db.webhooks.filter((w) => w.event === event && w.status === 'active');
  if (targets.length === 0) return;

  const body = JSON.stringify({ event, data: payload, sent_at: new Date().toISOString() });

  for (const webhook of targets) {
    const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');

    fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSA-Event': event,
        'X-CSA-Signature': signature,
      },
      body,
      signal: AbortSignal.timeout(8000),
    })
      .then((res) => {
        webhook.last_triggered_at = new Date().toISOString();
        webhook.last_status_code = res.status;
        db.recordWebhookDelivery({
          webhookId: webhook.id,
          event,
          statusCode: res.status,
          success: res.ok,
          errorMessage: res.ok ? null : `HTTP ${res.status}`,
        });
      })
      .catch((error) => {
        webhook.last_triggered_at = new Date().toISOString();
        webhook.last_status_code = null;
        db.recordWebhookDelivery({
          webhookId: webhook.id,
          event,
          statusCode: null,
          success: false,
          errorMessage: error?.message || 'Échec de la requête sortante',
        });
      });
  }
}
