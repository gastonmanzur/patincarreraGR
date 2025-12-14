export const CLUB_CONTEXT_EVENT = 'clubContextChanged';

const CONTACT_INFO_STORAGE_KEY = 'clubContactInfo';
const DEFAULT_CONTACT_INFO_KEY = 'default';
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

const getContactInfoStorageKey = (clubId) => {
  const normalisedClubId = normaliseClubId(clubId);
  return normalisedClubId || DEFAULT_CONTACT_INFO_KEY;
};

const readContactInfoStorage = () => {
  if (typeof sessionStorage === 'undefined') return {};

  try {
    const raw = sessionStorage.getItem(CONTACT_INFO_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const getStoredClubId = () => {
  const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('clubId') : null;
  return normaliseClubId(stored);
};

export const getStoredClubContactInfo = (clubId = getStoredClubId()) => {
  if (typeof sessionStorage === 'undefined') return null;

  const storageKey = getContactInfoStorageKey(clubId);
  const stored = readContactInfoStorage();
  if (!stored[storageKey]) return null;

  return buildStoredContactInfo(stored[storageKey]);
};

export const setStoredClubContactInfo = (contactInfo, clubId = getStoredClubId()) => {
  if (typeof sessionStorage === 'undefined') return null;

  const storageKey = getContactInfoStorageKey(clubId);
  const stored = readContactInfoStorage();

  if (!contactInfo || typeof contactInfo !== 'object') {
    delete stored[storageKey];

    if (Object.keys(stored).length === 0) {
      sessionStorage.removeItem(CONTACT_INFO_STORAGE_KEY);
    } else {
      sessionStorage.setItem(CONTACT_INFO_STORAGE_KEY, JSON.stringify(stored));
    }

    return null;
  }

  const sanitised = CONTACT_INFO_KEYS.reduce((acc, key) => {
    acc[key] = normaliseContactInfoValue(contactInfo[key]);
    return acc;
  }, {});

  stored[storageKey] = sanitised;
  sessionStorage.setItem(CONTACT_INFO_STORAGE_KEY, JSON.stringify(stored));

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
