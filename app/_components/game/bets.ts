import type { BetOption } from '../types';

import { getRankValue } from './cards';

export const betOptions: BetOption[] = [
  {
    id: 'color-red',
    category: 'Color',
    label: 'Red Cards',
    description: 'Hearts or Diamonds',
    baseMultiplier: 1.7,
    risk: 'low',
    check: (card) => card.suit === '♥' || card.suit === '♦'
  },
  {
    id: 'color-black',
    category: 'Color',
    label: 'Black Cards',
    description: 'Spades or Clubs',
    baseMultiplier: 1.7,
    risk: 'low',
    check: (card) => card.suit === '♠' || card.suit === '♣'
  },
  {
    id: 'suit-spades',
    category: 'Suit',
    label: 'Exact Suit · ♠',
    description: 'Bet on spades specifically',
    baseMultiplier: 3.2,
    risk: 'high',
    check: (card) => card.suit === '♠'
  },
  {
    id: 'suit-hearts',
    category: 'Suit',
    label: 'Exact Suit · ♥',
    description: 'Bet on hearts specifically',
    baseMultiplier: 3.0,
    risk: 'high',
    check: (card) => card.suit === '♥'
  },
  {
    id: 'suit-diamonds',
    category: 'Suit',
    label: 'Exact Suit · ♦',
    description: 'Bet on diamonds specifically',
    baseMultiplier: 3.0,
    risk: 'high',
    check: (card) => card.suit === '♦'
  },
  {
    id: 'suit-clubs',
    category: 'Suit',
    label: 'Exact Suit · ♣',
    description: 'Bet on clubs specifically',
    baseMultiplier: 3.2,
    risk: 'high',
    check: (card) => card.suit === '♣'
  },
  {
    id: 'rank-face',
    category: 'Rank Type',
    label: 'Face Card',
    description: 'J, Q, or K',
    baseMultiplier: 2.2,
    risk: 'medium',
    check: (card) => card.rank === 'J' || card.rank === 'Q' || card.rank === 'K'
  },
  {
    id: 'rank-number',
    category: 'Rank Type',
    label: 'Number Card',
    description: 'Ranks 2 through 10',
    baseMultiplier: 1.5,
    risk: 'low',
    check: (card) => !['A', 'J', 'Q', 'K', 'Joker'].includes(card.rank)
  },
  {
    id: 'value-high',
    category: 'Value',
    label: 'High Value (9+)',
    description: 'Rank 9 or above',
    baseMultiplier: 1.9,
    risk: 'medium',
    check: (card) => {
      if (card.rank === 'Joker') return true;
      return getRankValue(card.rank) >= 9;
    }
  },
  {
    id: 'value-low',
    category: 'Value',
    label: 'Low Value (2-6)',
    description: 'Rank between 2 and 6',
    baseMultiplier: 2.1,
    risk: 'medium',
    check: (card) => {
      if (card.rank === 'Joker') return false;
      const value = getRankValue(card.rank);
      return value >= 2 && value <= 6;
    }
  },
  {
    id: 'special-ace',
    category: 'Special',
    label: 'Ace!',
    description: 'Land exactly on an Ace',
    baseMultiplier: 4.5,
    risk: 'high',
    check: (card) => card.rank === 'A'
  },
  {
    id: 'special-joker',
    category: 'Special',
    label: 'Joker',
    description: 'Hit either Joker',
    baseMultiplier: 7.0,
    risk: 'extreme',
    check: (card) => card.rank === 'Joker'
  }
];

export const betOptionMap = new Map(betOptions.map((bet) => [bet.id, bet]));
