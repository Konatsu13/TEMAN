import test from 'node:test';
import assert from 'node:assert/strict';
import { isAIQueryResult } from './aiQueryResult';

test('AI query response accepts structured table results', () => {
  assert.equal(
    isAIQueryResult({
      answer: 'Ada 2 kompetisi aktif.',
      columns: ['Nama', 'Status'],
      rows: [{ Nama: 'Hackathon', Status: 'Aktif' }],
    }),
    true
  );
});

test('AI query response rejects invalid cells and malformed payloads', () => {
  assert.equal(
    isAIQueryResult({
      answer: 'Jawaban',
      columns: ['Jumlah'],
      rows: [{ Jumlah: Number.NaN }],
    }),
    false
  );
  assert.equal(isAIQueryResult({ answer: 'Jawaban', columns: [], rows: [null] }), false);
  assert.equal(isAIQueryResult(null), false);
  assert.equal(
    isAIQueryResult({ answer: 'Jawaban', columns: [], rows: [], supported: 'yes' }),
    false
  );
});

test('AI query response accepts support metadata for chat routing', () => {
  assert.equal(
    isAIQueryResult({
      answer: 'Saya belum menemukan analitik yang cocok.',
      columns: [],
      rows: [],
      supported: false,
    }),
    true
  );
});
