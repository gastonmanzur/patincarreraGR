import bcrypt from 'bcryptjs';

// Bcrypt hashes follow the `$2[aby]$<cost>$<53 chars>` structure. The regular
// expression below is intentionally strict so we can quickly discard legacy
// values that were stored in plain text or generated with a different
// algorithm. Attempting to validate those strings with bcrypt throws an
// `Invalid salt` error which bubbled up as a 500 response during login.
const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export const isLikelyBcryptHash = (value) =>
  typeof value === 'string' && BCRYPT_HASH_REGEX.test(value);

/**
 * Compare a plain text password against a stored hash while gracefully
 * handling malformed values. Instead of letting bcrypt throw (which ends up as
 * a 500 for the client) we detect invalid hashes and report them so the caller
 * can surface a friendly error message.
 *
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<{matches: boolean, reason: 'match' | 'mismatch' | 'invalid-hash' | 'error', error?: Error}>}
 */
export const comparePasswordWithHash = async (plainPassword, hashedPassword) => {
  if (!isLikelyBcryptHash(hashedPassword)) {
    return { matches: false, reason: 'invalid-hash' };
  }

  try {
    const matches = await bcrypt.compare(plainPassword, hashedPassword);
    return { matches, reason: matches ? 'match' : 'mismatch' };
  } catch (error) {
    if (error?.message?.toLowerCase().includes('invalid salt')) {
      return { matches: false, reason: 'invalid-hash' };
    }
    return { matches: false, reason: 'error', error };
  }
};

