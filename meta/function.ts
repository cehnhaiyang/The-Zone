import {
    SanctuaryTemplate,
    NodeTemplate,
    NpcTemplate,
    Puzzle,
    QuestTemplate,
    ItemTemplate,
    EnemyTemplate,
    WeaponInstance,
    ArmorInstance,
    AccessoryInstance,
    Item,
    Exit,
    Interaction,
    CardTemplate,
    ClozePuzzle,
    ChoicePuzzle,
    TypePuzzle,
    CombatIntent
} from './interface';
import { CharacterStyle, ItemRarity, WeaponType, AccessoryEffectType, ConsumableEffectType, SfxType, IntentType } from './type';

export function createSanctuaryT(
    id: string,
    name: string,
    background: string,
    topology: string,
    nodesCount: number,
    visualStyle: string,
    entrance: string,
    dilationFactor: number,
    food: number,
    water: number,
    medicine: number,
    electricity: number,
    scraps: number,
    population: number,
    morale: number,
    erosion: number,
    nodes: Record<string, NodeTemplate>
): SanctuaryTemplate {
    return {
        id,
        name,
        background,
        topology,
        nodesCount,
        visualStyle,
        initial: {
            dilationFactor,
            entrance,
            food,
            water,
            medicine,
            electricity,
            scraps,
            population,
            morale,
            erosion,
        },
        nodes,
    }
}

export function createNodeT(
    name: string,
    desc: string,
    visualPrompt: string,
    threatLevel?: number,
    childrenIds?: string[],
    interactions?: Interaction[],
    nodeNpc?: NpcTemplate,
    items?: Item[],
    specificEnemy?: EnemyTemplate,
    enemySpawnCondition?: 'on_enter' | 'on_search' | 'on_interact' | 'on_sanity_critical',
    exits?: Exit[],
): NodeTemplate {
    const node: NodeTemplate = {
        name,
        desc,
        visualPrompt
    }
    if (threatLevel) {
        node.threatLevel = threatLevel;
    }
    if (childrenIds) {
        node.childrenIds = childrenIds;
    }
    if (interactions) {
        node.interactions = interactions;
    }
    if (nodeNpc) {
        node.nodeNpc = nodeNpc;
    }
    if (items) {
        node.items = items;
    }
    if (specificEnemy) {
        node.specificEnemy = specificEnemy;
    }
    if (enemySpawnCondition) {
        node.enemySpawnCondition = enemySpawnCondition;
    }
    if (exits) {
        node.exits = exits;
    }
    return node
}

export function createNpcT(
    id: string,
    name: string,
    desc: string,
    visualPrompt: string,
    style: CharacterStyle,
    strength: number,
    agility: number,
    knowledge: number,
    perception: number,
    maxHp: number,
    maxSanity: number,
    maxStamina: number,
    maxVigor: number,
    trust: number,
    quest: Record<string, QuestTemplate>,
    deck: CardTemplate[],
    weapons: [WeaponInstance | null, WeaponInstance | null],
    armors: (ArmorInstance | null)[],
    accessories: (AccessoryInstance | null)[],
    inventory: ItemTemplate[],
    gender?: 'male' | 'female' | 'both'
): NpcTemplate {
    return {
        id,
        name,
        gender,
        desc,
        visualPrompt,
        style,
        initialState: {
            attribute: {
                strength,
                agility,
                knowledge,
                perception,
            },
            vital: {
                maxHp,
                maxSanity,
                maxStamina,
                maxVigor,
            },
            equipState: {
                weapons,
                armors,
                accessories,
            },
            inventory,
            deck,
            trust,
            quest
        }
    }
}

export function createPuzzle(
    title: string,
    lore: string,
    puzzleType: 'cloze' | 'choice' | 'type',
    answer: string | string[],
    hints?: string[],
    clozeBody?: Array<(string | '')[]>,
    choiceBody?: string[],
    timeCostPerAttempt?: number,
    timeLimit?: number,
    maxAttempts?: number,
    rewardItems?: ItemTemplate[],
    rewardSanity?: number,
    penaltyHp?: number,
    penaltySanity?: number,
    penaltySpawnEnemy?: EnemyTemplate,
    penaltyPermanentLock?: boolean,
    penaltyNodesToLock?: string | string[]
): Puzzle {
    let body: Puzzle['body'];

    if (puzzleType === 'cloze') {
        body = {
            type: 'cloze',
            body: clozeBody ?? [],
            answer: Array.isArray(answer) ? answer : [answer],
        } as ClozePuzzle;
    } else if (puzzleType === 'choice') {
        body = {
            type: 'choice',
            body: choiceBody ?? [],
            answer: Array.isArray(answer) ? (answer[0] ?? '') : answer,
        } as ChoicePuzzle;
    } else {
        body = {
            type: 'type',
            answer: Array.isArray(answer) ? (answer[0] ?? '') : answer,
        } as TypePuzzle;
    }

    const puzzle: Puzzle = {
        title,
        lore,
        body,
        hints: hints ?? [],
        restrictions: {
            timeCostPerAttempt: timeCostPerAttempt ?? 1,
            timeLimit,
            maxAttempts,
        },
    };

    if (rewardItems || rewardSanity) {
        puzzle.rewards = {
            items: rewardItems,
            sanity: rewardSanity,
        };
    }

    if (
        penaltyHp ||
        penaltySanity ||
        penaltySpawnEnemy ||
        penaltyPermanentLock ||
        penaltyNodesToLock
    ) {
        puzzle.penalties = {
            hp: penaltyHp,
            sanity: penaltySanity,
            spawnEnemy: penaltySpawnEnemy,
            permanentLock: penaltyPermanentLock,
            nodesToLock: penaltyNodesToLock,
        };
    }
    return puzzle
}

export function createItem(
    id: string,
    name: string,
    desc: string,
    rarity: ItemRarity,
    type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'document' | 'audio' | 'material',
    discoveryThreshold?: number,
    quantity?: number,
    weaponType?: WeaponType,
    meleeDamage?: number,
    rangeDamage?: number,
    defense?: number,
    maxUses?: number,
    effects?: [AccessoryEffectType, number][] | [ConsumableEffectType, number, number?][],
    documentContent?: string,
    audioScript?: string
): Item {
    const item: any = {
        id,
        name,
        desc,
        rarity,
        type
    }
    if (discoveryThreshold) {
        item.discoveryThreshold = discoveryThreshold;
    }
    if (quantity) {
        item.quantity = quantity;
    }
    if (type === 'weapon') {
        item.weaponType = weaponType;
        if (meleeDamage) {
            item.meleeDamage = meleeDamage;
        }
        if (rangeDamage) {
            item.rangeDamage = rangeDamage;
        }
        item.maxUses = maxUses ?? 1;
    } else if (type === 'armor') {
        item.defense = defense ?? 0;
        item.maxUses = maxUses ?? 1;
    } else if (type === 'accessory') {
        if (effects && effects.length > 0) {
            item.effects = effects;
        }
    } else if (type === 'consumable') {
        if (effects && effects.length > 0) {
            item.effects = effects;
        }
    } else if (type === 'document') {
        if (documentContent) {
            item.documentContent = documentContent;
        }
    } else if (type === 'audio') {
        if (audioScript) {
            item.audioScript = audioScript;
        }
    }
    return item as Item
}

export function createEnemy(
    id: string,
    name: string,
    desc: string,
    visualPrompt: string,
    strength: number,
    agility: number,
    knowledge: number,
    perception: number,
    weapons: [WeaponInstance | null, WeaponInstance | null],
    armors: (ArmorInstance | null)[],
    accessories: (AccessoryInstance | null)[],
    intentDistribution: Record<IntentType, number>,
    nextIntent: CombatIntent,
    zoneId?: string[],
    lootTable?: Array<ItemTemplate & { dropProbability: number }>,
    gender?: 'male' | 'female' | 'both'
): EnemyTemplate {
    const enemy: EnemyTemplate = {
        id,
        name,
        desc,
        visualPrompt,
        initialState: {
            attribute: {
                strength,
                agility,
                knowledge,
                perception
            },
            equipState: {
                weapons,
                armors,
                accessories
            }
        },
        intentDistribution,
        nextIntent
    };
    if (gender) {
        enemy.gender = gender;
    }
    if (zoneId) {
        enemy.zoneId = zoneId;
    }
    if (lootTable) {
        enemy.lootTable = lootTable;
    }
    return enemy;
}

export function createStateChange(
    hp?: number,
    sanity?: number,
    lose?: string[],
    gain?: Array<ItemTemplate | NpcTemplate>,
    spawnEnemy?: EnemyTemplate[],
    unlock?: Array<[string, string]>
): Interaction['results']['stateChange'] {
    const stateChange: Interaction['results']['stateChange'] = {}
    if (hp) stateChange.hp = hp
    if (sanity) stateChange.sanity = sanity
    if (lose) stateChange.lose = lose
    if (gain) stateChange.gain = gain
    if (spawnEnemy) stateChange.spawnEnemy = spawnEnemy
    if (unlock) stateChange.unlock = unlock
    return stateChange
}

export function createRequirement(
    items?: string[],
    staff?: string[],
    puzzleSolved?: Puzzle
): Interaction['requirements'] {
    const requirements: Interaction['requirements'] = {}
    if (items) requirements.items = items
    if (staff) requirements.staff = staff
    if (puzzleSolved) requirements.puzzleSolved = puzzleSolved
    return requirements
}

export function createResult(
    timeCost: number,
    soundEffect: SfxType,
    narrative: string,
    stateChange?: Interaction['results']['stateChange'],
): Interaction['results'] {
    const results: Interaction['results'] = {
        timeCost,
        soundEffect,
        narrative
    }
    if (stateChange) {
        results.stateChange = stateChange;
    }
    return results
}

export function createInteraction(
    desc: string,
    results: Interaction['results'],
    requirements?: Interaction['requirements'],
): Interaction {
    const interaction: Interaction = {
        desc,
        results
    }
    if (requirements) {
        interaction.requirements = requirements
    }
    return interaction
}