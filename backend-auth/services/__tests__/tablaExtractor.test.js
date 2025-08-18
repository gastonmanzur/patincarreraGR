import test from 'node:test';
import assert from 'node:assert/strict';
import { mapHeaders } from '../tablaExtractor.js';

test('mapea encabezados con sinónimos', () => {
  const headers = ['Puesto', 'N°', 'Apellido y Nombre', 'Categoría', 'Club', 'Tiempo', 'Pts'];
  const mapping = mapHeaders(headers);
  assert.equal(mapping.posicion, 0);
  assert.equal(mapping.dorsal, 1);
  assert.equal(mapping.nombre, 2);
  assert.equal(mapping.categoria, 3);
  assert.equal(mapping.club, 4);
  assert.equal(mapping.tiempo, 5);
  assert.equal(mapping.puntos, 6);
});
