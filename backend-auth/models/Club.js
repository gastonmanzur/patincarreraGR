import mongoose from 'mongoose';

const DEFAULT_TRIAL_DAYS = 30;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const resolveTrialDays = () => parsePositiveInteger(process.env.CLUB_TRIAL_DAYS, DEFAULT_TRIAL_DAYS);

const addDays = (date, days) => {
  const base = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(base.getTime())) {
    return new Date(Date.now() + days * 86400000);
  }
  return new Date(base.getTime() + days * 86400000);
};

const buildDefaultSubscriptionSnapshot = () => {
  const now = new Date();
  return {
    status: 'trial',
    trialStartedAt: now,
    trialEndsAt: addDays(now, resolveTrialDays()),
    currentPeriodEndsAt: null,
    graceEndsAt: null,
    lastPaymentAt: null,
    notes: ''
  };
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
    notes: { type: String, trim: true }
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
    this.subscription.trialEndsAt = addDays(base, resolveTrialDays());
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
  const snapshot = { ...buildDefaultSubscriptionSnapshot(), ...raw };
  snapshot.status = (raw.status || snapshot.status || 'trial').toLowerCase();
  snapshot.trialStartedAt = normaliseDate(snapshot.trialStartedAt);
  snapshot.trialEndsAt = normaliseDate(snapshot.trialEndsAt);
  snapshot.currentPeriodEndsAt = normaliseDate(snapshot.currentPeriodEndsAt);
  snapshot.graceEndsAt = normaliseDate(snapshot.graceEndsAt);
  snapshot.lastPaymentAt = normaliseDate(snapshot.lastPaymentAt);
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

  return {
    ...snapshot,
    status,
    isActive,
    reason,
    trialExpired: Boolean(trialEndsAt && trialEndsAt < nowTime),
    currentPeriodExpired: Boolean(currentPeriodEndsAt && currentPeriodEndsAt < nowTime),
    graceExpired: Boolean(graceEndsAt && graceEndsAt < nowTime),
    evaluatedAt: now
  };
};

clubSchema.methods.isSubscriptionActive = function isSubscriptionActive(referenceDate = new Date()) {
  const state = this.getSubscriptionState(referenceDate);
  return Boolean(state?.isActive);
};

export default mongoose.model('Club', clubSchema);
