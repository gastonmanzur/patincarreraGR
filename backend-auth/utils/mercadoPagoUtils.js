import mercadopago from 'mercadopago';

const { MercadoPagoConfig, PreApproval } = mercadopago;

const resolveAccessToken = () => {
  const candidates = [
    process.env.MERCADOPAGO_ACCESS_TOKEN,
    process.env.MERCADO_PAGO_ACCESS_TOKEN,
    process.env.MP_ACCESS_TOKEN
  ];

  const token = candidates.find((value) => typeof value === 'string' && value.trim());
  if (!token) {
    throw new Error(
      'Configurar MERCADOPAGO_ACCESS_TOKEN (o MERCADO_PAGO_ACCESS_TOKEN / MP_ACCESS_TOKEN) para habilitar los cobros con Mercado Pago.'
    );
  }
  return token.trim();
};

const isMercadoPagoConfigured = () => {
  try {
    return Boolean(resolveAccessToken());
  } catch (err) {
    return false;
  }
};

const buildMercadoPagoClient = () => {
  const integratorId = process.env.MERCADOPAGO_INTEGRATOR_ID?.trim();
  return new MercadoPagoConfig({
    accessToken: resolveAccessToken(),
    options: {
      ...(integratorId ? { integratorId } : {}),
      timeout: 5000
    }
  });
};

const preapprovalClient = () => new PreApproval(buildMercadoPagoClient());

const createMercadoPagoPreapproval = async ({
  reason,
  externalReference,
  payerEmail,
  transactionAmount,
  currency = 'ARS',
  backUrl,
  notificationUrl
}) => {
  const client = preapprovalClient();
  const payload = {
    reason,
    external_reference: externalReference,
    payer_email: payerEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: transactionAmount,
      currency_id: currency
    },
    back_url: backUrl,
    notification_url: notificationUrl,
    status: 'pending'
  };

  const response = await client.create({ body: payload });
  return {
    id: response?.id ?? null,
    initPoint: response?.init_point || response?.sandbox_init_point || null,
    nextPaymentDate: response?.auto_recurring?.next_payment_date ?? null,
    status: response?.status ?? null
  };
};

const fetchPreapprovalDetails = async (preapprovalId) => {
  if (!preapprovalId) return null;
  const client = preapprovalClient();
  const details = await client.get({ id: preapprovalId });
  return details || null;
};

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
