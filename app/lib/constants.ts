import type { DeckModifier } from './types';

export const STORAGE_KEY = 'card-clicker-rogue-v1';
export const THEME_STORAGE_KEY = 'card-clicker-theme';
export const PROFILES_KEY = 'card-clicker-profiles';
export const ACTIVE_PROFILE_KEY = 'card-clicker-active-profile';

export const BASE_DRAWS = 5;
export const BASE_INTEREST = 0.05;
export const GUARANTEED_DRAW_VALUE = 12;
export const MAX_RECENT_CARDS = 6;

export const DEFAULT_DECK_MODIFIERS: Required<DeckModifier> = {
  extraDraws: 0,
  flatBonus: 0,
  interestBonus: 0,
  startingBank: 0
};

export const getProfileStorageKey = (profileId: string) =>
  `${STORAGE_KEY}-${profileId}`;
