import { DEFAULT_ATHLETE_LIMIT } from './subscriptionConfig.js';

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const SUBSCRIPTION_PLANS = Object.freeze([
  Object.freeze({
    id: 'starter',
    name: 'Club Inicial',
    description: 'Ideal para clubes que están formando sus primeros equipos.',
    monthlyPrice: 10,
    currency: 'USD',
    minAthletes: 0,
    maxAthletes: 15,
    headline: 'Hasta 15 patinadores',
    badge: 'Comenzá hoy',
    features: [
      'Gestión completa del club y sus roles',
      'Control de cargas y fichas médicas',
      'Reportes y estadísticas esenciales'
    ]
  }),
  Object.freeze({
    id: 'growth',
    name: 'Club en Expansión',
    description: 'Perfecto para instituciones con varios equipos en competencia.',
    monthlyPrice: 15,
    currency: 'USD',
    minAthletes: 16,
    maxAthletes: 30,
    headline: '16 a 30 patinadores',
    badge: 'Más elegido',
    features: [
      'Todo lo del plan Inicial',
      'Herramientas avanzadas de seguimiento deportivo',
      'Reportes comparativos y descargas en Excel'
    ]
  }),
  Object.freeze({
    id: 'elite',
    name: 'Club Elite',
    description: 'Para clubes consolidados con planteles numerosos y staff completo.',
    monthlyPrice: 20,
    currency: 'USD',
    minAthletes: 31,
    maxAthletes: null,
    headline: 'Más de 30 patinadores',
    badge: 'Máxima capacidad',
    features: [
      'Todo lo de los planes anteriores',
      'Capacidad extendida sin límites tecnológicos',
      'Acompañamiento prioritario y capacitaciones exclusivas'
    ]
  })
]);

const normaliseAthleteLimit = (value, fallback = DEFAULT_ATHLETE_LIMIT) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 0) return fallback;
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
  }
  return fallback;
};

const resolveSubscriptionPlanForLimit = (limit) => {
  const normalisedLimit = normaliseAthleteLimit(limit);
  for (const plan of SUBSCRIPTION_PLANS) {
    const max = typeof plan.maxAthletes === 'number' ? plan.maxAthletes : Infinity;
    if (normalisedLimit >= plan.minAthletes && normalisedLimit <= max) {
      return plan;
    }
  }
  return SUBSCRIPTION_PLANS[SUBSCRIPTION_PLANS.length - 1];
};

const buildSubscriptionQuoteForLimit = (limit) => {
  const normalisedLimit = normaliseAthleteLimit(limit);
  const plan = resolveSubscriptionPlanForLimit(normalisedLimit);
  return {
    planId: plan.id,
    planName: plan.name,
    monthlyPrice: plan.monthlyPrice,
    currency: plan.currency,
    billingPeriod: 'monthly',
    athleteLimit: normalisedLimit,
    minAthletes: plan.minAthletes,
    maxAthletes: typeof plan.maxAthletes === 'number' ? plan.maxAthletes : null
  };
};

const getSubscriptionPlans = ({ trialDays } = {}) =>
  SUBSCRIPTION_PLANS.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    currency: plan.currency,
    minAthletes: plan.minAthletes,
    maxAthletes: typeof plan.maxAthletes === 'number' ? plan.maxAthletes : null,
    headline: plan.headline,
    badge: plan.badge,
    features: ensureArray(plan.features).slice(),
    trialDays: typeof trialDays === 'number' ? trialDays : null
  }));

export {
  SUBSCRIPTION_PLANS,
  normaliseAthleteLimit,
  resolveSubscriptionPlanForLimit,
  buildSubscriptionQuoteForLimit,
  getSubscriptionPlans
};

export default SUBSCRIPTION_PLANS;
