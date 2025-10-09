import type { ReactNode } from 'react';

import Card from '../../CardComponent';
import { cn } from '../../utils';
import type { CardType } from '../../types';
import type { ThemePalette } from '../theme';

interface GameOverOverlayProps {
  palette: ThemePalette;
  textPalette: ThemePalette['text'];
  buttonPalette: ThemePalette['button'];
  buttonBase: string;
  formatDisplayNumber: (value: number) => string;
  bank: number;
  roundNumber: number;
  ownedUpgradeCount: number;
  interestRate: number;
  lastDrawnCard: CardType | null;
  onStartNewRun: () => void;
  onReturnToMenu: () => void;
  settingsButton: ReactNode;
}

export function GameOverOverlay({
  palette,
  textPalette,
  buttonPalette,
  buttonBase,
  formatDisplayNumber,
  bank,
  roundNumber,
  ownedUpgradeCount,
  interestRate,
  lastDrawnCard,
  onStartNewRun,
  onReturnToMenu,
  settingsButton
}: GameOverOverlayProps) {
  return (
    <div className={cn('fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl')}>
      <div className={cn('w-full max-w-3xl space-y-10 rounded-3xl p-12 text-center', palette.surfaceMuted)}>
        <div>
          <h2 className={cn('mb-4 text-4xl font-bold', textPalette.danger)}>Run Lost</h2>
          <p className={cn('text-lg leading-relaxed', textPalette.secondary)}>
            You ran out of draws before hitting the target. Reset here or head back to the menu to tweak your plan.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-left md:grid-cols-4">
          <div className={cn('rounded-2xl p-5', palette.surfaceCard)}>
            <div className={cn('mb-2 text-xs uppercase tracking-wider', textPalette.secondary)}>Bank</div>
            <div className={cn('text-3xl font-semibold', textPalette.accent)}>
              {formatDisplayNumber(bank)}
            </div>
          </div>
          <div className={cn('rounded-2xl p-5', palette.surfaceCard)}>
            <div className={cn('mb-2 text-xs uppercase tracking-wider', textPalette.secondary)}>
              Round Reached
            </div>
            <div className={cn('text-3xl font-semibold', textPalette.positive)}>{roundNumber}</div>
          </div>
          <div className={cn('rounded-2xl p-5', palette.surfaceCard)}>
            <div className={cn('mb-2 text-xs uppercase tracking-wider', textPalette.secondary)}>
              Relics Owned
            </div>
            <div className={cn('text-3xl font-semibold', textPalette.warning)}>
              {ownedUpgradeCount}
            </div>
          </div>
          <div className={cn('rounded-2xl p-5', palette.surfaceCard)}>
            <div className={cn('mb-2 text-xs uppercase tracking-wider', textPalette.secondary)}>
              Interest Rate
            </div>
            <div className={cn('text-3xl font-semibold', textPalette.positive)}>
              {(interestRate * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <button onClick={onStartNewRun} className={cn(buttonBase, buttonPalette.accent, 'w-full')}>
            Launch New Run
          </button>
          <button onClick={onReturnToMenu} className={cn(buttonBase, buttonPalette.muted, 'w-full')}>
            Return to Main Menu
          </button>
        </div>
        {lastDrawnCard && (
          <div className={cn('mx-auto mt-6 w-32 text-center', textPalette.secondary)}>
            <div className="mb-2 text-xs uppercase tracking-[0.3em]">Last Draw</div>
            <div className={cn('rounded-2xl border p-3', palette.borderSubtle)}>
              <Card
                suit={lastDrawnCard.suit}
                rank={lastDrawnCard.rank}
                isJoker={lastDrawnCard.isJoker}
                jokerColor={lastDrawnCard.jokerColor}
              />
            </div>
          </div>
        )}
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {settingsButton}
      </div>
    </div>
  );
}
