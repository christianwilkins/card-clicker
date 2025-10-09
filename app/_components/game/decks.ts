import type { CardType, DeckModifier, DeckPreset, Rank, Suit } from '../types';

import { createCard, createJokerCard, createStandardDeck, ranks, suits } from './cards';

function createHighRollerDeck(): CardType[] {
  const deck: CardType[] = [];
  const premiumRanks: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  for (const suit of suits) {
    for (const rank of premiumRanks) {
      deck.push(createCard(suit, rank));
    }
  }

  let variant = 0;
  const bonusRanks: Rank[] = ['J', 'Q', 'K', 'A'];
  const bonusSuits: Suit[] = ['♠', '♥'];
  for (const suit of bonusSuits) {
    for (const rank of bonusRanks) {
      deck.push(createCard(suit, rank, variant++));
    }
  }

  deck.push(createJokerCard('red', 'joker-red-high'));
  deck.push(createJokerCard('black', 'joker-black-high'));
  deck.push(createJokerCard('black', 'joker-black-high-2'));
  return deck;
}

function createProbabilityBenderDeck(): CardType[] {
  const deck = createStandardDeck();
  let variant = 0;
  const lowRanks: Rank[] = ['2', '3', '4', '5', '6'];
  const redSuits: Suit[] = ['♥', '♦'];
  for (const suit of redSuits) {
    for (const rank of lowRanks) {
      deck.push(createCard(suit, rank, variant++));
    }
  }

  const momentumRanks: Rank[] = ['9', '10', 'J'];
  const blackSuits: Suit[] = ['♠', '♣'];
  for (const suit of blackSuits) {
    for (const rank of momentumRanks) {
      deck.push(createCard(suit, rank, variant++));
    }
  }

  deck.push(createJokerCard('red', 'joker-red-pb'));
  deck.push(createJokerCard('red', 'joker-red-pb-2'));
  deck.push(createJokerCard('black', 'joker-black-pb'));
  return deck;
}

function createMinimalistDeck(): CardType[] {
  const deck: CardType[] = [];
  const premiumRanks: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];
  for (const suit of suits) {
    for (const rank of premiumRanks) {
      deck.push(createCard(suit, rank));
    }
  }
  deck.push(createJokerCard('red', 'joker-red-mini'));
  deck.push(createJokerCard('black', 'joker-black-mini'));
  return deck;
}

function createChaosDeck(): CardType[] {
  const deck: CardType[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(createCard(suit, rank));
      deck.push(createCard(suit, rank, 1));
    }
  }
  for (let i = 0; i < 6; i++) {
    deck.push(createJokerCard(i % 2 === 0 ? 'red' : 'black', `joker-chaos-${i}`));
  }
  return deck;
}

function createBankerDeck(): CardType[] {
  return createStandardDeck();
}

export const deckPresets: DeckPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced Deck',
    description: 'Classic 54-card spread. No modifiers—pure odds.',
    modifiers: {},
    buildDeck: createStandardDeck
  },
  {
    id: 'high-roller',
    name: 'High Roller',
    description:
      'Lean stack stacked with face cards and extra jokers to chase big multipliers.',
    modifiers: { startingBank: 120, flatBonus: 4 },
    buildDeck: createHighRollerDeck,
    requirement: { type: 'bestRound', value: 5, label: 'Reach Round 5' }
  },
  {
    id: 'probability-bender',
    name: 'Probability Bender',
    description:
      'Weighted draws favor streaky reds, boosted lows, and a surplus of wild cards.',
    modifiers: { extraDraws: 1, interestBonus: 0.02 },
    buildDeck: createProbabilityBenderDeck,
    requirement: { type: 'bestRound', value: 10, label: 'Reach Round 10' }
  },
  {
    id: 'minimalist',
    name: 'Minimalist Deck',
    description: 'Only 26 premium cards (9+). Start with +2 draws and higher multipliers.',
    modifiers: { extraDraws: 2, flatBonus: 6 },
    buildDeck: createMinimalistDeck,
    requirement: { type: 'bestRound', value: 7, label: 'Reach Round 7' }
  },
  {
    id: 'chaos',
    name: 'Chaos Deck',
    description: '110 cards with 6 Jokers. Complete randomness, +1 draw. High variance chaos.',
    modifiers: { extraDraws: 1, flatBonus: 3 },
    buildDeck: createChaosDeck,
    requirement: { type: 'bestRound', value: 12, label: 'Reach Round 12' }
  },
  {
    id: 'banker',
    name: "Banker's Deck",
    description: 'Start with 200 bank and +5% interest, but -1 draw. Play the long game.',
    modifiers: { startingBank: 200, interestBonus: 0.05, extraDraws: -1 },
    buildDeck: createBankerDeck,
    requirement: { type: 'bestRound', value: 15, label: 'Reach Round 15' }
  }
];

const deckPresetMap = new Map<string, DeckPreset>(deckPresets.map((preset) => [preset.id, preset]));

export function getDeckPresetById(deckId: string): DeckPreset {
  return deckPresetMap.get(deckId) ?? deckPresets[0];
}

export function buildDeckForPreset(deckId: string): CardType[] {
  const preset = getDeckPresetById(deckId);
  return preset.buildDeck();
}

export function mergeDeckModifiers(
  modifiers: DeckModifier | undefined,
  overrides: DeckModifier | undefined
): Required<DeckModifier> {
  return {
    extraDraws: overrides?.extraDraws ?? modifiers?.extraDraws ?? 0,
    flatBonus: overrides?.flatBonus ?? modifiers?.flatBonus ?? 0,
    interestBonus: overrides?.interestBonus ?? modifiers?.interestBonus ?? 0,
    startingBank: overrides?.startingBank ?? modifiers?.startingBank ?? 0
  };
}
