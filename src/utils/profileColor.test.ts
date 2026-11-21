import test from 'node:test';
import assert from 'node:assert/strict';
import { getProfileColorText, isValidProfileColor } from './profileColor';

test('profile colors only accept six-digit HEX values', () => {
  assert.equal(isValidProfileColor('#2563EB'), true);
  assert.equal(isValidProfileColor('#abcdef'), true);
  assert.equal(isValidProfileColor('#fff'), false);
  assert.equal(isValidProfileColor('2563EB'), false);
  assert.equal(isValidProfileColor('red'), false);
  assert.equal(isValidProfileColor('url(https://example.com)'), false);
});

test('profile initials use a contrasting text color for light and dark backgrounds', () => {
  assert.equal(getProfileColorText('#F8FAFC'), '#000000');
  assert.equal(getProfileColorText('#090D16'), '#FFFFFF');
  assert.equal(getProfileColorText('invalid'), '#FFFFFF');
});
