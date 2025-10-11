import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import type { ThemePalette } from '@/app/lib/theme';

interface ShopTransitionOverlayProps {
  palette: ThemePalette;
  textPalette: ThemePalette['text'];
  settingsButton: ReactNode;
  message: string | null;
}

export function ShopTransitionOverlay({
  palette,
  textPalette,
  settingsButton,
  message
}: ShopTransitionOverlayProps) {
  return (
    <div className={cn('min-h-screen flex flex-col items-center justify-center gap-6 p-6', palette.shell)}>
      <div
        className={cn(
          'mx-auto w-full max-w-xl space-y-6 rounded-3xl px-10 py-10 text-center transition-all duration-300',
          palette.surfaceMuted
        )}
      >
        <div className={cn('text-sm uppercase tracking-[0.4em]', textPalette.secondary)}>
          Round Cleared
        </div>
        <div className={cn('text-3xl font-bold', textPalette.positive)}>Counting Rewards...</div>
        <p className={cn('text-lg leading-relaxed', textPalette.secondary)}>
          {message ?? 'Adding up draws, doubles, and interest for the bank...'}
        </p>
        <div className={cn('text-sm', textPalette.secondary)}>Opening upgrade shop</div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {settingsButton}
      </div>
    </div>
  );
}
