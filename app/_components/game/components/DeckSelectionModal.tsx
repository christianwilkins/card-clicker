import { cn } from '../../utils';
import type { DeckPreset, PlayerProfile, ThemeMode } from '../../types';
import type { ThemePalette } from '../theme';

interface DeckSelectionModalProps {
  isOpen: boolean;
  pendingDeckId: string;
  onCancel: () => void;
  onConfirm: () => void;
  onSelectDeck: (deckId: string) => void;
  deckPresets: DeckPreset[];
  currentProfile: PlayerProfile | null;
  isDeckUnlocked: (profile: PlayerProfile | null, preset: DeckPreset) => boolean;
  palette: ThemePalette;
  textPalette: ThemePalette['text'];
  buttonPalette: ThemePalette['button'];
  buttonBase: string;
  disabledButtonClasses: string;
  theme: ThemeMode;
  formatDisplayNumber: (value: number) => string;
  canStart: boolean;
}

export function DeckSelectionModal({
  isOpen,
  onCancel,
  onConfirm,
  onSelectDeck,
  deckPresets,
  currentProfile,
  isDeckUnlocked,
  palette,
  textPalette,
  buttonPalette,
  buttonBase,
  disabledButtonClasses,
  theme,
  formatDisplayNumber,
  pendingDeckId,
  canStart
}: DeckSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl"
      onClick={onCancel}
    >
      <div
        className={cn('w-full max-w-4xl space-y-6 rounded-3xl p-8', palette.surfaceMuted)}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className={cn('text-xl font-semibold', textPalette.primary)}>Choose Your Deck</h3>
            <p className={cn('mt-2 text-sm', textPalette.secondary)}>
              Locked decks unlock on each profile as you hit their milestone requirement.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              buttonBase,
              buttonPalette.muted,
              'h-9 w-9 justify-center rounded-full px-0 text-base'
            )}
            aria-label="Close deck selection"
          >
            ×
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {deckPresets.map((preset) => {
            const unlocked = isDeckUnlocked(currentProfile, preset);
            const isSelected = pendingDeckId === preset.id;
            const modifiers = preset.modifiers ?? {};
            const modifierLines: string[] = [];

            if (modifiers.startingBank) {
              modifierLines.push(
                `Start with +${formatDisplayNumber(modifiers.startingBank)} bank.`
              );
            }
            if (modifiers.extraDraws) {
              modifierLines.push(
                `+${modifiers.extraDraws} draw${modifiers.extraDraws === 1 ? '' : 's'} each round.`
              );
            }
            if (modifiers.flatBonus) {
              modifierLines.push(`+${modifiers.flatBonus} flat score per draw.`);
            }
            if (modifiers.interestBonus) {
              modifierLines.push(
                `+${(modifiers.interestBonus * 100).toFixed(0)}% interest on banked points.`
              );
            }
            if (modifierLines.length === 0) {
              modifierLines.push('Standard odds. No modifiers.');
            }

            const badgeClasses = unlocked
              ? theme === 'dark'
                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : theme === 'dark'
                ? 'border-slate-700 bg-slate-950 text-slate-400'
                : 'border-slate-200 bg-slate-100 text-slate-500';

            const cardHighlightClasses =
              theme === 'dark'
                ? 'bg-slate-950/70 hover:border-sky-400/60 hover:bg-slate-900/70'
                : 'bg-white/90 hover:border-sky-300 hover:bg-sky-50';

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => unlocked && onSelectDeck(preset.id)}
                disabled={!unlocked}
                className={cn(
                  'flex h-full flex-col gap-3 rounded-2xl border px-5 py-6 text-left transition-all duration-200',
                  palette.borderSubtle,
                  cardHighlightClasses,
                  isSelected &&
                    (theme === 'dark'
                      ? 'border-sky-400 bg-sky-500/15 shadow-[0_22px_55px_rgba(56,189,248,0.25)]'
                      : 'border-sky-300 bg-sky-100 shadow-[0_20px_48px_rgba(59,130,246,0.18)]'),
                  !unlocked && 'cursor-not-allowed opacity-60'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={cn('text-lg font-semibold', textPalette.primary)}>
                    {preset.name}
                  </span>
                  <span
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                      badgeClasses
                    )}
                  >
                    {unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
                <div className={cn('text-sm leading-relaxed', textPalette.secondary)}>
                  {preset.description}
                </div>
                <ul className="space-y-1 text-sm">
                  {modifierLines.map((line, index) => (
                    <li key={index} className={cn(textPalette.secondary)}>
                      {line}
                    </li>
                  ))}
                </ul>
                {!unlocked && preset.requirement && (
                  <div
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wide',
                      textPalette.dangerSoft
                    )}
                  >
                    {preset.requirement.label}
                  </div>
                )}
                {isSelected && unlocked && (
                  <div className={cn('text-xs uppercase tracking-[0.3em]', textPalette.accent)}>
                    Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className={cn(buttonBase, buttonPalette.muted, 'w-full sm:w-auto')}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canStart}
            className={cn(
              buttonBase,
              canStart ? buttonPalette.accent : disabledButtonClasses,
              'w-full sm:w-auto'
            )}
          >
            Start Run
          </button>
        </div>
      </div>
    </div>
  );
}
