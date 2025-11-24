export const DEFAULT_TRIAL_DAYS = 30;
export const DEFAULT_ATHLETE_LIMIT = 15;

const parseInteger = (value) => {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : NaN;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return NaN;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

export const parsePositiveInteger = (value, fallback) => {
  const parsed = parseInteger(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export const resolveTrialDays = () =>
  parsePositiveInteger(process.env.CLUB_TRIAL_DAYS, DEFAULT_TRIAL_DAYS);

export default {
  DEFAULT_TRIAL_DAYS,
  DEFAULT_ATHLETE_LIMIT,
  resolveTrialDays,
  parsePositiveInteger
};
