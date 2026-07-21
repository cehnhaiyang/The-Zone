import {
    ItemTemplate, ItemInstance, WeaponInstance, ArmorInstance, AccessoryInstance, ConsumableInstance, DocumentInstance,
    AudioInstance, MaterialInstance, CardTemplate, CardInstance, StatusEffectSource, StatusEffect, EntityTemplate, CharacterTemplate,
    BaseDynamicState, PlayerDynamicState, NpcDynamicState, Entity, CombatDynamicState, Node,
    Zone, Sanctuary, NeuralLinkState, PlotPointNet, ZoneDate, Exit,
    NpcTemplate, WeaponTemplate, ArmorTemplate, AccessoryTemplate, ConsumableTemplate, DocumentTemplate, AudioTemplate, MaterialTemplate,
    Local, ZoneTransfer, SanctuaryReturn,
    PlayerState, PlayerTemplate, Item,
    Interaction, Settings, Words, PlayerWordsTag, NpcWordsTag, EquipState, Loc,
    OriginTemplate, ChainNarrative, GameStateData, GameStateUpdaters, Log,
    StoryConfig, ZoneGenerationContext, ChainGenerationContext, EpisodicGenerationContext, EnemyTemplate,
} from './interface';

import {
    StatusEffectType, Mood, ConsumableEffectType, GameState, AttributeType, VitalType, SanctuaryState
} from './type';

//=============================================================================
// 1. 类型判定守卫 (Type Guards)
//=============================================================================

export const isWeaponTemplate = (item: ItemTemplate): item is WeaponTemplate => item.type === 'weapon';
export const isArmorTemplate = (item: ItemTemplate): item is ArmorTemplate => item.type === 'armor';
export const isAccessoryTemplate = (item: ItemTemplate): item is AccessoryTemplate => item.type === 'accessory';
export const isConsumableTemplate = (item: ItemTemplate): item is ConsumableTemplate => item.type === 'consumable';
export const isDocumentTemplate = (item: ItemTemplate): item is DocumentTemplate => item.type === 'document';
export const isAudioTemplate = (item: ItemTemplate): item is AudioTemplate => item.type === 'audio';
export const isMaterialTemplate = (item: ItemTemplate): item is MaterialTemplate => item.type === 'material';

export const isWeaponInstance = (item: ItemInstance): item is WeaponInstance => item.type === 'weapon';
export const isArmorInstance = (item: ItemInstance): item is ArmorInstance => item.type === 'armor';
export const isAccessoryInstance = (item: ItemInstance): item is AccessoryInstance => item.type === 'accessory';
export const isConsumableInstance = (item: ItemInstance): item is ConsumableInstance => item.type === 'consumable';
export const isDocumentInstance = (item: ItemInstance): item is DocumentInstance => item.type === 'document';
export const isAudioInstance = (item: ItemInstance): item is AudioInstance => item.type === 'audio';
export const isMaterialInstance = (item: ItemInstance): item is MaterialInstance => item.type === 'material';

export const isItemTemplate = (tpl: ItemTemplate | NpcTemplate): tpl is ItemTemplate => 'type' in tpl && typeof tpl.type === 'string';

export const isLocalExit = (exit: Exit): exit is Local => exit.type === 'local';
export const isZoneTransferExit = (exit: Exit): exit is ZoneTransfer => exit.type === 'zone_transfer';
export const isSanctuaryReturnExit = (exit: Exit): exit is SanctuaryReturn => exit.type === 'sanctuary_return';

export const hasDurability = (item: ItemInstance): item is WeaponInstance | ArmorInstance =>
    (isWeaponInstance(item) || isArmorInstance(item)) && 'maxUses' in item && 'currentUses' in item;

export const isEquipmentInstance = (item: ItemInstance): item is WeaponInstance | ArmorInstance | AccessoryInstance =>
    isWeaponInstance(item) || isArmorInstance(item) || isAccessoryInstance(item);

export const isNpcDynamicState = (state: BaseDynamicState): state is NpcDynamicState => 'trust' in state;

//=============================================================================
// 2. 基础数学与通用工具 (Math & Utilities)
//=============================================================================

export const safeDeepClone = <T>(obj: T): T => {
    if (typeof structuredClone !== 'undefined') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
};

export const clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));

export const getPercent = (current: number, max: number): number => clamp((current / max) * 100, 0, 100);

export const generateInstanceId = (prefix: string): string =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

//=============================================================================
// 3. 实例创建模块 (Instance Factory)
//=============================================================================

export const createItemInstance = (source: ItemTemplate | Item): ItemInstance => {
    const instanceId = generateInstanceId('item');
    const quantity = 'quantity' in source ? (source.quantity ?? 1) : 1;
    const discoveryThreshold = 'discoveryThreshold' in source ? (source.discoveryThreshold ?? 0) : 0;

    const baseData = { ...source, instanceId, quantity, discoveryThreshold };

    switch (baseData.type) {
        case 'weapon': {
            const currentUses = 'currentUses' in source && typeof source.currentUses === 'number'
                ? source.currentUses
                : (source as WeaponTemplate).maxUses;
            return { ...baseData, currentUses } as WeaponInstance;
        }
        case 'armor': {
            const currentUses = 'currentUses' in source && typeof source.currentUses === 'number'
                ? source.currentUses
                : (source as ArmorTemplate).maxUses;
            return { ...baseData, currentUses } as ArmorInstance;
        }
        case 'accessory': return { ...baseData } as AccessoryInstance;
        case 'consumable': return { ...baseData } as ConsumableInstance;
        case 'document': return { ...baseData } as DocumentInstance;
        case 'audio': return { ...baseData } as AudioInstance;
        case 'material': return { ...baseData } as MaterialInstance;
    }
};

export const createCardInstance = (template: CardTemplate, ownerId: string, ownerName: string): CardInstance => ({
    ...template,
    instanceId: generateInstanceId(template.id),
    ownerId,
    ownerName,
});

export const createPlayerDynamicState = (player: PlayerTemplate): PlayerDynamicState => {
    const { attribute, vital } = player.initialState;
    return {
        strength: attribute.strength,
        agility: attribute.agility,
        knowledge: attribute.knowledge,
        perception: attribute.perception,
        maxHp: vital.maxHp,
        maxSanity: vital.maxSanity,
        maxStamina: vital.maxStamina,
        maxVigor: vital.maxVigor,
        hp: vital.maxHp,
        sanity: vital.maxSanity,
        stamina: vital.maxStamina,
        vigor: vital.maxVigor,
        inventory: player.initialState.inventory.map(createItemInstance),
        deck: player.initialState.deck.map(card => createCardInstance(card, player.id, player.name)),
        equipment: safeDeepClone(player.initialState.equipState),
        xp: 0,
        level: 1,
    };
};

export const createPlayerEntity = (player: PlayerTemplate): Entity<PlayerTemplate, PlayerDynamicState> => ({
    static: player,
    dynamic: createPlayerDynamicState(player)
});

export const createNpcEntity = (npc: NpcTemplate): Entity<NpcTemplate, NpcDynamicState> => {
    const trust = npc.initialState.trust;
    return {
        static: npc,
        dynamic: {
            ...createPlayerDynamicState(npc),
            trust,
            totalDialogueRounds: 0,
            memory: { α: [], β: [], γ: [], δ: [] }
        }
    };
};

export const isEnemyTemplate = (template: EntityTemplate): template is EnemyTemplate => 'intentDistribution' in template;

/**
 * 强制收敛的战斗实体构造
 */
export const createEnemyEntity = (
    template: EnemyTemplate,
    threatLevel: number = 1
): Entity<EnemyTemplate, CombatDynamicState> => {
    const effectiveThreat = Math.max(1, threatLevel);
    const { attribute, equipState } = template.initialState;

    return {
        static: template,
        dynamic: {
            strength: attribute.strength,
            agility: attribute.agility,
            knowledge: attribute.knowledge,
            perception: attribute.perception,
            maxHp: Math.floor(50 * effectiveThreat),
            maxSanity: Math.floor(100 * effectiveThreat),
            maxStamina: 100 * effectiveThreat,
            maxVigor: 100 * effectiveThreat,
            hp: Math.floor(50 * effectiveThreat),
            sanity: Math.floor(100 * effectiveThreat),
            stamina: 100 * effectiveThreat,
            vigor: 100 * effectiveThreat,
            shield: 0,
            status: [],
            attackPower: Math.floor(attribute.strength * effectiveThreat),
            dodgePower: attribute.agility,
            hitPower: attribute.perception,
            combatBonus: attribute.knowledge,
            equipment: safeDeepClone(equipState),
            nextIntent: template.nextIntent,
        }
    };
};

/**
 * 严格继承探索态底层指标的战斗化映射
 */
export const createCombatantEntity = <T extends CharacterTemplate | NpcTemplate>(
    template: T,
    prevDynamic: PlayerDynamicState | NpcDynamicState
): Entity<T, CombatDynamicState> => {
    return {
        static: template,
        dynamic: {
            strength: prevDynamic.strength,
            agility: prevDynamic.agility,
            knowledge: prevDynamic.knowledge,
            perception: prevDynamic.perception,
            maxHp: prevDynamic.maxHp,
            maxSanity: prevDynamic.maxSanity,
            maxStamina: prevDynamic.maxStamina,
            maxVigor: prevDynamic.maxVigor,
            hp: prevDynamic.hp,
            sanity: prevDynamic.sanity,
            stamina: prevDynamic.stamina,
            vigor: prevDynamic.vigor,
            shield: 0,
            status: [],
            attackPower: Math.max(0, prevDynamic.strength),
            dodgePower: Math.max(0, prevDynamic.agility),
            hitPower: Math.max(0, prevDynamic.perception),
            combatBonus: Math.max(0, prevDynamic.knowledge),
            equipment: safeDeepClone(prevDynamic.equipment),
        }
    };
};

//=============================================================================
// 4. 状态修饰与计算 (Status & Modifiers)
//=============================================================================

export const createStatusEffect = (type: StatusEffectType, duration: number, value: number, source: StatusEffectSource): StatusEffect => ({
    id: generateInstanceId(type),
    type,
    duration,
    value,
    source,
    appliedAt: Date.now(),
});

export const getEffectiveStat = (entity: Entity<CharacterTemplate, BaseDynamicState>, statType: AttributeType | VitalType): number =>
    Math.max(0, entity.dynamic[statType]);

export const getEntityMaxHp = (entity: Entity<CharacterTemplate, BaseDynamicState>): number =>
    Math.max(0, entity.dynamic.maxHp);

export const getHpPercent = (current: number, max: number): number => getPercent(current, max);
export const getSanityPercent = (current: number, max: number): number => getPercent(current, max);

//=============================================================================
// 5. 庇护所与神经系统 (Sanctuary & NeuralLink)
//=============================================================================

// 仅操作 Sanctuary 顶层的运行时 SanctuaryState 字段，initial 为只读模板数据，严禁修改
export const updateSanctuaryResource = (sanctuary: Sanctuary, resource: keyof SanctuaryState, amount: number): Sanctuary => {
    const next = safeDeepClone(sanctuary);
    const currentValue = next[resource];

    if (typeof currentValue === 'number' && !isNaN(currentValue)) {
        next[resource] = Math.max(0, currentValue + amount);
    }
    return next;
};

export const updateNeuralLinkBattery = (neuralLink: NeuralLinkState, amount: number): NeuralLinkState => ({
    ...neuralLink,
    battery: clamp(neuralLink.battery + amount, 0, neuralLink.maxBattery),
});

export const updateNeuralLinkIntegrity = (neuralLink: NeuralLinkState, amount: number): NeuralLinkState => ({
    ...neuralLink,
    integrity: clamp(neuralLink.integrity + amount, 0, neuralLink.maxIntegrity),
});

//=============================================================================
// 6. 地图与层级解析 (Map & Topology)
//=============================================================================

export const normalizeUnlockIds = (ids: string | string[]): string[] => Array.isArray(ids) ? ids : ids.split(',').map(id => id.trim());

export const initializeZoneRuntime = (zone: Zone | Sanctuary): Zone | Sanctuary => {
    const updatedZone = safeDeepClone(zone);
    const nodes = updatedZone.nodes;

    for (const nodeId of Object.keys(nodes)) {
        const node = nodes[nodeId];
        node.exits = node.exits ?? [];

        if (!Array.isArray(node.childrenIds)) continue;

        const validChildrenIds = node.childrenIds.filter(id => !!nodes[id]);

        for (const childId of validChildrenIds) {
            const childNode = nodes[childId];
            childNode.exits = childNode.exits ?? [];

            if (!node.exits.some(e => e.targetId === childId)) {
                node.exits.push({ type: 'local', targetId: childId, label: childNode.name || childId });
            }
            if (!childNode.exits.some(e => e.targetId === nodeId)) {
                childNode.exits.push({ type: 'local', targetId: nodeId, label: node.name });
            }
            for (const otherChildId of validChildrenIds) {
                if (childId !== otherChildId && !childNode.exits.some(e => e.targetId === otherChildId)) {
                    childNode.exits.push({ type: 'local', targetId: otherChildId, label: nodes[otherChildId].name });
                }
            }
        }
    }

    for (const node of Object.values(nodes)) {
        node.exits?.forEach(exit => {
            if (exit.type === 'local' && !exit.label) {
                exit.label = exit.targetId && nodes[exit.targetId] ? nodes[exit.targetId].name : (exit.targetId || '未知');
            }
        });
    }

    Object.entries(nodes).forEach(([id, node]) => {
        nodes[id] = {
            searchCount: 0,
            isVisited: false,
            ...node
        } as Node;
    });

    Object.values(nodes).forEach(node => {
        node.interactions?.forEach(interaction => {
            interaction.results.stateChange?.unlock?.forEach(([targetNodeId, description]) => {
                if (nodes[targetNodeId]) {
                    nodes[targetNodeId] = { ...nodes[targetNodeId], lock: description };
                }
            });
        });
    });

    return updatedZone;
};

export const findNodeKey = (zone: Zone, node: Node): string | undefined =>
    Object.keys(zone.nodes).find(key => zone.nodes[key] === node);

export const getCurrentNodeId = (zone: Zone, node: Node): string => findNodeKey(zone, node) || 'unknown';

//=============================================================================
// 8. 背包与装备操作 (Inventory & Equipment)
//=============================================================================

export const findEquippedWeaponName = (player: PlayerState): string =>
    player.dynamic.equipment.weapons.find(w => w !== null)?.name || "";

export const findEquippedItemName = (player: PlayerState): string => {
    const { weapons, armors, accessories } = player.dynamic.equipment;
    return [...weapons, ...armors, ...accessories].find(i => i !== null)?.name || "";
};

export const addItemToInventory = (inventory: ItemInstance[], item: ItemInstance): ItemInstance[] => {
    if (item.type === 'consumable' || item.type === 'material') {
        const idx = inventory.findIndex(i => i.id === item.id && i.type === item.type);
        if (idx !== -1) {
            const existing = inventory[idx];
            if (typeof existing.quantity === 'number' && typeof item.quantity === 'number') {
                const updatedItem = { ...existing, quantity: existing.quantity + item.quantity };
                return [...inventory.slice(0, idx), updatedItem as ItemInstance, ...inventory.slice(idx + 1)];
            }
        }
    }
    return [...inventory, item];
};

export const removeItemFromInventory = (inventory: ItemInstance[], instanceId: string, quantity: number = 1): ItemInstance[] => {
    const idx = inventory.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return inventory;

    const item = inventory[idx];
    if ((item.type === 'consumable' || item.type === 'material') && typeof item.quantity === 'number' && item.quantity > quantity) {
        const updatedItem = { ...item, quantity: item.quantity - quantity };
        return [...inventory.slice(0, idx), updatedItem as ItemInstance, ...inventory.slice(idx + 1)];
    }
    return inventory.filter(i => i.instanceId !== instanceId);
};

export const findItemInInventory = (inventory: ItemInstance[], instanceId: string) => inventory.find(i => i.instanceId === instanceId);
export const hasItemInInventory = (inventory: ItemInstance[], itemId: string) => inventory.some(item => item.id === itemId);

export const equipItem = (equipment: EquipState, item: ItemInstance, itemType: 'weapon' | 'armor' | 'accessory', slotIndex: number): EquipState => {
    const next = safeDeepClone(equipment);

    if (itemType === 'weapon' && isWeaponInstance(item) && slotIndex >= 0 && slotIndex < 2) {
        next.weapons[slotIndex] = item;
    } else if (itemType === 'armor' && isArmorInstance(item) && slotIndex >= 0 && slotIndex < next.armors.length) {
        next.armors[slotIndex] = item;
    } else if (itemType === 'accessory' && isAccessoryInstance(item) && slotIndex >= 0 && slotIndex < next.accessories.length) {
        next.accessories[slotIndex] = item;
    }
    return next;
};

export const unequipItem = (equipment: EquipState, itemType: 'weapon' | 'armor' | 'accessory', slotIndex: number): EquipState => {
    const next = safeDeepClone(equipment);

    if (itemType === 'weapon' && slotIndex >= 0 && slotIndex < 2) {
        next.weapons[slotIndex] = null;
    } else if (itemType === 'armor' && slotIndex >= 0 && slotIndex < next.armors.length) {
        next.armors[slotIndex] = null;
    } else if (itemType === 'accessory' && slotIndex >= 0 && slotIndex < next.accessories.length) {
        next.accessories[slotIndex] = null;
    }
    return next;
};

//=============================================================================
// 9. 交互计算与结算系统 (Interactions & Effects)
//=============================================================================

export const applyConsumableEffects = (item: ConsumableInstance, player: PlayerState) => {
    const result = {
        attributeUpdates: {} as Partial<Record<AttributeType | VitalType, number>>,
        neuralLinkUpdates: {} as Partial<PlayerState['neuralLink']>,
        effectsApplied: [] as Array<{ type: string; value: number }>,
        hpDelta: 0,
        sanityDelta: 0
    };

    if (!item.effects?.length) return result;

    const baseAttributes = new Set<string>(['strength', 'agility', 'knowledge', 'perception', 'maxHp', 'maxSanity', 'maxStamina', 'maxVigor']);

    for (const [effectType, effectValue] of item.effects) {
        const value = Math.floor(effectValue as number);
        result.effectsApplied.push({ type: effectType as string, value });

        switch (effectType) {
            case 'heal_hp': result.hpDelta += value; break;
            case 'heal_sanity': result.sanityDelta += value; break;
            case 'restore_battery': result.neuralLinkUpdates.battery = clamp(player.neuralLink.battery + value, 0, player.neuralLink.maxBattery); break;
            case 'repair_integrity': result.neuralLinkUpdates.integrity = clamp(player.neuralLink.integrity + value, 0, player.neuralLink.maxIntegrity); break;
            default:
                if (baseAttributes.has(effectType as string)) {
                    const key = effectType as AttributeType | VitalType;
                    result.attributeUpdates[key] = value;
                } else {
                    console.warn(`[状态流转] 丢弃未知的消耗品效果指令: ${effectType}`);
                }
        }
    }
    return result;
};

export const getEffectValueByType = (item: ConsumableInstance, effectType: ConsumableEffectType): number => {
    const effect = item.effects?.find(eff => eff[0] === effectType);
    return effect ? Math.floor(effect[1] as number) : 0;
};

export const validateNodeInteraction = (node: Node, item: ItemInstance): Interaction | null =>
    node.interactions?.find(i => i.requirements?.items?.includes(item.id)) ?? null;

export const processStateChange = (stateChange: Interaction['results']['stateChange'], player: PlayerState) => {
    const changes: {
        inventory?: ItemInstance[];
        companions?: Entity<NpcTemplate, NpcDynamicState>[];
        hpDelta?: number;
        sanityDelta?: number;
        logs: Array<Pick<Log, 'text' | 'type'>>
    } = { logs: [] };

    if (!stateChange) return changes;

    if (stateChange.hp) {
        changes.hpDelta = stateChange.hp;
        changes.logs.push({ text: stateChange.hp > 0 ? `生命恢复 +${stateChange.hp}` : `受到 ${Math.abs(stateChange.hp)} 点伤害`, type: stateChange.hp > 0 ? 'success' : 'critical' });
    }
    if (stateChange.sanity) {
        changes.sanityDelta = stateChange.sanity;
        changes.logs.push({ text: stateChange.sanity > 0 ? `理智恢复 +${stateChange.sanity}` : `失去 ${Math.abs(stateChange.sanity)} 点理智`, type: stateChange.sanity > 0 ? 'success' : 'critical' });
    }

    if (stateChange.lose?.length) {
        let inv = [...player.dynamic.inventory];
        let comps = [...player.companions];
        for (const id of stateChange.lose) {
            const items = inv.filter(i => i.id === id);
            if (items.length > 0) {
                const item = items[Math.floor(Math.random() * items.length)];
                inv = removeItemFromInventory(inv, item.instanceId);
                changes.logs.push({ text: `失去物品: ${item.name}`, type: 'warning' });
            } else {
                const compIdx = comps.findIndex(c => c.static.id === id);
                if (compIdx !== -1) {
                    changes.logs.push({ text: `${comps[compIdx].static.name} 离开了队伍`, type: 'event' });
                    comps.splice(compIdx, 1);
                }
            }
        }
        changes.inventory = inv;
        changes.companions = comps;
    }

    if (stateChange.gain?.length) {
        let inv = changes.inventory || [...player.dynamic.inventory];
        let comps = changes.companions || [...player.companions];
        for (const tpl of stateChange.gain) {
            if (isItemTemplate(tpl)) {
                const item = createItemInstance(tpl);
                changes.logs.push({ text: `获得: ${item.name}`, type: 'loot' });
                inv = addItemToInventory(inv, item);
            } else {
                const npc = createNpcEntity(tpl);
                changes.logs.push({ text: `同伴加入: ${npc.static.name}`, type: 'event' });
                comps.push(npc);
            }
        }
        changes.inventory = inv;
        changes.companions = comps;
    }

    stateChange.spawnEnemy?.forEach(e => changes.logs.push({ text: `警报：${e.name} 出现了！`, type: 'critical' }));
    return changes;
};

export const removeInteractionFromNode = (node: Node, interaction: unknown) =>
    node.interactions?.filter(i => i !== interaction);

export const checkExitLock = (exit: Exit, nodes: Zone['nodes']) => {
    if (!exit.targetId) return { locked: false };
    const targetNode = nodes[exit.targetId] as Node & { lock?: string };
    return targetNode?.lock ? { locked: true, reason: targetNode.lock } : { locked: false };
};

//=============================================================================
// 10. 规则与检定引擎 (Rules & Rolls Engine)
//=============================================================================

export const calculateEncounterChance = (
    threatLevel: number, searchCount: number, staminaPct: number, vigorPct: number,
    condition: 'on_enter' | 'on_search' | 'on_interact' | 'on_sanity_critical', config: Settings['gameConfig']
): number => {
    let chance = config.enemyEncounter.baseChance + (threatLevel / config.enemyEncounter.threatDivisor);
    if (condition === 'on_search') {
        const fatiguePenalty = 1 + (1 - staminaPct) * config.searchCosts.staminaFatigueFactor + (1 - vigorPct) * config.searchCosts.vigorFatigueFactor;
        chance += config.enemyEncounter.searchBaseRisk + (searchCount * config.enemyEncounter.searchRiskPerCount) + ((fatiguePenalty - 1) * config.enemyEncounter.fatiguePenaltyFactor);
    } else if (condition === 'on_sanity_critical') {
        chance += 0.5;
    }
    return chance;
};

export const calculateSearchCosts = (
    attributes: { knowledge: number; perception: number }, staminaPct: number, vigorPct: number, config: Settings['gameConfig']
) => {
    const { searchCosts } = config;
    const fatiguePenalty = searchCosts.fatigueBase + (1 - staminaPct) * searchCosts.staminaFatigueFactor + (1 - vigorPct) * searchCosts.vigorFatigueFactor;
    const knowledgeResistance = Math.max(0, 1.0 - attributes.knowledge * searchCosts.knowledgeFactor + attributes.perception * searchCosts.perceptionFactor);

    const sanityCost = parseFloat((searchCosts.baseSanity * knowledgeResistance).toFixed(1));
    const costMultiplier = Math.max(0.2, 1.0 - (attributes.perception * searchCosts.perceptionFactor + attributes.knowledge * searchCosts.knowledgeRecoveryFactor));
    const staminaCost = parseFloat((searchCosts.baseStamina * costMultiplier * fatiguePenalty).toFixed(1));
    const vigorCost = parseFloat((searchCosts.baseVigor * costMultiplier * fatiguePenalty).toFixed(1));

    return { sanityCost, fatiguePenalty, staminaCost, vigorCost };
};

export const calculatePerceptionScore = (attributes: { knowledge: number; perception: number; agility: number }, searchCount: number, config: Settings['gameConfig']) =>
    attributes.knowledge + (attributes.agility * config.perceptionWeights.agility) + (attributes.perception * config.perceptionWeights.basePerception) + (searchCount * config.perceptionWeights.searchCount);

export const processItemDiscovery = (node: Node, roll: number, config: Settings['gameConfig']) => {
    const items = node.items || [];
    if (!items.length) return { foundItem: null, remainingItems: items };

    const discoverable = items.filter(item => roll >= (item.discoveryThreshold || config.discoveryThresholds.low));
    if (discoverable.length > 0) {
        const foundItem = discoverable[0];
        return { foundItem, remainingItems: items.filter(i => i.id !== foundItem.id) };
    }
    return { foundItem: null, remainingItems: items };
};

//=============================================================================
// 11. 游戏状态计算 (Game State Calculation)
//=============================================================================

export const advanceZoneTime = (current: ZoneDate, timePassed: number): ZoneDate => {
    let tick = current.tick + timePassed;
    let cycle = current.cycle + Math.floor(tick / 60);
    const day = current.day + Math.floor(cycle / 24);

    return { day, cycle: cycle % 24, tick: tick % 60 };
};

export const safeAudioOperation = (operation: () => void, errorContext: string): void => {
    try { operation(); } catch (e) { console.debug(`${errorContext}:`, e); }
};

const hasSolvePlotPointMarker = (entity: unknown): entity is { toSolvePP: string } => {
    if (entity === null || typeof entity !== 'object') return false;
    return 'toSolvePP' in entity && typeof (entity as { toSolvePP: unknown }).toSolvePP === 'string';
};

export const createDialogueRecord = (speakerName: string, text: string, location: Loc, isNPC: boolean, time: ZoneDate, mood?: Mood): Words<PlayerWordsTag> | Words<NpcWordsTag> =>
    isNPC
        ? { text, tag: { type: 'npc', speakerName, mood: mood || 'neutral' } }
        : { text, tag: { type: 'player', speakerName, location, currentTime: time } };

export const extractPlotPointsFromZone = (zone: Zone): { resolvedIds: string[], resolutionContexts: Record<string, string> } => {
    const resolvedIds: string[] = [];
    const resolutionContexts: Record<string, string> = {};

    const extract = (entity: unknown, contextText: string) => {
        if (hasSolvePlotPointMarker(entity)) {
            resolvedIds.push(entity.toSolvePP);
            resolutionContexts[entity.toSolvePP] = contextText;
        }
    };

    Object.values(zone.nodes).forEach(node => {
        extract(node, `在 [${node.name}] 中探索时揭示`);
        node.items?.forEach(item => extract(item, `发现线索 [${item.name}] 时解开`));
        if (node.nodeNpc) extract(node.nodeNpc, `遭遇 [${node.nodeNpc.name}] 时获悉`);
        node.interactions?.forEach(interaction => {
            if (interaction.requirements?.puzzleSolved) extract(interaction.requirements.puzzleSolved, `解开谜团 [${interaction.requirements.puzzleSolved.title}] 后揭晓`);
        });
    });

    return { resolvedIds, resolutionContexts };
};

export const calculateNextTickState = (
    prevPlayer: PlayerState,
    timePassed: number,
    gameState: GameState,
    isCameraMode: boolean,
    currentZone?: Zone
): { nextPlayer: PlayerState; isBatteryDepleted: boolean } => {
    const nextPlayer = safeDeepClone(prevPlayer);
    const isSanctuary = gameState === GameState.SANCTUARY;
    let isBatteryDepleted = false;

    nextPlayer.currentGameRound.absoluteTick += 1;
    nextPlayer.currentZoneTime = advanceZoneTime(nextPlayer.currentZoneTime, timePassed);
    nextPlayer.currentRealTime = new Date();

    const dilationFactor = currentZone?.initial?.dilationFactor ?? nextPlayer.sanctuary?.initial?.dilationFactor ?? 1.0;
    let sanityDrain = 0.1 * timePassed * dilationFactor;

    if (nextPlayer.neuralLink.battery <= 0 || nextPlayer.neuralLink.integrity <= 0) {
        sanityDrain += 1.0 * timePassed;
    }

    if (!isSanctuary) {
        nextPlayer.dynamic.sanity = Math.max(0, nextPlayer.dynamic.sanity - sanityDrain);
    }

    if (isCameraMode && !isSanctuary) {
        const baseDrain = 0.05;
        const noiseDrain = nextPlayer.neuralLink.noiseLevel * 0.2;
        const integrityFactor = nextPlayer.neuralLink.integrity < 50 ? 2 : 1;
        const totalDrain = (baseDrain + noiseDrain) * integrityFactor * timePassed;
        const previousBattery = nextPlayer.neuralLink.battery;

        nextPlayer.neuralLink.battery = Math.max(0, previousBattery - totalDrain);
        if (previousBattery > 0 && nextPlayer.neuralLink.battery <= 0) {
            isBatteryDepleted = true;
        }
    }

    if (nextPlayer.sanctuary) {
        // 读取顶层运行时字段，而非 initial 模板
        const population = nextPlayer.sanctuary.population || 1;
        const consumptionRate = timePassed * population;

        if (isSanctuary) {
            nextPlayer.sanctuary = updateSanctuaryResource(nextPlayer.sanctuary, 'food', -consumptionRate * 0.1);
            nextPlayer.sanctuary = updateSanctuaryResource(nextPlayer.sanctuary, 'water', -consumptionRate * 0.15);
            nextPlayer.sanctuary = updateSanctuaryResource(nextPlayer.sanctuary, 'electricity', -consumptionRate * 0.5);

            if (nextPlayer.sanctuary.food <= 0 || nextPlayer.sanctuary.water <= 0) {
                nextPlayer.sanctuary = updateSanctuaryResource(nextPlayer.sanctuary, 'morale', -timePassed * 2.0);
            }
        } else {
            nextPlayer.sanctuary = updateSanctuaryResource(nextPlayer.sanctuary, 'food', -timePassed * 0.05);
            nextPlayer.sanctuary = updateSanctuaryResource(nextPlayer.sanctuary, 'water', -timePassed * 0.08);
        }
    }

    return { nextPlayer, isBatteryDepleted };
};

export const performStateRestoration = (data: GameStateData, updaters: GameStateUpdaters): void => {
    const { setPlayer, setCurrentZone, setCurrentNodeId, setGameState, setSettings, setSanctuary } = updaters;
    setPlayer(data.player);
    setCurrentZone(data.currentZone);
    setCurrentNodeId(data.player.location.currentLocation.node.id);
    setGameState(data.gameState || GameState.PLAYING);
    if (data.settings) setSettings(data.settings);
    if (data.player.sanctuary) setSanctuary(data.player.sanctuary);
};

//=============================================================================
// 13. 区域生成上下文构建
//=============================================================================

export const buildZoneGenerationContext = (
    config: StoryConfig,
    player: PlayerState,
    analysis?: ChainNarrative['analysis']
): ZoneGenerationContext => {
    if (config.mode.id === 'chain') {
        if (!analysis) throw new Error('[状态流转异常] 链式叙事模式缺失 Analysis 参数');
        if (!config.pacing) throw new Error('[状态流转异常] 链式叙事模式缺失 Pacing 配置');

        const motif = config.motif || { id: 'auto', prompt: 'AI自适应生成' };
        const mainAxis = config.mainAxis || { id: 'auto', prompt: 'AI自适应生成' };

        return {
            base: {
                mode: { id: 'chain', prompt: config.mode.prompt },
                theme: { id: config.theme.id, prompt: config.theme.prompt },
                pacing: { id: config.pacing.id, prompt: config.pacing.prompt },
                motif: { id: motif.id, prompt: motif.prompt },
                mainAxis: { id: mainAxis.id, prompt: mainAxis.prompt },
            },
            params: analysis,
            extra: {
                questAccepted: player.questAccepted,
                prevLocation: player.location.prevLocation,
                currentLocation: player.location.currentLocation
            }
        } as ChainGenerationContext;
    } else {
        return {
            base: {
                mode: { id: 'episodic', prompt: config.mode.prompt },
                theme: { id: config.theme.id, prompt: config.theme.prompt },
            },
            params: {
                nodeToGenerate: config.nodeCount || 8,
                tension: config.tension || 500
            },
            extra: {
                questAccepted: player.questAccepted,
                player: { static: player.static, dynamic: player.dynamic },
                companions: player.companions
            }
        } as EpisodicGenerationContext;
    }
};

//=============================================================================
// 14. 战斗状态转换与映射 (Combat State Mapping)
//=============================================================================

export const processDamageDeduction = (currentShield: number, rawDamage: number) => {
    const damageToShield = Math.min(currentShield, rawDamage);
    return {
        newShield: currentShield - damageToShield,
        actualDmg: rawDamage - damageToShield
    };
};

export const applyCombatToPlayerDynamic = (base: PlayerDynamicState, combat: CombatDynamicState): PlayerDynamicState => {
    return {
        ...base,
        strength: combat.strength,
        agility: combat.agility,
        knowledge: combat.knowledge,
        perception: combat.perception,
        maxHp: combat.maxHp,
        maxSanity: combat.maxSanity,
        maxStamina: combat.maxStamina,
        maxVigor: combat.maxVigor,
        hp: combat.hp,
        sanity: combat.sanity,
        stamina: combat.stamina,
        vigor: combat.vigor,
        equipment: combat.equipment,
    };
};

export const applyCombatToNpcDynamic = (base: NpcDynamicState, combat: CombatDynamicState): NpcDynamicState => {
    return {
        ...base,
        strength: combat.strength,
        agility: combat.agility,
        knowledge: combat.knowledge,
        perception: combat.perception,
        maxHp: combat.maxHp,
        maxSanity: combat.maxSanity,
        maxStamina: combat.maxStamina,
        maxVigor: combat.maxVigor,
        hp: combat.hp,
        sanity: combat.sanity,
        stamina: combat.stamina,
        vigor: combat.vigor,
        equipment: combat.equipment,
    }
}

//=============================================================================
// 15. 游戏初始化 (Game Initialization)
//=============================================================================

export const initializeGameFromOrigin = (originTemplate: OriginTemplate) => {
    const sanctuaryTemplate = safeDeepClone(originTemplate.sanctuary);

    // 从 sanctuaryTemplate.initial 读取真实初始资源值，同时同步至顶层 SanctuaryState 字段
    const { food, water, medicine, electricity, scraps, population, morale, erosion } = sanctuaryTemplate.initial;
    const sanctuary = initializeZoneRuntime({
        ...sanctuaryTemplate,
        storage: [],
        food,
        water,
        medicine,
        electricity,
        scraps,
        population,
        morale,
        erosion
    }) as Sanctuary;

    const character = originTemplate.player;
    const playerEntity = createPlayerEntity(character);

    const baseAnalysis: ChainNarrative['analysis'] = {
        params: {
            progress: { marco: 'setup', micro: 0 },
            tension: 0,
            shouldTriggerEnding: false,
            activePlotPoints: [[], []] as PlotPointNet,
        },
        output: { ppToGenerate: { m: 0, s: 0 }, nodeToGenerate: 8, ppToSolve: 0 }
    };

    const player: PlayerState = {
        static: playerEntity.static,
        dynamic: playerEntity.dynamic,
        killCount: 0,
        searchCount: 0,
        exploredZones: 0,
        exploredNodes: 0,
        currentRealTime: new Date(),
        currentZoneTime: { day: 0, cycle: 0, tick: 0 },
        currentGameRound: { absoluteTick: 0, explorationStep: 0, combatTurn: 0 },
        neuralLink: {
            battery: 100,
            maxBattery: 100,
            integrity: 100,
            maxIntegrity: 100,
            noiseLevel: 10,
        },
        companions: originTemplate.companion?.map(createNpcEntity) ?? [],
        questAccepted: [],
        activeArc: undefined,
        archivedArcs: [],
        archivedHiddenAxis: [],
        sanctuary,
        visualMode: 'bio',
        location: {
            prevLocation: null,
            currentLocation: {
                zone: {
                    id: sanctuary.id,
                    name: sanctuary.name,
                    desc: {
                        background: sanctuary.background,
                        topology: sanctuary.topology,
                        visualStyle: sanctuary.visualStyle,
                        nodesCount: sanctuary.nodesCount,
                    },
                    isSanctuary: {
                        population: sanctuary.population,
                        food: sanctuary.food,
                        water: sanctuary.water,
                        medicine: sanctuary.medicine,
                        electricity: sanctuary.electricity,
                        scraps: sanctuary.scraps,
                        morale: sanctuary.morale,
                        erosion: sanctuary.erosion,
                    }
                },
                node: { id: sanctuary.initial.entrance, name: sanctuary.initial.entrance, desc: '' }
            }
        },
        dialogue: [],
        narrative: baseAnalysis,
        vitalRecord: {
            prevVital: { prevTick: 0, prevVital: { maxHp: 0, maxSanity: 0, maxStamina: 0, maxVigor: 0 } },
            currentVital: { currentTick: 0, currentVital: { maxHp: 0, maxSanity: 0, maxStamina: 0, maxVigor: 0 } }
        }
    };

    const zone = sanctuary as unknown as Zone;

    return {
        player,
        sanctuary,
        zone,
        entranceNodeId: sanctuary.initial.entrance
    }
}