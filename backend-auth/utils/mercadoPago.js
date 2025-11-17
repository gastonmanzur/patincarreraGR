const DEFAULT_API_BASE_URL = 'https://api.mercadopago.com';

const trimOrNull = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normaliseUrlOrNull = (value) => {
  const trimmed = trimOrNull(value);
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch (error) {
    console.error('Ignoring invalid Mercado Pago URL configuration', value, error?.message);
    return null;
  }
};

const normaliseAmount = (value) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('El monto a cobrar en Mercado Pago debe ser un número positivo.');
  }
  return Math.round(parsed * 100) / 100;
};

const parseBoolean = (value, defaultValue = false) => {
  if (typeof value !== 'string') return defaultValue;
  const normalised = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalised)) return true;
  if (['false', '0', 'no', 'off'].includes(normalised)) return false;
  return defaultValue;
};

class MercadoPagoConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MercadoPagoConfigurationError';
  }
}

class MercadoPagoApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'MercadoPagoApiError';
    this.status = status;
    this.details = details;
  }
}

const buildExternalReference = ({ clubId, planId }) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1_000_000);
  return `club:${clubId}:plan:${planId}:ts:${timestamp}:rnd:${random}`;
};

const buildMetadata = ({ clubId, planId, conversion, user }) => {
  const metadata = {
    clubId,
    planId,
    usdAmount: conversion?.usdAmount ?? null,
    arsAmount: conversion?.arsAmount ?? null,
    blueDollarRate: conversion?.rate ?? null
  };
  if (user?.id) metadata.userId = user.id;
  if (user?.email) metadata.userEmail = user.email;
  return metadata;
};

const buildPayer = (user) => {
  if (!user) return null;
  const payer = {};
  if (user.email) payer.email = user.email;
  if (user.name) payer.name = user.name;
  if (user.surname) payer.surname = user.surname;
  if (Object.keys(payer).length === 0) return null;
  return payer;
};

const resolveBackUrls = () => {
  const success = normaliseUrlOrNull(process.env.MERCADOPAGO_SUCCESS_URL);
  const failure = normaliseUrlOrNull(process.env.MERCADOPAGO_FAILURE_URL);
  const pending = normaliseUrlOrNull(process.env.MERCADOPAGO_PENDING_URL);

  const backUrls = {};
  if (success) backUrls.success = success;
  if (failure) backUrls.failure = failure;
  if (pending) backUrls.pending = pending;

  return Object.keys(backUrls).length > 0 ? backUrls : null;
};

const resolveNotificationUrl = () =>
  normaliseUrlOrNull(process.env.MERCADOPAGO_NOTIFICATION_URL);

const resolveApiBaseUrl = () =>
  trimOrNull(process.env.MERCADOPAGO_API_BASE_URL) || DEFAULT_API_BASE_URL;

const resolveUseSandbox = () => parseBoolean(process.env.MERCADOPAGO_USE_SANDBOX, false);

const resolveAccessToken = () => {
  const useSandbox = resolveUseSandbox();
  const accessToken = trimOrNull(process.env.MERCADOPAGO_ACCESS_TOKEN);
  const sandboxToken = trimOrNull(process.env.MERCADOPAGO_ACCESS_TOKEN_SANDBOX);

  if (useSandbox) {
    if (!sandboxToken) {
      throw new MercadoPagoConfigurationError(
        'Mercado Pago en modo sandbox no está configurado. Configurá MERCADOPAGO_ACCESS_TOKEN_SANDBOX o desactivá MERCADOPAGO_USE_SANDBOX.'
      );
    }
    return { accessToken: sandboxToken, useSandbox: true };
  }

  if (!accessToken) {
    throw new MercadoPagoConfigurationError(
      'Mercado Pago no está configurado. Configurá MERCADOPAGO_ACCESS_TOKEN o habilitá MERCADOPAGO_USE_SANDBOX con MERCADOPAGO_ACCESS_TOKEN_SANDBOX.'
    );
  }

  return { accessToken, useSandbox: false };
};

const createMercadoPagoPreference = async ({ plan, clubId, conversion, user }) => {
  const { accessToken, useSandbox } = resolveAccessToken();

  if (!plan?.name || !plan?.id) {
    throw new Error('El plan de suscripción no es válido para crear el pago en Mercado Pago.');
  }

  const amountArs = normaliseAmount(conversion?.arsAmount ?? conversion?.amount ?? conversion);

  const payload = {
    items: [
      {
        title: `Suscripción ${plan.name}`,
        description: `Suscripción mensual al plan ${plan.name} del club ${clubId}.`,
        quantity: 1,
        unit_price: amountArs,
        currency_id: 'ARS'
      }
    ],
    statement_descriptor: 'PATIN CARRERA',
    binary_mode: true,
    auto_return: 'approved',
    external_reference: buildExternalReference({ clubId, planId: plan.id }),
    metadata: buildMetadata({ clubId, planId: plan.id, conversion, user })
  };

  const payer = buildPayer(user);
  if (payer) payload.payer = payer;

  const backUrls = resolveBackUrls();
  if (backUrls) payload.back_urls = backUrls;

  const notificationUrl = resolveNotificationUrl();
  if (notificationUrl) payload.notification_url = notificationUrl;

  const apiBaseUrl = resolveApiBaseUrl().replace(/\/+$/, '');
  const endpoint = `${apiBaseUrl}/checkout/preferences`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const rawBody = await response.text();
  let parsedBody = null;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch (error) {
    parsedBody = null;
  }

  if (!response.ok) {
    throw new MercadoPagoApiError(
      `Mercado Pago rechazó la solicitud con código ${response.status}.`,
      response.status,
      parsedBody || rawBody || null
    );
  }

  const initPoint = useSandbox
    ? parsedBody?.sandbox_init_point || parsedBody?.init_point
    : parsedBody?.init_point || parsedBody?.sandbox_init_point;
  if (!initPoint) {
    throw new MercadoPagoApiError(
      'Mercado Pago no devolvió una URL de pago válida.',
      response.status,
      parsedBody
    );
  }

  return {
    initPoint,
    preferenceId: parsedBody?.id || null,
    raw: parsedBody
  };
};

export {
  createMercadoPagoPreference,
  MercadoPagoApiError,
  MercadoPagoConfigurationError
};
