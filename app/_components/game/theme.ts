import type { Rarity, ThemeMode } from '../types';

interface TextPalette {
  primary: string;
  secondary: string;
  accent: string;
  accentSoft: string;
  positive: string;
  positiveSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
}

interface ButtonPalette {
  accent: string;
  accentSecondary: string;
  positive: string;
  warning: string;
  danger: string;
  muted: string;
}

interface ScorePalette {
  neutral: string;
  accent: string;
  positive: string;
  warning: string;
  danger: string;
  legendary: string;
}

interface BetPalette {
  card: string;
  active: string;
}

interface TagPalette {
  extreme: string;
  high: string;
  medium: string;
  low: string;
}

export interface ThemePalette {
  shell: string;
  menuShell: string;
  panelLeft: string;
  panelRight: string;
  surfaceCard: string;
  surfaceMuted: string;
  borderSubtle: string;
  borderDanger: string;
  text: TextPalette;
  button: ButtonPalette;
  score: ScorePalette;
  bet: BetPalette;
  tags: TagPalette;
  deckLayer: string;
  themeBadge: string;
  bulletIcon: string;
}

const darkPalette: ThemePalette = {
  shell: 'bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-100',
  menuShell: 'bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-100',
  panelLeft:
    'bg-slate-950/80 border border-slate-800 shadow-[0_25px_60px_rgba(2,6,23,0.65)] backdrop-blur-xl',
  panelRight:
    'bg-slate-950/70 border border-slate-800 shadow-[0_20px_55px_rgba(2,6,23,0.55)] backdrop-blur-xl',
  surfaceCard:
    'bg-slate-950/70 border border-slate-800 shadow-[0_20px_55px_rgba(2,6,23,0.5)] backdrop-blur-xl',
  surfaceMuted:
    'bg-slate-950/85 border border-slate-800 shadow-[0_30px_70px_rgba(2,6,23,0.65)] backdrop-blur-xl',
  borderSubtle: 'border-slate-800/70',
  borderDanger: 'border-rose-500/60',
  text: {
    primary: 'text-slate-100',
    secondary: 'text-slate-300',
    accent: 'text-sky-300',
    accentSoft: 'text-sky-300/70',
    positive: 'text-emerald-300',
    positiveSoft: 'text-emerald-300/70',
    warning: 'text-amber-300',
    warningSoft: 'text-amber-300/70',
    danger: 'text-rose-300',
    dangerSoft: 'text-rose-300/70'
  },
  button: {
    accent:
      'bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-400 shadow-[0_20px_45px_rgba(56,189,248,0.35)]',
    accentSecondary:
      'bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/40 shadow-[0_12px_25px_rgba(56,189,248,0.2)]',
    positive:
      'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400 shadow-[0_20px_45px_rgba(16,185,129,0.35)]',
    warning:
      'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 shadow-[0_20px_45px_rgba(251,191,36,0.35)]',
    danger:
      'bg-rose-500 hover:bg-rose-400 text-slate-50 border border-rose-400 shadow-[0_20px_45px_rgba(244,63,94,0.35)]',
    muted:
      'bg-slate-900/50 hover:bg-slate-900/70 text-slate-200 border border-slate-700 shadow-[0_12px_30px_rgba(2,6,23,0.55)]'
  },
  score: {
    neutral:
      'bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 border border-slate-800 shadow-[0_25px_60px_rgba(2,6,23,0.65)]',
    accent:
      'bg-gradient-to-br from-sky-500/25 via-slate-900/80 to-slate-950 border border-sky-400/60 shadow-[0_30px_65px_rgba(37,99,235,0.45)]',
    positive:
      'bg-gradient-to-br from-emerald-500/25 via-slate-900/80 to-slate-950 border border-emerald-400/60 shadow-[0_30px_65px_rgba(16,185,129,0.45)]',
    warning:
      'bg-gradient-to-br from-amber-400/25 via-slate-900/80 to-slate-950 border border-amber-300/60 shadow-[0_30px_65px_rgba(251,191,36,0.45)]',
    danger:
      'bg-gradient-to-br from-rose-500/25 via-slate-900/80 to-slate-950 border border-rose-400/60 shadow-[0_30px_65px_rgba(244,63,94,0.45)]',
    legendary:
      'bg-gradient-to-br from-amber-300/35 via-slate-900/70 to-sky-500/30 border border-amber-300/60 shadow-[0_35px_70px_rgba(251,191,36,0.45)]'
  },
  bet: {
    card:
      'bg-slate-950/70 border border-slate-800 hover:border-sky-400/50 hover:bg-slate-900/80 transition-all duration-200 shadow-[0_12px_30px_rgba(2,6,23,0.45)]',
    active:
      'bg-gradient-to-br from-emerald-500/20 via-slate-950/80 to-slate-950 border border-emerald-400/60 shadow-[0_20px_45px_rgba(16,185,129,0.4)]'
  },
  tags: {
    extreme:
      'border border-rose-400/40 bg-rose-500/15 text-rose-300 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
    high:
      'border border-amber-300/40 bg-amber-400/15 text-amber-300 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
    medium:
      'border border-sky-400/40 bg-sky-500/15 text-sky-300 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
    low:
      'border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full'
  },
  deckLayer:
    'absolute inset-0 rounded-xl bg-gradient-to-br from-sky-600 to-sky-500 shadow-[0_10px_30px_rgba(8,12,24,0.55)]',
  themeBadge:
    'inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-1 text-xs font-semibold tracking-[0.4em] text-sky-200',
  bulletIcon: 'border border-sky-400/40 bg-sky-500/15 text-sky-200'
};

const lightPalette: ThemePalette = {
  shell: 'bg-slate-100 text-slate-900',
  menuShell: 'bg-slate-100 text-slate-900',
  panelLeft:
    'bg-white/85 border border-slate-200 shadow-[0_18px_45px_rgba(148,163,184,0.28)] backdrop-blur-xl',
  panelRight:
    'bg-white/80 border border-slate-200 shadow-[0_16px_40px_rgba(148,163,184,0.24)] backdrop-blur-xl',
  surfaceCard:
    'bg-white/85 border border-slate-200 shadow-[0_18px_45px_rgba(148,163,184,0.28)] backdrop-blur-xl',
  surfaceMuted:
    'bg-white/90 border border-slate-200 shadow-[0_24px_55px_rgba(148,163,184,0.28)] backdrop-blur-xl',
  borderSubtle: 'border-slate-200/80',
  borderDanger: 'border-rose-300',
  text: {
    primary: 'text-slate-900',
    secondary: 'text-slate-600',
    accent: 'text-sky-500',
    accentSoft: 'text-sky-500/80',
    positive: 'text-emerald-500',
    positiveSoft: 'text-emerald-500/80',
    warning: 'text-amber-500',
    warningSoft: 'text-amber-500/80',
    danger: 'text-rose-500',
    dangerSoft: 'text-rose-500/80'
  },
  button: {
    accent:
      'bg-sky-500 hover:bg-sky-400 text-white border border-sky-400 shadow-[0_18px_45px_rgba(56,189,248,0.35)]',
    accentSecondary:
      'bg-sky-100 hover:bg-sky-200 text-sky-600 border border-sky-200 shadow-[0_12px_25px_rgba(56,189,248,0.2)]',
    positive:
      'bg-emerald-500 hover:bg-emerald-400 text-white border border-emerald-400 shadow-[0_18px_45px_rgba(16,185,129,0.32)]',
    warning:
      'bg-amber-400 hover:bg-amber-300 text-slate-900 border border-amber-300 shadow-[0_18px_45px_rgba(251,191,36,0.32)]',
    danger:
      'bg-rose-500 hover:bg-rose-400 text-white border border-rose-400 shadow-[0_18px_45px_rgba(244,63,94,0.32)]',
    muted:
      'bg-slate-200 hover:bg-slate-300 text-slate-600 border border-slate-300 shadow-[0_12px_30px_rgba(148,163,184,0.32)]'
  },
  score: {
    neutral:
      'bg-white border border-slate-200 shadow-[0_18px_45px_rgba(148,163,184,0.28)]',
    accent:
      'bg-gradient-to-br from-sky-100 via-white to-slate-50 border border-sky-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]',
    positive:
      'bg-gradient-to-br from-emerald-100 via-white to-slate-50 border border-emerald-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]',
    warning:
      'bg-gradient-to-br from-amber-100 via-white to-slate-50 border border-amber-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]',
    danger:
      'bg-gradient-to-br from-rose-100 via-white to-slate-50 border border-rose-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]',
    legendary:
      'bg-gradient-to-br from-amber-100 via-sky-100/80 to-white border border-amber-200 shadow-[0_25px_55px_rgba(148,163,184,0.32)]'
  },
  bet: {
    card:
      'bg-white/80 border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all duration-200 shadow-[0_10px_25px_rgba(148,163,184,0.2)]',
    active:
      'bg-gradient-to-br from-emerald-100 via-white to-emerald-50 border border-emerald-300 shadow-[0_20px_45px_rgba(16,185,129,0.28)]'
  },
  tags: {
    extreme:
      'border border-rose-200 bg-rose-100/60 text-rose-600 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
    high:
      'border border-amber-200 bg-amber-100/60 text-amber-600 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
    medium:
      'border border-sky-200 bg-sky-100/60 text-sky-600 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full',
    low:
      'border border-emerald-200 bg-emerald-100/60 text-emerald-600 uppercase tracking-wide px-2 py-0.5 text-[0.7rem] font-semibold rounded-full'
  },
  deckLayer:
    'absolute inset-0 rounded-xl bg-gradient-to-br from-sky-500 to-sky-400 shadow-[0_8px_25px_rgba(148,163,184,0.35)]',
  themeBadge:
    'inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold tracking-[0.4em] text-sky-600',
  bulletIcon: 'border border-sky-200 bg-sky-100 text-sky-600'
};

export function getThemePalette(theme: ThemeMode): ThemePalette {
  return theme === 'dark' ? darkPalette : lightPalette;
}

export function getRarityStyles(
  theme: ThemeMode
): Record<Rarity, { card: string; badge: string }> {
  if (theme === 'dark') {
    return {
      common: {
        card: 'border-slate-700 shadow-[0_18px_45px_rgba(8,12,24,0.55)]',
        badge: 'border border-slate-600 bg-slate-900/70 text-slate-200'
      },
      uncommon: {
        card: 'border-emerald-500/40 shadow-[0_20px_50px_rgba(16,185,129,0.35)]',
        badge: 'border border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
      },
      rare: {
        card: 'border-sky-500/40 shadow-[0_20px_50px_rgba(56,189,248,0.35)]',
        badge: 'border border-sky-400/50 bg-sky-500/20 text-sky-100'
      },
      legendary: {
        card: 'border-amber-400/50 shadow-[0_24px_55px_rgba(251,191,36,0.4)]',
        badge: 'border border-amber-300/60 bg-amber-400/20 text-amber-100'
      }
    };
  }

  return {
    common: {
      card: 'border-slate-200 shadow-[0_16px_40px_rgba(148,163,184,0.28)]',
      badge: 'border border-slate-200 bg-slate-100 text-slate-600'
    },
    uncommon: {
      card: 'border-emerald-200 shadow-[0_18px_45px_rgba(16,185,129,0.24)]',
      badge: 'border border-emerald-200 bg-emerald-100 text-emerald-700'
    },
    rare: {
      card: 'border-sky-200 shadow-[0_18px_45px_rgba(59,130,246,0.24)]',
      badge: 'border border-sky-200 bg-sky-100 text-sky-700'
    },
    legendary: {
      card: 'border-amber-200 shadow-[0_20px_48px_rgba(251,191,36,0.3)]',
      badge: 'border border-amber-200 bg-amber-100 text-amber-700'
    }
  };
}

export function getDisabledButtonClasses(theme: ThemeMode): string {
  return theme === 'dark'
    ? 'bg-slate-900/40 text-slate-500 border border-slate-800 shadow-none'
    : 'bg-slate-200 text-slate-400 border border-slate-200 shadow-none';
}
