import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCompetitionAnalytics,
  calculateParticipationByMember,
} from './competitionAnalytics';

test('calculateCompetitionAnalytics summarizes fees and free entries', () => {
  const summary = calculateCompetitionAnalytics([
    {
      id: 'one',
      name: 'Lomba A',
      fee_type: 'paid',
      fee_amount: 150000,
    },
    {
      id: 'two',
      name: 'Lomba B',
      fee_type: 'paid',
      fee_amount: 50000,
    },
    {
      id: 'three',
      name: 'Lomba C',
      fee_type: 'free',
      fee_amount: 0,
    },
  ]);

  assert.equal(summary.totalFee, 200000);
  assert.equal(summary.paidCount, 2);
  assert.equal(summary.freeCount, 1);
  assert.deepEqual(
    summary.feeItems.map((item) => item.id),
    ['one', 'two']
  );
});

test('calculateParticipationByMember counts competition memberships per member', () => {
  const participation = calculateParticipationByMember(
    [
      { user_id: 'a' },
      { user_id: 'a' },
      { user_id: 'b' },
    ],
    [
      { id: 'a', username: 'ana', full_name: 'Ana' },
      { id: 'b', username: 'budi', full_name: 'Budi' },
      { id: 'c', username: 'cici', full_name: 'Cici' },
    ]
  );

  assert.deepEqual(
    participation.map(({ user_id, competition_count }) => [
      user_id,
      competition_count,
    ]),
    [
      ['a', 2],
      ['b', 1],
    ]
  );
});

test('calculateCompetitionAnalytics handles an empty competition list', () => {
  const summary = calculateCompetitionAnalytics([]);

  assert.equal(summary.totalFee, 0);
  assert.equal(summary.paidCount, 0);
  assert.equal(summary.freeCount, 0);
  assert.equal(summary.feeItems.length, 0);
});
