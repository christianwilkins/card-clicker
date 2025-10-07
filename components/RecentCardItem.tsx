'use client';

import { memo } from 'react';
import Card, { type CardType } from '@/components/Card';

export type RecentCardStatus = 'enter' | 'idle' | 'exit';

interface RecentCardItemProps {
  card: CardType;
  status: RecentCardStatus;
  opacity: number;
  betHit: boolean;
  gain: number;
  betLabel?: string;
  onExitComplete?: () => void;
}

function RecentCardItemComponent({
  card,
  status,
  opacity,
  betHit,
  gain,
  betLabel,
  onExitComplete
}: RecentCardItemProps) {
  return (
    <div
      className="recent-card-item flex-shrink-0 w-28"
      data-status={status}
      data-hit={betHit ? 'true' : 'false'}
      style={{ opacity }}
      onAnimationEnd={status === 'exit' ? onExitComplete : undefined}
    >
      <div
        className={`relative pointer-events-none scale-90 rounded-xl border-2 overflow-visible ${
          betHit
            ? 'border-emerald-400/80 bg-emerald-500/10'
            : 'border-rose-500/70 bg-rose-500/5'
        }`}
      >
        <Card
          suit={card.suit}
          rank={card.rank}
          isJoker={card.isJoker}
          jokerColor={card.jokerColor}
        />
        <div
          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow ${
            betHit
              ? 'bg-emerald-500/90 text-emerald-950 shadow-[0_6px_12px_rgba(16,185,129,0.45)]'
              : 'bg-rose-500/90 text-rose-50 shadow-[0_6px_12px_rgba(244,63,94,0.4)]'
          }`}
        >
          {betHit ? 'HIT' : 'MISS'} · {gain}
        </div>
      </div>
      {betLabel && (
        <div className="mt-4 text-[11px] text-center text-gray-400 leading-tight">
          {betLabel}
        </div>
      )}
    </div>
  );
}

const RecentCardItem = memo(RecentCardItemComponent);
export default RecentCardItem;
