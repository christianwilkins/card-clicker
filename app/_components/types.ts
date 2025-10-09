export type GamePhase = 'menu' | 'gameplay' | 'shopTransition' | 'shop' | 'gameOver';
export type RoundOutcome = 'active' | 'won' | 'lost';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type BetCategory = 'Color' | 'Suit' | 'Rank Type' | 'Value' | 'Special';
export type ThemeMode = 'light' | 'dark';
export type Suit = '♠' | '♥' | '♦' | '♣' | 'Joker';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Joker';
export type RecentCardStatus = 'enter' | 'idle' | 'exit';

export interface CardType {
  suit: Suit;
  rank: Rank;
  id: string;
  isJoker?: boolean;
  jokerColor?: 'red' | 'black';
}

export interface BetOption {
  id: string;
  category: BetCategory;
  label: string;
  description: string;
  baseMultiplier: number;
  risk: 'low' | 'medium' | 'high' | 'extreme';
  check: (card: CardType) => boolean;
}

export interface BossModifier {
  id: string;
  name: string;
  description: string;
  targetMultiplier: number;
  effect?: {
    type: 'disableBets' | 'reduceFlatBonus' | 'reduceMultipliers' | 'bankDrain' | 'noInterest';
    value?: number;
    betIds?: string[];
  };
}

export type UpgradeEffect =
  | { type: 'extraDraws'; value: number }
  | { type: 'betMultiplier'; betId: string; value: number }
  | { type: 'flatBonus'; value: number }
  | { type: 'interestRate'; value: number }
  | { type: 'synergyMultiplier'; tag: string; value: number }
  | { type: 'transformation'; set: string; piece: number }
  | { type: 'conditionalBonus'; condition: 'onHit' | 'onMiss' | 'streak'; multiplier?: number; flatBonus?: number; bankReward?: number; bankPenalty?: number }
  | { type: 'comboCounter'; value: number; decay: 'onMiss' | 'perRound' }
  | { type: 'globalMultiplier'; value: number };

export interface ShopUpgrade {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  cost: number;
  icon: string;
  effects: UpgradeEffect[];
  tags?: string[];
}

export interface OwnedUpgrade extends ShopUpgrade {
  purchasedAtRound: number;
}

export interface DeckModifier {
  extraDraws?: number;
  flatBonus?: number;
  interestBonus?: number;
  startingBank?: number;
}

export interface DeckPreset {
  id: string;
  name: string;
  description: string;
  modifiers: DeckModifier;
  buildDeck: () => CardType[];
  requirement?: { type: 'bestRound'; value: number; label: string };
}

export interface PlayerProfile {
  id: string;
  name: string;
  unlockedDecks: string[];
  bestRound: number;
}

export interface RecentCardEntry {
  id: string;
  card: CardType;
  status: RecentCardStatus;
  betId: string;
  betLabel: string;
  betHit: boolean;
  gain: number;
}

export interface FloatingScore {
  id: string;
  value: number;
  hit: boolean;
}

export interface DrawAnimation {
  id: string;
  card: CardType;
}

export interface StoredGameState {
  deck: CardType[];
  bank: number;
  roundNumber: number;
  roundScore: number;
  roundTarget: number;
  drawsRemaining: number;
  roundOutcome: RoundOutcome;
  gamePhase: GamePhase;
  selectedBetId: string | null;
  ownedUpgrades: OwnedUpgrade[];
  recentCards: RecentCardEntry[];
  targetAchieved: boolean;
  currentShopChoices: ShopUpgrade[];
  purchasedShopIds: string[];
  activeDeckId: string;
  deckModifiers: DeckModifier;
  lockedBetCategory?: BetCategory | null;
  requireBetChangeAfterHit?: boolean;
  comboStreak?: number;
  lastBetHit?: boolean;
  transformationsCompleted?: string[];
}
