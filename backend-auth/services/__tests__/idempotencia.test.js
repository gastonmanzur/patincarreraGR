import test from 'node:test';
import assert from 'node:assert/strict';
function upsertResultadoMem(store, data) {
  const key = `${data.competenciaId}-${data.deportistaId}-${data.categoria}`;
  const exists = store.has(key);
  store.set(key, data);
  return exists ? 'update' : 'insert';
}

test('upsert es idempotente por competencia+deportista+categoria', () => {
  const store = new Map();
  const base = { competenciaId: 1, deportistaId: 2, categoria: 'Mayores', puntos: 10 };
  const first = upsertResultadoMem(store, base);
  const second = upsertResultadoMem(store, { ...base, puntos: 12 });
  assert.equal(first, 'insert');
  assert.equal(second, 'update');
  assert.equal(store.size, 1);
  assert.equal(store.get('1-2-Mayores').puntos, 12);
});
