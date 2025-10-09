import type { Suit, Rank } from './types';

interface CardProps {
  suit: Suit;
  rank: Rank;
  isJoker?: boolean;
  jokerColor?: 'red' | 'black';
  onClick?: () => void;
}

export default function Card({ suit, rank, onClick, isJoker, jokerColor }: CardProps) {
  const resolvedIsJoker = isJoker || rank === 'Joker' || suit === 'Joker';
  const displaySuit = resolvedIsJoker ? '🃏' : suit;
  const isRedSuit = suit === '♥' || suit === '♦' || (resolvedIsJoker && jokerColor === 'red');
  const textColor = resolvedIsJoker
    ? jokerColor === 'red'
      ? 'text-red-500'
      : 'text-indigo-600'
    : isRedSuit
      ? 'text-red-600'
      : 'text-slate-900';
  const accentColor = resolvedIsJoker
    ? jokerColor === 'red'
      ? 'bg-gradient-to-br from-rose-100 via-white to-amber-100'
      : 'bg-gradient-to-br from-slate-100 via-white to-sky-100'
    : 'bg-white';
  const cornerRank = resolvedIsJoker ? 'Jk' : rank;

  const backgroundStyle = resolvedIsJoker
    ? {
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.8), transparent 55%), radial-gradient(circle at 80% 30%, rgba(226, 232, 240, 0.9), transparent 60%), repeating-linear-gradient(45deg, rgba(99, 102, 241, 0.12), rgba(99, 102, 241, 0.12) 6px, rgba(236, 72, 153, 0.12) 6px, rgba(236, 72, 153, 0.12) 12px)'
      }
    : {
        backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(248, 250, 252, 0.9), transparent 60%), radial-gradient(circle at 80% 80%, rgba(226, 232, 240, 0.6), transparent 65%), repeating-linear-gradient(135deg, rgba(14, 116, 144, 0.08), rgba(14, 116, 144, 0.08) 5px, rgba(14, 116, 144, 0.02) 5px, rgba(14, 116, 144, 0.02) 10px)'
      };

  return (
    <div
      onClick={onClick}
      className={`
        relative w-24 h-32 ${accentColor} rounded-xl border border-slate-200
        flex flex-col items-center justify-center ${onClick ? 'cursor-pointer' : 'cursor-default'}
        shadow-[0_8px_24px_rgba(15,23,42,0.28)]
        hover:shadow-[0_14px_32px_rgba(15,23,42,0.35)] hover:-translate-y-1 transition-all duration-200 ease-out
        ${textColor}
      `}
      style={backgroundStyle}
    >
      <div className="absolute inset-2 rounded-lg border border-white/50" />
      <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
        <div className="absolute w-full h-full opacity-10 bg-[radial-gradient(circle,_rgba(30,64,175,0.4)_10%,_transparent_50%)] blur-md" />
      </div>

      <div className="absolute top-3 left-3 flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">{cornerRank}</span>
        <span className="text-lg">{displaySuit}</span>
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col items-start leading-tight rotate-180">
        <span className="text-sm font-semibold">{cornerRank}</span>
        <span className="text-lg">{displaySuit}</span>
      </div>

      {resolvedIsJoker ? (
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-5xl leading-none">🃏</span>
          <span className="text-xs font-semibold tracking-[0.3em] uppercase text-slate-500">
            Joker
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="text-4xl">{displaySuit}</div>
          <div className="text-lg font-semibold tracking-wide uppercase text-slate-500/70">
            {rank}
          </div>
        </div>
      )}
    </div>
  );
}
