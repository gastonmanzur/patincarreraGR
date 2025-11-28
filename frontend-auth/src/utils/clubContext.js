export const CLUB_CONTEXT_EVENT = 'clubContextChanged';

const CONTACT_INFO_STORAGE_KEY = 'clubContactInfo';
const CONTACT_INFO_KEYS = Object.freeze([
  'phone',
  'email',
  'address',
  'mapUrl',
  'facebook',
  'instagram',
  'whatsapp',
  'x',
  'history'
]);

const extractIdFromObject = (value) => {
  if (!value || typeof value !== 'object') return null;
  if (typeof value._id === 'string') return value._id;
  if (typeof value.id === 'string') return value.id;
  return null;
};

const normaliseClubId = (clubId) => {
  if (clubId && typeof clubId === 'object') {
    const extracted = extractIdFromObject(clubId);
    if (extracted) return extracted.trim();
  }

  if (typeof clubId !== 'string') return null;
  const trimmed = clubId.trim();
  return trimmed ? trimmed : null;
};

const normaliseContactInfoValue = (value) => (typeof value === 'string' ? value : '');

const buildStoredContactInfo = (raw) =>
  CONTACT_INFO_KEYS.reduce((acc, key) => {
    acc[key] = normaliseContactInfoValue(raw?.[key]);
    return acc;
  }, {});

export const getStoredClubId = () => {
  const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('clubId') : null;
  return normaliseClubId(stored);
};

export const getStoredClubContactInfo = () => {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(CONTACT_INFO_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;
    return buildStoredContactInfo(parsed);
  } catch {
    return null;
  }
};

export const setStoredClubContactInfo = (contactInfo) => {
  if (typeof sessionStorage === 'undefined') return null;
  if (!contactInfo || typeof contactInfo !== 'object') {
    sessionStorage.removeItem(CONTACT_INFO_STORAGE_KEY);
    return null;
  }

  const sanitised = CONTACT_INFO_KEYS.reduce((acc, key) => {
    acc[key] = normaliseContactInfoValue(contactInfo[key]);
    return acc;
  }, {});

  sessionStorage.setItem(CONTACT_INFO_STORAGE_KEY, JSON.stringify(sanitised));
  return buildStoredContactInfo(sanitised);
};

export const clearStoredClubContactInfo = () => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(CONTACT_INFO_STORAGE_KEY);
};

export const setStoredClubId = (clubId) => {
  const normalised = normaliseClubId(clubId);
  const previous = getStoredClubId();

  if (normalised) {
    sessionStorage.setItem('clubId', normalised);
  } else {
    sessionStorage.removeItem('clubId');
  }

  if (previous !== normalised) {
    clearStoredClubContactInfo();
    window.dispatchEvent(
      new CustomEvent(CLUB_CONTEXT_EVENT, {
        detail: { clubId: normalised }
      })
    );
  }

  return normalised;
};

export const clearStoredClubId = () => setStoredClubId(null);
