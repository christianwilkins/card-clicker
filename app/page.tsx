'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Card, { type CardType, type Rank, type Suit } from '@/components/Card';
import RecentCardItem, { type RecentCardStatus } from '@/components/RecentCardItem';

type GamePhase = 'menu' | 'gameplay' | 'shopTransition' | 'shop' | 'gameOver';
type RoundOutcome = 'active' | 'won' | 'lost';
type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
type BetCategory = 'Color' | 'Suit' | 'Rank Type' | 'Value' | 'Special';

interface FloatingScore {
  id: string;
  value: number;
  hit: boolean;
}

interface DrawAnimation {
  id: string;
  card: CardType;
}

interface RecentCardEntry {
  id: string;
  card: CardType;
  status: RecentCardStatus;
  betId: string;
  betLabel: string;
  betHit: boolean;
  gain: number;
}

interface StoredGameState {
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
}

interface BetOption {
  id: string;
  category: BetCategory;
  label: string;
  description: string;
  baseMultiplier: number;
  risk: 'low' | 'medium' | 'high' | 'extreme';
  check: (card: CardType) => boolean;
}

type UpgradeEffect =
  | { type: 'extraDraws'; value: number }
  | { type: 'betMultiplier'; betId: string; value: number }
  | { type: 'flatBonus'; value: number }
  | { type: 'interestRate'; value: number };

interface ShopUpgrade {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  cost: number;
  effects: UpgradeEffect[];
}

interface OwnedUpgrade extends ShopUpgrade {
  purchasedAtRound: number;
}

const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const STORAGE_KEY = 'card-clicker-rogue-v1';
const BASE_DRAWS = 5;
const BASE_INTEREST = 0.05;
const GUARANTEED_DRAW_VALUE = 12;
const MAX_RECENT_CARDS = 6;

const rarityStyles: Record<Rarity, { border: string; badge: string; glow: string }> = {
  common: {
    border: 'border-gray-700',
    badge: 'bg-gray-600 text-gray-100',
    glow: 'shadow-[0_10px_25px_rgba(148,163,184,0.18)]'
  },
  uncommon: {
    border: 'border-emerald-500/50',
    badge: 'bg-emerald-500/90 text-emerald-950',
    glow: 'shadow-[0_14px_30px_rgba(16,185,129,0.28)]'
  },
  rare: {
    border: 'border-sky-500/60',
    badge: 'bg-sky-500/90 text-sky-950',
    glow: 'shadow-[0_16px_32px_rgba(56,189,248,0.3)]'
  },
  legendary: {
    border: 'border-amber-400/70',
    badge: 'bg-amber-400 text-amber-950',
    glow: 'shadow-[0_18px_38px_rgba(251,191,36,0.35)]'
  }
};

function createJokerCard(color: 'red' | 'black', id?: string): CardType {
  return {
    suit: 'Joker',
    rank: 'Joker',
    id: id ?? `joker-${color}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    isJoker: true,
    jokerColor: color
  };
}

function normalizeStoredCard(card: CardType): CardType {
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

function createDeck(): CardType[] {
  const deck: CardType[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        id: `${rank}${suit}`
      });
    }
  }
  deck.push(createJokerCard('red', 'joker-red'));
  deck.push(createJokerCard('black', 'joker-black'));
  return deck;
}

function shuffleDeck(deck: CardType[]): CardType[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'J') return 12;
  if (rank === 'Q') return 13;
  if (rank === 'K') return 14;
  return parseInt(rank);
}

const betOptions: BetOption[] = [
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

const betOptionMap = new Map(betOptions.map((bet) => [bet.id, bet]));

const upgradeTemplates: ShopUpgrade[] = [
  {
    id: 'flat-bonus-2',
    name: 'Scuffed Token',
    description: 'Every draw awards +2 bonus points.',
    rarity: 'common',
    cost: 60,
    effects: [{ type: 'flatBonus', value: 2 }]
  },
  {
    id: 'bet-bonus-red-small',
    name: 'Tinted Lens',
    description: 'Red Cards bet gains +0.2× multiplier.',
    rarity: 'common',
    cost: 65,
    effects: [{ type: 'betMultiplier', betId: 'color-red', value: 0.2 }]
  },
  {
    id: 'interest-boost-0',
    name: 'Savings Charm',
    description: 'Increase bank interest by +2%.',
    rarity: 'common',
    cost: 70,
    effects: [{ type: 'interestRate', value: 0.02 }]
  },
  {
    id: 'extra-draw-1',
    name: 'Lucky Glove',
    description: 'Gain +1 draw every round.',
    rarity: 'uncommon',
    cost: 120,
    effects: [{ type: 'extraDraws', value: 1 }]
  },
  {
    id: 'extra-draw-2',
    name: 'Chrono Deck',
    description: 'Gain +2 draws every round.',
    rarity: 'rare',
    cost: 240,
    effects: [{ type: 'extraDraws', value: 2 }]
  },
  {
    id: 'bet-bonus-black',
    name: 'Shadow Edge',
    description: 'Black Cards bet gains +0.6× multiplier.',
    rarity: 'rare',
    cost: 190,
    effects: [{ type: 'betMultiplier', betId: 'color-black', value: 0.6 }]
  },
  {
    id: 'bet-bonus-face',
    name: 'Court Favor',
    description: 'Face Card bet gains +0.8× multiplier.',
    rarity: 'rare',
    cost: 210,
    effects: [{ type: 'betMultiplier', betId: 'rank-face', value: 0.8 }]
  },
  {
    id: 'bet-bonus-joker',
    name: 'Wild Antenna',
    description: 'Joker bet gains +1.5× multiplier.',
    rarity: 'legendary',
    cost: 360,
    effects: [{ type: 'betMultiplier', betId: 'special-joker', value: 1.5 }]
  },
  {
    id: 'flat-bonus-8',
    name: 'Lucky Coin',
    description: 'Every draw awards +8 bonus points.',
    rarity: 'uncommon',
    cost: 140,
    effects: [{ type: 'flatBonus', value: 8 }]
  },
  {
    id: 'flat-bonus-15',
    name: 'Golden Effigy',
    description: 'Every draw awards +15 bonus points.',
    rarity: 'legendary',
    cost: 320,
    effects: [{ type: 'flatBonus', value: 15 }]
  },
  {
    id: 'bet-bonus-red',
    name: 'Ruby Lens',
    description: 'Red Cards bet gains +0.4× multiplier.',
    rarity: 'uncommon',
    cost: 150,
    effects: [{ type: 'betMultiplier', betId: 'color-red', value: 0.4 }]
  },
  {
    id: 'bet-bonus-high',
    name: 'High Stakes Loop',
    description: 'High Value bet gains +0.5× multiplier.',
    rarity: 'uncommon',
    cost: 170,
    effects: [{ type: 'betMultiplier', betId: 'value-high', value: 0.5 }]
  },
  {
    id: 'extra-draw-legendary',
    name: 'Temporal Crown',
    description: 'Gain +3 draws every round.',
    rarity: 'legendary',
    cost: 440,
    effects: [{ type: 'extraDraws', value: 3 }]
  },
  {
    id: 'flat-bonus-4',
    name: 'Warm-Up Routine',
    description: 'Every draw awards +4 bonus points.',
    rarity: 'common',
    cost: 80,
    effects: [{ type: 'flatBonus', value: 4 }]
  },
  {
    id: 'bet-bonus-number',
    name: 'Dealer’s Whisper',
    description: 'Number Card bet gains +0.35× multiplier.',
    rarity: 'common',
    cost: 110,
    effects: [{ type: 'betMultiplier', betId: 'rank-number', value: 0.35 }]
  },
  {
    id: 'interest-boost-1',
    name: 'Compound Prism',
    description: 'Increase bank interest by +3%.',
    rarity: 'uncommon',
    cost: 160,
    effects: [{ type: 'interestRate', value: 0.03 }]
  },
  {
    id: 'interest-boost-2',
    name: 'Vault Engine',
    description: 'Increase bank interest by +5%.',
    rarity: 'rare',
    cost: 240,
    effects: [{ type: 'interestRate', value: 0.05 }]
  },
  {
    id: 'interest-boost-legendary',
    name: 'Time Dividend',
    description: 'Increase bank interest by +8%.',
    rarity: 'legendary',
    cost: 360,
    effects: [{ type: 'interestRate', value: 0.08 }]
  }
];

const rarityWeights: Record<Rarity, number> = {
  common: 46,
  uncommon: 28,
  rare: 18,
  legendary: 8
};

function calculateRoundTarget(roundNumber: number, ownedUpgrades: OwnedUpgrade[]): number {
  const base = 38 + (roundNumber - 1) * 6;
  const bonus = ownedUpgrades.reduce((total, upgrade) => {
    if (upgrade.rarity === 'legendary') return total + 4;
    if (upgrade.rarity === 'rare') return total + 2;
    return total;
  }, 0);
  return Math.max(24, Math.floor(base + bonus));
}

function generateShopChoices(roundNumber: number): ShopUpgrade[] {
  const choices: ShopUpgrade[] = [];
  const availableTemplates = [...upgradeTemplates];

  const cheapPool = availableTemplates.filter((template) => template.cost <= 120);
  if (cheapPool.length > 0) {
    const cheapTemplate = cheapPool[Math.floor(Math.random() * cheapPool.length)];
    choices.push({
      ...cheapTemplate,
      id: `${cheapTemplate.id}-${roundNumber}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    });
    const removalIndex = availableTemplates.findIndex((template) => template.id === cheapTemplate.id);
    if (removalIndex !== -1) {
      availableTemplates.splice(removalIndex, 1);
    }
  }

  while (choices.length < 4 && availableTemplates.length > 0) {
    const weightTotal = availableTemplates.reduce(
      (total, template) => total + rarityWeights[template.rarity],
      0
    );
    let pick = Math.random() * weightTotal;

    let selectedIndex = 0;
    for (let i = 0; i < availableTemplates.length; i++) {
      pick -= rarityWeights[availableTemplates[i].rarity];
      if (pick <= 0) {
        selectedIndex = i;
        break;
      }
    }

    const template = availableTemplates.splice(selectedIndex, 1)[0];
    choices.push({
      ...template,
      id: `${template.id}-${roundNumber}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    });
  }

  return choices;
}

function getExtraDraws(upgrades: OwnedUpgrade[]): number {
  return upgrades.reduce((total, upgrade) => {
    const effectSum = upgrade.effects
      .filter((effect) => effect.type === 'extraDraws')
      .reduce((sum, effect) => sum + (effect.type === 'extraDraws' ? effect.value : 0), 0);
    return total + effectSum;
  }, 0);
}

function getFlatBonus(upgrades: OwnedUpgrade[]): number {
  return upgrades.reduce((total, upgrade) => {
    const effectSum = upgrade.effects
      .filter((effect) => effect.type === 'flatBonus')
      .reduce((sum, effect) => sum + (effect.type === 'flatBonus' ? effect.value : 0), 0);
    return total + effectSum;
  }, 0);
}

function getBetBonusMap(upgrades: OwnedUpgrade[]): Map<string, number> {
  const map = new Map<string, number>();
  upgrades.forEach((upgrade) => {
    upgrade.effects
      .filter((effect): effect is Extract<UpgradeEffect, { type: 'betMultiplier' }> => effect.type === 'betMultiplier')
      .forEach((effect) => {
        map.set(effect.betId, (map.get(effect.betId) ?? 0) + effect.value);
      });
  });
  return map;
}

function getInterestBonus(upgrades: OwnedUpgrade[]): number {
  return upgrades.reduce((total, upgrade) => {
    const bonus = upgrade.effects
      .filter((effect): effect is Extract<UpgradeEffect, { type: 'interestRate' }> => effect.type === 'interestRate')
      .reduce((sum, effect) => sum + effect.value, 0);
    return total + bonus;
  }, 0);
}

export default function Home() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [deck, setDeck] = useState<CardType[]>([]);
  const deckRef = useRef<CardType[]>([]);
  const [bank, setBank] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundScore, setRoundScore] = useState(0);
  const [roundTarget, setRoundTarget] = useState(calculateRoundTarget(1, []));
  const [drawsRemaining, setDrawsRemaining] = useState(BASE_DRAWS);
  const [roundOutcome, setRoundOutcome] = useState<RoundOutcome>('active');
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [drawAnimations, setDrawAnimations] = useState<DrawAnimation[]>([]);
  const [recentCards, setRecentCards] = useState<RecentCardEntry[]>([]);
  const [lastDrawScore, setLastDrawScore] = useState(0);
  const [ownedUpgrades, setOwnedUpgrades] = useState<OwnedUpgrade[]>([]);
  const [shopChoices, setShopChoices] = useState<ShopUpgrade[]>([]);
  const [shopMessage, setShopMessage] = useState<string | null>(null);
  const [shopTransitionMessage, setShopTransitionMessage] = useState<string | null>(null);
  const [betFeedback, setBetFeedback] = useState<string | null>(null);
  const [readyToPersist, setReadyToPersist] = useState(false);
  const hasLoadedRef = useRef(false);
  const shopTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [targetAchieved, setTargetAchieved] = useState(false);

  const selectedBet = useMemo(
    () => (selectedBetId ? betOptionMap.get(selectedBetId) ?? null : null),
    [selectedBetId]
  );

  const betBonusMap = useMemo(() => getBetBonusMap(ownedUpgrades), [ownedUpgrades]);
  const flatBonus = useMemo(() => getFlatBonus(ownedUpgrades), [ownedUpgrades]);
  const interestRate = useMemo(
    () => BASE_INTEREST + getInterestBonus(ownedUpgrades),
    [ownedUpgrades]
  );

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StoredGameState>;

        const storedDeck =
          parsed.deck && Array.isArray(parsed.deck) && parsed.deck.length > 0
            ? parsed.deck.map(normalizeStoredCard)
            : shuffleDeck(createDeck());
        deckRef.current = storedDeck;
        setDeck(storedDeck);

        setBank(typeof parsed.bank === 'number' ? parsed.bank : 0);

        const storedRoundNumber =
          typeof parsed.roundNumber === 'number' && parsed.roundNumber > 0
            ? parsed.roundNumber
            : 1;
        setRoundNumber(storedRoundNumber);

        setRoundScore(typeof parsed.roundScore === 'number' ? parsed.roundScore : 0);
        const baseDrawAllowance = BASE_DRAWS + getExtraDraws(
          parsed.ownedUpgrades && Array.isArray(parsed.ownedUpgrades) ? parsed.ownedUpgrades : []
        );
        setDrawsRemaining(
          typeof parsed.drawsRemaining === 'number' ? parsed.drawsRemaining : baseDrawAllowance
        );
        setRoundOutcome(parsed.roundOutcome ?? 'active');
        setGamePhase(parsed.gamePhase ?? 'menu');
        setSelectedBetId(parsed.selectedBetId ?? null);

        const storedOwnedUpgrades =
          parsed.ownedUpgrades && Array.isArray(parsed.ownedUpgrades)
            ? parsed.ownedUpgrades
            : [];
        setOwnedUpgrades(storedOwnedUpgrades);

        setRoundTarget(
          typeof parsed.roundTarget === 'number'
            ? parsed.roundTarget
            : calculateRoundTarget(storedRoundNumber, storedOwnedUpgrades)
        );

        if (parsed.recentCards && Array.isArray(parsed.recentCards)) {
          setRecentCards(parsed.recentCards);
        }

        setTargetAchieved(Boolean(parsed.targetAchieved));
      } else {
        const freshDeck = shuffleDeck(createDeck());
        deckRef.current = freshDeck;
        setDeck(freshDeck);
      }
    } catch (error) {
      console.warn('Failed to load stored game state, resetting progress.', error);
      const freshDeck = shuffleDeck(createDeck());
      deckRef.current = freshDeck;
      setDeck(freshDeck);
      setGamePhase('menu');
      setTargetAchieved(false);
    } finally {
      hasLoadedRef.current = true;
      setReadyToPersist(true);
    }
  }, []);

  useEffect(() => () => {
    if (shopTransitionTimeoutRef.current) {
      clearTimeout(shopTransitionTimeoutRef.current);
      shopTransitionTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (gamePhase === 'shopTransition') {
      if (shopTransitionTimeoutRef.current) {
        clearTimeout(shopTransitionTimeoutRef.current);
      }
      shopTransitionTimeoutRef.current = setTimeout(() => {
        setGamePhase('shop');
        shopTransitionTimeoutRef.current = null;
      }, 1100);
    }
  }, [gamePhase]);

  useEffect(() => {
    if (!readyToPersist || typeof window === 'undefined') return;

    const payload: StoredGameState = {
      deck,
      bank,
      roundNumber,
      roundScore,
      roundTarget,
      drawsRemaining,
      roundOutcome,
      gamePhase,
      selectedBetId,
      ownedUpgrades,
      recentCards,
      targetAchieved
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to persist game state to localStorage.', error);
    }
  }, [
    bank,
    deck,
    drawsRemaining,
    gamePhase,
    ownedUpgrades,
    readyToPersist,
    recentCards,
    roundNumber,
    roundOutcome,
    roundScore,
    roundTarget,
    selectedBetId,
    targetAchieved
  ]);

  const roundProgress = roundTarget > 0 ? Math.min(roundScore / roundTarget, 1) : 0;
  const drawButtonDisabled = roundOutcome === 'lost' || roundOutcome === 'won' || !selectedBet || drawsRemaining <= 0;
  const leftoverConversionValue = drawsRemaining * GUARANTEED_DRAW_VALUE;

  const gainRatio = roundTarget > 0 ? lastDrawScore / roundTarget : 0;
  let scoreCardClass =
    'rounded-xl px-6 py-5 bg-gray-900/50 border border-gray-800 shadow-[0_10px_30px_rgba(15,23,42,0.22)] transition-all duration-200';
  let totalScoreClass = 'text-slate-100';
  let gainScoreClass = lastDrawScore > 0 ? 'text-sky-400' : 'text-rose-400';
  let ratioTagClass = lastDrawScore > 0 ? 'text-sky-300/80' : 'text-rose-400/80';
  const ratioLabel =
    lastDrawScore > 0
      ? `${Math.min(Math.round(gainRatio * 100), 999)}% of round target`
      : 'Missed bet';

  if (lastDrawScore === 0) {
    scoreCardClass =
      'rounded-xl px-6 py-5 bg-gradient-to-br from-rose-500/15 via-gray-900/55 to-gray-950 border border-rose-400/40 shadow-[0_16px_40px_rgba(244,63,94,0.25)] transition-all duration-200';
    totalScoreClass = 'text-rose-100';
  } else if (gainRatio >= 0.5) {
    scoreCardClass =
      'rounded-xl px-6 py-5 bg-gradient-to-br from-amber-500/20 via-gray-900/55 to-gray-950 border border-amber-400/50 shadow-[0_18px_45px_rgba(251,191,36,0.25)] transition-all duration-200';
    totalScoreClass = 'text-amber-200';
    gainScoreClass = 'text-amber-300';
    ratioTagClass = 'text-amber-200/80';
  } else if (gainRatio >= 0.3) {
    scoreCardClass =
      'rounded-xl px-6 py-5 bg-gradient-to-br from-emerald-500/18 via-gray-900/55 to-gray-950 border border-emerald-400/40 shadow-[0_16px_40px_rgba(16,185,129,0.22)] transition-all duration-200';
    totalScoreClass = 'text-emerald-200';
    gainScoreClass = 'text-emerald-300';
    ratioTagClass = 'text-emerald-200/80';
  } else if (gainRatio > 0) {
    scoreCardClass =
      'rounded-xl px-6 py-5 bg-gradient-to-br from-sky-500/15 via-gray-900/55 to-gray-950 border border-sky-400/30 shadow-[0_14px_35px_rgba(56,189,248,0.2)] transition-all duration-200';
    totalScoreClass = 'text-sky-200';
    gainScoreClass = 'text-sky-300';
    ratioTagClass = 'text-sky-200/80';
  }

  const betsByCategory = useMemo(() => {
    return betOptions.reduce((acc, option) => {
      if (!acc[option.category]) {
        acc[option.category] = [];
      }
      acc[option.category].push(option);
      return acc;
    }, {} as Record<BetCategory, BetOption[]>);
  }, []);

  const displayedRecentCards = useMemo(() => {
    const active = recentCards.filter((entry) => entry.status !== 'exit');
    const exiting = recentCards.filter((entry) => entry.status === 'exit');
    return [...active, ...exiting];
  }, [recentCards]);

  const activeRecentCards = useMemo(
    () => recentCards.filter((entry) => entry.status !== 'exit'),
    [recentCards]
  );

  const ensureDeck = () => {
    if (!deckRef.current || deckRef.current.length === 0) {
      const reshuffled = shuffleDeck(createDeck());
      deckRef.current = reshuffled;
      setDeck(reshuffled);
    }
  };

  const startNewRun = () => {
    const freshDeck = shuffleDeck(createDeck());
    deckRef.current = freshDeck;
    setDeck(freshDeck);
    setBank(0);
    setRoundNumber(1);
    setRoundScore(0);
    setRoundTarget(calculateRoundTarget(1, []));
    setDrawsRemaining(BASE_DRAWS);
    setRoundOutcome('active');
    setSelectedBetId(null);
    setFloatingScores([]);
    setDrawAnimations([]);
    setRecentCards([]);
    setOwnedUpgrades([]);
    setShopChoices([]);
    setShopMessage(null);
    setShopTransitionMessage(null);
    setBetFeedback(null);
    setLastDrawScore(0);
    setTargetAchieved(false);
    setGamePhase('gameplay');
  };

  const handleDraw = () => {
    if (gamePhase !== 'gameplay') return;
    if (roundOutcome !== 'active') return;
    if (!selectedBet) {
      setBetFeedback('Select a bet before drawing.');
      return;
    }
    if (drawsRemaining <= 0) return;

    ensureDeck();

    const [drawnCard, ...remainingDeck] = deckRef.current;
    if (!drawnCard) return;
    deckRef.current = remainingDeck;
    setDeck(remainingDeck);

    const baseScore = drawnCard.rank === 'Joker' ? 22 : Math.max(getRankValue(drawnCard.rank), 2);
    const betBonus = betBonusMap.get(selectedBet.id) ?? 0;
    const multiplier = selectedBet.baseMultiplier + betBonus;
    const hit = selectedBet.check(drawnCard);

    const drawScore = Math.floor(
      (hit ? baseScore * multiplier : baseScore * 0.5) + flatBonus
    );

    const floatingScore: FloatingScore = {
      id: `score-${Date.now()}`,
      value: drawScore,
      hit
    };
    setFloatingScores((prev) => [...prev, floatingScore]);
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((entry) => entry.id !== floatingScore.id));
    }, 2000);

    setRoundScore((prev) => prev + drawScore);
    setDrawsRemaining((prev) => prev - 1);
    setLastDrawScore(drawScore);
    setBetFeedback(
      hit
        ? `${selectedBet.label} hit for ${drawScore} points!`
        : `${selectedBet.label} missed · ${drawScore} points.`
    );

    const newEntry: RecentCardEntry = {
      id: `${drawnCard.id}-${Date.now()}`,
      card: drawnCard,
      status: 'enter',
      betId: selectedBet.id,
      betLabel: selectedBet.label,
      betHit: hit,
      gain: drawScore
    };
    setRecentCards((prev) => {
      const normalized = prev.map((entry) =>
        entry.status === 'enter' ? { ...entry, status: 'idle' as RecentCardStatus } : entry
      );
      const active = normalized.filter((entry) => entry.status !== 'exit');
      const exiting = normalized.filter((entry) => entry.status === 'exit');

      const nextActive = [newEntry, ...active];

      const kept: RecentCardEntry[] = [];
      const overflow: RecentCardEntry[] = [];

      nextActive.forEach((entry, index) => {
        if (index < MAX_RECENT_CARDS) {
          kept.push(entry);
        } else {
          overflow.push({ ...entry, status: 'exit' });
        }
      });

      return [...kept, ...overflow, ...exiting];
    });

    const animationId = `draw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setDrawAnimations((prev) => [...prev, { id: animationId, card: drawnCard }]);

    const projectedScore = roundScore + drawScore;
    const projectedDraws = drawsRemaining - 1;
    const achievedThisDraw = !targetAchieved && projectedScore >= roundTarget;

    if (achievedThisDraw) {
      setTargetAchieved(true);
      setBetFeedback('Target reached! Keep drawing or cash out unused draws for guaranteed points.');
    }

    if (projectedDraws <= 0) {
      if (projectedScore >= roundTarget || targetAchieved || achievedThisDraw) {
        finalizeRound({ convertUnused: false, baseScoreOverride: projectedScore });
      } else {
        setRoundOutcome('lost');
        setTargetAchieved(false);
        setGamePhase('gameOver');
      }
      return;
    }
  };

  const finalizeRound = (options?: { convertUnused?: boolean; baseScoreOverride?: number }) => {
    if (roundOutcome === 'lost' || roundOutcome === 'won') return;
    if (!targetAchieved && !options?.convertUnused) return;

    const convertUnused = Boolean(options?.convertUnused);
    const baseScore = options?.baseScoreOverride ?? roundScore;
    const unusedDraws = convertUnused ? drawsRemaining : 0;
    const conversionPoints = convertUnused ? unusedDraws * GUARANTEED_DRAW_VALUE : 0;
    const finalScore = baseScore + conversionPoints;

    if (conversionPoints > 0) {
      setRoundScore((prev) => prev + conversionPoints);
    }

    const preInterestBank = bank + finalScore;
    const interestEarned = Math.floor(preInterestBank * interestRate);
    const bankAfterInterest = preInterestBank + interestEarned;

    const messageParts: string[] = [`Banked ${finalScore} points`];
    if (conversionPoints > 0) {
      messageParts.push(`(${conversionPoints} from leftover draws)`);
    }
    messageParts.push(`+${interestEarned} from ${(interestRate * 100).toFixed(0)}% interest.`);
    const finalMessage = messageParts.join(' ');

    setBank(bankAfterInterest);
    setDrawsRemaining(0);
    setRoundOutcome('won');
    setTargetAchieved(false);
    setFloatingScores([]);
    setDrawAnimations([]);
    setShopChoices(generateShopChoices(roundNumber));
    setShopMessage(finalMessage);
    setShopTransitionMessage(finalMessage);
    setGamePhase('shopTransition');
  };

  const triggerShopTransition = () => {
    finalizeRound({ convertUnused: false });
  };

  const cashOutUnusedDraws = () => {
    if (!targetAchieved || drawsRemaining <= 0) return;
    finalizeRound({ convertUnused: true });
  };

  const handleRecentCardExitComplete = (entryId: string) => {
    setRecentCards((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const handleDrawAnimationEnd = (animationId: string) => {
    setDrawAnimations((prev) => prev.filter((animation) => animation.id !== animationId));
  };

  const proceedToNextRound = () => {
    const nextRound = roundNumber + 1;
    const freshDeck = shuffleDeck(createDeck());
    deckRef.current = freshDeck;
    setDeck(freshDeck);
    setRoundNumber(nextRound);
    const target = calculateRoundTarget(nextRound, ownedUpgrades);
    setRoundTarget(target);
    const draws = BASE_DRAWS + getExtraDraws(ownedUpgrades);
    setDrawsRemaining(draws);
    setRoundScore(0);
    setRoundOutcome('active');
    setSelectedBetId(null);
    setFloatingScores([]);
    setDrawAnimations([]);
    setRecentCards([]);
    setBetFeedback(null);
    setLastDrawScore(0);
    setShopChoices([]);
    setShopMessage(null);
    setShopTransitionMessage(null);
    setTargetAchieved(false);
    setGamePhase('gameplay');
  };

  const buyUpgrade = (upgrade: ShopUpgrade) => {
    if (bank < upgrade.cost) {
      setShopMessage('Not enough points in the bank for that upgrade.');
      return;
    }
    setBank((prev) => prev - upgrade.cost);
    setOwnedUpgrades((prev) => [
      ...prev,
      {
        ...upgrade,
        purchasedAtRound: roundNumber
      }
    ]);
    setShopChoices((prev) => prev.filter((item) => item.id !== upgrade.id));
    setShopMessage(`Bought ${upgrade.name}.`);
  };

  const resetToMenu = () => {
    setGamePhase('menu');
  };

  const renderMenu = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black text-white flex flex-col items-center justify-center gap-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-blue-400 tracking-tight">Card Risk: Ascension</h1>
        <p className="text-gray-400 max-w-xl mx-auto text-lg">
          Predict the next card, push your luck, and buy transdimensional relics to tilt the odds.
          Reach each round&apos;s target within your draw limit or the run collapses.
        </p>
      </div>
      <button
        onClick={startNewRun}
        className="px-10 py-4 text-lg font-semibold rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border border-blue-500/60 shadow-[0_20px_40px_rgba(37,99,235,0.28)] transition-all"
      >
        Begin the Run
      </button>
      {ownedUpgrades.length > 0 && (
        <div className="text-sm text-gray-500">
          Previous run upgrades remain stored in local memory.
        </div>
      )}
    </div>
  );

  const renderGameOver = () => (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-12">
      <div className="max-w-3xl w-full bg-gray-950/80 border border-gray-900 rounded-3xl p-12 shadow-[0_24px_60px_rgba(15,15,35,0.6)] text-center space-y-10">
        <div>
          <h2 className="text-4xl font-bold text-rose-400 mb-4">Run Lost</h2>
          <p className="text-gray-400 text-lg">
            You exhausted your draws before reaching the target. The current reality collapses, but
            your resolve doesn&apos;t have to.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-6 text-left">
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Bank</div>
            <div className="text-3xl font-semibold text-sky-300">{bank}</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Round Reached</div>
            <div className="text-3xl font-semibold text-emerald-300">{roundNumber}</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Relics Owned</div>
            <div className="text-3xl font-semibold text-amber-300">{ownedUpgrades.length}</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Interest Rate</div>
            <div className="text-3xl font-semibold text-emerald-300">
              {(interestRate * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <button
            onClick={startNewRun}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border border-blue-500/60 font-semibold text-lg transition-all"
          >
            Launch New Run
          </button>
          <button
            onClick={resetToMenu}
            className="w-full py-3 rounded-2xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 text-gray-300 transition-all"
          >
            Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );

  const renderShopTransitionOverlay = () => (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_60%),_#05060b] text-white flex items-center justify-center">
      <div className="max-w-xl mx-auto bg-gray-950/80 border border-gray-900 rounded-3xl px-12 py-10 text-center space-y-6 transition-enter-shop">
        <div className="text-sm uppercase tracking-[0.4em] text-gray-500">Round Cleared</div>
        <div className="text-3xl font-bold text-emerald-300">Banking Rewards...</div>
        <p className="text-gray-300 text-lg leading-relaxed">
          {shopTransitionMessage ?? 'Translating probability mass into spendable points...'}
        </p>
        <div className="text-sm text-gray-500">Preparing Interdimensional Curio Shop</div>
      </div>
    </div>
  );

  const renderShop = () => (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.1),_transparent_55%),_#05060b] text-white flex">
      <div className="w-[30%] border-r border-gray-900 p-10 space-y-8 bg-gray-950/70">
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Round Cleared</div>
          <div className="text-4xl font-bold text-emerald-300">Round {roundNumber}</div>
          <p className="text-sm text-gray-500 mt-3">
            You stocked {roundScore} points in the bank. Spend wisely before the next ascent.
          </p>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
          <div className="text-xs uppercase tracking-wider text-gray-500">Bank</div>
          <div className="text-3xl font-semibold text-sky-300">{bank}</div>
          <div className="text-sm font-semibold text-emerald-300">
            {(interestRate * 100).toFixed(0)}% interest next round
          </div>
          <div className="text-xs text-gray-500">Points carry over to future shops.</div>
        </div>
        <button
          onClick={proceedToNextRound}
          className="w-full py-4 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 font-semibold transition-all"
        >
          Continue to Round {roundNumber + 1}
        </button>
        <button
          onClick={resetToMenu}
          className="w-full py-3 rounded-2xl border border-gray-800 bg-gray-900/70 hover:bg-gray-900 text-gray-400 transition-all"
        >
          Return to Main Menu
        </button>
        {shopMessage && <div className="text-sm text-gray-400">{shopMessage}</div>}
      </div>
      <div className="flex-1 p-12 overflow-y-auto">
        <h2 className="text-3xl font-bold text-blue-400 mb-6">Interdimensional Curio Shop</h2>
        <p className="text-gray-400 mb-10 max-w-3xl">
          Every relic shifts probability in your favor—some subtly, others violently. Purchase any
          number of upgrades, then continue the run when ready.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {shopChoices.map((choice) => {
            const styles = rarityStyles[choice.rarity];
            return (
              <div
                key={choice.id}
                className={`relative rounded-2xl bg-gray-900/60 border ${styles.border} p-6 flex flex-col gap-4 ${styles.glow}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-gray-100">{choice.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{choice.description}</div>
                  </div>
                  <div className={`text-[11px] font-bold px-2 py-1 rounded-full ${styles.badge}`}>
                    {choice.rarity.toUpperCase()}
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  {choice.effects.map((effect, index) => {
                    if (effect.type === 'extraDraws') {
                      return <li key={index}>+{effect.value} draw(s) per round</li>;
                    }
                    if (effect.type === 'flatBonus') {
                      return <li key={index}>+{effect.value} flat points every draw</li>;
                    }
                    if (effect.type === 'interestRate') {
                      return <li key={index}>+{(effect.value * 100).toFixed(0)}% interest on bank</li>;
                    }
                    const betLabel = betOptionMap.get(effect.betId)?.label ?? effect.betId;
                    return (
                      <li key={index}>
                        +{effect.value.toFixed(2)}× multiplier to {betLabel}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-800">
                  <div className="text-sm text-gray-400">Cost</div>
                  <div className="text-lg font-semibold text-sky-300">{choice.cost}</div>
                </div>
                <button
                  onClick={() => buyUpgrade(choice)}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500/60 font-semibold"
                >
                  Acquire Relic
                </button>
              </div>
            );
          })}
          {shopChoices.length === 0 && (
            <div className="col-span-3 text-gray-500 text-sm">
              You purchased every relic offered. Continue to the next round when ready.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderGameplay = () => (
    <div className="min-h-screen bg-black text-white flex">
      <div className="w-[35%] bg-gray-950 border-r border-gray-900 flex flex-col">
        <div className="p-8 border-b border-gray-900 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Card Risk</h1>
            <div className="text-xs uppercase tracking-widest text-gray-500 mt-2">
              Round {roundNumber} • Target {roundTarget}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Draws Left</div>
            <div className="text-lg font-semibold text-sky-300">
              {drawsRemaining}/{BASE_DRAWS + getExtraDraws(ownedUpgrades)}
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 space-y-6 overflow-y-auto">
          <div className="relative">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Draw Pile</div>
              <div className="text-sm text-gray-400">{deck.length} cards left</div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-4">
              <div className="relative h-56 bg-gray-900/50 rounded-xl border border-gray-800 flex flex-1 items-center justify-start px-8 overflow-hidden">
                <div className="relative w-32 h-44">
                  {[...Array(Math.min(8, Math.max(1, Math.ceil(deck.length / 10))))].map((_, i) => (
                    <div
                      key={i}
                      className="deck-card-layer absolute inset-0 rounded-lg"
                      style={{
                        transform: `translate(${i * 1.5}px, ${i * -1.5}px)`,
                        zIndex: 10 - i,
                        opacity: 1 - i * 0.08
                      }}
                    />
                  ))}
                </div>

                {drawAnimations.map((animation) => (
                  <div
                    key={animation.id}
                    className="absolute left-8 pointer-events-none"
                    style={{ top: 'calc(50% - 88px)', zIndex: 30 }}
                  >
                    <div
                      className="animate-draw-card"
                      onAnimationEnd={() => handleDrawAnimationEnd(animation.id)}
                    >
                      <Card
                        suit={animation.card.suit}
                        rank={animation.card.rank}
                        isJoker={animation.card.isJoker}
                        jokerColor={animation.card.jokerColor}
                      />
                    </div>
                  </div>
                ))}

                {floatingScores.map((fs) => (
                  <div
                    key={fs.id}
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-4xl font-bold ${
                      fs.hit ? 'text-emerald-400' : 'text-rose-500'
                    }`}
                    style={{ animation: 'floatUp 2s ease-out forwards' }}
                  >
                    {fs.hit ? '+' : ''}{fs.value}
                  </div>
                ))}
              </div>

              <div className={`w-full md:w-[230px] lg:w-[240px] flex flex-col gap-4 ${scoreCardClass}`}>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                    Round Score
                  </div>
                  <div className={`text-5xl font-bold leading-tight ${totalScoreClass}`}>
                    {roundScore}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Target</span>
                    <span className="text-sm font-semibold text-gray-200">{roundTarget}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Bank</span>
                    <span className="text-sm font-semibold text-sky-300">{bank}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Interest Rate</span>
                    <span className="text-sm font-semibold text-emerald-300">
                      {(interestRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Last Draw</span>
                    <span className={`text-lg font-semibold ${gainScoreClass}`}>
                      {lastDrawScore > 0 ? `+${lastDrawScore}` : lastDrawScore}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        roundOutcome === 'lost'
                          ? 'bg-rose-500'
                          : roundProgress >= 1
                            ? 'bg-amber-400'
                            : 'bg-sky-500'
                      }`}
                      style={{ width: `${Math.min(roundProgress * 100, 100)}%` }}
                    />
                  </div>
                  <div className={`text-xs uppercase tracking-wide ${ratioTagClass}`}>
                    {ratioLabel}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleDraw}
              className={`w-full text-white font-medium py-4 rounded-lg transition-all ${
                drawButtonDisabled
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-800'
                  : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border border-blue-500/60 shadow-[0_12px_22px_rgba(37,99,235,0.25)]'
              }`}
            >
              {selectedBet ? `Draw with ${selectedBet.label}` : 'Select a bet to draw'}
            </button>
            {betFeedback && (
              <div className="mt-2 text-sm text-gray-300">{betFeedback}</div>
            )}
            {targetAchieved && drawsRemaining > 0 && (
              <div className="mt-2 text-sm text-emerald-300">
                Target secured. {drawsRemaining} unused draw{drawsRemaining === 1 ? '' : 's'} worth
                guaranteed {leftoverConversionValue} pts.
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">
              Recent Cards
            </div>
            {displayedRecentCards.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {displayedRecentCards.map((entry) => {
                  const activeIndex = activeRecentCards.findIndex((item) => item.id === entry.id);
                  const activeCount = activeRecentCards.length;
                  const opacity =
                    activeIndex === -1
                      ? 0.4
                      : activeCount === 1
                        ? 1
                        : 0.4 + ((activeCount - activeIndex - 1) / (activeCount - 1)) * 0.6;

                  return (
                    <RecentCardItem
                      key={entry.id}
                      card={entry.card}
                      status={entry.status}
                      opacity={opacity}
                      betHit={entry.betHit}
                      gain={entry.gain}
                      betLabel={entry.betLabel}
                      onExitComplete={
                        entry.status === 'exit'
                          ? () => handleRecentCardExitComplete(entry.id)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-600">Draw cards to populate the recent queue.</div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={cashOutUnusedDraws}
              disabled={!targetAchieved || drawsRemaining <= 0 || roundOutcome === 'won'}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                targetAchieved && drawsRemaining > 0 && roundOutcome !== 'won'
                  ? 'bg-amber-500/20 border border-amber-400/50 text-amber-200 hover:bg-amber-500/30'
                  : 'bg-gray-900 border border-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Convert Leftover Draws ({leftoverConversionValue} pts)
            </button>
            <button
              onClick={triggerShopTransition}
              disabled={!targetAchieved || roundOutcome === 'lost'}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                targetAchieved && roundOutcome !== 'lost'
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30'
                  : 'bg-gray-900 border border-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Finish Round & Visit Shop
            </button>
            <div className="flex gap-3">
              <button
                onClick={startNewRun}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-medium py-3 rounded-lg transition-colors border border-gray-800"
              >
                Reset Run
              </button>
              <button
                onClick={resetToMenu}
                className="flex-1 bg-red-900/30 hover:bg-red-900/40 text-red-400 hover:text-red-200 font-semibold py-3 rounded-lg transition-colors border border-red-700/60"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-[65%] p-12 overflow-y-auto">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-blue-400">Select Your Bet</h2>
            <p className="text-sm text-gray-400 mt-2">
              Pick exactly one bet before each draw. Upgrades you own modify multipliers and draw
              limits.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-gray-500">Relics Owned</div>
            <div className="text-3xl font-bold text-emerald-300">{ownedUpgrades.length}</div>
          </div>
        </div>

        {ownedUpgrades.length > 0 && (
          <div className="mb-8 bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">
              Active Relic Effects
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-300">
              {ownedUpgrades.map((upgrade) => (
                <span
                  key={upgrade.id}
                  className={`px-3 py-1 rounded-full border ${rarityStyles[upgrade.rarity].border}`}
                >
                  {upgrade.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
          {Object.entries(betsByCategory).map(([category, options]) => (
            <div key={category} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
              <div className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                {category} Bets
              </div>
              <div className="space-y-3">
                {options.map((option) => {
                  const isSelected = selectedBetId === option.id;
                  const bonus = betBonusMap.get(option.id) ?? 0;
                  const totalMultiplier = option.baseMultiplier + bonus;
                  const riskTone =
                    option.risk === 'extreme'
                      ? 'text-rose-300 bg-rose-500/10 border-rose-500/40'
                      : option.risk === 'high'
                        ? 'text-amber-300 bg-amber-500/10 border-amber-500/40'
                        : option.risk === 'medium'
                          ? 'text-sky-300 bg-sky-500/10 border-sky-500/40'
                          : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40';

                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedBetId(option.id);
                        setBetFeedback(null);
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_15px_30px_rgba(16,185,129,0.25)]'
                          : 'border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-100">
                          {option.label}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${riskTone}`}
                        >
                          {totalMultiplier.toFixed(2)}× · {option.risk.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">{option.description}</div>
                      {bonus > 0 && (
                        <div className="mt-2 text-[11px] uppercase tracking-wide text-emerald-300">
                          +{bonus.toFixed(2)}× relic bonus
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -150%) scale(0.7);
            opacity: 0;
          }
        }

        @keyframes recentCardEnter {
          0% {
            opacity: 0;
            transform: translateX(-24px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes recentCardExit {
          0% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(32px) scale(0.9);
          }
        }

        @keyframes drawCardSlide {
          0% {
            opacity: 0;
            transform: translate3d(0, -12px, 0) rotate(-6deg);
          }
          12% {
            opacity: 1;
            transform: translate3d(0, -24px, 0) rotate(-4deg);
          }
          38% {
            opacity: 1;
            transform: translate3d(24px, -100px, 0) rotate(-1deg);
          }
          72% {
            opacity: 1;
            transform: translate3d(168px, -24px, 0) rotate(6deg);
          }
          100% {
            opacity: 0;
            transform: translate3d(260px, 32px, 0) rotate(10deg);
          }
        }

        :global(.recent-card-item) {
          transition: transform 0.25s ease, opacity 0.3s ease;
          will-change: transform, opacity;
        }

        :global(.recent-card-item[data-status='enter']) {
          animation: recentCardEnter 0.35s ease-out;
        }

        :global(.recent-card-item[data-status='exit']) {
          animation: recentCardExit 0.3s ease-in forwards;
          pointer-events: none;
        }

        :global(.animate-draw-card) {
          animation: drawCardSlide 0.7s ease-in-out forwards;
          will-change: transform, opacity;
        }

        :global(.deck-card-layer) {
          position: absolute;
          background-color: rgba(30, 64, 175, 0.9);
          background-image:
            linear-gradient(135deg, rgba(37, 99, 235, 0.88), rgba(14, 116, 144, 0.92)),
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08) 6px, rgba(15, 23, 42, 0.1) 6px, rgba(15, 23, 42, 0.1) 12px);
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.2),
            0 6px 14px rgba(15, 23, 42, 0.4);
          border-radius: 0.75rem;
          overflow: hidden;
        }

        :global(.deck-card-layer::after) {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.25), transparent 55%),
            radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.18), transparent 60%);
          pointer-events: none;
        }

        @keyframes shopTransitionFade {
          0% {
            opacity: 0;
            transform: translateY(32px) scale(0.94);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        :global(.transition-enter-shop) {
          animation: shopTransitionFade 0.9s ease-out forwards;
          box-shadow: 0 28px 60px rgba(37, 99, 235, 0.25);
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );

  if (gamePhase === 'menu') {
    return renderMenu();
  }

  if (gamePhase === 'shopTransition') {
    return renderShopTransitionOverlay();
  }

  if (gamePhase === 'shop') {
    return renderShop();
  }

  if (gamePhase === 'gameOver') {
    return renderGameOver();
  }

  return renderGameplay();
}
