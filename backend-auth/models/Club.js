import mongoose from 'mongoose';
import {
  DEFAULT_ATHLETE_LIMIT,
  resolveTrialDays
} from '../config/subscriptionConfig.js';
import {
  buildSubscriptionQuoteForLimit,
  normaliseAthleteLimit
} from '../config/subscriptionPlans.js';

const addDays = (date, days) => {
  const base = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(base.getTime())) {
    return new Date(Date.now() + days * 86400000);
  }
  return new Date(base.getTime() + days * 86400000);
};

const applySubscriptionQuote = (subscription, limit = DEFAULT_ATHLETE_LIMIT) => {
  if (!subscription || typeof subscription !== 'object') {
    return false;
  }

  const quote = buildSubscriptionQuoteForLimit(limit);
  let mutated = false;

  const assignIfChanged = (key, value) => {
    const current = subscription[key];
    const nextValue = value ?? null;
    if (current === nextValue) {
      return;
    }
    if (
      current instanceof Date &&
      nextValue instanceof Date &&
      current.getTime() === nextValue.getTime()
    ) {
      return;
    }
    if (Number.isNaN(current) && Number.isNaN(nextValue)) {
      return;
    }
    subscription[key] = nextValue;
    mutated = true;
  };

  assignIfChanged('planId', quote.planId);
  assignIfChanged('planName', quote.planName);
  assignIfChanged('currency', quote.currency);
  assignIfChanged('monthlyPrice', quote.monthlyPrice);
  assignIfChanged('billingPeriod', quote.billingPeriod);
  assignIfChanged('athleteLimit', quote.athleteLimit);
  assignIfChanged('minAthletes', quote.minAthletes);
  assignIfChanged('maxAthletes', quote.maxAthletes);

  return mutated;
};

const ensureSubscriptionPricing = (subscription, limit) => {
  const effectiveLimit =
    typeof limit === 'number' && Number.isFinite(limit)
      ? limit
      : subscription?.athleteLimit ?? DEFAULT_ATHLETE_LIMIT;
  return applySubscriptionQuote(subscription, effectiveLimit);
};

const buildDefaultSubscriptionSnapshot = (limit = DEFAULT_ATHLETE_LIMIT) => {
  const now = new Date();
  const trialDays = resolveTrialDays();
  const trialEndsAt = trialDays > 0 ? addDays(now, trialDays) : null;
  const snapshot = {
    status: 'trial',
    trialStartedAt: now,
    trialEndsAt,
    currentPeriodEndsAt: null,
    graceEndsAt: null,
    lastPaymentAt: null,
    notes: '',
    trialDays: trialDays > 0 ? trialDays : 0
  };

  applySubscriptionQuote(snapshot, limit);
  return snapshot;
};

const tituloSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    anio: { type: Number },
    descripcion: { type: String, trim: true },
    imagen: { type: String, trim: true },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    creadoEn: { type: Date, default: Date.now }
  },
  { _id: true }
);

const contactInfoSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    mapUrl: { type: String, trim: true },
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    x: { type: String, trim: true },
    history: { type: String, trim: true }
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['trial', 'active', 'grace', 'past_due', 'inactive'],
      default: 'trial'
    },
    trialStartedAt: { type: Date },
    trialEndsAt: { type: Date },
    currentPeriodEndsAt: { type: Date },
    graceEndsAt: { type: Date },
    lastPaymentAt: { type: Date },
    notes: { type: String, trim: true },
    planId: { type: String, trim: true },
    planName: { type: String, trim: true },
    currency: { type: String, trim: true, default: 'USD' },
    monthlyPrice: { type: Number, min: 0 },
    billingPeriod: { type: String, trim: true, default: 'monthly' },
    athleteLimit: { type: Number, min: 1, default: DEFAULT_ATHLETE_LIMIT },
    minAthletes: { type: Number, min: 0 },
    maxAthletes: { type: Number, min: 0 },
    trialDays: { type: Number, min: 0, default: () => resolveTrialDays() }
  },
  { _id: false }
);

const clubSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true },
    nombreAmigable: { type: String, trim: true },
    federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation' },
    logo: { type: String, trim: true },
    titulos: { type: [tituloSchema], default: [] },
    contactInfo: { type: contactInfoSchema, default: () => ({}) },
    subscription: { type: subscriptionSchema, default: buildDefaultSubscriptionSnapshot },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

clubSchema.pre('save', function (next) {
  if (typeof this.ensureSubscriptionDefaults === 'function') {
    this.ensureSubscriptionDefaults();
  }
  this.nombre = this.nombre.trim().toUpperCase();
  if (typeof this.nombreAmigable === 'string') {
    this.nombreAmigable = this.nombreAmigable.trim();
    if (!this.nombreAmigable) {
      this.nombreAmigable = undefined;
    }
  }
  next();
});

const normaliseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

clubSchema.methods.ensureSubscriptionDefaults = function ensureSubscriptionDefaults() {
  if (!this.subscription || typeof this.subscription !== 'object') {
    this.subscription = buildDefaultSubscriptionSnapshot();
    return true;
  }

  let mutated = false;
  const resolvedTrialDays = resolveTrialDays();

  if (!this.subscription.status) {
    this.subscription.status = 'trial';
    mutated = true;
  }

  if (!this.subscription.trialStartedAt) {
    this.subscription.trialStartedAt = new Date();
    mutated = true;
  }

  if (!this.subscription.trialEndsAt) {
    const base = normaliseDate(this.subscription.trialStartedAt) || new Date();
    this.subscription.trialEndsAt =
      resolvedTrialDays > 0 ? addDays(base, resolvedTrialDays) : null;
    mutated = true;
  }

  if (
    typeof this.subscription.trialDays !== 'number' ||
    this.subscription.trialDays !== resolvedTrialDays
  ) {
    this.subscription.trialDays = resolvedTrialDays;
    if (this.subscription.status === 'trial') {
      const base = normaliseDate(this.subscription.trialStartedAt) || new Date();
      this.subscription.trialEndsAt =
        resolvedTrialDays > 0
          ? addDays(base, resolvedTrialDays)
          : this.subscription.trialEndsAt ?? null;
    }
    mutated = true;
  }

  const normalisedLimit = normaliseAthleteLimit(
    this.subscription.athleteLimit ?? DEFAULT_ATHLETE_LIMIT,
    DEFAULT_ATHLETE_LIMIT
  );

  if (this.subscription.athleteLimit !== normalisedLimit) {
    this.subscription.athleteLimit = normalisedLimit;
    mutated = true;
  }

  if (ensureSubscriptionPricing(this.subscription, normalisedLimit)) {
    mutated = true;
  }

  return mutated;
};

clubSchema.methods.getSubscriptionSnapshot = function getSubscriptionSnapshot() {
  const raw = this.subscription && typeof this.subscription === 'object'
    ? typeof this.subscription.toObject === 'function'
      ? this.subscription.toObject()
      : this.subscription
    : {};
  const resolvedTrialDays = resolveTrialDays();
  const baseLimit = raw?.athleteLimit ?? DEFAULT_ATHLETE_LIMIT;
  const snapshot = { ...buildDefaultSubscriptionSnapshot(baseLimit), ...raw };
  snapshot.status = (raw.status || snapshot.status || 'trial').toLowerCase();
  snapshot.trialStartedAt = normaliseDate(snapshot.trialStartedAt);
  snapshot.trialEndsAt = normaliseDate(snapshot.trialEndsAt);
  snapshot.currentPeriodEndsAt = normaliseDate(snapshot.currentPeriodEndsAt);
  snapshot.graceEndsAt = normaliseDate(snapshot.graceEndsAt);
  snapshot.lastPaymentAt = normaliseDate(snapshot.lastPaymentAt);
  snapshot.trialDays =
    typeof snapshot.trialDays === 'number' && snapshot.trialDays >= 0
      ? snapshot.trialDays
      : resolvedTrialDays;
  snapshot.athleteLimit = normaliseAthleteLimit(
    snapshot.athleteLimit ?? baseLimit,
    DEFAULT_ATHLETE_LIMIT
  );
  applySubscriptionQuote(snapshot, snapshot.athleteLimit);
  return snapshot;
};

clubSchema.methods.getSubscriptionState = function getSubscriptionState(referenceDate = new Date()) {
  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const nowTime = now.getTime();
  const snapshot = this.getSubscriptionSnapshot();

  const trialEndsAt = snapshot.trialEndsAt ? snapshot.trialEndsAt.getTime() : null;
  const currentPeriodEndsAt = snapshot.currentPeriodEndsAt ? snapshot.currentPeriodEndsAt.getTime() : null;
  const graceEndsAt = snapshot.graceEndsAt ? snapshot.graceEndsAt.getTime() : null;

  let status = snapshot.status || 'trial';
  let isActive = false;
  let reason = 'inactive';

  if (status === 'inactive') {
    reason = 'inactive';
  } else if (status === 'trial') {
    if (!trialEndsAt || trialEndsAt >= nowTime) {
      isActive = true;
      reason = 'trial';
    } else if (graceEndsAt && graceEndsAt >= nowTime) {
      isActive = true;
      status = 'grace';
      reason = 'trial-grace';
    } else {
      reason = 'trial-expired';
    }
  } else if (status === 'active') {
    if (!currentPeriodEndsAt || currentPeriodEndsAt >= nowTime) {
      isActive = true;
      reason = 'active';
    } else if (graceEndsAt && graceEndsAt >= nowTime) {
      isActive = true;
      status = 'grace';
      reason = 'grace';
    } else {
      reason = 'subscription-expired';
    }
  } else if (status === 'grace') {
    if (graceEndsAt && graceEndsAt >= nowTime) {
      isActive = true;
      reason = 'grace';
    } else {
      reason = 'grace-expired';
    }
  } else if (status === 'past_due') {
    if (graceEndsAt && graceEndsAt >= nowTime) {
      isActive = true;
      status = 'grace';
      reason = 'past-due-grace';
    } else {
      reason = 'payment-required';
    }
  } else {
    reason = 'inactive';
  }

  const pricing = {
    planId: snapshot.planId,
    planName: snapshot.planName,
    monthlyPrice: snapshot.monthlyPrice,
    currency: snapshot.currency,
    billingPeriod: snapshot.billingPeriod,
    athleteLimit: snapshot.athleteLimit,
    minAthletes: snapshot.minAthletes,
    maxAthletes: snapshot.maxAthletes,
    trialDays: snapshot.trialDays
  };

  return {
    ...snapshot,
    status,
    isActive,
    reason,
    trialExpired: Boolean(trialEndsAt && trialEndsAt < nowTime),
    currentPeriodExpired: Boolean(currentPeriodEndsAt && currentPeriodEndsAt < nowTime),
    graceExpired: Boolean(graceEndsAt && graceEndsAt < nowTime),
    evaluatedAt: now,
    pricing
  };
};

clubSchema.methods.isSubscriptionActive = function isSubscriptionActive(referenceDate = new Date()) {
  const state = this.getSubscriptionState(referenceDate);
  return Boolean(state?.isActive);
};

clubSchema.methods.setSubscriptionAthleteLimit = function setSubscriptionAthleteLimit(limit) {
  const effectiveLimit = normaliseAthleteLimit(limit, DEFAULT_ATHLETE_LIMIT);

  if (!this.subscription || typeof this.subscription !== 'object') {
    this.subscription = buildDefaultSubscriptionSnapshot(effectiveLimit);
    return true;
  }

  let mutated = false;
  if (this.subscription.athleteLimit !== effectiveLimit) {
    this.subscription.athleteLimit = effectiveLimit;
    mutated = true;
  }

  if (ensureSubscriptionPricing(this.subscription, effectiveLimit)) {
    mutated = true;
  }

  return mutated;
};

export default mongoose.model('Club', clubSchema);
