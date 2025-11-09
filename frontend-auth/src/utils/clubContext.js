export const CLUB_CONTEXT_EVENT = 'clubContextChanged';

const normaliseClubId = (clubId) => {
  if (typeof clubId !== 'string') return null;
  const trimmed = clubId.trim();
  return trimmed ? trimmed : null;
};

export const getStoredClubId = () => {
  const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('clubId') : null;
  return normaliseClubId(stored);
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
    window.dispatchEvent(
      new CustomEvent(CLUB_CONTEXT_EVENT, {
        detail: { clubId: normalised }
      })
    );
  }

  return normalised;
};

export const clearStoredClubId = () => setStoredClubId(null);
