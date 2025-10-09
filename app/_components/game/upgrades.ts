import type { OwnedUpgrade, Rarity, ShopUpgrade, UpgradeEffect } from '../types';

import { getBossForRound } from './bosses';

export const upgradeTemplates: ShopUpgrade[] = [
  {
    id: 'flat-bonus-2',
    name: 'Scuffed Token',
    description: 'Every draw awards +2 bonus points.',
    rarity: 'common',
    cost: 60,
    icon: '🪙',
    effects: [{ type: 'flatBonus', value: 2 }]
  },
  {
    id: 'bet-bonus-red-small',
    name: 'Tinted Lens',
    description: 'Red Cards bet gains +0.2× multiplier.',
    rarity: 'common',
    cost: 65,
    icon: '🔍',
    effects: [{ type: 'betMultiplier', betId: 'color-red', value: 0.2 }],
    tags: ['red-synergy']
  },
  {
    id: 'interest-boost-0',
    name: 'Savings Charm',
    description: 'Increase bank interest by +2%.',
    rarity: 'common',
    cost: 70,
    icon: '🧿',
    effects: [{ type: 'interestRate', value: 0.02 }],
    tags: ['interest-synergy']
  },
  {
    id: 'extra-draw-1',
    name: 'Lucky Glove',
    description: 'Gain +1 draw every round.',
    rarity: 'uncommon',
    cost: 120,
    icon: '🧤',
    effects: [{ type: 'extraDraws', value: 1 }]
  },
  {
    id: 'extra-draw-2',
    name: 'Chrono Deck',
    description: 'Gain +2 draws every round.',
    rarity: 'rare',
    cost: 240,
    icon: '⏳',
    effects: [{ type: 'extraDraws', value: 2 }]
  },
  {
    id: 'bet-bonus-black',
    name: 'Shadow Edge',
    description: 'Black Cards bet gains +0.6× multiplier.',
    rarity: 'rare',
    cost: 190,
    icon: '🗡️',
    effects: [{ type: 'betMultiplier', betId: 'color-black', value: 0.6 }],
    tags: ['black-synergy']
  },
  {
    id: 'bet-bonus-face',
    name: 'Court Favor',
    description: 'Face Card bet gains +0.8× multiplier.',
    rarity: 'rare',
    cost: 210,
    icon: '👑',
    effects: [{ type: 'betMultiplier', betId: 'rank-face', value: 0.8 }]
  },
  {
    id: 'bet-bonus-joker',
    name: 'Wild Antenna',
    description: 'Joker bet gains +1.5× multiplier.',
    rarity: 'legendary',
    cost: 360,
    icon: '🃏',
    effects: [{ type: 'betMultiplier', betId: 'special-joker', value: 1.5 }]
  },
  {
    id: 'flat-bonus-8',
    name: 'Lucky Coin',
    description: 'Every draw awards +8 bonus points.',
    rarity: 'uncommon',
    cost: 140,
    icon: '💠',
    effects: [{ type: 'flatBonus', value: 8 }]
  },
  {
    id: 'flat-bonus-15',
    name: 'Golden Effigy',
    description: 'Every draw awards +15 bonus points.',
    rarity: 'legendary',
    cost: 320,
    icon: '🏆',
    effects: [{ type: 'flatBonus', value: 15 }]
  },
  {
    id: 'bet-bonus-red',
    name: 'Ruby Lens',
    description: 'Red Cards bet gains +0.4× multiplier.',
    rarity: 'uncommon',
    cost: 150,
    icon: '💎',
    effects: [{ type: 'betMultiplier', betId: 'color-red', value: 0.4 }],
    tags: ['red-synergy']
  },
  {
    id: 'bet-bonus-high',
    name: 'High Stakes Loop',
    description: 'High Value bet gains +0.5× multiplier.',
    rarity: 'uncommon',
    cost: 170,
    icon: '🎯',
    effects: [{ type: 'betMultiplier', betId: 'value-high', value: 0.5 }]
  },
  {
    id: 'extra-draw-legendary',
    name: 'Temporal Crown',
    description: 'Gain +3 draws every round.',
    rarity: 'legendary',
    cost: 440,
    icon: '🕰️',
    effects: [{ type: 'extraDraws', value: 3 }]
  },
  {
    id: 'flat-bonus-4',
    name: 'Warm-Up Routine',
    description: 'Every draw awards +4 bonus points.',
    rarity: 'common',
    cost: 80,
    icon: '🔥',
    effects: [{ type: 'flatBonus', value: 4 }]
  },
  {
    id: 'bet-bonus-number',
    name: 'Dealer’s Whisper',
    description: 'Number Card bet gains +0.35× multiplier.',
    rarity: 'common',
    cost: 110,
    icon: '🎴',
    effects: [{ type: 'betMultiplier', betId: 'rank-number', value: 0.35 }]
  },
  {
    id: 'interest-boost-1',
    name: 'Compound Prism',
    description: 'Increase bank interest by +3%.',
    rarity: 'uncommon',
    cost: 160,
    icon: '🔮',
    effects: [{ type: 'interestRate', value: 0.03 }],
    tags: ['interest-synergy']
  },
  {
    id: 'interest-boost-2',
    name: 'Vault Engine',
    description: 'Increase bank interest by +5%.',
    rarity: 'rare',
    cost: 240,
    icon: '🏦',
    effects: [{ type: 'interestRate', value: 0.05 }],
    tags: ['interest-synergy']
  },
  {
    id: 'interest-boost-legendary',
    name: 'Time Dividend',
    description: 'Increase bank interest by +8%.',
    rarity: 'legendary',
    cost: 360,
    icon: '⏱️',
    effects: [{ type: 'interestRate', value: 0.08 }],
    tags: ['interest-synergy']
  },
  {
    id: 'synergy-red-hunter',
    name: 'Crimson Cascade',
    description: 'Red bet gains +0.15× for each other red-focused item you own.',
    rarity: 'rare',
    cost: 210,
    icon: '🌊',
    effects: [
      { type: 'betMultiplier', betId: 'color-red', value: 0.3 },
      { type: 'synergyMultiplier', tag: 'red-synergy', value: 0.15 }
    ],
    tags: ['red-synergy']
  },
  {
    id: 'synergy-black-hunter',
    name: 'Obsidian Chain',
    description: 'Black bet gains +0.15× for each other black-focused item you own.',
    rarity: 'rare',
    cost: 210,
    icon: '⛓️',
    effects: [
      { type: 'betMultiplier', betId: 'color-black', value: 0.3 },
      { type: 'synergyMultiplier', tag: 'black-synergy', value: 0.15 }
    ],
    tags: ['black-synergy']
  },
  {
    id: 'synergy-interest-compound',
    name: 'Exponential Vault',
    description: 'Gain +1% interest for each other interest item owned.',
    rarity: 'uncommon',
    cost: 140,
    icon: '📈',
    effects: [
      { type: 'interestRate', value: 0.02 },
      { type: 'synergyMultiplier', tag: 'interest-synergy', value: 0.01 }
    ],
    tags: ['interest-synergy']
  },
  {
    id: 'transform-gambler-1',
    name: "Gambler's Die",
    description:
      '[Gambler 1/3] Extreme bets (Joker, Ace) gain +0.5× multiplier. Transform: +2.0× on extremes.',
    rarity: 'rare',
    cost: 180,
    icon: '🎲',
    effects: [
      { type: 'betMultiplier', betId: 'special-joker', value: 0.5 },
      { type: 'betMultiplier', betId: 'special-ace', value: 0.5 },
      { type: 'transformation', set: 'gambler', piece: 1 }
    ]
  },
  {
    id: 'transform-gambler-2',
    name: "Gambler's Coin",
    description: '[Gambler 2/3] High Value bets gain +0.4× multiplier. Transform: +2.0× on extremes.',
    rarity: 'rare',
    cost: 180,
    icon: '🪙',
    effects: [
      { type: 'betMultiplier', betId: 'value-high', value: 0.4 },
      { type: 'transformation', set: 'gambler', piece: 2 }
    ]
  },
  {
    id: 'transform-gambler-3',
    name: "Gambler's Charm",
    description: '[Gambler 3/3] Gain +1 draw. Transform: +2.0× on extremes.',
    rarity: 'rare',
    cost: 180,
    icon: '🍀',
    effects: [
      { type: 'extraDraws', value: 1 },
      { type: 'transformation', set: 'gambler', piece: 3 }
    ]
  },
  {
    id: 'transform-banker-1',
    name: "Banker's Ledger",
    description: '[Banker 1/3] Gain +3% interest. Transform: +8% interest total.',
    rarity: 'uncommon',
    cost: 130,
    icon: '📒',
    effects: [
      { type: 'interestRate', value: 0.03 },
      { type: 'transformation', set: 'banker', piece: 1 }
    ]
  },
  {
    id: 'transform-banker-2',
    name: "Banker's Seal",
    description: '[Banker 2/3] Every draw awards +5 points. Transform: +8% interest total.',
    rarity: 'uncommon',
    cost: 130,
    icon: '🔏',
    effects: [
      { type: 'flatBonus', value: 5 },
      { type: 'transformation', set: 'banker', piece: 2 }
    ]
  },
  {
    id: 'transform-banker-3',
    name: "Banker's Vault",
    description: '[Banker 3/3] Gain +2% interest. Transform: +8% interest total.',
    rarity: 'uncommon',
    cost: 130,
    icon: '🏦',
    effects: [
      { type: 'interestRate', value: 0.02 },
      { type: 'transformation', set: 'banker', piece: 3 }
    ]
  },
  {
    id: 'conditional-double-down',
    name: 'Double or Nothing',
    description: 'When you HIT a bet, gain 50 extra bank. When you MISS, lose 15 bank.',
    rarity: 'rare',
    cost: 200,
    icon: '⚡',
    effects: [
      { type: 'conditionalBonus', condition: 'onHit', bankReward: 50 },
      { type: 'conditionalBonus', condition: 'onMiss', bankPenalty: 15 }
    ]
  },
  {
    id: 'conditional-high-roller',
    name: "High Roller’s Pride",
    description: 'Extreme bets (Joker, Ace) gain +1.5× multiplier but cost 10 bank.',
    rarity: 'legendary',
    cost: 300,
    icon: '💸',
    effects: [
      { type: 'betMultiplier', betId: 'special-joker', value: 1.5 },
      { type: 'betMultiplier', betId: 'special-ace', value: 1.5 },
      { type: 'conditionalBonus', condition: 'onHit', bankPenalty: 10 }
    ]
  },
  {
    id: 'conditional-streak',
    name: 'Momentum Engine',
    description: 'Each consecutive hit increases your multiplier by +0.1×. Resets on miss.',
    rarity: 'legendary',
    cost: 340,
    icon: '🔥',
    effects: [{ type: 'comboCounter', value: 0.1, decay: 'onMiss' }]
  },
  {
    id: 'conditional-comeback',
    name: 'Underdog Spirit',
    description: 'After missing a bet, next hit gains +1.0× multiplier.',
    rarity: 'uncommon',
    cost: 160,
    icon: '💪',
    effects: [{ type: 'conditionalBonus', condition: 'onMiss', multiplier: 1.0 }]
  },
  {
    id: 'global-amplifier',
    name: 'Universal Amplifier',
    description: 'ALL bets gain +0.3× multiplier.',
    rarity: 'legendary',
    cost: 380,
    icon: '✨',
    effects: [{ type: 'globalMultiplier', value: 0.3 }]
  },
  {
    id: 'global-small',
    name: 'Lucky Star',
    description: 'ALL bets gain +0.15× multiplier.',
    rarity: 'rare',
    cost: 200,
    icon: '⭐',
    effects: [{ type: 'globalMultiplier', value: 0.15 }]
  }
];

export const templateByName = new Map<string, ShopUpgrade>(
  upgradeTemplates.map((template) => [template.name, template])
);

export function calculateRoundTarget(roundNumber: number, ownedUpgrades: OwnedUpgrade[]): number {
  const baseTarget = 30;
  const growthRate = 1.55;
  const roundsCompleted = Math.max(0, roundNumber - 1);

  const exponentialTarget = baseTarget * Math.pow(growthRate, roundsCompleted);
  const momentumBonus = roundsCompleted * 6;

  const rarityScore = ownedUpgrades.reduce((total, upgrade) => {
    if (upgrade.rarity === 'legendary') return total + 6;
    if (upgrade.rarity === 'rare') return total + 3;
    if (upgrade.rarity === 'uncommon') return total + 1;
    return total;
  }, 0);
  const rarityPressure = 1 + rarityScore * 0.03;

  let target = Math.max(25, Math.floor((exponentialTarget + momentumBonus) * rarityPressure));

  const boss = getBossForRound(roundNumber);
  if (boss) {
    target = Math.floor(target * boss.targetMultiplier);
  }

  return target;
}

export function getShopSlotCount(roundNumber: number): number {
  return Math.min(8, 6 + Math.floor((roundNumber - 1) / 3));
}

export function getRarityWeight(rarity: Rarity, roundNumber: number): number {
  const roundFactor = Math.max(0, roundNumber - 1);
  switch (rarity) {
    case 'legendary':
      return 8 + roundFactor * 2.5;
    case 'rare':
      return 18 + roundFactor * 1.5;
    case 'uncommon':
      return Math.max(18, 28 - roundFactor * 1.2);
    case 'common':
    default:
      return Math.max(12, 46 - roundFactor * 3.5);
  }
}

export function generateShopChoices(
  roundNumber: number,
  ownedUpgrades: OwnedUpgrade[] = []
): ShopUpgrade[] {
  const choices: ShopUpgrade[] = [];
  const ownedTemplateIds = new Set(
    ownedUpgrades.map((upgrade) => {
      const match = upgrade.id.match(/^(.+?)-\d+-\d+-[a-f0-9]+$/);
      return match ? match[1] : upgrade.id;
    })
  );

  const availableTemplates = upgradeTemplates.filter(
    (template) => !ownedTemplateIds.has(template.id)
  );

  if (availableTemplates.length === 0) {
    return [];
  }

  const slotCount = getShopSlotCount(roundNumber);
  const cheapPool = availableTemplates.filter((template) => template.cost <= 120);

  if (cheapPool.length > 0 && choices.length < slotCount) {
    const cheapTemplate = cheapPool[Math.floor(Math.random() * cheapPool.length)];
    choices.push({
      ...cheapTemplate,
      id: `${cheapTemplate.id}-${roundNumber}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`
    });
    const removalIndex = availableTemplates.findIndex(
      (template) => template.id === cheapTemplate.id
    );
    if (removalIndex !== -1) {
      availableTemplates.splice(removalIndex, 1);
    }
  }

  while (choices.length < slotCount && availableTemplates.length > 0) {
    const weightTotal = availableTemplates.reduce(
      (total, template) => total + getRarityWeight(template.rarity, roundNumber),
      0
    );
    let pick = Math.random() * weightTotal;

    let selectedIndex = 0;
    for (let i = 0; i < availableTemplates.length; i++) {
      pick -= getRarityWeight(availableTemplates[i].rarity, roundNumber);
      if (pick <= 0) {
        selectedIndex = i;
        break;
      }
    }

    const template = availableTemplates.splice(selectedIndex, 1)[0];
    choices.push({
      ...template,
      id: `${template.id}-${roundNumber}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`
    });
  }

  return choices;
}

export function getExtraDraws(upgrades: OwnedUpgrade[]): number {
  return upgrades.reduce((total, upgrade) => {
    const effectSum = upgrade.effects
      .filter((effect) => effect.type === 'extraDraws')
      .reduce((sum, effect) => sum + effect.value, 0);
    return total + effectSum;
  }, 0);
}

export function getFlatBonus(upgrades: OwnedUpgrade[]): number {
  return upgrades.reduce((total, upgrade) => {
    const effectSum = upgrade.effects
      .filter((effect) => effect.type === 'flatBonus')
      .reduce((sum, effect) => sum + effect.value, 0);
    return total + effectSum;
  }, 0);
}

export function getCompletedTransformations(upgrades: OwnedUpgrade[]): Set<string> {
  const transformationPieces = new Map<string, number>();

  upgrades.forEach((upgrade) => {
    upgrade.effects
      .filter(
        (effect): effect is Extract<UpgradeEffect, { type: 'transformation' }> =>
          effect.type === 'transformation'
      )
      .forEach((effect) => {
        transformationPieces.set(effect.set, (transformationPieces.get(effect.set) ?? 0) + 1);
      });
  });

  const completed = new Set<string>();
  transformationPieces.forEach((count, set) => {
    if (count >= 3) {
      completed.add(set);
    }
  });

  return completed;
}

export function getTransformationBonuses(
  completedSets: Set<string>
): { betMultipliers: Map<string, number>; interestBonus: number } {
  const betMultipliers = new Map<string, number>();
  let interestBonus = 0;

  completedSets.forEach((set) => {
    if (set === 'gambler') {
      betMultipliers.set('special-joker', (betMultipliers.get('special-joker') ?? 0) + 2.0);
      betMultipliers.set('special-ace', (betMultipliers.get('special-ace') ?? 0) + 2.0);
    } else if (set === 'banker') {
      interestBonus += 0.08;
    }
  });

  return { betMultipliers, interestBonus };
}

export function getSynergyBonuses(
  upgrades: OwnedUpgrade[]
): Map<string, { betId?: string; interestBonus?: number; multiplier: number }> {
  const synergies = new Map<
    string,
    { betId?: string; interestBonus?: number; multiplier: number }
  >();

  upgrades.forEach((upgrade) => {
    upgrade.effects
      .filter(
        (effect): effect is Extract<UpgradeEffect, { type: 'synergyMultiplier' }> =>
          effect.type === 'synergyMultiplier'
      )
      .forEach((effect) => {
        const tagCount = upgrades.filter((candidate) => candidate.tags?.includes(effect.tag)).length;
        const totalBonus = effect.value * tagCount;

        const key = effect.tag;
        if (!synergies.has(key)) {
          synergies.set(key, { multiplier: 0 });
        }
        const entry = synergies.get(key)!;

        if (effect.tag === 'interest-synergy') {
          entry.interestBonus = (entry.interestBonus ?? 0) + totalBonus;
        } else {
          entry.multiplier += totalBonus;
        }
      });
  });

  return synergies;
}

export function getBetBonusMap(upgrades: OwnedUpgrade[]): Map<string, number> {
  const map = new Map<string, number>();

  upgrades.forEach((upgrade) => {
    upgrade.effects
      .filter(
        (effect): effect is Extract<UpgradeEffect, { type: 'betMultiplier' }> =>
          effect.type === 'betMultiplier'
      )
      .forEach((effect) => {
        map.set(effect.betId, (map.get(effect.betId) ?? 0) + effect.value);
      });
  });

  const synergyBonuses = getSynergyBonuses(upgrades);
  const redSynergy = synergyBonuses.get('red-synergy');
  const blackSynergy = synergyBonuses.get('black-synergy');

  if (redSynergy) {
    map.set('color-red', (map.get('color-red') ?? 0) + redSynergy.multiplier);
  }
  if (blackSynergy) {
    map.set('color-black', (map.get('color-black') ?? 0) + blackSynergy.multiplier);
  }

  const completedTransformations = getCompletedTransformations(upgrades);
  const { betMultipliers: transformBonuses } = getTransformationBonuses(completedTransformations);

  transformBonuses.forEach((bonus, betId) => {
    map.set(betId, (map.get(betId) ?? 0) + bonus);
  });

  return map;
}

export function getInterestBonus(upgrades: OwnedUpgrade[]): number {
  let total = upgrades.reduce((acc, upgrade) => {
    const bonus = upgrade.effects
      .filter(
        (effect): effect is Extract<UpgradeEffect, { type: 'interestRate' }> =>
          effect.type === 'interestRate'
      )
      .reduce((sum, effect) => sum + effect.value, 0);
    return acc + bonus;
  }, 0);

  const synergyBonuses = getSynergyBonuses(upgrades);
  const interestSynergy = synergyBonuses.get('interest-synergy');
  if (interestSynergy?.interestBonus) {
    total += interestSynergy.interestBonus;
  }

  const completedTransformations = getCompletedTransformations(upgrades);
  const { interestBonus: transformBonus } = getTransformationBonuses(completedTransformations);
  total += transformBonus;

  return total;
}

export function getGlobalMultiplier(upgrades: OwnedUpgrade[]): number {
  return upgrades.reduce((total, upgrade) => {
    const bonus = upgrade.effects
      .filter(
        (effect): effect is Extract<UpgradeEffect, { type: 'globalMultiplier' }> =>
          effect.type === 'globalMultiplier'
      )
      .reduce((sum, effect) => sum + effect.value, 0);
    return total + bonus;
  }, 0);
}
