import type { ReactNode } from 'react';

import { cn } from '../../utils';
import type { ThemePalette } from '../theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  palette: ThemePalette;
  textPalette: ThemePalette['text'];
  buttonPalette: ThemePalette['button'];
  buttonBase: string;
  themeToggleButton: ReactNode;
  musicToggleButton: ReactNode;
}

export function SettingsModal({
  isOpen,
  onClose,
  palette,
  textPalette,
  buttonPalette,
  buttonBase,
  themeToggleButton,
  musicToggleButton
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className={cn('w-full max-w-sm space-y-6 rounded-3xl p-6', palette.surfaceMuted)}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className={cn('text-lg font-semibold', textPalette.primary)}>Settings</h3>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              buttonBase,
              buttonPalette.muted,
              'h-9 w-9 justify-center rounded-full px-0 text-base'
            )}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <span className={cn('text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
              Theme
            </span>
            {themeToggleButton}
          </div>
          <div className="space-y-2">
            <span className={cn('text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
              Music
            </span>
            {musicToggleButton}
          </div>
        </div>
      </div>
    </div>
  );
}
