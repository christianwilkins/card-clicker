import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import type { ShopUpgrade } from '@/app/lib/types';
import type { ThemePalette } from '@/app/lib/theme';

interface ShopViewProps {
  palette: ThemePalette;
  textPalette: ThemePalette['text'];
  buttonPalette: ThemePalette['button'];
  buttonBase: string;
  formatDisplayNumber: (value: number) => string;
  roundNumber: number;
  roundScore: number;
  bank: number;
  interestRate: number;
  onProceed: () => void;
  onReturnToMenu: () => void;
  message: string | null;
  settingsButton: ReactNode;
  shopChoices: ShopUpgrade[];
  rarityStyles: Record<string, { card: string; badge: string }>;
  onBuyUpgrade: (upgrade: ShopUpgrade) => void;
  betLabelForId: (id: string) => string;
}

export function ShopView({
  palette,
  textPalette,
  buttonPalette,
  buttonBase,
  formatDisplayNumber,
  roundNumber,
  roundScore,
  bank,
  interestRate,
  onProceed,
  onReturnToMenu,
  message,
  settingsButton,
  shopChoices,
  rarityStyles,
  onBuyUpgrade,
  betLabelForId
}: ShopViewProps) {
  return (
    <div className={cn('min-h-screen flex flex-col gap-8 lg:flex-row', palette.shell)}>
      <div className={cn('w-full max-w-xl space-y-8 p-8 lg:max-w-sm', palette.panelLeft)}>
        <div className="space-y-3">
          <div className={cn('text-xs uppercase tracking-wider', textPalette.secondary)}>
            Round Cleared
          </div>
          <div className={cn('text-4xl font-bold', textPalette.positive)}>
            Round {roundNumber}
          </div>
          <p className={cn('text-sm leading-relaxed', textPalette.secondary)}>
            You banked {formatDisplayNumber(roundScore)} points. Spend some now or roll them into the
            next round.
          </p>
        </div>
        <div className={cn('space-y-3 rounded-2xl p-6', palette.surfaceCard)}>
          <div className={cn('text-xs uppercase tracking-wider', textPalette.secondary)}>Bank</div>
          <div className={cn('text-3xl font-semibold', textPalette.accent)}>
            {formatDisplayNumber(bank)}
          </div>
          <div className={cn('text-sm font-semibold', textPalette.positive)}>
            {(interestRate * 100).toFixed(0)}% interest next round
          </div>
          <div className={cn('text-xs', textPalette.secondary)}>
            Unspent points stay banked between rounds.
          </div>
        </div>
        <button onClick={onProceed} className={cn(buttonBase, buttonPalette.positive, 'w-full')}>
          Continue to Round {roundNumber + 1}
        </button>
        <button onClick={onReturnToMenu} className={cn(buttonBase, buttonPalette.muted, 'w-full')}>
          Return to Main Menu
        </button>
        {message && <div className={cn('text-sm', textPalette.secondary)}>{message}</div>}
        <div className="flex flex-wrap items-center gap-3">{settingsButton}</div>
      </div>
      <div className={cn('flex-1 overflow-y-auto px-6 pb-16 pt-14 lg:px-12', palette.panelRight)}>
        <h2 className={cn('mb-6 text-3xl font-bold', textPalette.accent)}>Upgrade Shop</h2>
        <p className={cn('mb-12 max-w-3xl leading-relaxed', textPalette.secondary)}>
          Grab the upgrades that fit your build, stack the bank, then jump back into the next round.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {shopChoices.map((choice) => {
            const styles = rarityStyles[choice.rarity];

            return (
              <div
                key={choice.id}
                className={cn(
                  'flex h-full flex-col gap-4 rounded-2xl p-6 transition-shadow duration-200 hover:-translate-y-1',
                  palette.surfaceCard,
                  styles.card
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-3xl leading-none">{choice.icon}</div>
                  <div className="flex-1">
                    <div className={cn('text-lg font-semibold', textPalette.primary)}>
                      {choice.name}
                    </div>
                    <div className={cn('mt-1 text-sm leading-snug', textPalette.secondary)}>
                      {choice.description}
                    </div>
                  </div>
                  <div className={cn('rounded-full px-2 py-1 text-[11px] font-bold', styles.badge)}>
                    {choice.rarity.toUpperCase()}
                  </div>
                </div>
                <ul className={cn('space-y-2 text-sm', textPalette.secondary)}>
                  {choice.effects.map((effect, index) => {
                    switch (effect.type) {
                      case 'extraDraws':
                        return <li key={index}>+{effect.value} draw(s) per round</li>;
                      case 'flatBonus':
                        return <li key={index}>+{effect.value} flat points every draw</li>;
                      case 'interestRate':
                        return (
                          <li key={index}>+{(effect.value * 100).toFixed(0)}% interest on bank</li>
                        );
                      case 'betMultiplier': {
                        const label = betLabelForId(effect.betId);
                        return (
                          <li key={index}>
                            +{effect.value.toFixed(2)}× multiplier to {label}
                          </li>
                        );
                      }
                      case 'synergyMultiplier':
                        return (
                          <li key={index}>
                            +{effect.value.toFixed(2)}× per {effect.tag} item
                          </li>
                        );
                      case 'transformation':
                        return <li key={index}>Transformation piece {effect.piece}/3</li>;
                      case 'conditionalBonus':
                        if (effect.bankReward) {
                          return <li key={index}>+{effect.bankReward} bank on hit</li>;
                        }
                        if (effect.bankPenalty) {
                          return <li key={index}>-{effect.bankPenalty} bank on miss</li>;
                        }
                        if (effect.multiplier) {
                          return (
                            <li key={index}>+{effect.multiplier.toFixed(1)}× on {effect.condition}</li>
                          );
                        }
                        return null;
                      case 'comboCounter':
                        return (
                          <li key={index}>
                            +{effect.value.toFixed(2)}× per consecutive hit
                          </li>
                        );
                      case 'globalMultiplier':
                        return (
                          <li key={index}>
                            +{effect.value.toFixed(2)}× to ALL bets
                          </li>
                        );
                      default:
                        return null;
                    }
                  })}
                </ul>
                <div
                  className={cn(
                    'mt-auto flex items-center justify-between border-t pt-4',
                    palette.borderSubtle
                  )}
                >
                  <div className={cn('text-sm', textPalette.secondary)}>Cost</div>
                  <div className={cn('text-lg font-semibold', textPalette.accent)}>
                    {formatDisplayNumber(choice.cost)}
                  </div>
                </div>
                <button
                  onClick={() => onBuyUpgrade(choice)}
                  className={cn(buttonBase, buttonPalette.accent, 'w-full')}
                >
                  Buy Upgrade
                </button>
              </div>
            );
          })}
          {shopChoices.length === 0 && (
            <div className={cn('col-span-full text-sm', textPalette.secondary)}>
              You picked up every upgrade. Continue to the next round when ready.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
