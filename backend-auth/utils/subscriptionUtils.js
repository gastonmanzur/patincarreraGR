import Club from '../models/Club.js';
import {
  buildSubscriptionQuoteForLimit,
  getSubscriptionPlans,
  normaliseAthleteLimit,
  resolveSubscriptionPlanForLimit
} from '../config/subscriptionPlans.js';
import {
  DEFAULT_ATHLETE_LIMIT,
  DEFAULT_TRIAL_DAYS,
  resolveTrialDays
} from '../config/subscriptionConfig.js';

const shouldPersistDefaults = (options = {}) => {
  if (typeof options.persistDefaults === 'boolean') {
    return options.persistDefaults;
  }
  if (typeof options.saveDefaults === 'boolean') {
    return options.saveDefaults;
  }
  return true;
};

export const loadClubSubscription = async (clubId, options = {}) => {
  if (!clubId) return null;

  const club = await Club.findById(clubId).select('nombre subscription');
  if (!club) return null;

  const persistDefaults = shouldPersistDefaults(options);
  let mutated = false;

  if (typeof club.ensureSubscriptionDefaults === 'function') {
    mutated = club.ensureSubscriptionDefaults();
  }

  if (mutated && persistDefaults) {
    try {
      await club.save();
    } catch (error) {
      console.warn('No se pudo guardar la configuración de suscripción por defecto del club.', error);
    }
  }

  const subscriptionState =
    typeof club.getSubscriptionState === 'function'
      ? club.getSubscriptionState()
      : { isActive: true, status: 'unknown', reason: 'missing-method' };

  return {
    club,
    subscriptionState
  };
};

export const buildSubscriptionPlansResponse = () => {
  const trialDays = resolveTrialDays();
  const plans = getSubscriptionPlans({ trialDays }).map((plan) => ({
    ...plan,
    trialDays
  }));

  return {
    trialDays,
    plans
  };
};

export {
  buildSubscriptionQuoteForLimit,
  getSubscriptionPlans,
  normaliseAthleteLimit,
  resolveSubscriptionPlanForLimit,
  resolveTrialDays,
  DEFAULT_TRIAL_DAYS,
  DEFAULT_ATHLETE_LIMIT
};

export default loadClubSubscription;
