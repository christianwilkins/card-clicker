'use client';

import type { ThemePalette } from '@/app/lib/theme';
import { BossModifier } from '@/app/lib/types';
import { cn } from '@/app/lib/utils';

interface BossRoundBannerProps {
  boss: BossModifier;
  palette: ThemePalette;
  textPalette: ThemePalette['text'];
}

export default function BossRoundBanner({ boss, palette, textPalette }: BossRoundBannerProps) {
  return (
    <div className={cn('mb-6 rounded-xl border-2 p-4', palette.borderDanger, palette.surfaceCard)}>
      <div className={cn('mb-1 text-xs font-bold uppercase tracking-wider', textPalette.danger)}>
        ⚠️ BOSS ROUND
      </div>
      <div className={cn('text-lg font-bold', textPalette.primary)}>
        {boss.name}
      </div>
      <p className={cn('mt-1 text-sm', textPalette.secondary)}>
        {boss.description}
      </p>
    </div>
  );
}
