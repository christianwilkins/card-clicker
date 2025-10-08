'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Card, { type CardType, type Rank, type Suit } from '@/components/Card';
import RecentCardItem, { type RecentCardStatus } from '@/components/RecentCardItem';
import { formatDisplayNumber, formatSignedDisplayNumber } from '@/lib/formatNumber';

type GamePhase = 'menu' | 'gameplay' | 'shopTransition' | 'shop' | 'gameOver';
type RoundOutcome = 'active' | 'won' | 'lost';
type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
type BetCategory = 'Color' | 'Suit' | 'Rank Type' | 'Value' | 'Special';
type ThemeMode = 'light' | 'dark';

interface GameAppProps {
  initialPhase?: GamePhase;
}

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
  icon: string;
  effects: UpgradeEffect[];
}

interface OwnedUpgrade extends ShopUpgrade {
  purchasedAtRound: number;
}

interface AudioVoice {
  osc: OscillatorNode;
  pitchLfo: OscillatorNode;
  ampLfo: OscillatorNode;
  gain: GainNode;
  pitchDepth: GainNode;
  ampDepth: GainNode;
}

const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const STORAGE_KEY = 'card-clicker-rogue-v1';
const THEME_STORAGE_KEY = 'card-clicker-theme';
const BASE_DRAWS = 5;
const BASE_INTEREST = 0.05;
const GUARANTEED_DRAW_VALUE = 12;
const MAX_RECENT_CARDS = 6;

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
    icon: '🪙',
    effects: [{ type: 'flatBonus', value: 2 }]
  },
  {
    id: 'bet-bonus-red-small',
    name: 'Tinted Lens',
    description: 'Red Cards bet gains +0.2× multiplier.',
    rarity: 'common',
    cost: 65,
    icon: '🔍',
    effects: [{ type: 'betMultiplier', betId: 'color-red', value: 0.2 }]
  },
  {
    id: 'interest-boost-0',
    name: 'Savings Charm',
    description: 'Increase bank interest by +2%.',
    rarity: 'common',
    cost: 70,
    icon: '🧿',
    effects: [{ type: 'interestRate', value: 0.02 }]
  },
  {
    id: 'extra-draw-1',
    name: 'Lucky Glove',
    description: 'Gain +1 draw every round.',
    rarity: 'uncommon',
    cost: 120,
    icon: '🧤',
    effects: [{ type: 'extraDraws', value: 1 }]
  },
  {
    id: 'extra-draw-2',
    name: 'Chrono Deck',
    description: 'Gain +2 draws every round.',
    rarity: 'rare',
    cost: 240,
    icon: '⏳',
    effects: [{ type: 'extraDraws', value: 2 }]
  },
  {
    id: 'bet-bonus-black',
    name: 'Shadow Edge',
    description: 'Black Cards bet gains +0.6× multiplier.',
    rarity: 'rare',
    cost: 190,
    icon: '🗡️',
    effects: [{ type: 'betMultiplier', betId: 'color-black', value: 0.6 }]
  },
  {
    id: 'bet-bonus-face',
    name: 'Court Favor',
    description: 'Face Card bet gains +0.8× multiplier.',
    rarity: 'rare',
    cost: 210,
    icon: '👑',
    effects: [{ type: 'betMultiplier', betId: 'rank-face', value: 0.8 }]
  },
  {
    id: 'bet-bonus-joker',
    name: 'Wild Antenna',
    description: 'Joker bet gains +1.5× multiplier.',
    rarity: 'legendary',
    cost: 360,
    icon: '🃏',
    effects: [{ type: 'betMultiplier', betId: 'special-joker', value: 1.5 }]
  },
  {
    id: 'flat-bonus-8',
    name: 'Lucky Coin',
    description: 'Every draw awards +8 bonus points.',
    rarity: 'uncommon',
    cost: 140,
    icon: '💠',
    effects: [{ type: 'flatBonus', value: 8 }]
  },
  {
    id: 'flat-bonus-15',
    name: 'Golden Effigy',
    description: 'Every draw awards +15 bonus points.',
    rarity: 'legendary',
    cost: 320,
    icon: '🏆',
    effects: [{ type: 'flatBonus', value: 15 }]
  },
  {
    id: 'bet-bonus-red',
    name: 'Ruby Lens',
    description: 'Red Cards bet gains +0.4× multiplier.',
    rarity: 'uncommon',
    cost: 150,
    icon: '💎',
    effects: [{ type: 'betMultiplier', betId: 'color-red', value: 0.4 }]
  },
  {
    id: 'bet-bonus-high',
    name: 'High Stakes Loop',
    description: 'High Value bet gains +0.5× multiplier.',
    rarity: 'uncommon',
    cost: 170,
    icon: '🎯',
    effects: [{ type: 'betMultiplier', betId: 'value-high', value: 0.5 }]
  },
  {
    id: 'extra-draw-legendary',
    name: 'Temporal Crown',
    description: 'Gain +3 draws every round.',
    rarity: 'legendary',
    cost: 440,
    icon: '🕰️',
    effects: [{ type: 'extraDraws', value: 3 }]
  },
  {
    id: 'flat-bonus-4',
    name: 'Warm-Up Routine',
    description: 'Every draw awards +4 bonus points.',
    rarity: 'common',
    cost: 80,
    icon: '🔥',
    effects: [{ type: 'flatBonus', value: 4 }]
  },
  {
    id: 'bet-bonus-number',
    name: 'Dealer’s Whisper',
    description: 'Number Card bet gains +0.35× multiplier.',
    rarity: 'common',
    cost: 110,
    icon: '🎴',
    effects: [{ type: 'betMultiplier', betId: 'rank-number', value: 0.35 }]
  },
  {
    id: 'interest-boost-1',
    name: 'Compound Prism',
    description: 'Increase bank interest by +3%.',
    rarity: 'uncommon',
    cost: 160,
    icon: '🔮',
    effects: [{ type: 'interestRate', value: 0.03 }]
  },
  {
    id: 'interest-boost-2',
    name: 'Vault Engine',
    description: 'Increase bank interest by +5%.',
    rarity: 'rare',
    cost: 240,
    icon: '🏦',
    effects: [{ type: 'interestRate', value: 0.05 }]
  },
  {
    id: 'interest-boost-legendary',
    name: 'Time Dividend',
    description: 'Increase bank interest by +8%.',
    rarity: 'legendary',
    cost: 360,
    icon: '⏱️',
    effects: [{ type: 'interestRate', value: 0.08 }]
  }
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const templateByName = new Map<string, ShopUpgrade>(upgradeTemplates.map((template) => [template.name, template]));

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

export default function GameApp({ initialPhase = 'menu' }: GameAppProps) {
  const [gamePhase, setGamePhaseState] = useState<GamePhase>(initialPhase);
  const setGamePhase = (phase: GamePhase) => {
    setGamePhaseState(phase);
    setIsSettingsOpen(false);
  };
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
  const [lastDrawnCard, setLastDrawnCard] = useState<CardType | null>(null);
  const [ownedUpgrades, setOwnedUpgrades] = useState<OwnedUpgrade[]>([]);
  const [shopChoices, setShopChoices] = useState<ShopUpgrade[]>([]);
  const [shopMessage, setShopMessage] = useState<string | null>(null);
  const [shopTransitionMessage, setShopTransitionMessage] = useState<string | null>(null);
  const [betFeedback, setBetFeedback] = useState<string | null>(null);
  const [readyToPersist, setReadyToPersist] = useState(false);
  const hasLoadedRef = useRef(false);
  const shopTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundFinalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [targetAchieved, setTargetAchieved] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioVoicesRef = useRef<AudioVoice[]>([]);
  const musicGainRef = useRef<GainNode | null>(null);
  const themeReadyRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const [routingReady, setRoutingReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const palette = useMemo(() => {
    if (theme === 'dark') {
      return {
        shell: 'bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-100',
        menuShell:
          'bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-100',
        panelLeft:
          'bg-slate-950/80 border border-slate-800 shadow-[0_25px_60px_rgba(2,6,23,0.65)] backdrop-blur-xl',
        panelRight:
          'bg-slate-950/70 border border-slate-800 shadow-[0_20px_55px_rgba(2,6,23,0.55)] backdrop-blur-xl',
        surfaceCard:
          'bg-slate-950/70 border border-slate-800 shadow-[0_20px_55px_rgba(2,6,23,0.5)] backdrop-blur-xl',
        surfaceMuted:
          'bg-slate-950/85 border border-slate-800 shadow-[0_30px_70px_rgba(2,6,23,0.65)] backdrop-blur-xl',
        borderSubtle: 'border-slate-800/70',
        text: {
          primary: 'text-slate-100',
          secondary: 'text-slate-300',
          accent: 'text-sky-300',
          accentSoft: 'text-sky-300/70',
          positive: 'text-emerald-300',
          positiveSoft: 'text-emerald-300/70',
          warning: 'text-amber-300',
          warningSoft: 'text-amber-300/70',
          danger: 'text-rose-300',
          dangerSoft: 'text-rose-300/70'
        },
        button: {
          accent:
            'bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-400 shadow-[0_20px_45px_rgba(56,189,248,0.35)]',
          accentSecondary:
            'bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/40 shadow-[0_12px_25px_rgba(56,189,248,0.2)]',
          positive:
            'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400 shadow-[0_20px_45px_rgba(16,185,129,0.35)]',
          warning:
            'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 shadow-[0_20px_45px_rgba(251,191,36,0.35)]',
          danger:
            'bg-rose-500 hover:bg-rose-400 text-slate-50 border border-rose-400 shadow-[0_20px_45px_rgba(244,63,94,0.35)]',
          muted:
            'bg-slate-900/50 hover:bg-slate-900/70 text-slate-200 border border-slate-700 shadow-[0_12px_30px_rgba(2,6,23,0.55)]'
        },
        score: {
          neutral:
            'bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 border border-slate-800 shadow-[0_25px_60px_rgba(2,6,23,0.65)]',
          accent:
            'bg-gradient-to-br from-sky-500/25 via-slate-900/80 to-slate-950 border border-sky-400/60 shadow-[0_30px_65px_rgba(37,99,235,0.45)]',
          positive:
            'bg-gradient-to-br from-emerald-500/25 via-slate-900/80 to-slate-950 border border-emerald-400/60 shadow-[0_30px_65px_rgba(16,185,129,0.45)]',
          warning:
            'bg-gradient-to-br from-amber-400/25 via-slate-900/80 to-slate-950 border border-amber-300/60 shadow-[0_30px_65px_rgba(251,191,36,0.45)]',
          danger:
            'bg-gradient-to-br from-rose-500/25 via-slate-900/80 to-slate-950 border border-rose-400/60 shadow-[0_30px_65px_rgba(244,63,94,0.45)]',
          legendary:
            'bg-gradient-to-br from-amber-300/35 via-slate-900/70 to-sky-500/30 border border-amber-300/60 shadow-[0_35px_70px_rgba(251,191,36,0.45)]'
        },
        bet: {
          card:
            'bg-slate-950/70 border border-slate-800 hover:border-sky-400/50 hover:bg-slate-900/80 transition-all duration-200 shadow-[0_12px_30px_rgba(2,6,23,0.45)]',
          active:
            'bg-gradient-to-br from-emerald-500/20 via-slate-950/80 to-slate-950 border border-emerald-400/60 shadow-[0_20px_45px_rgba(16,185,129,0.4)]'
        },
        tags: {
          extreme:
            'border border-rose-400/40 bg-rose-500/15 text-rose-300 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
          high:
            'border border-amber-300/40 bg-amber-400/15 text-amber-300 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
          medium:
            'border border-sky-400/40 bg-sky-500/15 text-sky-300 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
          low:
            'border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full'
        },
        deckLayer:
          'absolute inset-0 rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 shadow-[0_10px_30px_rgba(8,12,24,0.55)]',
        themeBadge:
          'inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-1 text-xs font-semibold tracking-[0.4em] text-sky-200',
        bulletIcon: 'border border-sky-400/40 bg-sky-500/15 text-sky-200'
      };
    }

    return {
      shell: 'bg-slate-100 text-slate-900',
      menuShell: 'bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-900',
      panelLeft:
        'bg-white/90 border border-slate-200 shadow-[0_25px_55px_rgba(148,163,184,0.38)] backdrop-blur-xl',
      panelRight:
        'bg-white/85 border border-slate-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)] backdrop-blur-xl',
      surfaceCard:
        'bg-white/90 border border-slate-200 shadow-[0_20px_50px_rgba(148,163,184,0.28)] backdrop-blur-xl',
      surfaceMuted:
        'bg-slate-50/95 border border-slate-200 shadow-[0_25px_60px_rgba(148,163,184,0.32)] backdrop-blur-xl',
      borderSubtle: 'border-slate-200',
      text: {
        primary: 'text-slate-900',
        secondary: 'text-slate-600',
        accent: 'text-sky-600',
        accentSoft: 'text-sky-500',
        positive: 'text-emerald-600',
        positiveSoft: 'text-emerald-500',
        warning: 'text-amber-600',
        warningSoft: 'text-amber-500',
        danger: 'text-rose-600',
        dangerSoft: 'text-rose-500'
      },
      button: {
        accent:
          'bg-sky-500 hover:bg-sky-600 text-white border border-sky-500 shadow-[0_20px_45px_rgba(56,189,248,0.3)]',
        accentSecondary:
          'bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 shadow-[0_10px_25px_rgba(59,130,246,0.18)]',
        positive:
          'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-500 shadow-[0_20px_45px_rgba(16,185,129,0.28)]',
        warning:
          'bg-amber-400 hover:bg-amber-500 text-slate-900 border border-amber-400 shadow-[0_20px_45px_rgba(251,191,36,0.28)]',
        danger:
          'bg-rose-500 hover:bg-rose-600 text-white border border-rose-500 shadow-[0_20px_45px_rgba(244,63,94,0.28)]',
        muted:
          'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-[0_10px_25px_rgba(148,163,184,0.2)]'
      },
      score: {
        neutral:
          'bg-gradient-to-br from-white via-slate-50 to-white border border-slate-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]',
        accent:
          'bg-gradient-to-br from-sky-100 via-white to-slate-50 border border-sky-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]',
        positive:
          'bg-gradient-to-br from-emerald-100 via-white to-slate-50 border border-emerald-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]',
        warning:
          'bg-gradient-to-br from-amber-100 via-white to-slate-50 border border-amber-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]',
        danger:
          'bg-gradient-to-br from-rose-100 via-white to-slate-50 border border-rose-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]',
        legendary:
          'bg-gradient-to-br from-amber-100 via-sky-100/80 to-white border border-amber-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]'
      },
      bet: {
        card:
          'bg-white/80 border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all duration-200 shadow-[0_10px_25px_rgba(148,163,184,0.2)]',
        active:
          'bg-gradient-to-br from-emerald-100 via-white to-emerald-50 border border-emerald-300 shadow-[0_20px_45px_rgba(16,185,129,0.28)]'
      },
      tags: {
        extreme:
          'border border-rose-200 bg-rose-100/60 text-rose-600 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
        high:
          'border border-amber-200 bg-amber-100/60 text-amber-600 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
        medium:
          'border border-sky-200 bg-sky-100/60 text-sky-600 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
        low:
          'border border-emerald-200 bg-emerald-100/60 text-emerald-600 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full'
      },
      deckLayer:
        'absolute inset-0 rounded-xl bg-gradient-to-br from-sky-500 to-sky-400 shadow-[0_8px_25px_rgba(148,163,184,0.35)]',
      themeBadge:
        'inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold tracking-[0.4em] text-sky-600',
      bulletIcon: 'border border-sky-200 bg-sky-100 text-sky-600'
    };
  }, [theme]);

  const buttonBase =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed';
  const textPalette = palette.text;
  const buttonPalette = palette.button;
  const scorePalette = palette.score;
  const betPalette = palette.bet;
  const tagPalette = palette.tags;
  const disabledButtonClasses =
    theme === 'dark'
      ? 'bg-slate-900/40 text-slate-500 border border-slate-800 shadow-none'
      : 'bg-slate-200 text-slate-400 border border-slate-200 shadow-none';
  const rarityStyles = useMemo(() => {
    if (theme === 'dark') {
      return {
        common: {
          card: 'border-slate-700 shadow-[0_18px_45px_rgba(8,12,24,0.55)]',
          badge: 'border border-slate-600 bg-slate-900/70 text-slate-200'
        },
        uncommon: {
          card: 'border-emerald-500/40 shadow-[0_20px_50px_rgba(16,185,129,0.35)]',
          badge: 'border border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
        },
        rare: {
          card: 'border-sky-500/40 shadow-[0_20px_50px_rgba(56,189,248,0.35)]',
          badge: 'border border-sky-400/50 bg-sky-500/20 text-sky-100'
        },
        legendary: {
          card: 'border-amber-400/50 shadow-[0_24px_55px_rgba(251,191,36,0.4)]',
          badge: 'border border-amber-300/60 bg-amber-400/20 text-amber-100'
        }
      } as Record<Rarity, { card: string; badge: string }>;
    }
    return {
      common: {
        card: 'border-slate-200 shadow-[0_16px_40px_rgba(148,163,184,0.28)]',
        badge: 'border border-slate-200 bg-slate-100 text-slate-600'
      },
      uncommon: {
        card: 'border-emerald-200 shadow-[0_18px_45px_rgba(16,185,129,0.24)]',
        badge: 'border border-emerald-200 bg-emerald-100 text-emerald-700'
      },
      rare: {
        card: 'border-sky-200 shadow-[0_18px_45px_rgba(59,130,246,0.24)]',
        badge: 'border border-sky-200 bg-sky-100 text-sky-700'
      },
      legendary: {
        card: 'border-amber-200 shadow-[0_20px_48px_rgba(251,191,36,0.3)]',
        badge: 'border border-amber-200 bg-amber-100 text-amber-700'
      }
    } as Record<Rarity, { card: string; badge: string }>;
  }, [theme]);

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
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!themeReadyRef.current) {
      themeReadyRef.current = true;
      return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setRoutingReady(true);
  }, []);

  useEffect(() => {
    if (!routingReady) return;
    let target: string | null = null;
    switch (gamePhase) {
      case 'menu':
        target = '/menu';
        break;
      case 'shop':
        target = '/shop';
        break;
      case 'gameplay':
      case 'shopTransition':
      case 'gameOver':
        target = '/game';
        break;
      default:
        target = null;
    }
    if (target && pathname !== target) {
      router.replace(target);
    }
  }, [gamePhase, pathname, routingReady, router]);

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
        const initialPhase = parsed.gamePhase ?? 'menu';
        setGamePhase(initialPhase);
        setSelectedBetId(parsed.selectedBetId ?? null);

        const storedOwnedUpgrades =
          parsed.ownedUpgrades && Array.isArray(parsed.ownedUpgrades)
            ? parsed.ownedUpgrades
            : [];
        const hydratedOwnedUpgrades = storedOwnedUpgrades.map((upgrade) => ({
          ...upgrade,
          icon: upgrade.icon ?? templateByName.get(upgrade.name)?.icon ?? '🔹'
        }));
        setOwnedUpgrades(hydratedOwnedUpgrades);

        setRoundTarget(
          typeof parsed.roundTarget === 'number'
            ? parsed.roundTarget
            : calculateRoundTarget(storedRoundNumber, hydratedOwnedUpgrades)
        );

        if (parsed.recentCards && Array.isArray(parsed.recentCards)) {
          setRecentCards(parsed.recentCards);
        }

        setTargetAchieved(Boolean(parsed.targetAchieved));
        if (parsed.recentCards && parsed.recentCards.length > 0) {
          setLastDrawnCard(parsed.recentCards[0].card);
        }

        if (initialPhase === 'shop' || initialPhase === 'shopTransition') {
          setShopChoices(generateShopChoices(storedRoundNumber));
        }
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
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
    }
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
    }
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
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

  const clearFinalizeTimeout = () => {
    if (roundFinalizeTimeoutRef.current) {
      clearTimeout(roundFinalizeTimeoutRef.current);
      roundFinalizeTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!isMusicPlaying) {
      audioVoicesRef.current.forEach(({ osc, pitchLfo, ampLfo, gain, pitchDepth, ampDepth }) => {
        [osc, pitchLfo, ampLfo].forEach((node) => {
          try {
            node.stop();
          } catch (error) {
            console.warn(error);
          }
        });
        try {
          osc.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          gain.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          pitchDepth.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          ampDepth.disconnect();
        } catch (error) {
          console.warn(error);
        }
      });
      audioVoicesRef.current = [];
      if (musicGainRef.current) {
        musicGainRef.current.disconnect();
        musicGainRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'suspended') {
        void audioCtxRef.current.suspend();
      }
      return;
    }

    const context = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = context;
    void context.resume();

    const master = context.createGain();
    master.gain.value = 0.1;
    master.connect(context.destination);
    musicGainRef.current = master;

    const voices = [
      { base: 262, lfoRate: 0.18, ampRate: 2.3, type: 'triangle' as OscillatorType, detune: -4 },
      { base: 330, lfoRate: 0.14, ampRate: 2.8, type: 'sawtooth' as OscillatorType, detune: 3 },
      { base: 392, lfoRate: 0.2, ampRate: 1.9, type: 'square' as OscillatorType, detune: 5 },
      { base: 523, lfoRate: 0.12, ampRate: 3.4, type: 'triangle' as OscillatorType, detune: -2 }
    ];

    audioVoicesRef.current = voices.map(({ base, lfoRate, ampRate, type, detune = 0 }) => {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = base;
      if (detune !== 0) {
        osc.detune.value = detune * 10;
      }

      const pitchLfo = context.createOscillator();
      pitchLfo.type = 'sine';
      pitchLfo.frequency.value = lfoRate;

      const pitchDepth = context.createGain();
      pitchDepth.gain.value = base * 0.01;
      pitchLfo.connect(pitchDepth);
      pitchDepth.connect(osc.frequency);

      const gainNode = context.createGain();
      gainNode.gain.value = 0.22;
      osc.connect(gainNode);
      gainNode.connect(master);

      const ampLfo = context.createOscillator();
      ampLfo.type = 'triangle';
      ampLfo.frequency.value = ampRate + Math.random() * 0.4;

      const ampDepth = context.createGain();
      ampDepth.gain.value = 0.1;
      ampLfo.connect(ampDepth);
      ampDepth.connect(gainNode.gain);

      osc.start();
      pitchLfo.start();
      ampLfo.start();

      return {
        osc,
        pitchLfo,
        ampLfo,
        gain: gainNode,
        pitchDepth,
        ampDepth
      };
    });

    return () => {
      audioVoicesRef.current.forEach(({ osc, pitchLfo, ampLfo, gain, pitchDepth, ampDepth }) => {
        [osc, pitchLfo, ampLfo].forEach((node) => {
          try {
            node.stop();
          } catch (error) {
            console.warn(error);
          }
        });
        try {
          osc.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          gain.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          pitchDepth.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          ampDepth.disconnect();
        } catch (error) {
          console.warn(error);
        }
      });
      audioVoicesRef.current = [];
      if (musicGainRef.current) {
        musicGainRef.current.disconnect();
        musicGainRef.current = null;
      }
    };
  }, [isMusicPlaying]);

  useEffect(() => () => {
    audioVoicesRef.current.forEach(({ osc, pitchLfo, ampLfo, gain, pitchDepth, ampDepth }) => {
      [osc, pitchLfo, ampLfo].forEach((node) => {
        try {
          node.stop();
        } catch (error) {
          console.warn(error);
        }
      });
      [osc, gain, pitchDepth, ampDepth].forEach((node) => {
        try {
          node.disconnect();
        } catch (error) {
          console.warn(error);
        }
      });
    });
    audioVoicesRef.current = [];
    if (musicGainRef.current) {
      musicGainRef.current.disconnect();
      musicGainRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(console.warn);
      audioCtxRef.current = null;
    }
    clearFinalizeTimeout();
    if (shopTransitionTimeoutRef.current) {
      clearTimeout(shopTransitionTimeoutRef.current);
    }
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
    }
  }, []);

  const roundProgress = roundTarget > 0 ? Math.min(roundScore / roundTarget, 1) : 0;
  const drawButtonDisabled = roundOutcome === 'lost' || roundOutcome === 'won' || !selectedBet || drawsRemaining <= 0;
  const leftoverConversionValue = drawsRemaining * GUARANTEED_DRAW_VALUE;

  const toggleMusic = () => {
    setIsMusicPlaying((prev) => !prev);
  };

  const musicToggleButton = (
    <button
      type="button"
      onClick={toggleMusic}
      className={cn(
        buttonBase,
        isMusicPlaying ? buttonPalette.muted : buttonPalette.accentSecondary,
        'w-full justify-center px-4 py-2 text-sm'
      )}
      aria-pressed={isMusicPlaying}
    >
      {isMusicPlaying ? 'Pause Music' : 'Play Music'}
    </button>
  );

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const themeToggleButton = (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(buttonBase, buttonPalette.accentSecondary, 'w-full justify-center px-4 py-2 text-sm')}
      aria-pressed={theme === 'dark'}
    >
      {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
    </button>
  );

  const settingsButton = !isSettingsOpen && gamePhase !== 'gameOver' ? (
    <button
      type="button"
      onClick={() => setIsSettingsOpen(true)}
      className={cn(buttonBase, buttonPalette.accentSecondary, 'px-4 py-2 text-sm')}
    >
      Settings
    </button>
  ) : null;

  const gainRatio = roundTarget > 0 ? lastDrawScore / roundTarget : 0;
  let scoreCardClass = scorePalette.neutral;
  let totalScoreClass = textPalette.primary;
  let gainScoreClass = lastDrawScore > 0 ? textPalette.accent : textPalette.danger;
  let ratioTagClass = lastDrawScore > 0 ? textPalette.accentSoft : textPalette.dangerSoft;
  const ratioLabel =
    lastDrawScore > 0
      ? `${Math.min(Math.round(gainRatio * 100), 999)}% of round target`
      : 'Missed bet';

  if (lastDrawScore === 0) {
    scoreCardClass = scorePalette.danger;
    totalScoreClass = textPalette.danger;
  } else if (gainRatio >= 0.5) {
    scoreCardClass = scorePalette.legendary;
    totalScoreClass = textPalette.warning;
    gainScoreClass = textPalette.warning;
    ratioTagClass = textPalette.warningSoft;
  } else if (gainRatio >= 0.3) {
    scoreCardClass = scorePalette.positive;
    totalScoreClass = textPalette.positive;
    gainScoreClass = textPalette.positive;
    ratioTagClass = textPalette.positiveSoft;
  } else if (gainRatio > 0) {
    scoreCardClass = scorePalette.accent;
    totalScoreClass = textPalette.accent;
    gainScoreClass = textPalette.accent;
    ratioTagClass = textPalette.accentSoft;
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
    if (shopTransitionTimeoutRef.current) {
      clearTimeout(shopTransitionTimeoutRef.current);
      shopTransitionTimeoutRef.current = null;
    }
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
    }
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
    }
    deckRef.current = freshDeck;
    setDeck(freshDeck);
    clearFinalizeTimeout();
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
    setLastDrawnCard(null);
    setTargetAchieved(false);
    setGamePhase('gameplay');
  };

  const clearSavedData = () => {
    clearFinalizeTimeout();
    if (shopTransitionTimeoutRef.current) {
      clearTimeout(shopTransitionTimeoutRef.current);
      shopTransitionTimeoutRef.current = null;
    }
    deckRef.current = [];
    setDeck([]);
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
    setLastDrawnCard(null);
    setTargetAchieved(false);
    setGamePhase('menu');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
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
    setLastDrawnCard(drawnCard);
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((entry) => entry.id !== floatingScore.id));
    }, 2000);

    const drawScoreLabel = formatDisplayNumber(drawScore);

    setRoundScore((prev) => prev + drawScore);
    setDrawsRemaining((prev) => prev - 1);
    setLastDrawScore(drawScore);
    setBetFeedback(
      hit
        ? `${selectedBet.label} hit for ${drawScoreLabel} points!`
        : `${selectedBet.label} missed · ${drawScoreLabel} points.`
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
        clearFinalizeTimeout();
        roundFinalizeTimeoutRef.current = setTimeout(() => {
          roundFinalizeTimeoutRef.current = null;
          finalizeRound({ convertUnused: false, baseScoreOverride: projectedScore });
        }, 900);
      } else {
        setRoundOutcome('lost');
        setTargetAchieved(false);
        if (gameOverTimeoutRef.current) {
          clearTimeout(gameOverTimeoutRef.current);
        }
        gameOverTimeoutRef.current = setTimeout(() => {
          setGamePhase('gameOver');
          gameOverTimeoutRef.current = null;
        }, 600);
      }
      return;
    }
  };

  const finalizeRound = (options?: { convertUnused?: boolean; baseScoreOverride?: number }) => {
    if (roundOutcome === 'lost' || roundOutcome === 'won') return;
    if (!targetAchieved && !options?.convertUnused) return;

    clearFinalizeTimeout();

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

    const messageParts: string[] = [`Banked ${formatDisplayNumber(finalScore)} points`];
    if (conversionPoints > 0) {
      messageParts.push(`(${formatDisplayNumber(conversionPoints)} from leftover draws)`);
    }
    messageParts.push(
      `+${formatDisplayNumber(interestEarned)} from ${(interestRate * 100).toFixed(0)}% interest.`
    );
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
    if (shopTransitionTimeoutRef.current) {
      clearTimeout(shopTransitionTimeoutRef.current);
      shopTransitionTimeoutRef.current = null;
    }
    deckRef.current = freshDeck;
    setDeck(freshDeck);
    clearFinalizeTimeout();
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
    setLastDrawnCard(null);
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
    clearFinalizeTimeout();
    if (shopTransitionTimeoutRef.current) {
      clearTimeout(shopTransitionTimeoutRef.current);
      shopTransitionTimeoutRef.current = null;
    }
    setGamePhase('menu');
  };

  const renderMenu = () => (
    <div className={cn('min-h-screen px-6 py-16', palette.menuShell)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className={cn('rounded-3xl p-8 lg:p-12 space-y-8', palette.surfaceCard)}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-4 text-left">
              <div className={palette.themeBadge}>Arcade Build</div>
              <h1 className={cn('text-5xl font-extrabold tracking-tight', textPalette.primary)}>
                Card Clicker
              </h1>
              <p className={cn('text-lg leading-relaxed', textPalette.secondary)}>
                Flip fast, bank smarter, and experiment with new relic builds between rounds. Your
                bankroll and upgrades persist, so every run feeds the next.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start">
              {settingsButton}
            </div>
          </div>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="space-y-1">
                <span className={cn('uppercase tracking-[0.18em] text-xs', textPalette.secondary)}>
                  Banked Points
                </span>
                <span className={cn('text-2xl font-semibold', textPalette.accent)}>
                  {formatDisplayNumber(bank)}
                </span>
              </div>
              <div className="space-y-1">
                <span className={cn('uppercase tracking-[0.18em] text-xs', textPalette.secondary)}>
                  Highest Round
                </span>
                <span className={cn('text-2xl font-semibold', textPalette.positive)}>
                  {roundNumber}
                </span>
              </div>
              <div className="space-y-1">
                <span className={cn('uppercase tracking-[0.18em] text-xs', textPalette.secondary)}>
                  Relics Stored
                </span>
                <span className={cn('text-2xl font-semibold', textPalette.warning)}>
                  {ownedUpgrades.length}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={startNewRun}
                className={cn(buttonBase, buttonPalette.accent, 'px-6 py-3 text-base')}
              >
                Start New Run
              </button>
              <button
                onClick={resetToMenu}
                className={cn(buttonBase, buttonPalette.muted, 'px-6 py-3 text-base')}
              >
                Return to Main Menu
              </button>
            </div>
          </div>
          {ownedUpgrades.length > 0 && (
            <div className={cn('text-xs uppercase tracking-wider', textPalette.secondary)}>
              {ownedUpgrades.length} relic{ownedUpgrades.length === 1 ? '' : 's'} ready to deploy on
              your next run.
            </div>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className={cn('rounded-3xl p-8 space-y-6 lg:col-span-2', palette.surfaceCard)}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={cn('text-2xl font-semibold', textPalette.primary)}>Patch Notes</h2>
              <span className={cn('text-xs uppercase tracking-wide', textPalette.secondary)}>
                v0.4 refresh
              </span>
            </div>
            <ul className={cn('space-y-4 text-sm leading-relaxed', textPalette.secondary)}>
              <li className="flex items-start gap-3">
                <span
                  className={cn(
                    'grid h-7 w-7 place-content-center rounded-xl text-sm font-semibold',
                    palette.bulletIcon
                  )}
                >
                  ♪
                </span>
                <span>
                  New upbeat synth loop and richer lighting keep long click streaks lively.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className={cn(
                    'grid h-7 w-7 place-content-center rounded-xl text-sm font-semibold',
                    palette.bulletIcon
                  )}
                >
                  Σ
                </span>
                <span>Score displays flip into scientific notation earlier to tame giant bankrolls.</span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className={cn(
                    'grid h-7 w-7 place-content-center rounded-xl text-sm font-semibold',
                    palette.bulletIcon
                  )}
                >
                  ⚙
                </span>
                <span>
                  Manual light/dark toggle and refreshed menu styling for quicker session setup.
                </span>
              </li>
            </ul>
          </section>

          <section className={cn('rounded-3xl p-6 space-y-5', palette.surfaceCard)}>
            <h2 className={cn('text-lg font-semibold', textPalette.primary)}>Run Actions</h2>
            <p className={cn('text-sm', textPalette.secondary)}>
              Ready to bank another streak or wipe the slate? Use these quick controls before diving in.
            </p>
            <div className="space-y-3">
              <button
                onClick={startNewRun}
                className={cn(buttonBase, buttonPalette.accent, 'w-full')}
              >
                Launch Fresh Run
              </button>
              <button
                onClick={clearSavedData}
                className={cn(buttonBase, buttonPalette.muted, 'w-full')}
              >
                Clear Local Save
              </button>
            </div>
            <div className={cn('text-xs leading-relaxed', textPalette.secondary)}>
              Clearing the save removes stored relics and bank totals. Theme and audio preferences stay
              put.
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const renderGameOverOverlay = () => (
    <div className={cn('fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl')}>
      <div className={cn('w-full max-w-3xl rounded-3xl p-12 text-center space-y-10', palette.surfaceMuted)}>
        <div>
          <h2 className={cn('mb-4 text-4xl font-bold', textPalette.danger)}>Run Lost</h2>
          <p className={cn('text-lg leading-relaxed', textPalette.secondary)}>
            You ran out of draws before hitting the target. Reset here or head back to the menu to
            tweak your plan.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-left md:grid-cols-4">
          <div className={cn('rounded-2xl p-5', palette.surfaceCard)}>
            <div className={cn('mb-2 text-xs uppercase tracking-wider', textPalette.secondary)}>Bank</div>
            <div className={cn('text-3xl font-semibold', textPalette.accent)}>
              {formatDisplayNumber(bank)}
            </div>
          </div>
          <div className={cn('rounded-2xl p-5', palette.surfaceCard)}>
            <div className={cn('mb-2 text-xs uppercase tracking-wider', textPalette.secondary)}>
              Round Reached
            </div>
            <div className={cn('text-3xl font-semibold', textPalette.positive)}>{roundNumber}</div>
          </div>
          <div className={cn('rounded-2xl p-5', palette.surfaceCard)}>
            <div className={cn('mb-2 text-xs uppercase tracking-wider', textPalette.secondary)}>
              Relics Owned
            </div>
            <div className={cn('text-3xl font-semibold', textPalette.warning)}>
              {ownedUpgrades.length}
            </div>
          </div>
          <div className={cn('rounded-2xl p-5', palette.surfaceCard)}>
            <div className={cn('mb-2 text-xs uppercase tracking-wider', textPalette.secondary)}>
              Interest Rate
            </div>
            <div className={cn('text-3xl font-semibold', textPalette.positive)}>
              {(interestRate * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <button onClick={startNewRun} className={cn(buttonBase, buttonPalette.accent, 'w-full')}>
            Launch New Run
          </button>
          <button onClick={resetToMenu} className={cn(buttonBase, buttonPalette.muted, 'w-full')}>
            Return to Main Menu
          </button>
        </div>
        {lastDrawnCard && (
          <div className={cn('mx-auto mt-6 w-32 text-center', textPalette.secondary)}>
            <div className="mb-2 text-xs uppercase tracking-[0.3em]">Last Draw</div>
            <div className={cn('rounded-2xl border p-3', palette.borderSubtle)}>
              <Card
                suit={lastDrawnCard.suit}
                rank={lastDrawnCard.rank}
                isJoker={lastDrawnCard.isJoker}
                jokerColor={lastDrawnCard.jokerColor}
              />
            </div>
          </div>
        )}
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {settingsButton}
      </div>
    </div>
  );

  const renderSettingsModal = () => {
    if (!isSettingsOpen) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl"
        onClick={() => setIsSettingsOpen(false)}
      >
        <div
          className={cn('w-full max-w-sm space-y-6 rounded-3xl p-6', palette.surfaceMuted)}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className={cn('text-lg font-semibold', textPalette.primary)}>Settings</h3>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className={cn(buttonBase, buttonPalette.muted, 'h-9 w-9 justify-center rounded-full px-0 text-base')}
              aria-label="Close settings"
            >
              ×
            </button>
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <span className={cn('text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>Theme</span>
              {themeToggleButton}
            </div>
            <div className="space-y-2">
              <span className={cn('text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>Music</span>
              {musicToggleButton}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderShopTransitionOverlay = () => (
    <div className={cn('min-h-screen flex flex-col items-center justify-center gap-6 p-6', palette.shell)}>
      <div className={cn('mx-auto w-full max-w-xl rounded-3xl px-10 py-10 text-center space-y-6 transition-all duration-300', palette.surfaceMuted)}>
        <div className={cn('text-sm uppercase tracking-[0.4em]', textPalette.secondary)}>Round Cleared</div>
        <div className={cn('text-3xl font-bold', textPalette.positive)}>Counting Rewards...</div>
        <p className={cn('text-lg leading-relaxed', textPalette.secondary)}>
          {shopTransitionMessage ?? 'Adding up draws, doubles, and interest for the bank...'}
        </p>
        <div className={cn('text-sm', textPalette.secondary)}>Opening upgrade shop</div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {settingsButton}
      </div>
    </div>
  );

  const renderShop = () => (
    <div className={cn('min-h-screen flex flex-col gap-8 lg:flex-row', palette.shell)}>
      <div className={cn('w-full max-w-xl space-y-8 p-8 lg:max-w-sm', palette.panelLeft)}>
        <div className="space-y-3">
          <div className={cn('text-xs uppercase tracking-wider', textPalette.secondary)}>
            Round Cleared
          </div>
          <div className={cn('text-4xl font-bold', textPalette.positive)}>Round {roundNumber}</div>
          <p className={cn('text-sm leading-relaxed', textPalette.secondary)}>
            You banked {formatDisplayNumber(roundScore)} points. Spend some now or roll them into the
            next round.
          </p>
        </div>
        <div className={cn('rounded-2xl p-6 space-y-3', palette.surfaceCard)}>
          <div className={cn('text-xs uppercase tracking-wider', textPalette.secondary)}>Bank</div>
          <div className={cn('text-3xl font-semibold', textPalette.accent)}>
            {formatDisplayNumber(bank)}
          </div>
          <div className={cn('text-sm font-semibold', textPalette.positive)}>
            {(interestRate * 100).toFixed(0)}% interest next round
          </div>
          <div className={cn('text-xs', textPalette.secondary)}>
            Unspent points stay banked between rounds.
          </div>
        </div>
        <button onClick={proceedToNextRound} className={cn(buttonBase, buttonPalette.positive, 'w-full')}>
          Continue to Round {roundNumber + 1}
        </button>
        <button onClick={resetToMenu} className={cn(buttonBase, buttonPalette.muted, 'w-full')}>
          Return to Main Menu
        </button>
        {shopMessage && <div className={cn('text-sm', textPalette.secondary)}>{shopMessage}</div>}
        <div className="flex flex-wrap items-center gap-3">
          {settingsButton}
        </div>
      </div>
      <div className={cn('flex-1 overflow-y-auto px-6 pb-12 lg:px-12', palette.panelRight)}>
        <h2 className={cn('mb-6 text-3xl font-bold', textPalette.accent)}>Upgrade Shop</h2>
        <p className={cn('mb-10 max-w-3xl leading-relaxed', textPalette.secondary)}>
          Grab the upgrades that fit your build, stack the bank, then jump back into the next round.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {shopChoices.map((choice) => {
            const styles = rarityStyles[choice.rarity];
            return (
              <div
                key={choice.id}
                className={cn(
                  'flex h-full flex-col gap-4 rounded-2xl p-6 transition-shadow duration-200 hover:-translate-y-1',
                  palette.surfaceCard,
                  styles.card
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-3xl leading-none">{choice.icon}</div>
                  <div className="flex-1">
                    <div className={cn('text-lg font-semibold', textPalette.primary)}>{choice.name}</div>
                    <div className={cn('mt-1 text-sm leading-snug', textPalette.secondary)}>
                      {choice.description}
                    </div>
                  </div>
                  <div className={cn('rounded-full px-2 py-1 text-[11px] font-bold', styles.badge)}>
                    {choice.rarity.toUpperCase()}
                  </div>
                </div>
                <ul className={cn('space-y-2 text-sm', textPalette.secondary)}>
                  {choice.effects.map((effect, index) => {
                    if (effect.type === 'extraDraws') {
                      return <li key={index}>+{effect.value} draw(s) per round</li>;
                    }
                    if (effect.type === 'flatBonus') {
                      return <li key={index}>+{effect.value} flat points every draw</li>;
                    }
                    if (effect.type === 'interestRate') {
                      return (
                        <li key={index}>+{(effect.value * 100).toFixed(0)}% interest on bank</li>
                      );
                    }
                    const betLabel = betOptionMap.get(effect.betId)?.label ?? effect.betId;
                    return (
                      <li key={index}>
                        +{effect.value.toFixed(2)}× multiplier to {betLabel}
                      </li>
                    );
                  })}
                </ul>
                <div
                  className={cn(
                    'mt-auto flex items-center justify-between border-t pt-4',
                    palette.borderSubtle
                  )}
                >
                  <div className={cn('text-sm', textPalette.secondary)}>Cost</div>
                  <div className={cn('text-lg font-semibold', textPalette.accent)}>
                    {formatDisplayNumber(choice.cost)}
                  </div>
                </div>
                <button
                  onClick={() => buyUpgrade(choice)}
                  className={cn(buttonBase, buttonPalette.accent, 'w-full')}
                >
                  Buy Upgrade
                </button>
              </div>
            );
          })}
          {shopChoices.length === 0 && (
            <div className={cn('col-span-full text-sm', textPalette.secondary)}>
              You picked up every upgrade. Continue to the next round when ready.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderGameplay = () => (
    <div className={cn('min-h-screen flex flex-col lg:flex-row', palette.shell)}>
      <div className={cn('flex w-full flex-col lg:max-w-[420px]', palette.panelLeft)}>
        <div className={cn('flex items-center justify-between border-b px-6 py-6', palette.borderSubtle)}>
          <div>
            <h1 className={cn('text-3xl font-bold', textPalette.accent)}>Card Clicker</h1>
            <div className={cn('mt-2 text-xs uppercase tracking-[0.35em]', textPalette.secondary)}>
              Round {roundNumber} • Target {formatDisplayNumber(roundTarget)}
            </div>
          </div>
          <div className="text-right">
            <div className={cn('mb-1 text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
              Draws Left
            </div>
            <div className={cn('text-lg font-semibold', textPalette.accent)}>
              {drawsRemaining}/{BASE_DRAWS + getExtraDraws(ownedUpgrades)}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-8">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className={cn('text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
                Draw Pile
              </span>
              <span className={cn('text-sm', textPalette.secondary)}>{deck.length} cards left</span>
            </div>

            <div className="flex flex-col gap-6 md:flex-row">
              <div className={cn('relative flex-1 overflow-hidden rounded-2xl px-8 py-8', palette.surfaceCard)}>
                <div className="relative h-44 w-32">
                  {[...Array(Math.min(8, Math.max(1, Math.ceil(deck.length / 10))))].map((_, i) => (
                    <div
                      key={i}
                      className={cn('pointer-events-none rounded-xl', palette.deckLayer)}
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
                    className="pointer-events-none absolute left-8"
                    style={{ top: 'calc(50% - 88px)', zIndex: 30 }}
                  >
                    <div
                      className="animate-card-slide"
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
                    className={cn(
                      'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-bold animate-float-up',
                      fs.hit ? textPalette.positive : textPalette.danger
                    )}
                  >
                    {fs.hit ? '+' : ''}
                    {formatDisplayNumber(fs.value)}
                  </div>
                ))}
              </div>

              <div className={cn('w-full md:w-[240px] flex flex-col gap-4 rounded-2xl p-6', scoreCardClass)}>
                <div>
                  <div className={cn('mb-1 text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
                    Round Score
                  </div>
                  <div className={cn('text-5xl font-bold leading-tight', totalScoreClass)}>
                    {formatDisplayNumber(roundScore)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', textPalette.secondary)}>Target</span>
                    <span className={cn('text-sm font-semibold', textPalette.primary)}>
                      {formatDisplayNumber(roundTarget)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', textPalette.secondary)}>Bank</span>
                    <span className={cn('text-sm font-semibold', textPalette.accent)}>
                      {formatDisplayNumber(bank)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', textPalette.secondary)}>Interest Rate</span>
                    <span className={cn('text-sm font-semibold', textPalette.positive)}>
                      {(interestRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', textPalette.secondary)}>Last Draw</span>
                    <span className={cn('text-lg font-semibold', gainScoreClass)}>
                      {formatSignedDisplayNumber(lastDrawScore)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'h-2 w-full overflow-hidden rounded-full',
                      theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-200'
                    )}
                  >
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        roundOutcome === 'lost'
                          ? 'bg-rose-500'
                          : roundProgress >= 1
                            ? 'bg-amber-400'
                            : 'bg-sky-500'
                      )}
                      style={{ width: `${Math.min(roundProgress * 100, 100)}%` }}
                    />
                  </div>
                  <div className={cn('text-xs uppercase tracking-wide', ratioTagClass)}>{ratioLabel}</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleDraw}
              disabled={drawButtonDisabled}
              className={cn(
                buttonBase,
                drawButtonDisabled ? disabledButtonClasses : buttonPalette.accent,
                'mt-4 w-full'
              )}
            >
              {selectedBet ? `Draw with ${selectedBet.label}` : 'Select a bet to draw'}
            </button>
            {betFeedback && (
              <div className={cn('mt-2 text-sm', textPalette.secondary)}>{betFeedback}</div>
            )}
            {targetAchieved && drawsRemaining > 0 && (
              <div className={cn('mt-2 text-sm', textPalette.positive)}>
                Target secured. {drawsRemaining} unused draw{drawsRemaining === 1 ? '' : 's'} worth
                guaranteed {formatDisplayNumber(leftoverConversionValue)} pts.
              </div>
            )}
          </div>

          <div>
            <div className={cn('mb-3 text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
              Recent Cards
            </div>
            {displayedRecentCards.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
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
              <div className={cn('text-sm', textPalette.secondary)}>
                Draw cards to populate the recent queue.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={cashOutUnusedDraws}
              disabled={!targetAchieved || drawsRemaining <= 0 || roundOutcome === 'won'}
              className={cn(
                buttonBase,
                targetAchieved && drawsRemaining > 0 && roundOutcome !== 'won'
                  ? buttonPalette.warning
                  : disabledButtonClasses,
                'w-full'
              )}
            >
              Convert Leftover Draws ({formatDisplayNumber(leftoverConversionValue)} pts)
            </button>
            <button
              onClick={triggerShopTransition}
              disabled={!targetAchieved || roundOutcome === 'lost'}
              className={cn(
                buttonBase,
                targetAchieved && roundOutcome !== 'lost'
                  ? buttonPalette.positive
                  : disabledButtonClasses,
                'w-full'
              )}
            >
              Finish Round & Visit Shop
            </button>
            <div className="flex gap-3">
              <button onClick={startNewRun} className={cn(buttonBase, buttonPalette.muted, 'flex-1')}>
                Reset Run
              </button>
              <button onClick={resetToMenu} className={cn(buttonBase, buttonPalette.danger, 'flex-1')}>
                Main Menu
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={cn('flex-1 overflow-y-auto px-6 pb-12 pt-8 lg:px-12', palette.panelRight)}>
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className={cn('text-2xl font-bold', textPalette.accent)}>Select Your Bet</h2>
            <p className={cn('mt-2 text-sm leading-relaxed', textPalette.secondary)}>
              Pick exactly one bet before each draw. Upgrades you own modify multipliers and draw limits.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={cn('text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
                Relics Owned
              </div>
              <div className={cn('text-3xl font-bold', textPalette.positive)}>
                {ownedUpgrades.length}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {settingsButton}
            </div>
          </div>
        </div>

        {ownedUpgrades.length > 0 && (
          <div className={cn('mb-8 rounded-2xl p-5', palette.surfaceCard)}>
            <div className={cn('mb-3 text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
              Active Relic Effects
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {ownedUpgrades.map((upgrade) => (
                <span
                  key={upgrade.id}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
                    rarityStyles[upgrade.rarity].badge
                  )}
                >
                  <span>{upgrade.icon}</span>
                  {upgrade.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(betsByCategory).map(([category, options]) => (
            <div key={category} className={cn('rounded-2xl p-5', palette.surfaceCard)}>
              <div className={cn('mb-4 text-sm font-semibold uppercase tracking-[0.3em]', textPalette.primary)}>
                {category} Bets
              </div>
              <div className="space-y-3">
                {options.map((option) => {
                  const isSelected = selectedBetId === option.id;
                  const bonus = betBonusMap.get(option.id) ?? 0;
                  const totalMultiplier = option.baseMultiplier + bonus;
                  const riskClass =
                    option.risk === 'extreme'
                      ? tagPalette.extreme
                      : option.risk === 'high'
                        ? tagPalette.high
                        : option.risk === 'medium'
                          ? tagPalette.medium
                          : tagPalette.low;

                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedBetId(option.id);
                        setBetFeedback(null);
                      }}
                      className={cn(
                        'w-full rounded-2xl p-4 text-left transition-all duration-200',
                        betPalette.card,
                        isSelected && betPalette.active
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className={cn('text-sm font-semibold', textPalette.primary)}>
                          {option.label}
                        </span>
                        <span className={riskClass}>
                          {totalMultiplier.toFixed(2)}× · {option.risk.toUpperCase()}
                        </span>
                      </div>
                      <div className={cn('text-xs leading-snug', textPalette.secondary)}>
                        {option.description}
                      </div>
                      {bonus > 0 && (
                        <div className={cn('mt-2 text-[11px] uppercase tracking-[0.25em]', textPalette.positive)}>
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
    </div>
  );

  if (gamePhase === 'menu') {
    return (
      <>
        {renderMenu()}
        {renderSettingsModal()}
      </>
    );
  }

  if (gamePhase === 'shopTransition') {
    return (
      <>
        {renderShopTransitionOverlay()}
        {renderSettingsModal()}
      </>
    );
  }

  if (gamePhase === 'shop') {
    return (
      <>
        {renderShop()}
        {renderSettingsModal()}
      </>
    );
  }

  if (gamePhase === 'gameOver') {
    return (
      <>
        {renderGameplay()}
        {renderGameOverOverlay()}
        {renderSettingsModal()}
      </>
    );
  }

  return (
    <>
      {renderGameplay()}
      {renderSettingsModal()}
    </>
  );
}
