import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatChatDayWIB,
  formatCurrencyIDR,
  formatDateTimeLocalWIB,
  formatDateTimeWIB,
  formatDateWIB,
  formatFileSize,
  formatTimeWIB,
  getInitials,
  parseDateTimeLocalWIB,
} from './formatters';

test('formatDateWIB and formatDateTimeWIB format UTC ISO timestamps into Asia/Jakarta', () => {
  const iso = '2026-11-18T02:05:00.000Z'; // 09:05 WIB
  const dateStr = formatDateWIB(iso);
  const dateTimeStr = formatDateTimeWIB(iso);

  assert.match(dateStr, /18/);
  assert.match(dateStr, /2026/);
  assert.match(dateTimeStr, /09:05 WIB$/);

  assert.equal(formatDateWIB(null), '—');
  assert.equal(formatDateTimeWIB('invalid-date'), '—');
});

test('formatCurrencyIDR formats IDR without decimals', () => {
  const formatted = formatCurrencyIDR(150000);
  assert.match(formatted, /Rp\s?150\.000/);
  assert.equal(formatCurrencyIDR(0).replace(/\s+/g, ' '), 'Rp 0');
});

test('local datetime inputs convert to and from WIB consistently', () => {
  const iso = '2026-11-18T02:05:00.000Z';

  assert.equal(formatDateTimeLocalWIB(iso), '2026-11-18T09:05');
  assert.equal(parseDateTimeLocalWIB('2026-11-18T09:05'), iso);
  assert.equal(parseDateTimeLocalWIB('invalid'), null);
});

test('getInitials returns up to 2 uppercase characters', () => {
  assert.equal(getInitials('Raka Pratama'), 'RP');
  assert.equal(getInitials('Siti'), 'SI');
  assert.equal(getInitials(''), 'TM');
});

test('formatFileSize formats byte units correctly', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(1024), '1.0 KB');
  assert.equal(formatFileSize(1048576), '1.0 MB');
});

test('formatTimeWIB and formatChatDayWIB use the WIB day boundary', () => {
  const now = new Date('2026-11-21T05:00:00.000Z'); // 12:00 WIB
  const today = '2026-11-21T02:05:00.000Z'; // 09:05 WIB
  const yesterday = '2026-11-20T16:30:00.000Z'; // 23:30 WIB, previous day
  const older = '2026-11-18T02:05:00.000Z';

  assert.equal(formatTimeWIB(today), '09:05');
  assert.equal(formatChatDayWIB(today, now), 'Hari ini');
  assert.equal(formatChatDayWIB(yesterday, now), 'Kemarin');
  assert.match(formatChatDayWIB(older, now), /18/);
  assert.equal(formatTimeWIB(null), '—');
});
