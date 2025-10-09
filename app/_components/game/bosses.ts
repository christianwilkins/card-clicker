import type { BossModifier } from '../types';

export const bossModifiers: BossModifier[] = [
  {
    id: 'boss-purist',
    name: 'The Purist',
    description: 'Only exact suit and special bets available. Color bets disabled.',
    targetMultiplier: 1.3,
    effect: {
      type: 'disableBets',
      betIds: ['color-red', 'color-black', 'rank-number', 'rank-face', 'value-high', 'value-low']
    }
  },
  {
    id: 'boss-accountant',
    name: 'The Accountant',
    description: 'Interest is disabled. Flat bonuses reduced by 50%.',
    targetMultiplier: 1.2,
    effect: {
      type: 'noInterest'
    }
  },
  {
    id: 'boss-multiplier-curse',
    name: 'The Dampener',
    description: 'All bet multipliers reduced by 50%.',
    targetMultiplier: 1.4,
    effect: {
      type: 'reduceMultipliers',
      value: 0.5
    }
  },
  {
    id: 'boss-drain',
    name: 'The Tax Collector',
    description: 'Lose 8 bank per missed bet.',
    targetMultiplier: 1.25,
    effect: {
      type: 'bankDrain',
      value: 8
    }
  },
  {
    id: 'boss-flat-curse',
    name: 'The Nullifier',
    description: 'Flat bonus per draw reduced to 0.',
    targetMultiplier: 1.3,
    effect: {
      type: 'reduceFlatBonus',
      value: 0
    }
  }
];

export function isBossRound(roundNumber: number): boolean {
  return roundNumber > 0 && roundNumber % 5 === 0;
}

export function getBossForRound(roundNumber: number): BossModifier | null {
  if (!isBossRound(roundNumber)) return null;
  const bossIndex = Math.floor(roundNumber / 5 - 1) % bossModifiers.length;
  return bossModifiers[bossIndex];
}
