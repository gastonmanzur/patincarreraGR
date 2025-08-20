import test from 'node:test';
import assert from 'node:assert/strict';
import { mapHeaders, extractTableFromText } from '../tablaExtractor.js';

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

test('reconoce encabezados abreviados y tabla separada por espacios', () => {
  const text =
    'Orden  Nro atleta  Apellido y nombres  categoria  club  pos  ptos\n' +
    '1      25          Perez Juan         Juvenil    Club A  1   10';
  const { headers, rows } = extractTableFromText(text);
  assert.deepEqual(headers, [
    'Orden',
    'Nro atleta',
    'Apellido y nombres',
    'categoria',
    'club',
    'pos',
    'ptos'
  ]);

  const mapping = mapHeaders(headers);
  assert.equal(mapping.dorsal, 1);
  assert.equal(mapping.nombre, 2);
  assert.equal(mapping.categoria, 3);
  assert.equal(mapping.club, 4);
  assert.equal(mapping.posicion, 0);
  assert.equal(mapping.puntos, 6);

  assert.deepEqual(rows[0], [
    '1',
    '25',
    'Perez Juan',
    'Juvenil',
    'Club A',
    '1',
    '10'
  ]);
});

test('maneja encabezados repetidos y variaciones tipográficas', () => {
  const headers = [
    'Orden',
    'Nro Atleta',
    'APELLIDO Y NOBRES',
    'CATEGORIA',
    'CLUB',
    'Nro Atleta',
    'POS',
    'PTOS',
    'Nro Atleta',
    'POS',
    'PTOS TOTAL'
  ];
  const mapping = mapHeaders(headers);
  assert.equal(mapping.posicion, 0);
  assert.equal(mapping.dorsal, 1); // primera ocurrencia
  assert.equal(mapping.nombre, 2);
  assert.equal(mapping.categoria, 3);
  assert.equal(mapping.club, 4);
  assert.equal(mapping.puntos, 10); // columna "PTOS TOTAL"
});
