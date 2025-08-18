import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTiempo, normalizarNumero } from '../normalizadorResultados.js';

test('normaliza tiempos variados', () => {
  assert.equal(normalizarTiempo('00:47.32'), 47320);
  assert.equal(normalizarTiempo('0:48.10'), 48100);
  assert.equal(normalizarTiempo('1:02'), 62000);
});

test('normaliza números con coma', () => {
  assert.equal(normalizarNumero('10,5'), 10.5);
  assert.equal(normalizarNumero('8'), 8);
});
