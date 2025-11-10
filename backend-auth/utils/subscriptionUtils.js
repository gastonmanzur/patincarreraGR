import Club from '../models/Club.js';

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

export default loadClubSubscription;
