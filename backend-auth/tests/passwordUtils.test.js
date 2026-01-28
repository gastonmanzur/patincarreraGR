import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { comparePasswordWithHash, isLikelyBcryptHash } from '../utils/passwordUtils.js';

test('isLikelyBcryptHash identifies valid bcrypt hashes', async () => {
  const hash = await bcrypt.hash('ClaveSegura123!', 10);
  assert.equal(isLikelyBcryptHash(hash), true);
  assert.equal(isLikelyBcryptHash('not-a-hash'), false);
  assert.equal(isLikelyBcryptHash(''), false);
});

test('comparePasswordWithHash validates matching and non-matching passwords', async () => {
  const password = 'OtraClave123!';
  const hash = await bcrypt.hash(password, 10);

  const match = await comparePasswordWithHash(password, hash);
  assert.equal(match.matches, true);
  assert.equal(match.reason, 'match');

  const mismatch = await comparePasswordWithHash('incorrecta', hash);
  assert.equal(mismatch.matches, false);
  assert.equal(mismatch.reason, 'mismatch');
});

test('comparePasswordWithHash flags malformed hashes without throwing', async () => {
  const result = await comparePasswordWithHash('loquesea', 'contraseña-plana');
  assert.equal(result.matches, false);
  assert.equal(result.reason, 'invalid-hash');
});

