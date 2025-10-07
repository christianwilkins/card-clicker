export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface CardType {
  suit: Suit;
  rank: Rank;
  id: string;
}

interface CardProps {
  suit: Suit;
  rank: Rank;
  onClick?: () => void;
}

export default function Card({ suit, rank, onClick }: CardProps) {
  const isRed = suit === '♥' || suit === '♦';

  return (
    <div
      onClick={onClick}
      className={`
        w-24 h-32 bg-white rounded-lg border border-gray-200
        flex flex-col items-center justify-center cursor-pointer
        shadow-[0_4px_12px_rgba(0,0,0,0.3)]
        hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:scale-105 transition-all
        ${isRed ? 'text-red-600' : 'text-black'}
      `}
    >
      <div className="text-2xl font-bold">{rank}</div>
      <div className="text-4xl">{suit}</div>
    </div>
  );
}