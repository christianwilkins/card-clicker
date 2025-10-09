import type { ChangeEvent, ReactNode } from 'react';

import { cn } from '../../utils';
import type { PlayerProfile, ThemeMode } from '../../types';
import type { ThemePalette } from '../theme';

interface MenuScreenProps {
  palette: ThemePalette;
  textPalette: ThemePalette['text'];
  buttonPalette: ThemePalette['button'];
  buttonBase: string;
  settingsButton: ReactNode;
  bank: number;
  currentProfile: PlayerProfile | null;
  roundNumber: number;
  ownedUpgradeCount: number;
  formatDisplayNumber: (value: number) => string;
  activeProfileId: string | null;
  onContinueRun: () => void;
  onStartNewRun: () => void;
  newProfileName: string;
  onProfileNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSaveProfile: () => void;
  profiles: PlayerProfile[];
  profileSelectionId: string | null;
  onProfileSelectionChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onLoadProfile: () => void;
  onDeleteProfile: () => void;
  theme: ThemeMode;
  deckCount: number;
  getProfileStorageKey: (profileId: string) => string;
  profileMessage: string | null;
}

export function MenuScreen({
  palette,
  textPalette,
  buttonPalette,
  buttonBase,
  settingsButton,
  bank,
  currentProfile,
  roundNumber,
  ownedUpgradeCount,
  formatDisplayNumber,
  activeProfileId,
  onContinueRun,
  onStartNewRun,
  newProfileName,
  onProfileNameChange,
  onSaveProfile,
  profiles,
  profileSelectionId,
  onProfileSelectionChange,
  onLoadProfile,
  onDeleteProfile,
  theme,
  deckCount,
  getProfileStorageKey,
  profileMessage
}: MenuScreenProps) {
  const hasSavedGame =
    typeof window !== 'undefined' &&
    !!(activeProfileId && window.localStorage.getItem(getProfileStorageKey(activeProfileId)));

  const bestRound = currentProfile?.bestRound ?? roundNumber;

  return (
    <div className={cn('min-h-screen flex items-center justify-center px-6 py-16', palette.menuShell)}>
      <div className="w-full max-w-2xl">
        <div className={cn('space-y-8 rounded-3xl p-8 lg:p-12', palette.surfaceCard)}>
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className={palette.themeBadge}>Arcade Build</div>
            </div>
            <h1 className={cn('text-5xl font-extrabold tracking-tight', textPalette.primary)}>
              Card Clicker
            </h1>
            <p className={cn('text-base leading-relaxed', textPalette.secondary)}>
              Flip fast, bank smarter, and experiment with new relic builds between rounds.
            </p>
          </div>

          <div className="flex justify-center gap-8 text-center">
            <div className="space-y-1">
              <div className={cn('text-xs uppercase tracking-wider', textPalette.secondary)}>
                Bank
              </div>
              <div className={cn('text-2xl font-semibold', textPalette.accent)}>
                {formatDisplayNumber(bank)}
              </div>
            </div>
            <div className="space-y-1">
              <div className={cn('text-xs uppercase tracking-wider', textPalette.secondary)}>
                Best Round
              </div>
              <div className={cn('text-2xl font-semibold', textPalette.positive)}>{bestRound}</div>
            </div>
            <div className="space-y-1">
              <div className={cn('text-xs uppercase tracking-wider', textPalette.secondary)}>
                Relics
              </div>
              <div className={cn('text-2xl font-semibold', textPalette.warning)}>
                {ownedUpgradeCount}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {hasSavedGame ? (
              <>
                <button
                  onClick={onContinueRun}
                  className={cn(buttonBase, buttonPalette.accent, 'w-full py-4 text-lg')}
                >
                  Continue Run
                </button>
                <button
                  onClick={onStartNewRun}
                  className={cn(buttonBase, buttonPalette.accentSecondary, 'w-full')}
                >
                  Start New Run
                </button>
              </>
            ) : (
              <button
                onClick={onStartNewRun}
                className={cn(buttonBase, buttonPalette.accent, 'w-full py-4 text-lg')}
              >
                Start New Run
              </button>
            )}
          </div>

          <div className={cn('space-y-3 border-t pt-6', palette.borderSubtle)}>
            <div className="text-center">
              <div className={cn('text-xs uppercase tracking-wider', textPalette.secondary)}>
                Active Profile
              </div>
              <div className={cn('text-lg font-semibold', textPalette.primary)}>
                {currentProfile?.name ?? 'No Profile'}
              </div>
              <div className={cn('text-xs', textPalette.secondary)}>
                {currentProfile ? currentProfile.unlockedDecks.length : 0}/{deckCount} Decks
                Unlocked
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newProfileName}
                onChange={onProfileNameChange}
                placeholder="New profile name"
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400',
                  palette.borderSubtle,
                  theme === 'dark' ? 'bg-slate-950/70 text-slate-100' : 'bg-white text-slate-900'
                )}
              />
              <button
                onClick={onSaveProfile}
                className={cn(buttonBase, buttonPalette.accent, 'whitespace-nowrap')}
              >
                Save
              </button>
            </div>

            {profileMessage && (
              <div className={cn('text-xs font-medium', textPalette.secondary)}>{profileMessage}</div>
            )}

            {profiles.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={profileSelectionId ?? ''}
                  onChange={onProfileSelectionChange}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400',
                    palette.borderSubtle,
                    theme === 'dark' ? 'bg-slate-950/70 text-slate-100' : 'bg-white text-slate-900'
                  )}
                >
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={onLoadProfile}
                  className={cn(buttonBase, buttonPalette.accentSecondary)}
                  disabled={!profileSelectionId || profileSelectionId === activeProfileId}
                >
                  Load
                </button>
                <button
                  onClick={onDeleteProfile}
                  className={cn(buttonBase, buttonPalette.danger)}
                  disabled={!profileSelectionId || profiles.length <= 1}
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-center">{settingsButton}</div>
        </div>
      </div>
    </div>
  );
}
