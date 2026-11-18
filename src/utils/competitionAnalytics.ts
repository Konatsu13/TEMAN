import type { FeeType } from '../types/database.types';

export interface CompetitionAnalyticsInput {
  id: string;
  name: string;
  fee_type: FeeType;
  fee_amount: number;
}

export interface CompetitionParticipationInput {
  id: string;
  username: string;
  full_name: string;
}

export function calculateParticipationByMember(
  memberships: readonly { user_id: string }[],
  profiles: readonly CompetitionParticipationInput[]
) {
  const counts = new Map<string, number>();
  for (const membership of memberships) {
    counts.set(membership.user_id, (counts.get(membership.user_id) ?? 0) + 1);
  }

  return profiles
    .map((profile) => ({
      user_id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      competition_count: counts.get(profile.id) ?? 0,
    }))
    .filter((member) => member.competition_count > 0)
    .sort((a, b) => b.competition_count - a.competition_count);
}

export function calculateCompetitionAnalytics(
  competitions: readonly CompetitionAnalyticsInput[]
) {
  const feeItems = competitions
    .filter((competition) => competition.fee_type === 'paid')
    .map((competition) => ({
      id: competition.id,
      name: competition.name,
      amount:
        Number.isFinite(competition.fee_amount) && competition.fee_amount > 0
          ? competition.fee_amount
          : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalFee: feeItems.reduce((sum, item) => sum + item.amount, 0),
    paidCount: feeItems.length,
    freeCount: competitions.filter((competition) => competition.fee_type === 'free')
      .length,
    feeItems,
  };
}
