'use client';

import { useState, useEffect, useRef } from 'react';
import Card, { type CardType, type Suit, type Rank } from '@/components/Card';
import RecentCardItem, { type RecentCardStatus } from '@/components/RecentCardItem';

interface FloatingScore {
  id: string;
  value: number;
}

const suits: Suit[] = ['♠', '♥', '♦', '♣'];
const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface Upgrade {
  id: string;
  type: 'sameSuitMult' | 'sameRankMult' | 'card';
  name: string;
  cost: number;
  value?: number;
  card?: CardType;
}

interface RecentCardEntry {
  id: string;
  card: CardType;
  status: RecentCardStatus;
}

interface DrawAnimation {
  id: string;
  card: CardType;
}

interface StoredGameState {
  deck: CardType[];
  score: number;
  recentCards: RecentCardEntry[];
  sameSuitMult: number;
  sameRankMult: number;
  upgrades: Upgrade[];
}

const STORAGE_KEY = 'card-clicker-progress-v1';

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
  if (rank === 'Joker') return 15;
  if (rank === 'A') return 11;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank);
}

function generateRandomCard(): CardType {
  if (Math.random() < 0.05) {
    return createJokerCard(Math.random() > 0.5 ? 'red' : 'black');
  }
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  return { suit, rank, id: `${rank}${suit}-${Date.now()}` };
}

function generateUpgrades(): Upgrade[] {
  const upgrades: Upgrade[] = [];

  upgrades.push({
    id: 'suit-mult-1',
    type: 'sameSuitMult',
    name: 'Same Suit Multiplier',
    cost: 50,
    value: 0.5
  });

  upgrades.push({
    id: 'rank-mult-1',
    type: 'sameRankMult',
    name: 'Same Rank Multiplier',
    cost: 50,
    value: 0.5
  });

  for (let i = 0; i < 4; i++) {
    const card = generateRandomCard();
    upgrades.push({
      id: `card-${i}`,
      type: 'card',
      name: `${card.rank}${card.suit}`,
      cost: 100,
      card
    });
  }

  return upgrades;
}

export default function Home() {
  const [deck, setDeck] = useState<CardType[]>(createDeck());
  const [score, setScore] = useState(0);
  const [recentCards, setRecentCards] = useState<RecentCardEntry[]>([]);
  const [sameSuitMult, setSameSuitMult] = useState(1);
  const [sameRankMult, setSameRankMult] = useState(1);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [replacingCard, setReplacingCard] = useState<CardType | null>(null);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [lastScoreAdded, setLastScoreAdded] = useState<number>(0);
  const [drawAnimations, setDrawAnimations] = useState<DrawAnimation[]>([]);
  const [readyToPersist, setReadyToPersist] = useState(false);
  const hasLoadedRef = useRef(false);
  const deckRef = useRef<CardType[]>(deck);

  const activeRecentCards = recentCards.filter(entry => entry.status !== 'exit');
  const exitingRecentCards = recentCards.filter(entry => entry.status === 'exit');
  const displayedRecentCards = [...activeRecentCards, ...exitingRecentCards];

  const previousScore = Math.max(score - lastScoreAdded, 0);
  const ratioDenominator = previousScore > 0 ? previousScore : Math.max(lastScoreAdded, 1);
  const gainRatio = lastScoreAdded > 0 ? lastScoreAdded / ratioDenominator : 0;
  let scoreCardClass =
    'rounded-xl px-6 py-5 bg-gray-900/50 border border-gray-800 shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition-all duration-200';
  let totalScoreClass = 'text-slate-100';
  let gainScoreClass = lastScoreAdded > 0 ? 'text-sky-400' : 'text-gray-500';
  let ratioTagClass = lastScoreAdded > 0 ? 'text-sky-300/80' : 'text-gray-600';
  let ratioLabel = '';

  if (lastScoreAdded > 0) {
    const ratioPercentRaw = gainRatio * 100;
    const roundedPercent = Math.round(Math.min(ratioPercentRaw, 999));
    if (ratioPercentRaw >= 100) {
      ratioLabel = '100%+ of progress';
    } else if (roundedPercent <= 0 && ratioPercentRaw > 0) {
      ratioLabel = '<1% of progress';
    } else {
      ratioLabel = `${roundedPercent}% of progress`;
    }

    if (gainRatio >= 0.75) {
      scoreCardClass =
        'rounded-xl px-6 py-5 bg-gradient-to-br from-amber-500/20 via-gray-900/55 to-gray-950 border border-amber-400/50 shadow-[0_18px_45px_rgba(251,191,36,0.25)] transition-all duration-200';
      totalScoreClass = 'text-amber-200';
      gainScoreClass = 'text-amber-300';
      ratioTagClass = 'text-amber-200/80';
    } else if (gainRatio >= 0.4) {
      scoreCardClass =
        'rounded-xl px-6 py-5 bg-gradient-to-br from-emerald-500/18 via-gray-900/55 to-gray-950 border border-emerald-400/40 shadow-[0_16px_40px_rgba(16,185,129,0.22)] transition-all duration-200';
      totalScoreClass = 'text-emerald-200';
      gainScoreClass = 'text-emerald-300';
      ratioTagClass = 'text-emerald-200/80';
    } else if (gainRatio >= 0.18) {
      scoreCardClass =
        'rounded-xl px-6 py-5 bg-gradient-to-br from-sky-500/15 via-gray-900/55 to-gray-950 border border-sky-400/30 shadow-[0_14px_35px_rgba(56,189,248,0.2)] transition-all duration-200';
      totalScoreClass = 'text-sky-200';
      gainScoreClass = 'text-sky-300';
      ratioTagClass = 'text-sky-200/80';
    } else {
      gainScoreClass = 'text-sky-400';
      ratioTagClass = 'text-sky-300/80';
    }
  }

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

        setScore(typeof parsed.score === 'number' && !Number.isNaN(parsed.score) ? parsed.score : 0);
        setSameSuitMult(
          typeof parsed.sameSuitMult === 'number' && parsed.sameSuitMult > 0 ? parsed.sameSuitMult : 1
        );
        setSameRankMult(
          typeof parsed.sameRankMult === 'number' && parsed.sameRankMult > 0 ? parsed.sameRankMult : 1
        );
        if (parsed.upgrades && Array.isArray(parsed.upgrades) && parsed.upgrades.length > 0) {
          const hydratedUpgrades = parsed.upgrades.map((item) =>
            item.type === 'card' && item.card
              ? {
                  ...item,
                  card: normalizeStoredCard(item.card)
                }
              : item
          );
          setUpgrades(hydratedUpgrades);
        } else {
          setUpgrades(generateUpgrades());
        }
        if (parsed.recentCards && Array.isArray(parsed.recentCards)) {
          setRecentCards(
            parsed.recentCards.map(entry => ({
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
        setUpgrades(generateUpgrades());
      }
    } catch (error) {
      console.warn('Failed to load stored game state, resetting progress.', error);
      const freshDeck = shuffleDeck(createDeck());
      deckRef.current = freshDeck;
      setDeck(freshDeck);
      setUpgrades(generateUpgrades());
      setScore(0);
      setSameSuitMult(1);
      setSameRankMult(1);
      setRecentCards([]);
    } finally {
      hasLoadedRef.current = true;
      setReadyToPersist(true);
    }
  }, [hasLoadedRef]);

  useEffect(() => {
    if (!readyToPersist || typeof window === 'undefined') return;

    const sanitizedRecentCards = recentCards.map(entry => ({
      ...entry,
      status: 'idle' as RecentCardStatus
    }));

    const stateToStore: StoredGameState = {
      deck,
      score,
      recentCards: sanitizedRecentCards,
      sameSuitMult,
      sameRankMult,
      upgrades
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
    } catch (error) {
      console.warn('Failed to persist game state to localStorage.', error);
    }
  }, [deck, score, recentCards, sameSuitMult, sameRankMult, upgrades, readyToPersist]);

  const drawCard = () => {
    let deckToUse = deckRef.current;

    if (!deckToUse) {
      deckToUse = createDeck();
    }

    if (deckToUse.length === 0) {
      deckToUse = shuffleDeck(createDeck());
    }

    if (deckToUse.length === 0) {
      return;
    }

    const [drawnCard, ...remainingDeck] = deckToUse;
    if (!drawnCard) {
      return;
    }

    deckRef.current = remainingDeck;
    setDeck(remainingDeck);

    let cardScore = getRankValue(drawnCard.rank);

    const lastCard = recentCards.find(entry => entry.status !== 'exit')?.card;
    if (lastCard) {
      if (lastCard.suit === drawnCard.suit) {
        cardScore *= sameSuitMult;
      }
      if (lastCard.rank === drawnCard.rank) {
        cardScore *= sameRankMult;
      }
    }

    const finalScore = Math.floor(cardScore);

    const floatingScore: FloatingScore = {
      id: `score-${Date.now()}`,
      value: finalScore
    };
    setFloatingScores(prev => [...prev, floatingScore]);

    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== floatingScore.id));
    }, 2000);

    setScore(prev => prev + finalScore);
    setLastScoreAdded(finalScore);

    const cardForQueue = drawnCard;

    setRecentCards(prev => {
      const normalized = prev.map(entry =>
        entry.status === 'enter'
          ? { ...entry, status: 'idle' as RecentCardStatus }
          : entry
      );

      const activeEntries = normalized.filter(entry => entry.status !== 'exit');
      const exitEntries = normalized.filter(entry => entry.status === 'exit');

      const newEntry: RecentCardEntry = {
        id: `${cardForQueue.id}-${Date.now()}`,
        card: cardForQueue,
        status: 'enter'
      };

      const nextActive = [newEntry, ...activeEntries];

      const keptActive: RecentCardEntry[] = [];
      const overflowActive: RecentCardEntry[] = [];

      nextActive.forEach((entry, index) => {
        if (index < 5) {
          keptActive.push(entry);
        } else {
          overflowActive.push({ ...entry, status: 'exit' as RecentCardStatus });
        }
      });

      return [...keptActive, ...overflowActive, ...exitEntries];
    });

    const animationId = `draw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setDrawAnimations(prev => [...prev, { id: animationId, card: cardForQueue }]);
  };

  const handleRecentCardExitComplete = (entryId: string) => {
    setRecentCards(prev => prev.filter(entry => entry.id !== entryId));
  };

  const handleDrawAnimationEnd = (animationId: string) => {
    setDrawAnimations(prev => prev.filter(animation => animation.id !== animationId));
  };

  const applyFreshState = () => {
    const refreshedDeck = shuffleDeck(createDeck());
    deckRef.current = refreshedDeck;
    setDeck(refreshedDeck);
    setScore(0);
    setRecentCards([]);
    setSameSuitMult(1);
    setSameRankMult(1);
    setUpgrades(generateUpgrades());
    setReplacingCard(null);
    setFloatingScores([]);
    setLastScoreAdded(0);
    setDrawAnimations([]);
  };

  const buyUpgrade = (upgrade: Upgrade) => {
    if (score < upgrade.cost) return;

    setScore(prev => prev - upgrade.cost);

    if (upgrade.type === 'sameSuitMult') {
      const increment = upgrade.value ?? 0.5;
      const nextCost = Math.max(upgrade.cost + 10, Math.floor(upgrade.cost * 1.5));

      setSameSuitMult(prev => prev + increment);
      setUpgrades(prev =>
        prev.map(u =>
          u.id === upgrade.id
            ? {
                id: `suit-mult-${Date.now()}`,
                type: 'sameSuitMult',
                name: 'Same Suit Multiplier',
                cost: nextCost,
                value: increment
              }
            : u
        )
      );
    } else if (upgrade.type === 'sameRankMult') {
      const increment = upgrade.value ?? 0.5;
      const nextCost = Math.max(upgrade.cost + 10, Math.floor(upgrade.cost * 1.5));

      setSameRankMult(prev => prev + increment);
      setUpgrades(prev =>
        prev.map(u =>
          u.id === upgrade.id
            ? {
                id: `rank-mult-${Date.now()}`,
                type: 'sameRankMult',
                name: 'Same Rank Multiplier',
                cost: nextCost,
                value: increment
              }
            : u
        )
      );
    } else if (upgrade.type === 'card' && upgrade.card) {
      if (deckRef.current.length >= 54) {
        setReplacingCard(upgrade.card);
        return;
      }

      setDeck(prev => {
        const updated = [...prev, upgrade.card];
        deckRef.current = updated;
        return updated;
      });

      const newCard = generateRandomCard();
      setUpgrades(prev =>
        prev.map(u =>
          u.id === upgrade.id
            ? {
                id: `card-${Date.now()}`,
                type: 'card',
                name: `${newCard.rank}${newCard.suit}`,
                cost: upgrade.cost,
                card: newCard
              }
            : u
        )
      );
    }
  };

  const replaceCard = (oldCard: CardType) => {
    if (!replacingCard) return;

    const replacement = replacingCard;

    setDeck(prev => {
      const updated = prev.map(card => (card.id === oldCard.id ? replacement : card));
      deckRef.current = updated;
      return updated;
    });
    setReplacingCard(null);

    setUpgrades(prev => {
      const index = prev.findIndex(u => u.card?.id === replacement.id);
      if (index === -1) {
        return prev;
      }

      const newCard = generateRandomCard();
      const current = prev[index];
      const next = [...prev];
      next[index] = {
        id: `card-${Date.now()}`,
        type: 'card',
        name: `${newCard.rank}${newCard.suit}`,
        cost: current?.cost ?? 100,
        card: newCard
      };
      return next;
    });
  };

  const resetGame = () => {
    applyFreshState();
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
    applyFreshState();
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Panel - 35% */}
      <div className="w-[35%] bg-gray-950 border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-gray-800">
          <h1 className="text-3xl font-bold text-blue-400">Card Clicker</h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 space-y-6 overflow-y-auto">
          {/* Deck & Score */}
          <div className="relative">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Deck</div>
              <div className="text-sm text-gray-400">{deck.length} cards</div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-4">
              <div className="relative h-56 bg-gray-900/50 rounded-xl border border-gray-800 flex flex-1 items-center justify-start px-8 overflow-hidden">
                {/* Deck stack */}
                <div className="relative w-32 h-44">
                  {[...Array(Math.min(8, Math.max(1, Math.ceil(deck.length / 10))))].map((_, i) => (
                    <div
                      key={i}
                      className="deck-card-layer absolute inset-0 rounded-lg"
                      style={{
                        transform: `translate(${i * 1.5}px, ${i * -1.5}px)`,
                        zIndex: 10 - i,
                        opacity: 1 - (i * 0.08)
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

                {/* Floating scores */}
                {floatingScores.map((fs) => (
                  <div
                    key={fs.id}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-4xl font-bold text-blue-400"
                    style={{ animation: 'floatUp 2s ease-out forwards' }}
                  >
                    +{fs.value}
                  </div>
                ))}
              </div>

              <div className={`w-full md:w-[220px] lg:w-[240px] flex flex-col justify-between gap-3 ${scoreCardClass}`}>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Score</div>
                  <div className={`text-5xl font-bold leading-tight ${totalScoreClass}`}>
                    {Math.floor(score)}
                  </div>
                </div>
                {lastScoreAdded > 0 ? (
                  <div className="flex flex-col gap-1">
                    <span className={`text-2xl font-semibold ${gainScoreClass}`}>
                      +{lastScoreAdded}
                    </span>
                    <span className={`text-xs uppercase tracking-wide ${ratioTagClass}`}>
                      {ratioLabel}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs uppercase tracking-wide text-gray-600">
                    Draw a card to build your score
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={drawCard}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium py-4 rounded-lg transition-colors"
            >
              Draw Card
            </button>
          </div>

          {/* Multipliers */}
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">Multipliers</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm py-2 px-3 bg-gray-900/50 rounded-lg border border-gray-800">
                <span className="text-gray-400">Same Suit</span>
                <span className="text-blue-400 font-medium">{sameSuitMult.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between text-sm py-2 px-3 bg-gray-900/50 rounded-lg border border-gray-800">
                <span className="text-gray-400">Same Rank</span>
                <span className="text-blue-400 font-medium">{sameRankMult.toFixed(1)}x</span>
              </div>
            </div>
          </div>

          {/* Recent Cards */}
          {displayedRecentCards.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">Recent Cards</div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {displayedRecentCards.map((entry) => {
                  const activeIndex = activeRecentCards.findIndex(item => item.id === entry.id);
                  const activeCount = activeRecentCards.length;
                  const opacity = activeIndex === -1
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
                      onExitComplete={entry.status === 'exit' ? () => handleRecentCardExitComplete(entry.id) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-800 space-y-3">
          <button
            onClick={resetGame}
            className="w-full bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-medium py-3 rounded-lg transition-colors border border-gray-800"
          >
            Reset Game
          </button>
          <button
            onClick={hardResetGame}
            className="w-full bg-red-900/30 hover:bg-red-900/40 text-red-400 hover:text-red-200 font-semibold py-3 rounded-lg transition-colors border border-red-700/60"
          >
            Hard Reset (Wipe Progress)
          </button>
        </div>
      </div>

      {/* Right Panel - 65% */}
      <div className="w-[65%] p-12 overflow-y-auto">
        <h2 className="text-2xl font-bold text-blue-400 mb-8">Upgrades</h2>

        <div className="grid grid-cols-3 gap-6">
          {upgrades.map((upgrade) => (
            <button
              key={upgrade.id}
              onClick={() => buyUpgrade(upgrade)}
              disabled={score < upgrade.cost}
              className={`
                relative p-6 rounded-xl border transition-all
                ${score >= upgrade.cost
                  ? 'bg-gray-900/40 border-blue-600/50 hover:border-blue-500 hover:bg-gray-900/60 cursor-pointer'
                  : 'bg-gray-900/20 border-gray-800 opacity-30 cursor-not-allowed'
                }
              `}
            >
              {upgrade.type === 'card' && upgrade.card ? (
                <div className="flex flex-col items-center space-y-4">
                  <Card
                    suit={upgrade.card.suit}
                    rank={upgrade.card.rank}
                    isJoker={upgrade.card.isJoker}
                    jokerColor={upgrade.card.jokerColor}
                  />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{upgrade.cost}</div>
                    <div className="text-xs text-gray-500 mt-1">points</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-300 font-medium leading-snug">
                    {upgrade.name}
                  </div>
                  <div className="pt-2 border-t border-gray-800">
                    <div className="text-xs text-gray-500 mb-1">Cost</div>
                    <div className="text-2xl font-bold text-blue-400">{upgrade.cost}</div>
                  </div>
                  <div className="text-xs text-gray-600">+0.5x multiplier</div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Card Replacement Modal */}
      {replacingCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
          <div className="bg-gray-950 rounded-2xl border border-gray-800 p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-blue-400 mb-2">Replace a Card</h2>
            <p className="text-gray-400 mb-8">Your deck is full. Select a card to replace:</p>

            <div className="grid grid-cols-10 gap-3 mb-8">
              {deck.map((card) => (
                <button
                  key={card.id}
                  onClick={() => replaceCard(card)}
                  className="hover:scale-105 transition-transform"
                >
                  <Card
                    suit={card.suit}
                    rank={card.rank}
                    isJoker={card.isJoker}
                    jokerColor={card.jokerColor}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={() => setReplacingCard(null)}
              className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white font-medium py-3 px-6 rounded-lg transition-colors border border-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
