'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Card, { type CardType, type Rank, type Suit } from '@/components/Card';
import RecentCardItem, { type RecentCardStatus } from '@/components/RecentCardItem';

interface FloatingScore {
  id: string;
  value: number;
  hit: boolean;
}

interface DrawAnimation {
  id: string;
  card: CardType;
}

type RoundOutcome = 'active' | 'won' | 'lost';

interface RecentCardEntry {
  id: string;
  card: CardType;
  status: RecentCardStatus;
  betId: string | null;
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
  selectedBetId: string | null;
  recentCards: RecentCardEntry[];
}

const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const STORAGE_KEY = 'card-clicker-risk-v1';
const MAX_DRAWS = 4;

interface BetOption {
  id: string;
  category: 'Color' | 'Suit' | 'Rank Type' | 'Value' | 'Special';
  label: string;
  description: string;
  multiplier: number;
  risk: 'low' | 'medium' | 'high' | 'extreme';
  check: (card: CardType) => boolean;
}

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
    multiplier: 1.7,
    risk: 'low',
    check: (card) => card.suit === '♥' || card.suit === '♦'
  },
  {
    id: 'color-black',
    category: 'Color',
    label: 'Black Cards',
    description: 'Spades or Clubs',
    multiplier: 1.7,
    risk: 'low',
    check: (card) => card.suit === '♠' || card.suit === '♣'
  },
  {
    id: 'suit-spades',
    category: 'Suit',
    label: 'Exact Suit: ♠',
    description: 'Bet on spades specifically',
    multiplier: 3.2,
    risk: 'high',
    check: (card) => card.suit === '♠'
  },
  {
    id: 'suit-hearts',
    category: 'Suit',
    label: 'Exact Suit: ♥',
    description: 'Bet on hearts specifically',
    multiplier: 3.0,
    risk: 'high',
    check: (card) => card.suit === '♥'
  },
  {
    id: 'suit-diamonds',
    category: 'Suit',
    label: 'Exact Suit: ♦',
    description: 'Bet on diamonds specifically',
    multiplier: 3.0,
    risk: 'high',
    check: (card) => card.suit === '♦'
  },
  {
    id: 'suit-clubs',
    category: 'Suit',
    label: 'Exact Suit: ♣',
    description: 'Bet on clubs specifically',
    multiplier: 3.2,
    risk: 'high',
    check: (card) => card.suit === '♣'
  },
  {
    id: 'rank-face',
    category: 'Rank Type',
    label: 'Face Card',
    description: 'J, Q, or K',
    multiplier: 2.2,
    risk: 'medium',
    check: (card) => card.rank === 'J' || card.rank === 'Q' || card.rank === 'K'
  },
  {
    id: 'rank-number',
    category: 'Rank Type',
    label: 'Number Card',
    description: 'Ranks 2 through 10',
    multiplier: 1.5,
    risk: 'low',
    check: (card) => ['A', 'J', 'Q', 'K', 'Joker'].includes(card.rank) === false
  },
  {
    id: 'value-high',
    category: 'Value',
    label: 'High (9+)',
    description: 'Rank 9 or above',
    multiplier: 1.9,
    risk: 'medium',
    check: (card) => {
      if (card.rank === 'Joker') return true;
      const value = getRankValue(card.rank);
      return value >= 9;
    }
  },
  {
    id: 'value-low',
    category: 'Value',
    label: 'Low (2-6)',
    description: 'Rank 2 through 6',
    multiplier: 2.1,
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
    label: 'Ace',
    description: 'Land exactly on an Ace',
    multiplier: 4.5,
    risk: 'high',
    check: (card) => card.rank === 'A'
  },
  {
    id: 'special-joker',
    category: 'Special',
    label: 'Joker',
    description: 'Hit either Joker',
    multiplier: 7.0,
    risk: 'extreme',
    check: (card) => card.rank === 'Joker'
  }
];

const betOptionMap = new Map(betOptions.map((option) => [option.id, option]));

function calculateRoundTarget(roundNumber: number): number {
  return Math.floor(44 + (roundNumber - 1) * 7);
}

export default function Home() {
  const [deck, setDeck] = useState<CardType[]>(() => shuffleDeck(createDeck()));
  const deckRef = useRef<CardType[]>(deck);
  const [bank, setBank] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundScore, setRoundScore] = useState(0);
  const [roundTarget, setRoundTarget] = useState(calculateRoundTarget(1));
  const [drawsRemaining, setDrawsRemaining] = useState(MAX_DRAWS);
  const [roundOutcome, setRoundOutcome] = useState<RoundOutcome>('active');
  const [recentCards, setRecentCards] = useState<RecentCardEntry[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [drawAnimations, setDrawAnimations] = useState<DrawAnimation[]>([]);
  const [lastDrawScore, setLastDrawScore] = useState(0);
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
  const [betFeedback, setBetFeedback] = useState<string | null>(null);
  const [readyToPersist, setReadyToPersist] = useState(false);
  const hasLoadedRef = useRef(false);

  const selectedBet = useMemo(
    () => (selectedBetId ? betOptionMap.get(selectedBetId) ?? null : null),
    [selectedBetId]
  );

  const activeRecentCards = recentCards.filter((entry) => entry.status !== 'exit');
  const exitingRecentCards = recentCards.filter((entry) => entry.status === 'exit');
  const displayedRecentCards = [...activeRecentCards, ...exitingRecentCards];

  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StoredGameState>;

        if (parsed.deck && Array.isArray(parsed.deck) && parsed.deck.length > 0) {
          const hydratedDeck = parsed.deck.map(normalizeStoredCard);
          deckRef.current = hydratedDeck;
          setDeck(hydratedDeck);
        } else {
          const freshDeck = shuffleDeck(createDeck());
          deckRef.current = freshDeck;
          setDeck(freshDeck);
        }

        setBank(typeof parsed.bank === 'number' && !Number.isNaN(parsed.bank) ? parsed.bank : 0);

        const storedRound = typeof parsed.roundNumber === 'number' && parsed.roundNumber > 0
          ? Math.floor(parsed.roundNumber)
          : 1;
        setRoundNumber(storedRound);

        setRoundScore(
          typeof parsed.roundScore === 'number' && parsed.roundScore >= 0 ? parsed.roundScore : 0
        );

        if (typeof parsed.roundTarget === 'number' && parsed.roundTarget > 0) {
          setRoundTarget(parsed.roundTarget);
        } else {
          setRoundTarget(calculateRoundTarget(storedRound));
        }

        setDrawsRemaining(
          typeof parsed.drawsRemaining === 'number' && parsed.drawsRemaining >= 0 && parsed.drawsRemaining <= MAX_DRAWS
            ? parsed.drawsRemaining
            : MAX_DRAWS
        );

        setRoundOutcome(
          parsed.roundOutcome === 'won' || parsed.roundOutcome === 'lost' ? parsed.roundOutcome : 'active'
        );

        if (parsed.selectedBetId && betOptionMap.has(parsed.selectedBetId)) {
          setSelectedBetId(parsed.selectedBetId);
        }

        if (parsed.recentCards && Array.isArray(parsed.recentCards)) {
          setRecentCards(
            parsed.recentCards.map((entry) => ({
              ...entry,
              card: normalizeStoredCard(entry.card),
              status: 'idle' as RecentCardStatus
            }))
          );
        } else {
          setRecentCards([]);
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
      setBank(0);
      setRoundNumber(1);
      setRoundScore(0);
      setRoundTarget(calculateRoundTarget(1));
      setDrawsRemaining(MAX_DRAWS);
      setRoundOutcome('active');
      setSelectedBetId(null);
      setRecentCards([]);
    } finally {
      hasLoadedRef.current = true;
      setReadyToPersist(true);
    }
  }, []);

  useEffect(() => {
    if (!readyToPersist || typeof window === 'undefined') return;

    const sanitizedRecentCards = recentCards.map((entry) => ({
      ...entry,
      status: 'idle' as RecentCardStatus
    }));

    const payload: StoredGameState = {
      deck,
      bank,
      roundNumber,
      roundScore,
      roundTarget,
      drawsRemaining,
      roundOutcome,
      selectedBetId,
      recentCards: sanitizedRecentCards
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to persist game state to localStorage.', error);
    }
  }, [
    deck,
    bank,
    roundNumber,
    roundScore,
    roundTarget,
    drawsRemaining,
    roundOutcome,
    selectedBetId,
    recentCards,
    readyToPersist
  ]);

  const gainRatio = roundTarget > 0 ? lastDrawScore / roundTarget : 0;
  let scoreCardClass =
    'rounded-xl px-6 py-5 bg-gray-900/50 border border-gray-800 shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition-all duration-200';
  let totalScoreClass = 'text-slate-100';
  let gainScoreClass = lastDrawScore > 0 ? 'text-sky-400' : 'text-rose-400';
  let ratioTagClass = lastDrawScore > 0 ? 'text-sky-300/80' : 'text-rose-400/80';
  const ratioLabel = lastDrawScore > 0
    ? `${Math.min(Math.round(gainRatio * 100), 999)}% of round target`
    : 'Missed bet';

  if (lastDrawScore === 0) {
    scoreCardClass =
      'rounded-xl px-6 py-5 bg-gradient-to-br from-rose-500/15 via-gray-900/55 to-gray-950 border border-rose-400/40 shadow-[0_16px_40px_rgba(244,63,94,0.2)] transition-all duration-200';
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
    }, {} as Record<string, BetOption[]>);
  }, []);

  const roundProgress = roundTarget > 0 ? Math.min(roundScore / roundTarget, 1) : 0;

  const drawCard = () => {
    if (roundOutcome !== 'active') return;
    if (!selectedBet) {
      setBetFeedback('Select a bet before drawing a card.');
      return;
    }

    let deckToUse = deckRef.current;
    if (!deckToUse || deckToUse.length === 0) {
      deckToUse = shuffleDeck(createDeck());
    }

    const [drawnCard, ...remainingDeck] = deckToUse;
    if (!drawnCard) return;

    deckRef.current = remainingDeck;
    setDeck(remainingDeck);

    const baseScore =
      drawnCard.rank === 'Joker' ? 20 : Math.max(getRankValue(drawnCard.rank), 2);
    const betHit = selectedBet.check(drawnCard);
    const drawScore = betHit
      ? Math.floor(baseScore * selectedBet.multiplier)
      : Math.floor(baseScore * 0.35);

    const floatingScore: FloatingScore = {
      id: `score-${Date.now()}`,
      value: drawScore,
      hit: betHit
    };
    setFloatingScores((prev) => [...prev, floatingScore]);
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((entry) => entry.id !== floatingScore.id));
    }, 2000);

    const newRoundScore = roundScore + drawScore;
    const newDrawsRemaining = drawsRemaining - 1;

    setRoundScore(newRoundScore);
    setDrawsRemaining(newDrawsRemaining);
    setLastDrawScore(drawScore);

    const newEntry: RecentCardEntry = {
      id: `${drawnCard.id}-${Date.now()}`,
      card: drawnCard,
      status: 'enter',
      betId: selectedBet.id,
      betHit,
      gain: drawScore
    };

    setRecentCards((prev) => {
      const normalized = prev.map((entry) =>
        entry.status === 'enter'
          ? { ...entry, status: 'idle' as RecentCardStatus }
          : entry
      );

      const activeEntries = normalized.filter((entry) => entry.status !== 'exit');
      const exitEntries = normalized.filter((entry) => entry.status === 'exit');

      const nextActive = [newEntry, ...activeEntries];

      const keptActive: RecentCardEntry[] = [];
      const overflowActive: RecentCardEntry[] = [];

      nextActive.forEach((entry, index) => {
        if (index < 6) {
          keptActive.push(entry);
        } else {
          overflowActive.push({ ...entry, status: 'exit' as RecentCardStatus });
        }
      });

      return [...keptActive, ...overflowActive, ...exitEntries];
    });

    const animationId = `draw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setDrawAnimations((prev) => [...prev, { id: animationId, card: drawnCard }]);

    if (newRoundScore >= roundTarget) {
      setRoundOutcome('won');
      setBank((prev) => prev + newRoundScore);
      setBetFeedback('Round cleared! Start the next round to press your luck.');
    } else if (newDrawsRemaining <= 0) {
      setRoundOutcome('lost');
      setBank(0);
      setBetFeedback('Round failed. Reset the run to try again.');
    } else {
      setBetFeedback(
        betHit
          ? `Hit! ${selectedBet.label} paid ${drawScore} points.`
          : `Missed ${selectedBet.label}. Only ${drawScore} points.`
      );
    }
  };

  const handleRecentCardExitComplete = (entryId: string) => {
    setRecentCards((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const handleDrawAnimationEnd = (animationId: string) => {
    setDrawAnimations((prev) => prev.filter((animation) => animation.id !== animationId));
  };

  const advanceRound = () => {
    const nextRoundNumber = roundOutcome === 'won' ? roundNumber + 1 : roundNumber;
    const refreshedDeck = shuffleDeck(createDeck());
    deckRef.current = refreshedDeck;
    setDeck(refreshedDeck);
    setRoundNumber(nextRoundNumber);
    setRoundTarget(calculateRoundTarget(nextRoundNumber));
    setRoundScore(0);
    setDrawsRemaining(MAX_DRAWS);
    setRoundOutcome('active');
    setLastDrawScore(0);
    setFloatingScores([]);
    setDrawAnimations([]);
    setRecentCards([]);
    setSelectedBetId(null);
    setBetFeedback(null);
  };

  const resetRun = () => {
    const refreshedDeck = shuffleDeck(createDeck());
    deckRef.current = refreshedDeck;
    setDeck(refreshedDeck);
    setBank(0);
    setRoundNumber(1);
    setRoundTarget(calculateRoundTarget(1));
    setRoundScore(0);
    setDrawsRemaining(MAX_DRAWS);
    setRoundOutcome('active');
    setLastDrawScore(0);
    setFloatingScores([]);
    setDrawAnimations([]);
    setRecentCards([]);
    setSelectedBetId(null);
    setBetFeedback(null);
  };

  const hardResetGame = () => {
    if (typeof window === 'undefined') return;
    const confirmed = window.confirm('ARE YOU SURE?');
    if (!confirmed) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove stored game state.', error);
    }

    resetRun();
  };

  const drawButtonDisabled =
    roundOutcome !== 'active' || !selectedBet || drawsRemaining <= 0;

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Panel - gameplay */}
      <div className="w-[35%] bg-gray-950 border-r border-gray-900 flex flex-col">
        <div className="p-8 border-b border-gray-900 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Card Risk</h1>
            <div className="text-xs uppercase tracking-widest text-gray-500 mt-2">
              Round {roundNumber} • Target {roundTarget} • Bank {bank}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Draws</div>
            <div className="text-lg font-semibold text-sky-300">
              {drawsRemaining}/{MAX_DRAWS}
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 space-y-6 overflow-y-auto">
          {/* Deck and score */}
          <div className="relative">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Deck</div>
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
              onClick={drawCard}
              disabled={drawButtonDisabled}
              className={`w-full text-white font-medium py-4 rounded-lg transition-all ${
                drawButtonDisabled
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-800'
                  : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border border-blue-500/60 shadow-[0_12px_22px_rgba(37,99,235,0.25)]'
              }`}
            >
              {roundOutcome === 'active'
                ? selectedBet
                  ? `Draw with ${selectedBet.label}`
                  : 'Select a bet to draw'
                : roundOutcome === 'won'
                  ? 'Round cleared'
                  : 'Round failed'}
            </button>
            {betFeedback && (
              <div className="mt-2 text-sm text-gray-300">{betFeedback}</div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">
              Recent Cards
            </div>
            {displayedRecentCards.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {displayedRecentCards.map((entry) => {
                  const activeIndex = activeRecentCards.findIndex((item) => item.id === entry.id);
                  const activeCount = activeRecentCards.length;
                  const opacity =
                    activeIndex === -1
                      ? 0.4
                      : activeCount === 1
                        ? 1
                        : 0.4 + ((activeCount - activeIndex - 1) / (activeCount - 1)) * 0.6;

                  const betLabel = entry.betId ? betOptionMap.get(entry.betId)?.label ?? '' : '';

                  return (
                    <RecentCardItem
                      key={entry.id}
                      card={entry.card}
                      status={entry.status}
                      opacity={opacity}
                      betHit={entry.betHit}
                      gain={entry.gain}
                      betLabel={betLabel}
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
              onClick={advanceRound}
              disabled={roundOutcome !== 'won'}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                roundOutcome === 'won'
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30'
                  : 'bg-gray-900 border border-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Start Next Round
            </button>
            <div className="flex gap-3">
              <button
                onClick={resetRun}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-medium py-3 rounded-lg transition-colors border border-gray-800"
              >
                Reset Run
              </button>
              <button
                onClick={hardResetGame}
                className="flex-1 bg-red-900/30 hover:bg-red-900/40 text-red-400 hover:text-red-200 font-semibold py-3 rounded-lg transition-colors border border-red-700/60"
              >
                Hard Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - betting interface */}
      <div className="w-[65%] p-12 overflow-y-auto">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-blue-400">Bet the Next Card</h2>
            <p className="text-sm text-gray-400 mt-2">
              Choose exactly one prediction before each draw. Hitting your bet multiplies the card
              value; missing it clips your gain. Clear the round target in four draws to bank the
              points.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-gray-500">Bank</div>
            <div className="text-3xl font-bold text-sky-300">{bank}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
          {Object.entries(betsByCategory).map(([category, options]) => (
            <div key={category} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
              <div className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                {category} Bets
              </div>
              <div className="space-y-3">
                {options.map((option) => {
                  const isSelected = selectedBetId === option.id;
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
                          {option.multiplier.toFixed(2)}× · {option.risk.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">{option.description}</div>
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
}
