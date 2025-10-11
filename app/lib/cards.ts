import type { CardType, Rank, Suit } from './types';

export const suits: Suit[] = ['♠', '♥', '♦', '♣'];
export const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createCard(suit: Suit, rank: Rank, variant?: number): CardType {
  return {
    suit,
    rank,
    id: variant !== undefined ? `${rank}${suit}-${variant}` : `${rank}${suit}`
  };
}

export function createJokerCard(color: 'red' | 'black', id?: string): CardType {
  return {
    suit: 'Joker',
    rank: 'Joker',
    id: id ?? `joker-${color}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    isJoker: true,
    jokerColor: color
  };
}

export function normalizeStoredCard(card: CardType): CardType {
  if (card.rank === 'Joker' || card.suit === 'Joker' || card.isJoker) {
    return {
      ...card,
      suit: 'Joker',
      rank: 'Joker',
      isJoker: true,
      jokerColor: card.jokerColor ?? 'black'
    };
  }

  return {
    ...card,
    isJoker: false
  };
}

export function createStandardDeck(): CardType[] {
  const deck: CardType[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(createCard(suit, rank));
    }
  }
  deck.push(createJokerCard('red', 'joker-red'));
  deck.push(createJokerCard('black', 'joker-black'));
  return deck;
}

export function shuffleDeck(deck: CardType[]): CardType[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'J') return 12;
  if (rank === 'Q') return 13;
  if (rank === 'K') return 14;
  return parseInt(rank, 10);
}
