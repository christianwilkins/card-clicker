'use client';

import { memo } from 'react';
import Card, { type CardType } from '@/components/Card';
import { formatDisplayNumber } from '@/lib/formatNumber';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

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
      className={cn(
        'w-28 flex-shrink-0 transition-all duration-200',
        status === 'enter' && 'animate-recent-enter',
        status === 'exit' && 'animate-recent-exit pointer-events-none'
      )}
      data-status={status}
      data-hit={betHit ? 'true' : 'false'}
      style={{ opacity }}
      onAnimationEnd={status === 'exit' ? onExitComplete : undefined}
    >
      <div
        className={cn(
          'relative overflow-visible rounded-xl border-2',
          betHit
            ? 'border-emerald-300/70 bg-emerald-400/10 dark:border-emerald-400/80 dark:bg-emerald-500/10'
            : 'border-rose-300/70 bg-rose-400/10 dark:border-rose-500/70 dark:bg-rose-500/10'
        )}
      >
        <Card
          suit={card.suit}
          rank={card.rank}
          isJoker={card.isJoker}
          jokerColor={card.jokerColor}
        />
        <div
          className={cn(
            'absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow',
            betHit
              ? 'bg-emerald-500 text-emerald-50 shadow-[0_6px_12px_rgba(16,185,129,0.35)]'
              : 'bg-rose-500 text-rose-50 shadow-[0_6px_12px_rgba(244,63,94,0.35)]'
          )}
        >
          {betHit ? 'HIT' : 'MISS'} · {formatDisplayNumber(gain)}
        </div>
      </div>
      {betLabel && (
        <div className="mt-4 text-center text-[11px] leading-tight text-slate-500 dark:text-slate-300">
          {betLabel}
        </div>
      )}
    </div>
  );
}

const RecentCardItem = memo(RecentCardItemComponent);
export default RecentCardItem;
