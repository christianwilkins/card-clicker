'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
// Old imports - commented out, using local copies now
// import Card, { type CardType, type Rank, type Suit } from '@/components/Card';
// import RecentCardItem, { type RecentCardStatus } from '@/components/RecentCardItem';
// import { formatDisplayNumber, formatSignedDisplayNumber } from '@/lib/formatNumber';

import Card from './CardComponent';
import RecentCardItem from './RecentCardItemComponent';
import { cn, formatDisplayNumber, formatSignedDisplayNumber } from './utils';
import type {
  BetCategory,
  BetOption,
  CardType,
  DeckModifier,
  DeckPreset,
  DrawAnimation,
  FloatingScore,
  GamePhase,
  OwnedUpgrade,
  PlayerProfile,
  RecentCardEntry,
  RecentCardStatus,
  RoundOutcome,
  ShopUpgrade,
  StoredGameState,
  ThemeMode,
  UpgradeEffect
} from './types';

import {
  ACTIVE_PROFILE_KEY,
  BASE_DRAWS,
  BASE_INTEREST,
  DEFAULT_DECK_MODIFIERS,
  GUARANTEED_DRAW_VALUE,
  MAX_RECENT_CARDS,
  PROFILES_KEY,
  THEME_STORAGE_KEY,
  getProfileStorageKey
} from './game/constants';
import { betOptionMap, betOptions } from './game/bets';
import { getRankValue, normalizeStoredCard, shuffleDeck } from './game/cards';
import {
  buildDeckForPreset,
  deckPresets,
  getDeckPresetById,
  mergeDeckModifiers
} from './game/decks';
import { getBossForRound } from './game/bosses';
import {
  calculateRoundTarget,
  generateShopChoices,
  getBetBonusMap,
  getExtraDraws,
  getFlatBonus,
  getGlobalMultiplier,
  getInterestBonus,
  templateByName
} from './game/upgrades';
import { getDisabledButtonClasses, getRarityStyles, getThemePalette } from './game/theme';
import { SettingsModal } from './game/components/SettingsModal';
import { DeckSelectionModal } from './game/components/DeckSelectionModal';
import { GameOverOverlay } from './game/components/GameOverOverlay';
import { ShopTransitionOverlay } from './game/components/ShopTransitionOverlay';
import { MenuScreen } from './game/components/MenuScreen';
import { ShopView } from './game/components/ShopView';

interface GameAppProps {
  initialPhase?: GamePhase;
}

interface AudioVoice {
  osc: OscillatorNode;
  pitchLfo: OscillatorNode;
  ampLfo: OscillatorNode;
  gain: GainNode;
  pitchDepth: GainNode;
  ampDepth: GainNode;
}

const getProfileById = (profilesData: PlayerProfile[], id: string | null) =>
  (id ? profilesData.find((profile) => profile.id === id) ?? null : null);

const isDeckUnlocked = (profile: PlayerProfile | null, preset: DeckPreset): boolean => {
  if (!preset.requirement) return true;
  if (!profile) return false;
  if (profile.unlockedDecks.includes(preset.id)) return true;
  if (preset.requirement.type === 'bestRound') {
    return profile.bestRound >= preset.requirement.value;
  }
  return false;
};

export default function GameApp({ initialPhase = 'menu' }: GameAppProps) {
  const [gamePhase, setGamePhaseState] = useState<GamePhase>(initialPhase);
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const setGamePhase = (phase: GamePhase) => {
    setGamePhaseState(phase);
    setIsSettingsOpen(false);
  };
  const [deck, setDeck] = useState<CardType[]>([]);
  const deckRef = useRef<CardType[]>([]);
  const [bank, setBank] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundScore, setRoundScore] = useState(0);
  const [roundTarget, setRoundTarget] = useState(calculateRoundTarget(1, []));
  const [drawsRemaining, setDrawsRemaining] = useState(BASE_DRAWS);
  const [roundOutcome, setRoundOutcome] = useState<RoundOutcome>('active');
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [drawAnimations, setDrawAnimations] = useState<DrawAnimation[]>([]);
  const [recentCards, setRecentCards] = useState<RecentCardEntry[]>([]);
  const [lastDrawScore, setLastDrawScore] = useState(0);
  const [lastDrawnCard, setLastDrawnCard] = useState<CardType | null>(null);
  const [activeDeckId, setActiveDeckId] = useState<string>(deckPresets[0].id);
  const [deckModifiers, setDeckModifiers] = useState<Required<DeckModifier>>(DEFAULT_DECK_MODIFIERS);
  const [ownedUpgrades, setOwnedUpgrades] = useState<OwnedUpgrade[]>([]);
  const [shopChoices, setShopChoices] = useState<ShopUpgrade[]>([]);
  const [purchasedShopIds, setPurchasedShopIds] = useState<string[]>([]);
  const [shopMessage, setShopMessage] = useState<string | null>(null);
  const [shopTransitionMessage, setShopTransitionMessage] = useState<string | null>(null);
  const [betFeedback, setBetFeedback] = useState<string | null>(null);
  const [readyToPersist, setReadyToPersist] = useState(false);
  const hasLoadedRef = useRef(false);
  const shopTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundFinalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [targetAchieved, setTargetAchieved] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioVoicesRef = useRef<AudioVoice[]>([]);
  const musicGainRef = useRef<GainNode | null>(null);
  const themeReadyRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const [routingReady, setRoutingReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [pendingDeckId, setPendingDeckId] = useState<string>(deckPresets[0].id);
  const [newProfileName, setNewProfileName] = useState('');
  const [comboStreak, setComboStreak] = useState(0);
  const [lastBetHit, setLastBetHit] = useState<boolean | null>(null);
  const [lockedBetCategory, setLockedBetCategory] = useState<BetCategory | null>(null);
  const [requireBetChangeAfterHit, setRequireBetChangeAfterHit] = useState(false);
  const [profileSelectionId, setProfileSelectionId] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const profilesLoadedRef = useRef(false);
  const currentProfile = useMemo(
    () => getProfileById(profiles, activeProfileId),
    [profiles, activeProfileId]
  );

  const updateActiveProfile = useCallback(
    (updater: (profile: PlayerProfile) => PlayerProfile) => {
      if (!activeProfileId) return;
      setProfiles((prev) =>
        prev.map((profile) => (profile.id === activeProfileId ? updater(profile) : profile))
      );
    },
    [activeProfileId]
  );

  const bestRoundRef = useRef(0);

  useEffect(() => {
    bestRoundRef.current = currentProfile?.bestRound ?? 0;
  }, [currentProfile]);

  useEffect(() => {
    if (profiles.length === 0) {
      if (profileSelectionId !== null) {
        setProfileSelectionId(null);
      }
      return;
    }
    const hasSelection =
      profileSelectionId && profiles.some((profile) => profile.id === profileSelectionId);
    if (hasSelection) {
      return;
    }
    if (activeProfileId && profiles.some((profile) => profile.id === activeProfileId)) {
      setProfileSelectionId(activeProfileId);
      return;
    }
    setProfileSelectionId(profiles[0].id);
  }, [profiles, activeProfileId, profileSelectionId]);

  const buildGameStatePayload = useCallback((): StoredGameState => ({
    deck,
    bank,
    roundNumber,
    roundScore,
    roundTarget,
    drawsRemaining,
    roundOutcome,
    gamePhase,
    selectedBetId,
    ownedUpgrades,
    recentCards,
    targetAchieved,
    currentShopChoices: shopChoices,
    purchasedShopIds,
    activeDeckId,
    deckModifiers,
    lockedBetCategory,
    requireBetChangeAfterHit
  }), [
    deck,
    bank,
    roundNumber,
    roundScore,
    roundTarget,
    drawsRemaining,
    roundOutcome,
    gamePhase,
    selectedBetId,
    ownedUpgrades,
    recentCards,
    targetAchieved,
    shopChoices,
    purchasedShopIds,
    activeDeckId,
    deckModifiers,
    lockedBetCategory,
    requireBetChangeAfterHit
  ]);

  const handleSaveProfile = useCallback(() => {
    const trimmedName = newProfileName.trim();
    if (!trimmedName) {
      setProfileMessage('Enter a profile name before saving.');
      return;
    }
    if (profiles.some((profile) => profile.name.toLowerCase() === trimmedName.toLowerCase())) {
      setProfileMessage('A profile with that name already exists.');
      return;
    }

    const profileId = `profile-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
    const unlockedDecks = currentProfile
      ? Array.from(new Set(currentProfile.unlockedDecks))
      : [deckPresets[0].id];
    const bestRound = currentProfile?.bestRound ?? 0;
    const nextProfile: PlayerProfile = {
      id: profileId,
      name: trimmedName,
      unlockedDecks,
      bestRound
    };

    setProfiles((prev) => [...prev, nextProfile]);
    setActiveProfileId(nextProfile.id);
    setProfileSelectionId(nextProfile.id);
    setNewProfileName('');
    setProfileMessage(`Saved profile "${nextProfile.name}".`);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          getProfileStorageKey(nextProfile.id),
          JSON.stringify(buildGameStatePayload())
        );
      } catch (error) {
        console.warn('Failed to persist saved profile to localStorage.', error);
      }
    }
  }, [newProfileName, profiles, currentProfile, buildGameStatePayload]);

  const handleLoadProfile = useCallback(() => {
    if (!profileSelectionId) {
      setProfileMessage('Select a profile to load.');
      return;
    }
    if (profileSelectionId === activeProfileId) {
      setProfileMessage('Profile already active.');
      return;
    }
    const selectedProfile = profiles.find((profile) => profile.id === profileSelectionId);
    if (!selectedProfile) {
      setProfileMessage('Could not find the selected profile.');
      return;
    }
    setActiveProfileId(profileSelectionId);
    setProfileMessage(`Loaded profile "${selectedProfile.name}".`);
  }, [profileSelectionId, activeProfileId, profiles]);

  const handleDeleteProfile = useCallback(() => {
    if (!profileSelectionId) {
      setProfileMessage('Select a profile to delete.');
      return;
    }
    if (profiles.length <= 1) {
      setProfileMessage('Keep at least one profile on disk.');
      return;
    }
    const profileToDelete = profiles.find((profile) => profile.id === profileSelectionId);
    if (!profileToDelete) {
      setProfileMessage('Could not find the selected profile.');
      return;
    }
    const remaining = profiles.filter((profile) => profile.id !== profileSelectionId);
    setProfiles(remaining);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(getProfileStorageKey(profileSelectionId));
      } catch (error) {
        console.warn('Failed to remove profile save from localStorage.', error);
      }
    }

    const nextActiveId =
      profileSelectionId === activeProfileId ? remaining[0]?.id ?? null : activeProfileId;
    setActiveProfileId(nextActiveId);
    const nextSelectionId = remaining.length > 0 ? (nextActiveId ?? remaining[0].id) : null;
    setProfileSelectionId(nextSelectionId);
    setProfileMessage(`Deleted profile "${profileToDelete.name}".`);
  }, [profileSelectionId, profiles, activeProfileId]);

  const handleProfileNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setNewProfileName(event.target.value);
    setProfileMessage(null);
  }, []);

  const handleProfileSelectionChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setProfileSelectionId(value ? value : null);
    setProfileMessage(null);
  }, []);

  const getDefaultDeckId = useCallback(() => {
    if (!currentProfile) return deckPresets[0].id;
    const activePreset = getDeckPresetById(activeDeckId);
    if (isDeckUnlocked(currentProfile, activePreset)) {
      return activePreset.id;
    }
    const fallback = deckPresets.find((preset) => isDeckUnlocked(currentProfile, preset));
    return fallback?.id ?? deckPresets[0].id;
  }, [activeDeckId, currentProfile]);

  const openDeckModal = useCallback(() => {
    const defaultDeck = getDefaultDeckId();
    setPendingDeckId(defaultDeck);
    setIsDeckModalOpen(true);
  }, [getDefaultDeckId]);

  const startNewRun = useCallback(() => {
    openDeckModal();
  }, [openDeckModal]);

  const handleDeckCancel = useCallback(() => {
    setIsDeckModalOpen(false);
  }, []);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleContinueRun = useCallback(() => {
    setGamePhase('gameplay');
    setReadyToPersist(true);
  }, []);

  const palette = useMemo(() => getThemePalette(theme), [theme]);


  const buttonBase =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed';
  const textPalette = palette.text;
  const buttonPalette = palette.button;
  const scorePalette = palette.score;
  const betPalette = palette.bet;
  const tagPalette = palette.tags;
  const disabledButtonClasses = getDisabledButtonClasses(theme);
  const rarityStyles = useMemo(() => getRarityStyles(theme), [theme]);

  const selectedBet = useMemo(
    () => (selectedBetId ? betOptionMap.get(selectedBetId) ?? null : null),
    [selectedBetId]
  );

  const betBonusMap = useMemo(() => getBetBonusMap(ownedUpgrades), [ownedUpgrades]);
  const flatBonus = useMemo(() => {
    let bonus = getFlatBonus(ownedUpgrades) + deckModifiers.flatBonus;

    // Apply boss modifier that reduces flat bonus
    const boss = getBossForRound(roundNumber);
    if (boss && boss.effect?.type === 'reduceFlatBonus' && boss.effect.value !== undefined) {
      bonus = boss.effect.value; // Set to specific value (0 for Nullifier boss)
    } else if (boss && boss.effect?.type === 'noInterest') {
      // Accountant boss reduces flat bonuses by 50%
      bonus = Math.floor(bonus * 0.5);
    }

    return bonus;
  }, [ownedUpgrades, deckModifiers.flatBonus, roundNumber]);
  const interestRate = useMemo(
    () => BASE_INTEREST + deckModifiers.interestBonus + getInterestBonus(ownedUpgrades),
    [ownedUpgrades, deckModifiers.interestBonus]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!themeReadyRef.current) {
      themeReadyRef.current = true;
      return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setRoutingReady(true);
  }, []);

  useEffect(() => {
    if (!routingReady) return;
    let target: string | null = null;
    switch (gamePhase) {
      case 'menu':
        target = '/menu';
        break;
      case 'shop':
        target = '/shop';
        break;
      case 'gameplay':
      case 'shopTransition':
      case 'gameOver':
        target = '/game';
        break;
      default:
        target = null;
    }
    if (target && pathname !== target) {
      router.replace(target);
    }
  }, [gamePhase, pathname, routingReady, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (profilesLoadedRef.current) return;

    try {
      const storedProfilesRaw = window.localStorage.getItem(PROFILES_KEY);
      let loadedProfiles: PlayerProfile[] = [];
      if (storedProfilesRaw) {
        try {
          const parsed = JSON.parse(storedProfilesRaw) as PlayerProfile[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedProfiles = parsed;
          }
        } catch (error) {
          console.warn('Failed to parse stored profiles, resetting.', error);
        }
      }

      if (loadedProfiles.length === 0) {
        loadedProfiles = [
          {
            id: `profile-${Date.now().toString(16)}`,
            name: 'Player 1',
            unlockedDecks: [deckPresets[0].id],
            bestRound: 0
          }
        ];
      }

      const storedActive = window.localStorage.getItem(ACTIVE_PROFILE_KEY);
      const initialProfileId =
        storedActive && loadedProfiles.some((profile) => profile.id === storedActive)
          ? storedActive
          : loadedProfiles[0]?.id ?? null;

      setProfiles(loadedProfiles);
      setActiveProfileId(initialProfileId);
    } finally {
      profilesLoadedRef.current = true;
    }
  }, []);

useEffect(() => {
  if (!profilesLoadedRef.current) return;
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  if (activeProfileId) {
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  }
}, [profiles, activeProfileId]);

useEffect(() => {
  if (!currentProfile) return;
  if (roundNumber <= bestRoundRef.current) return;
  bestRoundRef.current = roundNumber;
  updateActiveProfile((profile) => {
    const nextBest = Math.max(profile.bestRound, roundNumber);
    const unlocked = new Set(profile.unlockedDecks);
    deckPresets.forEach((preset) => {
      if (
        preset.requirement?.type === 'bestRound' &&
        nextBest >= preset.requirement.value
      ) {
        unlocked.add(preset.id);
      }
    });
    return {
      ...profile,
      bestRound: nextBest,
      unlockedDecks: Array.from(unlocked)
    };
  });
}, [roundNumber, currentProfile, updateActiveProfile]);

const resetGameState = () => {
  deckRef.current = [];
  setDeck([]);
  setBank(0);
  setRoundNumber(1);
  setRoundScore(0);
  setRoundTarget(calculateRoundTarget(1, []));
  setDrawsRemaining(BASE_DRAWS);
  setRoundOutcome('active');
  setSelectedBetId(null);
  setFloatingScores([]);
  setDrawAnimations([]);
  setRecentCards([]);
  setLastDrawScore(0);
  setLastDrawnCard(null);
  setOwnedUpgrades([]);
  setShopChoices([]);
  setPurchasedShopIds([]);
  setShopMessage(null);
  setShopTransitionMessage(null);
  setBetFeedback(null);
  setTargetAchieved(false);
  setLockedBetCategory(null);
  setRequireBetChangeAfterHit(false);
  setActiveDeckId(deckPresets[0].id);
  setDeckModifiers(DEFAULT_DECK_MODIFIERS);
  setIsDeckModalOpen(false);
  setPendingDeckId(deckPresets[0].id);
};

  useEffect(() => {
    if (!activeProfileId || typeof window === 'undefined') return;

    resetGameState();
    hasLoadedRef.current = false;
    setReadyToPersist(false);

    try {
      const stored = window.localStorage.getItem(getProfileStorageKey(activeProfileId));
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StoredGameState>;

        const resolvedDeckId = parsed.activeDeckId ?? deckPresets[0].id;

        const storedDeck =
          parsed.deck && Array.isArray(parsed.deck) && parsed.deck.length > 0
            ? parsed.deck.map(normalizeStoredCard)
            : shuffleDeck(buildDeckForPreset(resolvedDeckId));
        deckRef.current = storedDeck;
        setDeck(storedDeck);

        setBank(typeof parsed.bank === 'number' ? parsed.bank : 0);

        const storedRoundNumber =
          typeof parsed.roundNumber === 'number' && parsed.roundNumber > 0
            ? parsed.roundNumber
            : 1;
        setRoundNumber(storedRoundNumber);

        setRoundScore(typeof parsed.roundScore === 'number' ? parsed.roundScore : 0);

        const basePresetModifiers = getDeckPresetById(resolvedDeckId).modifiers;
        const storedDeckModifiers = mergeDeckModifiers(
          basePresetModifiers,
          parsed.deckModifiers ?? undefined
        );
        setDeckModifiers(storedDeckModifiers);
        setActiveDeckId(resolvedDeckId);
        setPendingDeckId(resolvedDeckId);

        const storedOwnedUpgrades =
          parsed.ownedUpgrades && Array.isArray(parsed.ownedUpgrades)
            ? parsed.ownedUpgrades
            : [];
        const hydratedOwnedUpgrades = storedOwnedUpgrades.map((upgrade) => ({
          ...upgrade,
          icon: upgrade.icon ?? templateByName.get(upgrade.name)?.icon ?? '🔹'
        }));
        setOwnedUpgrades(hydratedOwnedUpgrades);

        const baseDrawAllowance =
          BASE_DRAWS + storedDeckModifiers.extraDraws +
          getExtraDraws(hydratedOwnedUpgrades);

        setDrawsRemaining(
          typeof parsed.drawsRemaining === 'number' ? parsed.drawsRemaining : baseDrawAllowance
        );
        setRoundOutcome(parsed.roundOutcome ?? 'active');
        const initialGamePhase = parsed.gamePhase ?? 'menu';
        setGamePhase(initialGamePhase);
        setSelectedBetId(parsed.selectedBetId ?? null);
        const validCategories: BetCategory[] = ['Color', 'Suit', 'Rank Type', 'Value', 'Special'];
        if (validCategories.includes(parsed.lockedBetCategory as BetCategory)) {
          setLockedBetCategory(parsed.lockedBetCategory as BetCategory);
        } else {
          setLockedBetCategory(null);
        }
        setRequireBetChangeAfterHit(Boolean(parsed.requireBetChangeAfterHit));

        setRoundTarget(
          typeof parsed.roundTarget === 'number'
            ? parsed.roundTarget
            : calculateRoundTarget(storedRoundNumber, hydratedOwnedUpgrades)
        );

        if (parsed.recentCards && Array.isArray(parsed.recentCards)) {
          setRecentCards(parsed.recentCards);
        }

        setTargetAchieved(Boolean(parsed.targetAchieved));
        if (parsed.recentCards && parsed.recentCards.length > 0) {
          setLastDrawnCard(parsed.recentCards[0].card);
        }

        const storedShopChoices =
          parsed.currentShopChoices && Array.isArray(parsed.currentShopChoices)
            ? parsed.currentShopChoices.map((choice) => ({
                ...choice,
                icon: choice.icon ?? templateByName.get(choice.name)?.icon ?? '🔹'
              }))
            : null;

        if (storedShopChoices) {
          setShopChoices(storedShopChoices);
          setPurchasedShopIds(
            parsed.purchasedShopIds && Array.isArray(parsed.purchasedShopIds)
              ? parsed.purchasedShopIds
              : []
          );
        } else {
          setPurchasedShopIds([]);
          if (initialGamePhase === 'shop' || initialGamePhase === 'shopTransition') {
            setShopChoices(generateShopChoices(storedRoundNumber, hydratedOwnedUpgrades));
          } else {
            setShopChoices([]);
          }
        }
      } else {
        const freshDeck = shuffleDeck(buildDeckForPreset(deckPresets[0].id));
        deckRef.current = freshDeck;
        setDeck(freshDeck);
      }
    } catch (error) {
      console.warn('Failed to load profile state, resetting.', error);
      const freshDeck = shuffleDeck(buildDeckForPreset(deckPresets[0].id));
      deckRef.current = freshDeck;
      setDeck(freshDeck);
      setGamePhase('menu');
      setTargetAchieved(false);
    } finally {
      hasLoadedRef.current = true;
      setReadyToPersist(true);
    }
  }, [activeProfileId]);

  useEffect(() => () => {
    if (shopTransitionTimeoutRef.current) {
      clearTimeout(shopTransitionTimeoutRef.current);
      shopTransitionTimeoutRef.current = null;
    }
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (gamePhase === 'shopTransition') {
      if (shopTransitionTimeoutRef.current) {
        clearTimeout(shopTransitionTimeoutRef.current);
      }
      shopTransitionTimeoutRef.current = setTimeout(() => {
        setGamePhase('shop');
        shopTransitionTimeoutRef.current = null;
      }, 1100);
    }
  }, [gamePhase]);

  useEffect(() => {
    if (!readyToPersist || typeof window === 'undefined' || !activeProfileId) return;

    const payload = buildGameStatePayload();

    try {
      localStorage.setItem(getProfileStorageKey(activeProfileId), JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to persist game state to localStorage.', error);
    }
  }, [
    buildGameStatePayload,
    readyToPersist,
    activeProfileId
  ]);

  const clearFinalizeTimeout = useCallback(() => {
    if (roundFinalizeTimeoutRef.current) {
      clearTimeout(roundFinalizeTimeoutRef.current);
      roundFinalizeTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isMusicPlaying) {
      audioVoicesRef.current.forEach(({ osc, pitchLfo, ampLfo, gain, pitchDepth, ampDepth }) => {
        [osc, pitchLfo, ampLfo].forEach((node) => {
          try {
            node.stop();
          } catch (error) {
            console.warn(error);
          }
        });
        try {
          osc.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          gain.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          pitchDepth.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          ampDepth.disconnect();
        } catch (error) {
          console.warn(error);
        }
      });
      audioVoicesRef.current = [];
      if (musicGainRef.current) {
        musicGainRef.current.disconnect();
        musicGainRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'suspended') {
        void audioCtxRef.current.suspend();
      }
      return;
    }

    const context = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = context;
    void context.resume();

    const master = context.createGain();
    master.gain.value = 0.1;
    master.connect(context.destination);
    musicGainRef.current = master;

    const voices = [
      { base: 262, lfoRate: 0.18, ampRate: 2.3, type: 'triangle' as OscillatorType, detune: -4 },
      { base: 330, lfoRate: 0.14, ampRate: 2.8, type: 'sawtooth' as OscillatorType, detune: 3 },
      { base: 392, lfoRate: 0.2, ampRate: 1.9, type: 'square' as OscillatorType, detune: 5 },
      { base: 523, lfoRate: 0.12, ampRate: 3.4, type: 'triangle' as OscillatorType, detune: -2 }
    ];

    audioVoicesRef.current = voices.map(({ base, lfoRate, ampRate, type, detune = 0 }) => {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = base;
      if (detune !== 0) {
        osc.detune.value = detune * 10;
      }

      const pitchLfo = context.createOscillator();
      pitchLfo.type = 'sine';
      pitchLfo.frequency.value = lfoRate;

      const pitchDepth = context.createGain();
      pitchDepth.gain.value = base * 0.01;
      pitchLfo.connect(pitchDepth);
      pitchDepth.connect(osc.frequency);

      const gainNode = context.createGain();
      gainNode.gain.value = 0.22;
      osc.connect(gainNode);
      gainNode.connect(master);

      const ampLfo = context.createOscillator();
      ampLfo.type = 'triangle';
      ampLfo.frequency.value = ampRate + Math.random() * 0.4;

      const ampDepth = context.createGain();
      ampDepth.gain.value = 0.1;
      ampLfo.connect(ampDepth);
      ampDepth.connect(gainNode.gain);

      osc.start();
      pitchLfo.start();
      ampLfo.start();

      return {
        osc,
        pitchLfo,
        ampLfo,
        gain: gainNode,
        pitchDepth,
        ampDepth
      };
    });

    return () => {
      audioVoicesRef.current.forEach(({ osc, pitchLfo, ampLfo, gain, pitchDepth, ampDepth }) => {
        [osc, pitchLfo, ampLfo].forEach((node) => {
          try {
            node.stop();
          } catch (error) {
            console.warn(error);
          }
        });
        try {
          osc.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          gain.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          pitchDepth.disconnect();
        } catch (error) {
          console.warn(error);
        }
        try {
          ampDepth.disconnect();
        } catch (error) {
          console.warn(error);
        }
      });
      audioVoicesRef.current = [];
      if (musicGainRef.current) {
        musicGainRef.current.disconnect();
        musicGainRef.current = null;
      }
    };
  }, [isMusicPlaying]);

  useEffect(() => () => {
    audioVoicesRef.current.forEach(({ osc, pitchLfo, ampLfo, gain, pitchDepth, ampDepth }) => {
      [osc, pitchLfo, ampLfo].forEach((node) => {
        try {
          node.stop();
        } catch (error) {
          console.warn(error);
        }
      });
      [osc, gain, pitchDepth, ampDepth].forEach((node) => {
        try {
          node.disconnect();
        } catch (error) {
          console.warn(error);
        }
      });
    });
    audioVoicesRef.current = [];
    if (musicGainRef.current) {
      musicGainRef.current.disconnect();
      musicGainRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(console.warn);
      audioCtxRef.current = null;
    }
    if (roundFinalizeTimeoutRef.current) {
      clearTimeout(roundFinalizeTimeoutRef.current);
      roundFinalizeTimeoutRef.current = null;
    }
    if (shopTransitionTimeoutRef.current) {
      clearTimeout(shopTransitionTimeoutRef.current);
    }
    if (gameOverTimeoutRef.current) {
      clearTimeout(gameOverTimeoutRef.current);
    }
  }, []);

  const roundProgress = roundTarget > 0 ? Math.min(roundScore / roundTarget, 1) : 0;
  const betLocked = Boolean(
    selectedBet && requireBetChangeAfterHit && lockedBetCategory === selectedBet.category
  );
  const drawButtonDisabled =
    roundOutcome === 'lost' || roundOutcome === 'won' || !selectedBet || drawsRemaining <= 0 || betLocked;
  const leftoverConversionValue = drawsRemaining * GUARANTEED_DRAW_VALUE;

  const toggleMusic = () => {
    setIsMusicPlaying((prev) => !prev);
  };

  const musicToggleButton = (
    <button
      type="button"
      onClick={toggleMusic}
      className={cn(
        buttonBase,
        isMusicPlaying ? buttonPalette.muted : buttonPalette.accentSecondary,
        'w-full justify-center px-4 py-2 text-sm'
      )}
      aria-pressed={isMusicPlaying}
    >
      {isMusicPlaying ? 'Pause Music' : 'Play Music'}
    </button>
  );

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const themeToggleButton = (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(buttonBase, buttonPalette.accentSecondary, 'w-full justify-center px-4 py-2 text-sm')}
      aria-pressed={theme === 'dark'}
    >
      {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
    </button>
  );

  const settingsButton = !isSettingsOpen && gamePhase !== 'gameOver' ? (
    <button
      type="button"
      onClick={openSettings}
      className={cn(buttonBase, buttonPalette.accentSecondary, 'px-4 py-2 text-sm')}
    >
      Settings
    </button>
  ) : null;

  const settingsModal = (
    <SettingsModal
      isOpen={isSettingsOpen}
      onClose={closeSettings}
      palette={palette}
      textPalette={textPalette}
      buttonPalette={buttonPalette}
      buttonBase={buttonBase}
      themeToggleButton={themeToggleButton}
      musicToggleButton={musicToggleButton}
    />
  );

  const selectedDeckPreset = useMemo(
    () => getDeckPresetById(pendingDeckId),
    [pendingDeckId]
  );

  const canStartDeck = useMemo(
    () => isDeckUnlocked(currentProfile, selectedDeckPreset),
    [currentProfile, selectedDeckPreset]
  );

  const handleDeckSelect = useCallback((deckId: string) => {
    setPendingDeckId(deckId);
  }, []);

  const gainRatio = roundTarget > 0 ? lastDrawScore / roundTarget : 0;
  let scoreCardClass = scorePalette.neutral;
  let totalScoreClass = textPalette.primary;
  let gainScoreClass = lastDrawScore > 0 ? textPalette.accent : textPalette.danger;
  let ratioTagClass = lastDrawScore > 0 ? textPalette.accentSoft : textPalette.dangerSoft;
  const ratioLabel =
    lastDrawScore > 0
      ? `${Math.min(Math.round(gainRatio * 100), 999)}% of round target`
      : 'Missed bet';

  if (lastDrawScore === 0) {
    scoreCardClass = scorePalette.danger;
    totalScoreClass = textPalette.danger;
  } else if (gainRatio >= 0.5) {
    scoreCardClass = scorePalette.legendary;
    totalScoreClass = textPalette.warning;
    gainScoreClass = textPalette.warning;
    ratioTagClass = textPalette.warningSoft;
  } else if (gainRatio >= 0.3) {
    scoreCardClass = scorePalette.positive;
    totalScoreClass = textPalette.positive;
    gainScoreClass = textPalette.positive;
    ratioTagClass = textPalette.positiveSoft;
  } else if (gainRatio > 0) {
    scoreCardClass = scorePalette.accent;
    totalScoreClass = textPalette.accent;
    gainScoreClass = textPalette.accent;
    ratioTagClass = textPalette.accentSoft;
  }

  const betsByCategory = useMemo(() => {
    // Check if this is a boss round and get modifiers
    const boss = getBossForRound(roundNumber);
    let availableBets = betOptions;

    // Apply boss modifiers that disable certain bets
    if (boss && boss.effect?.type === 'disableBets' && boss.effect.betIds) {
      availableBets = betOptions.filter(bet => !boss.effect!.betIds!.includes(bet.id));
    }

    return availableBets.reduce((acc, option) => {
      if (!acc[option.category]) {
        acc[option.category] = [];
      }
      acc[option.category].push(option);
      return acc;
    }, {} as Record<BetCategory, BetOption[]>);
  }, [roundNumber]);

  const displayedRecentCards = useMemo(() => {
    const active = recentCards.filter((entry) => entry.status !== 'exit');
    const exiting = recentCards.filter((entry) => entry.status === 'exit');
    return [...active, ...exiting];
  }, [recentCards]);

  const activeRecentCards = useMemo(
    () => recentCards.filter((entry) => entry.status !== 'exit'),
    [recentCards]
  );

  const ensureDeck = () => {
    if (!deckRef.current || deckRef.current.length === 0) {
      const reshuffled = shuffleDeck(buildDeckForPreset(activeDeckId));
      deckRef.current = reshuffled;
      setDeck(reshuffled);
    }
  };

  const startRunWithDeck = useCallback(
    (deckId: string) => {
      const preset = getDeckPresetById(deckId);
      const modifiers: Required<DeckModifier> = {
        ...DEFAULT_DECK_MODIFIERS,
        ...preset.modifiers
      };

      setActiveDeckId(preset.id);
      setDeckModifiers(modifiers);

      const freshDeck = shuffleDeck(buildDeckForPreset(preset.id));
      deckRef.current = freshDeck;
      setDeck(freshDeck);

      clearFinalizeTimeout();
      if (shopTransitionTimeoutRef.current) {
        clearTimeout(shopTransitionTimeoutRef.current);
        shopTransitionTimeoutRef.current = null;
      }
      if (gameOverTimeoutRef.current) {
        clearTimeout(gameOverTimeoutRef.current);
        gameOverTimeoutRef.current = null;
      }

      setBank(modifiers.startingBank);
      setRoundNumber(1);
      setRoundScore(0);
      setRoundTarget(calculateRoundTarget(1, []));
      setDrawsRemaining(BASE_DRAWS + modifiers.extraDraws);
      setRoundOutcome('active');
      setSelectedBetId(null);
      setFloatingScores([]);
      setDrawAnimations([]);
      setRecentCards([]);
      setLockedBetCategory(null);
      setRequireBetChangeAfterHit(false);
      setOwnedUpgrades([]);
      setShopChoices([]);
      setPurchasedShopIds([]);
      setShopMessage(null);
      setShopTransitionMessage(null);
      setBetFeedback(null);
      setLastDrawScore(0);
      setLastDrawnCard(null);
      setTargetAchieved(false);
      setGamePhase('gameplay');
    },
    [
      clearFinalizeTimeout,
      gameOverTimeoutRef,
      shopTransitionTimeoutRef
    ]
  );

  const handleDeckConfirm = useCallback(() => {
    if (!currentProfile) return;
    const preset = getDeckPresetById(pendingDeckId);
    if (!isDeckUnlocked(currentProfile, preset)) return;
    setIsDeckModalOpen(false);
    startRunWithDeck(preset.id);
  }, [currentProfile, pendingDeckId, startRunWithDeck]);

  const deckSelectionModal = (
    <DeckSelectionModal
      isOpen={isDeckModalOpen}
      onCancel={handleDeckCancel}
      onConfirm={handleDeckConfirm}
      onSelectDeck={handleDeckSelect}
      deckPresets={deckPresets}
      currentProfile={currentProfile}
      isDeckUnlocked={isDeckUnlocked}
      palette={palette}
      textPalette={textPalette}
      buttonPalette={buttonPalette}
      buttonBase={buttonBase}
      disabledButtonClasses={disabledButtonClasses}
      theme={theme}
      formatDisplayNumber={formatDisplayNumber}
      pendingDeckId={pendingDeckId}
      canStart={canStartDeck}
    />
  );

  const handleDraw = () => {
    if (gamePhase !== 'gameplay') return;
    if (roundOutcome !== 'active') return;
    if (!selectedBet) {
      setBetFeedback('Select a bet before drawing.');
      return;
    }
    if (
      requireBetChangeAfterHit &&
      lockedBetCategory &&
      selectedBet.category === lockedBetCategory
    ) {
      setBetFeedback('Pick a different bet category before drawing after a successful hit.');
      return;
    }
    if (
      requireBetChangeAfterHit &&
      lockedBetCategory &&
      selectedBet.category !== lockedBetCategory
    ) {
      setRequireBetChangeAfterHit(false);
      setLockedBetCategory(null);
    }
    if (drawsRemaining <= 0) return;

    ensureDeck();

    const [drawnCard, ...remainingDeck] = deckRef.current;
    if (!drawnCard) return;
    deckRef.current = remainingDeck;
    setDeck(remainingDeck);

    const baseScore = drawnCard.rank === 'Joker' ? 22 : Math.max(getRankValue(drawnCard.rank), 2);
    const betBonus = betBonusMap.get(selectedBet.id) ?? 0;
    const hit = selectedBet.check(drawnCard);

    // Calculate combo streak bonus
    const comboCounterItems = ownedUpgrades.filter(u =>
      u.effects.some(e => e.type === 'comboCounter')
    );
    let comboBonus = 0;
    if (comboCounterItems.length > 0) {
      comboCounterItems.forEach(item => {
        item.effects
          .filter((e): e is Extract<UpgradeEffect, { type: 'comboCounter' }> => e.type === 'comboCounter')
          .forEach(effect => {
            comboBonus += effect.value * comboStreak;
          });
      });
    }

    // Check for conditional bonuses (Underdog Spirit: bonus after missing)
    let conditionalMultiplier = 0;
    if (!hit && lastBetHit === false) {
      // Just missed, no bonus
    } else if (hit && lastBetHit === false) {
      // Hit after miss - check for comeback bonus
      ownedUpgrades.forEach(upgrade => {
        upgrade.effects
          .filter((e): e is Extract<UpgradeEffect, { type: 'conditionalBonus' }> => e.type === 'conditionalBonus')
          .forEach(effect => {
            if (effect.condition === 'onMiss' && effect.multiplier) {
              conditionalMultiplier += effect.multiplier;
            }
          });
      });
    }

    // Apply global multiplier
    const globalMult = getGlobalMultiplier(ownedUpgrades);

    let multiplier = selectedBet.baseMultiplier + betBonus + comboBonus + conditionalMultiplier + globalMult;

    // Apply boss modifier that reduces multipliers
    const boss = getBossForRound(roundNumber);
    if (boss && boss.effect?.type === 'reduceMultipliers' && boss.effect.value !== undefined) {
      multiplier = multiplier * boss.effect.value; // e.g., multiply by 0.5 for 50% reduction
    }

    const drawScore = Math.floor(
      (hit ? baseScore * multiplier : baseScore * 0.5) + flatBonus
    );

    // Update combo streak
    if (hit) {
      setComboStreak((prev) => prev + 1);
      setLockedBetCategory(selectedBet.category);
      setRequireBetChangeAfterHit(true);
    } else {
      setComboStreak(0);
      setRequireBetChangeAfterHit(false);
      setLockedBetCategory(null);
    }
    setLastBetHit(hit);

    // Apply conditional bank rewards/penalties
    let bankDelta = 0;
    ownedUpgrades.forEach(upgrade => {
      upgrade.effects
        .filter((e): e is Extract<UpgradeEffect, { type: 'conditionalBonus' }> => e.type === 'conditionalBonus')
        .forEach(effect => {
          if (hit && effect.condition === 'onHit') {
            if (effect.bankReward) bankDelta += effect.bankReward;
            if (effect.bankPenalty) bankDelta -= effect.bankPenalty; // Items like High Roller's Pride
          } else if (!hit && effect.condition === 'onMiss') {
            if (effect.bankPenalty) bankDelta -= effect.bankPenalty;
          }
        });
    });

    // Apply boss bank drain effect on miss
    if (!hit && boss && boss.effect?.type === 'bankDrain' && boss.effect.value !== undefined) {
      bankDelta -= boss.effect.value;
    }

    if (bankDelta !== 0) {
      setBank(prev => Math.max(0, prev + bankDelta));
    }

    const floatingScore: FloatingScore = {
      id: `score-${Date.now()}`,
      value: drawScore,
      hit
    };
    setFloatingScores((prev) => [...prev, floatingScore]);
    setLastDrawnCard(drawnCard);
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((entry) => entry.id !== floatingScore.id));
    }, 2000);

    const drawScoreLabel = formatDisplayNumber(drawScore);

    setRoundScore((prev) => prev + drawScore);
    setDrawsRemaining((prev) => prev - 1);
    setLastDrawScore(drawScore);
    setBetFeedback(
      hit
        ? `${selectedBet.label} hit for ${drawScoreLabel} points! Pick a different bet category before your next draw.`
        : `${selectedBet.label} missed · ${drawScoreLabel} points.`
    );

    const newEntry: RecentCardEntry = {
      id: `${drawnCard.id}-${Date.now()}`,
      card: drawnCard,
      status: 'enter',
      betId: selectedBet.id,
      betLabel: selectedBet.label,
      betHit: hit,
      gain: drawScore
    };
    setRecentCards((prev) => {
      const normalized = prev.map((entry) =>
        entry.status === 'enter' ? { ...entry, status: 'idle' as RecentCardStatus } : entry
      );
      const active = normalized.filter((entry) => entry.status !== 'exit');
      const exiting = normalized.filter((entry) => entry.status === 'exit');

      const nextActive = [newEntry, ...active];

      const kept: RecentCardEntry[] = [];
      const overflow: RecentCardEntry[] = [];

      nextActive.forEach((entry, index) => {
        if (index < MAX_RECENT_CARDS) {
          kept.push(entry);
        } else {
          overflow.push({ ...entry, status: 'exit' });
        }
      });

      return [...kept, ...overflow, ...exiting];
    });

    const animationId = `draw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setDrawAnimations((prev) => [...prev, { id: animationId, card: drawnCard }]);

    const projectedScore = roundScore + drawScore;
    const projectedDraws = drawsRemaining - 1;
    const achievedThisDraw = !targetAchieved && projectedScore >= roundTarget;

    if (achievedThisDraw) {
      setTargetAchieved(true);
      setBetFeedback('Target reached! Keep drawing or cash out unused draws for guaranteed points.');
    }

    if (projectedDraws <= 0) {
      if (projectedScore >= roundTarget || targetAchieved || achievedThisDraw) {
        clearFinalizeTimeout();
        roundFinalizeTimeoutRef.current = setTimeout(() => {
          roundFinalizeTimeoutRef.current = null;
          finalizeRound({ convertUnused: false, baseScoreOverride: projectedScore });
        }, 900);
      } else {
        setRoundOutcome('lost');
        setTargetAchieved(false);
        setRequireBetChangeAfterHit(false);
        setLockedBetCategory(null);
        if (gameOverTimeoutRef.current) {
          clearTimeout(gameOverTimeoutRef.current);
        }
        gameOverTimeoutRef.current = setTimeout(() => {
          setGamePhase('gameOver');
          gameOverTimeoutRef.current = null;
        }, 600);
      }
      return;
    }
  };

  const finalizeRound = (options?: { convertUnused?: boolean; baseScoreOverride?: number }) => {
    if (roundOutcome === 'lost' || roundOutcome === 'won') return;
    if (!targetAchieved && !options?.convertUnused) return;

    clearFinalizeTimeout();

    const convertUnused = Boolean(options?.convertUnused);
    const baseScore = options?.baseScoreOverride ?? roundScore;
    const unusedDraws = convertUnused ? drawsRemaining : 0;
    const conversionPoints = convertUnused ? unusedDraws * GUARANTEED_DRAW_VALUE : 0;
    const finalScore = baseScore + conversionPoints;

    if (conversionPoints > 0) {
      setRoundScore((prev) => prev + conversionPoints);
    }

    const preInterestBank = bank + finalScore;

    // Apply boss "noInterest" effect
    const boss = getBossForRound(roundNumber);
    let effectiveInterestRate = interestRate;
    if (boss && boss.effect?.type === 'noInterest') {
      effectiveInterestRate = 0;
    }

    const interestEarned = Math.floor(preInterestBank * effectiveInterestRate);
    const bankAfterInterest = preInterestBank + interestEarned;

    const messageParts: string[] = [`Banked ${formatDisplayNumber(finalScore)} points`];
    if (conversionPoints > 0) {
      messageParts.push(`(${formatDisplayNumber(conversionPoints)} from leftover draws)`);
    }
    if (effectiveInterestRate > 0) {
      messageParts.push(
        `+${formatDisplayNumber(interestEarned)} from ${(effectiveInterestRate * 100).toFixed(0)}% interest.`
      );
    } else if (boss && boss.effect?.type === 'noInterest') {
      messageParts.push(`(No interest this round - Boss Effect!)`);
    }
    const finalMessage = messageParts.join(' ');

    setBank(bankAfterInterest);
    setDrawsRemaining(0);
    setRoundOutcome('won');
    setTargetAchieved(false);
    setRequireBetChangeAfterHit(false);
    setLockedBetCategory(null);
    setFloatingScores([]);
    setDrawAnimations([]);
    setShopChoices(generateShopChoices(roundNumber, ownedUpgrades));
    setPurchasedShopIds([]);
    setShopMessage(finalMessage);
    setShopTransitionMessage(finalMessage);
    setGamePhase('shopTransition');
  };

  const triggerShopTransition = () => {
    finalizeRound({ convertUnused: false });
  };

  const cashOutUnusedDraws = () => {
    if (!targetAchieved || drawsRemaining <= 0) return;
    finalizeRound({ convertUnused: true });
  };

  const handleRecentCardExitComplete = (entryId: string) => {
    setRecentCards((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const handleDrawAnimationEnd = (animationId: string) => {
    setDrawAnimations((prev) => prev.filter((animation) => animation.id !== animationId));
  };

  const proceedToNextRound = () => {
    const nextRound = roundNumber + 1;
    const freshDeck = shuffleDeck(buildDeckForPreset(activeDeckId));
    if (shopTransitionTimeoutRef.current) {
      clearTimeout(shopTransitionTimeoutRef.current);
      shopTransitionTimeoutRef.current = null;
    }
    deckRef.current = freshDeck;
    setDeck(freshDeck);
    clearFinalizeTimeout();
    setRoundNumber(nextRound);
    const target = calculateRoundTarget(nextRound, ownedUpgrades);
    setRoundTarget(target);
    const draws = BASE_DRAWS + deckModifiers.extraDraws + getExtraDraws(ownedUpgrades);
    setDrawsRemaining(draws);
    setRoundScore(0);
    setRoundOutcome('active');
    setSelectedBetId(null);
    setFloatingScores([]);
    setDrawAnimations([]);
    setRecentCards([]);
    setBetFeedback(null);
    setLockedBetCategory(null);
    setRequireBetChangeAfterHit(false);
    setLastDrawScore(0);
    setShopChoices([]);
    setPurchasedShopIds([]);
    setShopMessage(null);
    setShopTransitionMessage(null);
    setTargetAchieved(false);
    setLastDrawnCard(null);
    setGamePhase('gameplay');
  };

  const buyUpgrade = (upgrade: ShopUpgrade) => {
    if (bank < upgrade.cost) {
      setShopMessage('Not enough points in the bank for that upgrade.');
      return;
    }
    setBank((prev) => prev - upgrade.cost);
    setOwnedUpgrades((prev) => [
      ...prev,
      {
        ...upgrade,
        purchasedAtRound: roundNumber
      }
    ]);
    setShopChoices((prev) => prev.filter((item) => item.id !== upgrade.id));
    setShopMessage(`Bought ${upgrade.name}.`);
    setPurchasedShopIds((prev) => [...prev, upgrade.id]);
  };

  const resetToMenu = () => {
    clearFinalizeTimeout();
    if (shopTransitionTimeoutRef.current) {
      clearTimeout(shopTransitionTimeoutRef.current);
      shopTransitionTimeoutRef.current = null;
    }
    setGamePhase('menu');
  };

  const getBetLabel = (betId: string) => betOptionMap.get(betId)?.label ?? betId;

  const shopView = (
    <ShopView
      palette={palette}
      textPalette={textPalette}
      buttonPalette={buttonPalette}
      buttonBase={buttonBase}
      formatDisplayNumber={formatDisplayNumber}
      roundNumber={roundNumber}
      roundScore={roundScore}
      bank={bank}
      interestRate={interestRate}
      onProceed={proceedToNextRound}
      onReturnToMenu={resetToMenu}
      message={shopMessage}
      settingsButton={settingsButton}
      shopChoices={shopChoices}
      rarityStyles={rarityStyles}
      onBuyUpgrade={buyUpgrade}
      betLabelForId={getBetLabel}
    />
  );

  const menuScreen = (
    <MenuScreen
      palette={palette}
      textPalette={textPalette}
      buttonPalette={buttonPalette}
      buttonBase={buttonBase}
      settingsButton={settingsButton}
      bank={bank}
      currentProfile={currentProfile}
      roundNumber={roundNumber}
      ownedUpgradeCount={ownedUpgrades.length}
      formatDisplayNumber={formatDisplayNumber}
      activeProfileId={activeProfileId}
      onContinueRun={handleContinueRun}
      onStartNewRun={startNewRun}
      newProfileName={newProfileName}
      onProfileNameChange={handleProfileNameChange}
      onSaveProfile={handleSaveProfile}
      profiles={profiles}
      profileSelectionId={profileSelectionId}
      onProfileSelectionChange={handleProfileSelectionChange}
      onLoadProfile={handleLoadProfile}
      onDeleteProfile={handleDeleteProfile}
      theme={theme}
      deckCount={deckPresets.length}
      getProfileStorageKey={getProfileStorageKey}
      profileMessage={profileMessage}
    />
  );

  const shopTransitionOverlay = (
    <ShopTransitionOverlay
      palette={palette}
      textPalette={textPalette}
      settingsButton={settingsButton}
      message={shopTransitionMessage}
    />
  );

  const gameOverOverlay = (
    <GameOverOverlay
      palette={palette}
      textPalette={textPalette}
      buttonPalette={buttonPalette}
      buttonBase={buttonBase}
      formatDisplayNumber={formatDisplayNumber}
      bank={bank}
      roundNumber={roundNumber}
      ownedUpgradeCount={ownedUpgrades.length}
      interestRate={interestRate}
      lastDrawnCard={lastDrawnCard}
      onStartNewRun={startNewRun}
      onReturnToMenu={resetToMenu}
      settingsButton={settingsButton}
    />
  );

  const renderGameplay = () => (
    <div className={cn('min-h-screen flex flex-col lg:flex-row', palette.shell)}>
      <div className={cn('flex w-full flex-col lg:max-w-[420px]', palette.panelLeft)}>
        <div className={cn('flex items-center justify-between border-b px-6 py-6', palette.borderSubtle)}>
          <div>
            <h1 className={cn('text-3xl font-bold', textPalette.accent)}>Card Clicker</h1>
            <div className={cn('mt-2 text-xs uppercase tracking-[0.35em]', textPalette.secondary)}>
              Round {roundNumber} • Target {formatDisplayNumber(roundTarget)}
            </div>
            {(() => {
              const currentBoss = getBossForRound(roundNumber);
              return currentBoss ? (
                <div className={cn('mt-2 text-xs font-bold uppercase tracking-wider', textPalette.danger)}>
                  ⚠️ BOSS: {currentBoss.name}
                </div>
              ) : null;
            })()}
          </div>
          <div className="text-right">
            <div className={cn('mb-1 text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
              Draws Left
            </div>
            <div className={cn('text-lg font-semibold', textPalette.accent)}>
              {drawsRemaining}/{BASE_DRAWS + deckModifiers.extraDraws + getExtraDraws(ownedUpgrades)}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-8">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className={cn('text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
                Draw Pile
              </span>
              <span className={cn('text-sm', textPalette.secondary)}>{deck.length} cards left</span>
            </div>

            <div className="flex flex-col gap-6 md:flex-row">
              <div className={cn('relative flex-1 overflow-hidden rounded-2xl px-8 py-8', palette.surfaceCard)}>
                <div className="relative h-44 w-32">
                  {[...Array(Math.min(8, Math.max(1, Math.ceil(deck.length / 10))))].map((_, i) => (
                    <div
                      key={i}
                      className={cn('pointer-events-none rounded-xl', palette.deckLayer)}
                      style={{
                        transform: `translate(${i * 1.5}px, ${i * -1.5}px)`,
                        zIndex: 10 - i,
                        opacity: 1 - i * 0.08
                      }}
                    />
                  ))}
                </div>
                {drawAnimations.map((animation) => (
                  <div
                    key={animation.id}
                    className="pointer-events-none absolute left-8"
                    style={{ top: 'calc(50% - 88px)', zIndex: 30 }}
                  >
                    <div
                      className="animate-card-slide"
                      onAnimationEnd={() => handleDrawAnimationEnd(animation.id)}
                    >
                      <Card
                        suit={animation.card.suit}
                        rank={animation.card.rank}
                        isJoker={animation.card.isJoker}
                        jokerColor={animation.card.jokerColor}
                      />
                    </div>
                  </div>
                ))}

                {floatingScores.map((fs) => (
                  <div
                    key={fs.id}
                    className={cn(
                      'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-bold animate-float-up',
                      fs.hit ? textPalette.positive : textPalette.danger
                    )}
                  >
                    {fs.hit ? '+' : ''}
                    {formatDisplayNumber(fs.value)}
                  </div>
                ))}
              </div>

              <div className={cn('w-full md:w-[240px] flex flex-col gap-4 rounded-2xl p-6', scoreCardClass)}>
                <div>
                  <div className={cn('mb-1 text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
                    Round Score
                  </div>
                  <div className={cn('text-5xl font-bold leading-tight', totalScoreClass)}>
                    {formatDisplayNumber(roundScore)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', textPalette.secondary)}>Target</span>
                    <span className={cn('text-sm font-semibold', textPalette.primary)}>
                      {formatDisplayNumber(roundTarget)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', textPalette.secondary)}>Bank</span>
                    <span className={cn('text-sm font-semibold', textPalette.accent)}>
                      {formatDisplayNumber(bank)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', textPalette.secondary)}>Interest Rate</span>
                    <span className={cn('text-sm font-semibold', textPalette.positive)}>
                      {(interestRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', textPalette.secondary)}>Last Draw</span>
                    <span className={cn('text-lg font-semibold', gainScoreClass)}>
                      {formatSignedDisplayNumber(lastDrawScore)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'h-2 w-full overflow-hidden rounded-full',
                      theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-200'
                    )}
                  >
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        roundOutcome === 'lost'
                          ? 'bg-rose-500'
                          : roundProgress >= 1
                            ? 'bg-amber-400'
                            : 'bg-sky-500'
                      )}
                      style={{ width: `${Math.min(roundProgress * 100, 100)}%` }}
                    />
                  </div>
                  <div className={cn('text-xs uppercase tracking-wide', ratioTagClass)}>{ratioLabel}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDraw}
              disabled={drawButtonDisabled}
              className={cn(
                buttonBase,
                drawButtonDisabled ? disabledButtonClasses : buttonPalette.accent,
                'mt-4 w-full'
              )}
            >
              {betLocked
                ? 'Pick a different bet category before drawing'
                : selectedBet
                  ? `Draw with ${selectedBet.label}`
                  : 'Select a bet to draw'}
            </button>
            {betFeedback && (
              <div className={cn('mt-2 text-sm', textPalette.secondary)}>{betFeedback}</div>
            )}
            {targetAchieved && drawsRemaining > 0 && (
              <div className={cn('mt-2 text-sm', textPalette.positive)}>
                Target secured. {drawsRemaining} unused draw{drawsRemaining === 1 ? '' : 's'} worth
                guaranteed {formatDisplayNumber(leftoverConversionValue)} pts.
              </div>
            )}
          </div>

          <div>
            <div className={cn('mb-3 text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
              Recent Cards
            </div>
            {displayedRecentCards.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {displayedRecentCards.map((entry) => {
                  const activeIndex = activeRecentCards.findIndex((item) => item.id === entry.id);
                  const activeCount = activeRecentCards.length;
                  const opacity =
                    activeIndex === -1
                      ? 0.4
                      : activeCount === 1
                        ? 1
                        : 0.4 + ((activeCount - activeIndex - 1) / (activeCount - 1)) * 0.6;

                  return (
                    <RecentCardItem
                      key={entry.id}
                      card={entry.card}
                      status={entry.status}
                      opacity={opacity}
                      betHit={entry.betHit}
                      gain={entry.gain}
                      betLabel={entry.betLabel}
                      onExitComplete={
                        entry.status === 'exit'
                          ? () => handleRecentCardExitComplete(entry.id)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <div className={cn('text-sm', textPalette.secondary)}>
                Draw cards to populate the recent queue.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={cashOutUnusedDraws}
              disabled={!targetAchieved || drawsRemaining <= 0 || roundOutcome === 'won'}
              className={cn(
                buttonBase,
                targetAchieved && drawsRemaining > 0 && roundOutcome !== 'won'
                  ? buttonPalette.warning
                  : disabledButtonClasses,
                'w-full'
              )}
            >
              Convert Leftover Draws ({formatDisplayNumber(leftoverConversionValue)} pts)
            </button>
            <button
              onClick={triggerShopTransition}
              disabled={!targetAchieved || roundOutcome === 'lost'}
              className={cn(
                buttonBase,
                targetAchieved && roundOutcome !== 'lost'
                  ? buttonPalette.positive
                  : disabledButtonClasses,
                'w-full'
              )}
            >
              Finish Round & Visit Shop
            </button>
            <div className="flex gap-3">
              <button onClick={startNewRun} className={cn(buttonBase, buttonPalette.muted, 'flex-1')}>
                Reset Run
              </button>
              <button onClick={resetToMenu} className={cn(buttonBase, buttonPalette.danger, 'flex-1')}>
                Main Menu
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={cn('flex-1 overflow-y-auto px-6 pb-12 pt-8 lg:px-12', palette.panelRight)}>
        {(() => {
          const currentBoss = getBossForRound(roundNumber);
          return currentBoss ? (
            <div className={cn('mb-6 rounded-xl border-2 p-4', palette.borderDanger, palette.surfaceCard)}>
              <div className={cn('mb-1 text-xs font-bold uppercase tracking-wider', textPalette.danger)}>
                ⚠️ BOSS ROUND
              </div>
              <div className={cn('text-lg font-bold', textPalette.primary)}>
                {currentBoss.name}
              </div>
              <p className={cn('mt-1 text-sm', textPalette.secondary)}>
                {currentBoss.description}
              </p>
            </div>
          ) : null;
        })()}
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className={cn('text-2xl font-bold', textPalette.accent)}>Select Your Bet</h2>
            <p className={cn('mt-2 text-sm leading-relaxed', textPalette.secondary)}>
              Pick exactly one bet before each draw. Upgrades you own modify multipliers and draw limits.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={cn('text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
                Relics Owned
              </div>
              <div className={cn('text-3xl font-bold', textPalette.positive)}>
                {ownedUpgrades.length}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {settingsButton}
            </div>
          </div>
        </div>

        {ownedUpgrades.length > 0 && (
          <div className={cn('mb-8 rounded-2xl p-5', palette.surfaceCard)}>
            <div className={cn('mb-3 text-xs uppercase tracking-[0.3em]', textPalette.secondary)}>
              Active Relic Effects
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {ownedUpgrades.map((upgrade) => (
                <span
                  key={upgrade.id}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
                    rarityStyles[upgrade.rarity].badge
                  )}
                >
                  <span>{upgrade.icon}</span>
                  {upgrade.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(betsByCategory).map(([categoryKey, options]) => {
            const category = categoryKey as BetCategory;
            const categoryLocked = requireBetChangeAfterHit && lockedBetCategory === category;
            return (
              <div key={category} className={cn('rounded-2xl p-5', palette.surfaceCard)}>
                <div className="mb-4 flex items-center justify-between">
                  <div className={cn('text-sm font-semibold uppercase tracking-[0.3em]', textPalette.primary)}>
                    {category} Bets
                  </div>
                  {categoryLocked && (
                    <div
                      className={cn(
                        'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em]',
                        textPalette.secondary,
                        theme === 'dark' ? 'bg-slate-900/60' : 'bg-slate-200'
                      )}
                    >
                      Locked
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {options.map((option) => {
                    const isSelected = selectedBetId === option.id;
                    const bonus = betBonusMap.get(option.id) ?? 0;
                    const totalMultiplier = option.baseMultiplier + bonus;
                    const isLocked =
                      requireBetChangeAfterHit && lockedBetCategory === option.category;
                    const riskClass =
                      option.risk === 'extreme'
                        ? tagPalette.extreme
                        : option.risk === 'high'
                          ? tagPalette.high
                          : option.risk === 'medium'
                            ? tagPalette.medium
                            : tagPalette.low;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          if (isLocked) {
                            setBetFeedback('Pick a different bet category before drawing after a successful hit.');
                            return;
                          }
                          setSelectedBetId(option.id);
                          if (!requireBetChangeAfterHit) {
                            setBetFeedback(null);
                          }
                        }}
                        className={cn(
                          'w-full rounded-2xl p-4 text-left transition-all duration-200',
                          betPalette.card,
                          isSelected && betPalette.active,
                          isLocked && 'cursor-not-allowed opacity-60'
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className={cn('text-sm font-semibold', textPalette.primary)}>
                            {option.label}
                          </span>
                          <span className={riskClass}>
                            {totalMultiplier.toFixed(2)}× · {option.risk.toUpperCase()}
                          </span>
                        </div>
                        <div className={cn('text-xs leading-snug', textPalette.secondary)}>
                          {option.description}
                        </div>
                        {bonus > 0 && (
                          <div className={cn('mt-2 text-[11px] uppercase tracking-[0.25em]', textPalette.positive)}>
                            +{bonus.toFixed(2)}× relic bonus
                          </div>
                        )}
                        {isLocked && (
                          <div className={cn('mt-2 text-[11px] uppercase tracking-[0.25em]', textPalette.secondary)}>
                            Locked after hit
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (gamePhase === 'menu') {
    return (
      <>
        {menuScreen}
        {settingsModal}
        {deckSelectionModal}
      </>
    );
  }

  if (gamePhase === 'shopTransition') {
    return (
      <>
        {shopTransitionOverlay}
        {settingsModal}
        {deckSelectionModal}
      </>
    );
  }

  if (gamePhase === 'shop') {
    return (
      <>
        {shopView}
        {settingsModal}
        {deckSelectionModal}
      </>
    );
  }

  if (gamePhase === 'gameOver') {
    return (
      <>
        {renderGameplay()}
        {gameOverOverlay}
        {settingsModal}
        {deckSelectionModal}
      </>
    );
  }

  return (
    <>
      {renderGameplay()}
      {settingsModal}
      {deckSelectionModal}
    </>
  );
}
