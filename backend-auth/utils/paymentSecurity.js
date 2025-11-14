import crypto from 'crypto';

const DEFAULT_KEY_LENGTH = 32; // AES-256
const DEFAULT_IV_LENGTH = 12; // Recommended for GCM

const normaliseBuffer = (value, encoding = 'utf8') => {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return Buffer.from(trimmed, encoding);
  }
  return null;
};

const getEncryptionKey = () => {
  const rawKey = process.env.PAYMENT_ENCRYPTION_KEY;
  const keyBuffer = normaliseBuffer(rawKey, 'base64') || normaliseBuffer(rawKey);

  if (!keyBuffer || keyBuffer.length < DEFAULT_KEY_LENGTH) {
    throw new Error(
      'PAYMENT_ENCRYPTION_KEY must be configured with at least 32 bytes (Base64 or UTF-8) to protect payment data.'
    );
  }

  if (keyBuffer.length === DEFAULT_KEY_LENGTH) {
    return keyBuffer;
  }

  if (keyBuffer.length > DEFAULT_KEY_LENGTH) {
    return keyBuffer.subarray(0, DEFAULT_KEY_LENGTH);
  }

  const padded = Buffer.allocUnsafe(DEFAULT_KEY_LENGTH);
  keyBuffer.copy(padded);
  return padded;
};

const encryptSensitiveData = (payload) => {
  const serialised = JSON.stringify(payload ?? {});
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(DEFAULT_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(serialised, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
};

const decryptSensitiveData = ({ ciphertext, iv, authTag }) => {
  const key = getEncryptionKey();
  const ivBuffer = normaliseBuffer(iv, 'base64');
  const authTagBuffer = normaliseBuffer(authTag, 'base64');
  const dataBuffer = normaliseBuffer(ciphertext, 'base64');

  if (!ivBuffer || !authTagBuffer || !dataBuffer) {
    throw new Error('Encrypted payment payload is incomplete.');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  const decrypted = Buffer.concat([decipher.update(dataBuffer), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
};

export { encryptSensitiveData, decryptSensitiveData };
