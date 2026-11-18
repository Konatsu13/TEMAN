import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInternalAuthEmail,
  normalizeUsername,
  validateLoginInput,
} from './authValidation';

test('normalizeUsername trims, lowercases, and strips leading @', () => {
  assert.equal(normalizeUsername('  @Budi.Santoso '), 'budi.santoso');
  assert.equal(normalizeUsername('owner_01'), 'owner_01');
});

test('validateLoginInput validates name and password minimum', () => {
  const valid = validateLoginInput('Ahmad Fauzi', 'secret123');
  assert.equal(valid.valid, true);
  assert.equal(valid.normalizedUsername, 'Ahmad Fauzi');
  assert.deepEqual(valid.errors, {});

  const shortName = validateLoginInput('a', '123456');
  assert.equal(shortName.valid, false);
  assert.ok(shortName.errors.username);
  assert.equal(shortName.errors.password, undefined);

  const shortPass = validateLoginInput('Ahmad', '123');
  assert.equal(shortPass.valid, false);
  assert.ok(shortPass.errors.password);
});

test('buildInternalAuthEmail maps name or username cleanly', () => {
  assert.equal(buildInternalAuthEmail('Rina Putri'), 'rinaputri@teman.local');
  assert.equal(
    buildInternalAuthEmail('owner', 'custom.teman.id'),
    'owner@custom.teman.id'
  );
});
