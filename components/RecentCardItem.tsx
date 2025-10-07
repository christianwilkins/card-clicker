'use client';

import { memo } from 'react';
import Card, { type CardType } from '@/components/Card';

export type RecentCardStatus = 'enter' | 'idle' | 'exit';

interface RecentCardItemProps {
  card: CardType;
  status: RecentCardStatus;
  opacity: number;
  onExitComplete?: () => void;
}

function RecentCardItemComponent({ card, status, opacity, onExitComplete }: RecentCardItemProps) {
  return (
    <div
      className="recent-card-item flex-shrink-0"
      data-status={status}
      style={{ opacity }}
      onAnimationEnd={status === 'exit' ? onExitComplete : undefined}
    >
      <div className="pointer-events-none scale-90">
        <Card suit={card.suit} rank={card.rank} />
      </div>
    </div>
  );
}

const RecentCardItem = memo(RecentCardItemComponent);
export default RecentCardItem;
