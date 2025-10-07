'use client';

import { useState, useEffect } from 'react';
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
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank);
}

function generateRandomCard(): CardType {
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

  const activeRecentCards = recentCards.filter(entry => entry.status !== 'exit');
  const exitingRecentCards = recentCards.filter(entry => entry.status === 'exit');
  const displayedRecentCards = [...activeRecentCards, ...exitingRecentCards];

  useEffect(() => {
    setDeck(shuffleDeck(createDeck()));
    setUpgrades(generateUpgrades());
  }, []);

  const drawCard = () => {
    if (deck.length === 0) {
      setDeck(shuffleDeck(createDeck()));
      return;
    }

    const [drawnCard, ...remainingDeck] = deck;
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

    setScore(score + finalScore);
    setLastScoreAdded(finalScore);

    setRecentCards(prev => {
      const normalized = prev.map(entry =>
        entry.status === 'enter'
          ? { ...entry, status: 'idle' as RecentCardStatus }
          : entry
      );

      const activeEntries = normalized.filter(entry => entry.status !== 'exit');
      const exitEntries = normalized.filter(entry => entry.status === 'exit');

      const newEntry: RecentCardEntry = {
        id: `${drawnCard.id}-${Date.now()}`,
        card: drawnCard,
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
  };

  const handleRecentCardExitComplete = (entryId: string) => {
    setRecentCards(prev => prev.filter(entry => entry.id !== entryId));
  };

  const buyUpgrade = (upgrade: Upgrade) => {
    if (score < upgrade.cost) return;

    setScore(score - upgrade.cost);

    if (upgrade.type === 'sameSuitMult') {
      setSameSuitMult(sameSuitMult + (upgrade.value || 0));
      setUpgrades(upgrades.filter(u => u.id !== upgrade.id));
      setTimeout(() => {
        setUpgrades(prev => [...prev, {
          id: `suit-mult-${Date.now()}`,
          type: 'sameSuitMult',
          name: 'Same Suit Multiplier',
          cost: Math.floor(upgrade.cost * 1.5),
          value: 0.5
        }]);
      }, 100);
    } else if (upgrade.type === 'sameRankMult') {
      setSameRankMult(sameRankMult + (upgrade.value || 0));
      setUpgrades(upgrades.filter(u => u.id !== upgrade.id));
      setTimeout(() => {
        setUpgrades(prev => [...prev, {
          id: `rank-mult-${Date.now()}`,
          type: 'sameRankMult',
          name: 'Same Rank Multiplier',
          cost: Math.floor(upgrade.cost * 1.5),
          value: 0.5
        }]);
      }, 100);
    } else if (upgrade.type === 'card' && upgrade.card) {
      if (deck.length >= 52) {
        setReplacingCard(upgrade.card);
      } else {
        setDeck([...deck, upgrade.card]);
        setUpgrades(upgrades.filter(u => u.id !== upgrade.id));
        setTimeout(() => {
          const newCard = generateRandomCard();
          setUpgrades(prev => [...prev, {
            id: `card-${Date.now()}`,
            type: 'card',
            name: `${newCard.rank}${newCard.suit}`,
            cost: 100,
            card: newCard
          }]);
        }, 100);
      }
    }
  };

  const replaceCard = (oldCard: CardType) => {
    if (!replacingCard) return;

    setDeck(deck.map(card => card.id === oldCard.id ? replacingCard : card));
    setReplacingCard(null);

    setUpgrades(upgrades.filter(u => u.card?.id !== replacingCard.id));
    setTimeout(() => {
      const newCard = generateRandomCard();
      setUpgrades(prev => [...prev, {
        id: `card-${Date.now()}`,
        type: 'card',
        name: `${newCard.rank}${newCard.suit}`,
        cost: 100,
        card: newCard
      }]);
    }, 100);
  };

  const resetGame = () => {
    setDeck(shuffleDeck(createDeck()));
    setScore(0);
    setRecentCards([]);
    setSameSuitMult(1);
    setSameRankMult(1);
    setUpgrades(generateUpgrades());
    setReplacingCard(null);
    setFloatingScores([]);
    setLastScoreAdded(0);
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
          {/* Score */}
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Score</div>
            <div className="text-6xl font-bold text-white mb-2">{Math.floor(score)}</div>
            {lastScoreAdded > 0 && (
              <div className="text-lg text-blue-400 font-medium">+{lastScoreAdded}</div>
            )}
          </div>

          {/* Deck */}
          <div className="relative">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Deck</div>
              <div className="text-sm text-gray-400">{deck.length} cards</div>
            </div>

            <div className="relative h-56 bg-gray-900/50 rounded-xl border border-gray-800 flex items-center justify-center mb-4">
              {/* Deck stack */}
              <div className="relative w-32 h-44">
                {[...Array(Math.min(8, Math.max(1, Math.ceil(deck.length / 10))))].map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg"
                    style={{
                      transform: `translate(${i * 1.5}px, ${i * -1.5}px)`,
                      zIndex: 10 - i,
                      opacity: 1 - (i * 0.08)
                    }}
                  />
                ))}
              </div>

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
        <div className="p-8 border-t border-gray-800">
          <button
            onClick={resetGame}
            className="w-full bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white font-medium py-3 rounded-lg transition-colors border border-gray-800"
          >
            Reset Game
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
                  <Card suit={upgrade.card.suit} rank={upgrade.card.rank} />
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
                  <Card suit={card.suit} rank={card.rank} />
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
