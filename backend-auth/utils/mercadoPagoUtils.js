import { MercadoPagoConfig, PreApproval } from 'mercadopago';

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || null;

/**
 * Devuelve true si Mercado Pago está correctamente configurado
 * (es decir, si hay ACCESS_TOKEN definido).
 */
const isMercadoPagoConfigured = () => Boolean(accessToken);

// Cliente de MP y cliente de PreApproval (suscripciones) solo si hay token
const mpClient = accessToken
  ? new MercadoPagoConfig({
      accessToken,
      options: {
        timeout: 5000
      }
    })
  : null;

const preApprovalClient = mpClient ? new PreApproval(mpClient) : null;

/**
 * Crea una suscripción (PreApproval) en Mercado Pago.
 * 
 * params:
 * - payerEmail: email del pagador
 * - backUrl: URL a la que vuelve el usuario después de aprobar
 * - reason: descripción/motivo de la suscripción
 * - autoRecurring: objeto con frecuencia, monto, moneda, etc.
 *   Ejemplo:
 *   {
 *     frequency: 1,
 *     frequency_type: 'months',
 *     transaction_amount: 10,
 *     currency_id: 'ARS'
 *   }
 * - externalReference: string tipo "club:ID|plan:ID|user:ID"
 */
const createMercadoPagoPreapproval = async ({
  payerEmail,
  backUrl,
  reason,
  autoRecurring,
  externalReference
}) => {
  if (!preApprovalClient) {
    throw new Error(
      'Mercado Pago no está configurado. Falta MERCADOPAGO_ACCESS_TOKEN.'
    );
  }

  const body = {
    payer_email: payerEmail,
    back_url: backUrl,
    reason,
    external_reference: externalReference,
    auto_recurring: autoRecurring
  };

  const response = await preApprovalClient.create({ body });
  return response;
};

/**
 * Obtiene los detalles de una suscripción (PreApproval) por ID.
 */
const fetchPreapprovalDetails = async (preapprovalId) => {
  if (!preApprovalClient) {
    throw new Error(
      'Mercado Pago no está configurado. Falta MERCADOPAGO_ACCESS_TOKEN.'
    );
  }

  if (!preapprovalId) {
    throw new Error('preapprovalId es requerido para consultar la suscripción.');
  }

  const response = await preApprovalClient.get({ preapprovalId });
  return response;
};

/**
 * Parsea el external_reference que mandás a MP.
 * Formato esperado: "club:ID_CLUB|plan:ID_PLAN|user:ID_USER"
 * 
 * Devuelve:
 * { clubId, planId, userId } o null si falta club o plan.
 */
const parseExternalReference = (value) => {
  if (!value || typeof value !== 'string') return null;

  const parts = value.split('|').map((part) => part.trim());
  const meta = {};

  for (const part of parts) {
    const [key, ...rest] = part.split(':');
    if (key && rest.length) {
      meta[key] = rest.join(':');
    }
  }

  if (!meta.club || !meta.plan) return null;

  return {
    clubId: meta.club,
    planId: meta.plan,
    userId: meta.user || null
  };
};

export {
  createMercadoPagoPreapproval,
  fetchPreapprovalDetails,
  isMercadoPagoConfigured,
  parseExternalReference
};
