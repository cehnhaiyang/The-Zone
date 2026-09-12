/**
 * schema.ts
 * LLM Schema 定义 (v6.0)
 *
 * 设计原则：
 * - 原子 schema 独立维护
 * - 各领域 schema 通过原子 schema 组装
 * - 链式叙事、单元剧、社交 LLM 各自只看到自己需要的字段
 * - 不在 schema 中提及当前领域不存在的字段
 * - 所有枚举严格映射 type.ts / interface.ts
 *
 * @version 6.0.0
 * @see type.ts
 * @see interface.ts
 */

const schema = (...parts: Array<string | false | null | undefined>): string =>
  Array.from(
    new Set(parts.filter((part): part is string => typeof part === 'string' && part.trim().length > 0))
  ).join('\n\n');

//=============================================================================
// 0. 输出规则
//=============================================================================

export const RULE_OUTPUT_JSON = `
输出必须是 JSON 兼容对象。
未标注可选的字段为必填。
所有枚举值、字面量联合类型必须完全匹配。
id 使用英文 snake_case，并在同一作用域内唯一。
number 必须为有限数值。
数组字段未说明可为空时，至少包含一个有效元素。
`.trim();

//=============================================================================
// 1. 原子类型
//=============================================================================

export const T_ITEM_RARITY = `
type ItemRarity =
  | 'salvaged'
  | 'standard'
  | 'reliable'
  | 'organized'
  | 'foundation'
  | 'deep'
  | 'prototype'
  | 'ark'
  | 'abyssal'
  | 'forbidden'
  | 'ineffable';
`.trim();

export const T_WEAPON_TYPE = `
type WeaponType =
  | 'magic'
  | 'sniper_rifle'
  | 'assault_rifle'
  | 'smg'
  | 'pistol'
  | 'shotgun'
  | 'sawed_off'
  | 'crossbow'
  | 'throw'
  | 'bow'
  | 'wave'
  | 'both_wave'
  | 'prick'
  | 'both_prick';
`.trim();

export const T_WEAPON_DAMAGE_TYPE = `
type WeaponDamageType = 'cold' | 'hot' | 'instant';
`.trim();

export const T_ATTRIBUTE_TYPE = `
type AttributeType = 'strength' | 'agility' | 'wisdom' | 'perception' | 'spiritual';
`.trim();

export const T_VITAL_TYPE = `
type VitalType = 'maxHp' | 'maxSanity' | 'maxStamina' | 'maxVigor';
`.trim();

export const T_ACCESSORY_EFFECT_TYPE = `
type AccessoryEffectType = AttributeType | VitalType;
`.trim();

export const T_CONSUMABLE_EFFECT_TYPE = `
type ConsumableEffectType =
  | AccessoryEffectType
  | 'heal_hp'
  | 'heal_sanity'
  | 'heal_stamina'
  | 'heal_vigor'
  | 'restore_battery'
  | 'repair_integrity';
`.trim();

export const T_COMBAT_STYLE = `
type CombatStyle = 'burst' | 'attack' | 'balance' | 'defense' | 'skirmish';
`.trim();

export const T_GENDER = `
type Gender = 'male' | 'female' | 'both';
`.trim();

export const T_INTENT_TYPE = `
type IntentType = 'attack' | 'defense' | 'buff' | 'debuff' | 'observe';
`.trim();

export const T_ENEMY_SPAWN_CONDITION = `
type EnemySpawnCondition = 'on_enter' | 'on_search' | 'on_interact';
`.trim();

export const T_PLOT_POINT_TYPE = `
type PlotPointType = 'main' | 'side';
`.trim();

export const T_MOOD = `
type Mood = 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'neutral';
`.trim();

export const T_SANCTUARY_STATE_KEY = `
type SanctuaryStateKey =
  | 'food'
  | 'water'
  | 'medicine'
  | 'electricity'
  | 'scraps'
  | 'population'
  | 'morale'
  | 'erosion';
`.trim();

export const T_SOUND_TYPE = `
type SoundType =
  | 'typing_1'
  | 'typing_2'
  | 'typing_3'
  | 'success'
  | 'fail'
  | 'error'
  | 'search'
  | 'unlock'
  | 'lock'
  | 'item_pickup'
  | 'item_use'
  | 'item_equip'
  | 'item_unequip'
  | 'item_break'
  | 'ui_click'
  | 'ui_hover'
  | 'ui_transition'
  | 'ui_notification'
  | 'tactic_execute'
  | 'combat_miss'
  | 'combat_graze'
  | 'combat_hit'
  | 'combat_crit'
  | 'combat_block'
  | 'combat_buff'
  | 'combat_debuff'
  | 'event_npc_join'
  | 'event_npc_leave'
  | 'terrifying'
  | 'node_transition'
  | 'zone_enter';
`.trim();

//=============================================================================
// 2. 基础数值结构
//=============================================================================

export const ATTRIBUTE_SCHEMA = `
Attribute = {
  "strength": number,
  "agility": number,
  "wisdom": number,
  "perception": number,
  "spiritual": number
}
约束：
Attribute 五项必须全部存在。
取值范围 0-100。
0-5：残废、差劲。
5-10：较弱。
10-20：一般人。
20-30：较强。
30-40：很强。
40-50：佼佼者。
50-60：中 boss 级。
60-70：大 boss 级。
70-80：超大 boss 级。
80-100：区域关底级。
`.trim();

export const VITAL_SCHEMA = `
Vital = {
  "maxHp": number,
  "maxSanity": number,
  "maxStamina": number,
  "maxVigor": number
}
约束：
Vital 四项必须全部存在。
50：残废。
100：普通人。
200：优秀。
300：极其优秀。
400：令人震惊。
500：绝无仅有。
`.trim();

//=============================================================================
// 3. 物品模板
//=============================================================================

export const WEAPON_TEMPLATE_SCHEMA = `
WeaponTemplate = {
  "id": string,
  "name": string,
  "desc": string,
  "rarity": ItemRarity,
  "type": "weapon",
  "weaponType": WeaponType,
  "weaponDamageType": WeaponDamageType,
  "range": number,
  "maxUses": number,
  "damage": number
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
weaponDamageType：cold 对应冷兵器，hot 对应热武器，instant 仅用于 magic 类型。
range 为有效攻击距离（战场格数），取值 0-12，必须精确落入以下档位之一：
  0：无限（仅 magic 类型使用）。
  1：贴身（长剑、斧、锤、棍、匕首、短刀、爪）。
  2：极近（短矛、刺剑、武士刀突刺、双持短刃）。
  3：近（短管霰弹枪、飞刀、手斧、手雷、长矛、戟、薙刀）。
  4：中近（标准霰弹枪、短管左轮、袖珍手枪）。
  5：中（反曲弓、短弩、大多数半自动手枪）。
  6：中远（长管左轮、大威力手枪、复合弓、PDW 短管版）。
  7：远（独头弹霰弹枪、军用弩、冲锋枪短管版）。
  8：极远（复合长弓、冲锋枪标准管）。
  9：长（短管突击步枪、卡宾步枪、精密冲锋枪）。
  10：中长（标准突击步枪、战斗步枪、轻机枪短管版）。
  11：极长（精确射手步枪、中短管狙击步枪、通用机枪）。
  12：极限（长管狙击步枪、反器材步枪）。
maxUses 为正整数。
damage 为非负整数。
`.trim();

export const ARMOR_TEMPLATE_SCHEMA = `
ArmorTemplate = {
  "id": string,
  "name": string,
  "desc": string,
  "rarity": ItemRarity,
  "type": "armor",
  "partialReduction": number,
  "maxUses": number
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
partialReduction 取值 0-0.999。
maxUses 为正整数。
`.trim();

export const ACCESSORY_TEMPLATE_SCHEMA = `
AccessoryTemplate = {
  "id": string,
  "name": string,
  "desc": string,
  "rarity": ItemRarity,
  "type": "accessory",
  "effects": Array<[AccessoryEffectType, number]>
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
effects 每项第二项为整数。
属性加成常见为 1-10。
最大体征加成常见为 10-100。
`.trim();

export const CONSUMABLE_TEMPLATE_SCHEMA = `
ConsumableTemplate = {
  "id": string,
  "name": string,
  "desc": string,
  "rarity": ItemRarity,
  "type": "consumable",
  "effects": Array<[ConsumableEffectType, number, number?]>
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
effects 每项第二项为整数。
effects 每项第三项为可选持续回合数（仅 buff 类效果需要）。
恢复类效果值常见为 10-80。
`.trim();

export const DATA_TEMPLATE_SCHEMA = `
DataTemplate = {
  "id": string,
  "name": string,
  "desc": string,
  "rarity": ItemRarity,
  "type": "data",
  "documentContent?": string,
  "audioScript?": string
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
documentContent、audioScript 至少存在一项。
`.trim();

export const MATERIAL_TEMPLATE_SCHEMA = `
MaterialTemplate = {
  "id": string,
  "name": string,
  "desc": string,
  "rarity": ItemRarity,
  "type": "material"
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
`.trim();

export const ITEM_TEMPLATE_UNION_SCHEMA = `
ItemTemplate = WeaponTemplate | ArmorTemplate | AccessoryTemplate | ConsumableTemplate | DataTemplate | MaterialTemplate;
`.trim();

export const MAP_ITEM_SCHEMA = `
MapItem = ItemTemplate & {
  "discoveryThreshold?": number,
  "quantity?": number
}
约束：
MapItem 用于节点物品列表。
quantity 为正整数，默认 1。
discoveryThreshold 为非负数，表示需要达到多少搜查次数才能发现该物品。
`.trim();

//=============================================================================
// 4. 任务模板
//=============================================================================

export const QUEST_TEMPLATE_SCHEMA = `
QuestTemplate = {
  "id": string,
  "desc": string,
  "difficulty": number,
  "goals": Array<ItemTemplate | NpcBaseTemplate>,
  "rewards": Array<ItemTemplate | NpcBaseTemplate>
}
约束：
id 使用英文 snake_case。
desc 使用中文。
difficulty 取值参考：
  1：休闲。
  2：轻松。
  3：简单。
  4：标准。
  5：普通。
  6：困难。
  7：极难。
  8：难到爆。
  9：噩梦。
  10：地狱。
  10+：不可能完成。
goals、rewards 中若为 NPC，使用 NpcBaseTemplate。
`.trim();

//=============================================================================
// 5. NPC 模板
//=============================================================================

export const NPC_BASE_TEMPLATE_SCHEMA = `
NpcBaseTemplate = {
  "id": string,
  "name": string,
  "gender?": Gender,
  "desc": string,
  "visualPrompt": string,
  "style": CombatStyle,
  "initialState": {
    "attribute": Attribute,
    "vital": Vital,
    "inventory?": ItemTemplate[],
    "trust?": number
  }
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
visualPrompt 使用英文 AI 绘图提示词。
trust 建议范围 -50 到 100。
`.trim();

export const NPC_TEMPLATE_SCHEMA = `
NpcTemplate = NpcBaseTemplate & {
  "initialState": NpcBaseTemplate["initialState"] & {
    "quest?": QuestTemplate[]
  }
}
约束：
quest 数组中的任务排列顺序决定玩家接取顺序。
必须完成前一个任务，后一个任务才会显示并可接取。
`.trim();

export const NODE_NPC_EXTENSION_SCHEMA = `
NodeNpcTemplate = NpcTemplate & {
  "canBeInvited?": {
    "trust?": number,
    "item?": string[],
    "questsArchived?": string[],
    "replacement?": Array<
      string |
      {
        "duty": string,
        "desc": string,
        "attributes?": Partial<Record<AttributeType, number>>,
        "vitals?": Partial<Record<VitalType, number>>,
        "dynamicVitals?": Partial<Record<VitalType, number>>
      }
    >,
    "isSanctuarySafe?": Partial<Record<SanctuaryStateKey, number>>
  },
  "willRoam?": {
    "speed": number,
    "passNodes?": {
      "maxThreat?": number,
      "nodesId?": string[]
    },
    "route?": string[]
  }
}
约束：
无 canBeInvited 字段表示该 NPC 不可被邀请。
canBeInvited.replacement 可以直接是 NPC ID 字符串，也可以是详细职责要求对象。
canBeInvited.isSanctuarySafe 仅用于庇护所 NPC。
无 willRoam 字段表示该 NPC 始终停留在原位节点。
willRoam.speed 表示多少个 tick 移动一次。
willRoam.passNodes 与 willRoam.route 互斥，只能存在其一。
`.trim();

//=============================================================================
// 6. 敌人模板
//=============================================================================

export const ENEMY_TEMPLATE_SCHEMA = `
EnemyTemplate（常规敌人，type = "cthulhu"） = {
  "type": "cthulhu",
  "id": string,
  "name": string,
  "gender?": Gender,
  "desc": string,
  "visualPrompt": string,
  "zoneId?": string[],
  "range": number,
  "speed": number,
  "damage": number,
  "defense": number,
  "evasion": number,
  "lootTable?": Array<ItemTemplate & { "dropProbability": number }>,
  "intentDistribution": Record<IntentType, number>
}

EnemyTemplate（固定敌人，type = "immovable"） = 同上，但：
  "type" 为 "immovable"。
  省略 evasion。
  省略 intentDistribution。

约束：
id 使用英文 snake_case。
name、desc 使用中文。
visualPrompt 使用英文 AI 绘图提示词。
speed：速度，影响行动频率，建议 6-28。
damage：攻击力，建议 5-40。
defense：防御力，影响最低减伤比，高护甲单位给 16-24，普通 2-12。
evasion：闪避力，影响最高减伤比，建议 4-26，必须 ≥ defense；敏捷单位给高值、笨重单位给低值。
range 为攻击距离（战场格数），取值 1-12：
  1-2：纯近战实体。
  3-5：中近距离（喷吐、毒气、飞舞碎片）。
  6-9：远程火力（持枪者、无人机）。
  10-12：超远程（炮塔、狙击型）。
intentDistribution 五个键必须全部存在（仅 cthulhu 类型）。
intentDistribution 每个值取值 0-1，总和建议为 1。
lootTable 中每个 dropProbability 取值 0-1。
`.trim();

//=============================================================================
// 7. 谜题模板
//=============================================================================

export const CLOZE_PUZZLE_SCHEMA = `
ClozePuzzle = {
  "type": "cloze",
  "body": Array<Array<string | "">>,
  "answer": string[]
}
约束：
body 必须是二维数组。
body 中的空字符串 "" 表示填空位置。
answer 长度必须等于 body 中所有 "" 的总数量。
answer 顺序必须与 body 中 "" 的出现顺序一一对应。
`.trim();

export const CHOICE_PUZZLE_SCHEMA = `
ChoicePuzzle = {
  "type": "choice",
  "body": string[],
  "answer": string
}
约束：
body 为选项文本数组。
answer 必须存在于 body 选项中。
`.trim();

export const TYPE_PUZZLE_SCHEMA = `
TypePuzzle = {
  "type": "type",
  "answer": string
}
约束：
TypePuzzle 不需要额外 body 字段。
Puzzle.lore 可作为谜面。
`.trim();

export const PUZZLE_SCHEMA = `
Puzzle = {
  "title": string,
  "lore": string,
  "body": ClozePuzzle | ChoicePuzzle | TypePuzzle,
  "hints": string[],
  "restrictions": {
    "timeCostPerAttempt": number,
    "timeLimit?": number,
    "maxAttempts?": number
  },
  "rewards?": {
    "items?": ItemTemplate[],
    "sanity?": number
  },
  "penalties?": {
    "hp?": number,
    "sanity?": number,
    "spawnEnemy?": EnemyTemplate,
    "permanentLock?": boolean,
    "nodesToLock?": string | string[]
  }
}
约束：
title、lore、hints 使用中文。
rewards.sanity 为正数，表示理智恢复。
penalties.hp、penalties.sanity 为正数，表示扣除量。
penalties.spawnEnemy 为单个 EnemyTemplate。
nodesToLock 可锁定单个节点 ID 或多个节点 ID。
`.trim();

//=============================================================================
// 8. 交互模板
//=============================================================================

export const INTERACTION_SCHEMA = `
Interaction = {
  "desc": string,
  "requirements?": {
    "items?": string[],
    "staff?": string[],
    "puzzleSolved?": Puzzle
  },
  "results": {
    "timeCost": number,
    "soundEffect": SoundType,
    "narrative": string,
    "stateChange?": {
      "hp?": number,
      "sanity?": number,
      "lose?": string[],
      "gain?": Array<ItemTemplate | NpcBaseTemplate>,
      "spawnEnemy?": EnemyTemplate[],
      "unlock?": Array<[string, string]>
    }
  }
}
约束：
desc、narrative 使用中文。
requirements 为可选；若存在，至少包含 items、staff、puzzleSolved 中的一项。
hp、sanity 正数为恢复，负数为扣除。
lose 只需要物品或人员的 ID。
gain 必须提供完整模板。
gain 中若为 NPC，使用 NpcBaseTemplate。
unlock 每项为二元组：第一项为节点 ID，第二项为中文行动按钮描述。
`.trim();

//=============================================================================
// 9. 出口模板
//=============================================================================

export const LOCAL_EXIT_SCHEMA = `
LocalExit = {
  "type": "local",
  "targetId?": string,
  "label": string
}
约束：
label 使用中文。
targetId 指向同区域 nodes 中已存在的节点 ID。
无 targetId 表示进入即死亡的陷阱出口。
`.trim();

export const ZONE_TRANSFER_EXIT_SCHEMA = `
ZoneTransferExit = {
  "type": "zone_transfer",
  "label": string
}
约束：
label 使用中文。
用于触发新区域生成。
`.trim();

export const CHAIN_SANCTUARY_RETURN_EXIT_SCHEMA = `
ChainSanctuaryReturnExit = {
  "type": "sanctuary_return",
  "label": string,
  "isEnding": boolean
}
约束：
label 使用中文。
isEnding 为 true 表示叙事链完结。
isEnding 为 false 表示叙事链中途挂起。
`.trim();

export const EPISODIC_SANCTUARY_RETURN_EXIT_SCHEMA = `
EpisodicSanctuaryReturnExit = {
  "type": "sanctuary_return",
  "label": string
}
约束：
label 使用中文。
`.trim();

//=============================================================================
// 10. 节点模板
//=============================================================================

export const NODE_COMMON_SCHEMA = `
NodeCommon = {
  "name": string,
  "desc": string,
  "visualPrompt": string,
  "threatLevel?": number,
  "childrenIds?": string[],
  "interactions?": Interaction[],
  "nodeNpc?": NodeNpcTemplate,
  "items?": MapItem[],
  "specificEnemy?": {
    "data": EnemyTemplate[],
    "spawnCondition": EnemySpawnCondition
  }
}
约束：
name、desc 使用中文。
desc 应为三到四句生动描写。
visualPrompt 使用英文 AI 绘图提示词。
threatLevel 取值 1-50 的整数，未设置表示安全节点。
childrenIds 中的节点之间会自动建立双向连接，不需要再显式定义彼此出口。
非 childrenIds 关系且逻辑上可往返的节点，必须双向显式定义出口。
单向出口仅用于陷阱、特殊拓扑或明确叙事设计。
specificEnemy 存在时，该节点的遇敌将仅产生 data 中定义的敌人。
`.trim();

export const CHAIN_NODE_SCHEMA = `
ChainNodeTemplate = NodeCommon & {
  "exits?": Array<LocalExit | ZoneTransferExit | ChainSanctuaryReturnExit>
}
`.trim();

export const EPISODIC_NODE_SCHEMA = `
EpisodicNodeTemplate = NodeCommon & {
  "exits?": Array<LocalExit | EpisodicSanctuaryReturnExit>
}
`.trim();

//=============================================================================
// 11. 伏笔模板
//=============================================================================

export const PLOT_POINT_SCHEMA = `
PlotPoint = {
  "id": string,
  "type": PlotPointType,
  "content": string,
  "hint": string
}
约束：
id 使用英文 snake_case。
content、hint 使用中文。
hint 暗示未来如何揭示或解决，不直接给出完整答案。
伏笔解决位置应安排在后续区域或后续节点。
`.trim();

//=============================================================================
// 12. 区域模板
//=============================================================================

export const CHAIN_ZONE_SCHEMA = `
ChainZoneTemplate = {
  "id": string,
  "name": string,
  "background": string,
  "topology": string,
  "nodesCount": number,
  "visualStyle": string,
  "entrance": string,
  "dilationFactor": number,
  "nodes": Record<string, ChainNodeTemplate>
}
约束：
id 使用英文 snake_case。
name、background、topology 使用中文。
visualStyle 使用英文 AI 绘图提示词前缀。
nodesCount 必须严格等于 Object.keys(nodes).length。
entrance 必须是 nodes 中已定义的节点 ID。
dilationFactor 为时间流速异常系数：
  0：时间停止。
  小于 1：时间流速减慢。
  等于 1：正常流速。
  大于 1：时间流速加快。
`.trim();

export const EPISODIC_ZONE_SCHEMA = `
EpisodicZoneTemplate = {
  "id": string,
  "name": string,
  "background": string,
  "topology": string,
  "nodesCount": number,
  "visualStyle": string,
  "entrance": string,
  "dilationFactor": number,
  "nodes": Record<string, EpisodicNodeTemplate>
}
约束：
id 使用英文 snake_case。
name、background、topology 使用中文。
visualStyle 使用英文 AI 绘图提示词前缀。
nodesCount 必须严格等于 Object.keys(nodes).length。
entrance 必须是 nodes 中已定义的节点 ID。
dilationFactor 为时间流速异常系数：
  0：时间停止。
  小于 1：时间流速减慢。
  等于 1：正常流速。
  大于 1：时间流速加快。
`.trim();

//=============================================================================
// 12.5 庇护所模块
//=============================================================================

export const FACILITY_TEMPLATE_SCHEMA = `
FacilityTemplate = {
  "id": string,
  "name": string,
  "desc": string,
  "nodeMounted": string,
  "production": Partial<Record<SanctuaryStateKey, number>>
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
nodeMounted 为设施挂载的节点 ID，必须是庇护所 nodes 中已定义的节点键名。
production 为设施每日产出，键为 SanctuaryStateKey，值为正数表示产出、负数表示消耗。
`.trim();

export const RESIDENT_SCHEMA = `
ResidentTemplate = {
  "id": string,
  "name": string
}
Resident = ResidentTemplate & {
  "hp": number,
  "san": number
}
约束：
id 使用英文 snake_case。
name 使用中文。
hp 为当前生命值，san 为当前理智值。
`.trim();

export const SANCTUARY_TEMPLATE_SCHEMA = `
SanctuaryTemplate = {
  "id": string,
  "name": string,
  "background": string,
  "topology": string,
  "nodesCount": number,
  "visualStyle": string,
  "entrance": string,
  "dilationFactor": number,
  "initialState": {
    "food": number,
    "water": number,
    "medicine": number,
    "electricity": number,
    "scraps": number,
    "population": number,
    "morale": number,
    "erosion": number,
    "facility": FacilityTemplate[]
  },
  "nodes": Record<string, ChainNodeTemplate>
}
约束：
nodes 应包含生活区、生产设施、防御节点等。
entrance 必须是 nodes 中已定义的节点 ID。
initialState 为庇护所初始资源与初始设施。
facility 数组中的每个设施会按日产生 production 中声明的资源变化。
`.trim();

export const SANCTUARY_EVENT_OUTPUT_SCHEMA = `
SanctuaryEvent = {
  "desc": string,
  "choices": Array<{
    "desc": string,
    "stateChange": {
      "food?": number,
      "water?": number,
      "medicine?": number,
      "electricity?": number,
      "scraps?": number,
      "morale?": number,
      "erosion?": number,
      "residents?": number
        | Array<
            | Resident
            | Resident["id"]
            | [Resident["id"], 1 | 2 | 3 | 4, number]
          >,
      "spawnEnemy?": boolean
    }
  }>
}
约束：
desc 使用中文，营造生存恐怖氛围。
choices 至少 2 个、至多 4 个，方案间应有明显取舍。
资源键（food/water/medicine/electricity/scraps）正数为增加、负数为减少。
morale 正数为士气提升、负数为士气下降。
erosion 正数为侵蚀加剧、负数为侵蚀缓解。
residents 有两种形态：
  number：正数表示随机生成 n 名新居民，负数表示随机失去 n 名已有居民。
  数组：对指定居民进行精确操作，每项为以下三种之一：
    Resident 对象：获得该新居民（必须给出完整 id/name/hp/san）。
    Resident["id"] 字符串：失去该已有居民。
    [Resident["id"], 操作码, 数值] 元组：
      操作码 1 = 恢复该居民 hp，
      操作码 2 = 消耗该居民 hp，
      操作码 3 = 恢复该居民 san，
      操作码 4 = 消耗该居民 san，
      数值为正整数。
spawnEnemy 为 true 表示该选项会引出战斗。
`.trim();

//=============================================================================
// 13. 社交输出
//=============================================================================

export const SOCIAL_BEHAVIOR_RULE_SCHEMA = `
角色只知道提示词提供的信息，或可由角色身份、环境、记忆合理推断的信息。
不要假设在玩家与你对话前已经发生了什么，除非那在提示词中明确提到或合理暗示了。
`.trim();

export const NPC_DIALOGUE_OUTPUT_SCHEMA = `
NpcDialogueOutput =
  | {
      "thought": string,
      "needMemorySearch": string
    }
  | {
      "thought": string,
      "response": string,
      "trustChange": number,
      "mood": Mood,
      "quest?": QuestTemplate
    }
约束：
第一种结构用于请求检索本地历史对话。
needMemorySearch 为若干个独立关键词，使用英文逗号分隔。
第二种结构用于记忆充足时生成最终角色回复。
thought 为角色内心独白或检索原因。
response 为角色实际对玩家说的话。
trustChange 为 -100 到 100 之间的整数。
quest 为可选字段。
`.trim();

export const NPC_REACTION_OUTPUT_SCHEMA = `
NpcReactionOutput = {
  "content": string,
  "isAction": boolean
}
约束：
content 使用中文，长度 15-40 字。
isAction 为 true 表示 content 主要是动作、神态或环境反应。
isAction 为 false 表示 content 主要是角色说出口的话。
`.trim();

export const NPC_INTIMACY_OUTPUT_SCHEMA = `
NpcIntimacyOutput = {
  "desc": string,
  "vocal": string
}
约束：
desc 使用中文，聚焦情绪、呼吸、体温、颤抖、低语、短暂安全感。
vocal 用于 TTS，可包含破碎声音、呼吸、停顿。
保持心理恐怖、创伤联结与角色一致性。
保持克制，避免露骨色情描写。
`.trim();

export const MEMORY_SUMMARY_OUTPUT_SCHEMA = `
MemorySummaryOutput = {
  "summary": string,
  "keyEntities": string[],
  "importanceScore": number
}
约束：
summary 使用中文，客观第三人称，描述关键事件、承诺、冲突、情感转折或长期关系变化。
importanceScore 取值 0 到 1。
普通闲聊 importanceScore 为 0.1-0.3。
关键情报、任务、情感羁绊 importanceScore 为 0.7-1.0。
`.trim();

export const MEMORY_CONSOLIDATION_OUTPUT_SCHEMA = `
MemoryConsolidationOutput = {
  "summary": string,
  "keyEntities": string[],
  "importanceScore": number
}
约束：
summary 使用中文，将多个记忆片段提炼为更高维度叙事，体现关系演变、逻辑关联或长期影响。
importanceScore 取值 0 到 1。
`.trim();

//=============================================================================
// 14. 领域组装：链式叙事区域生成
//=============================================================================

export const CHAIN_ZONE_GENERATION_SCHEMA = schema(
  RULE_OUTPUT_JSON,
  T_ITEM_RARITY,
  T_WEAPON_TYPE,
  T_WEAPON_DAMAGE_TYPE,
  T_ATTRIBUTE_TYPE,
  T_VITAL_TYPE,
  T_ACCESSORY_EFFECT_TYPE,
  T_CONSUMABLE_EFFECT_TYPE,
  T_COMBAT_STYLE,
  T_GENDER,
  T_INTENT_TYPE,
  T_ENEMY_SPAWN_CONDITION,
  T_PLOT_POINT_TYPE,
  T_SANCTUARY_STATE_KEY,
  T_SOUND_TYPE,
  ATTRIBUTE_SCHEMA,
  VITAL_SCHEMA,
  WEAPON_TEMPLATE_SCHEMA,
  ARMOR_TEMPLATE_SCHEMA,
  ACCESSORY_TEMPLATE_SCHEMA,
  CONSUMABLE_TEMPLATE_SCHEMA,
  DATA_TEMPLATE_SCHEMA,
  MATERIAL_TEMPLATE_SCHEMA,
  ITEM_TEMPLATE_UNION_SCHEMA,
  MAP_ITEM_SCHEMA,
  QUEST_TEMPLATE_SCHEMA,
  NPC_BASE_TEMPLATE_SCHEMA,
  NPC_TEMPLATE_SCHEMA,
  NODE_NPC_EXTENSION_SCHEMA,
  ENEMY_TEMPLATE_SCHEMA,
  CLOZE_PUZZLE_SCHEMA,
  CHOICE_PUZZLE_SCHEMA,
  TYPE_PUZZLE_SCHEMA,
  PUZZLE_SCHEMA,
  INTERACTION_SCHEMA,
  LOCAL_EXIT_SCHEMA,
  ZONE_TRANSFER_EXIT_SCHEMA,
  CHAIN_SANCTUARY_RETURN_EXIT_SCHEMA,
  NODE_COMMON_SCHEMA,
  CHAIN_NODE_SCHEMA,
  PLOT_POINT_SCHEMA,
  CHAIN_ZONE_SCHEMA
);

//=============================================================================
// 15. 领域组装：单元剧区域生成
//=============================================================================

export const EPISODIC_ZONE_GENERATION_SCHEMA = schema(
  RULE_OUTPUT_JSON,
  T_ITEM_RARITY,
  T_WEAPON_TYPE,
  T_WEAPON_DAMAGE_TYPE,
  T_ATTRIBUTE_TYPE,
  T_VITAL_TYPE,
  T_ACCESSORY_EFFECT_TYPE,
  T_CONSUMABLE_EFFECT_TYPE,
  T_COMBAT_STYLE,
  T_GENDER,
  T_INTENT_TYPE,
  T_ENEMY_SPAWN_CONDITION,
  T_SANCTUARY_STATE_KEY,
  T_SOUND_TYPE,
  ATTRIBUTE_SCHEMA,
  VITAL_SCHEMA,
  WEAPON_TEMPLATE_SCHEMA,
  ARMOR_TEMPLATE_SCHEMA,
  ACCESSORY_TEMPLATE_SCHEMA,
  CONSUMABLE_TEMPLATE_SCHEMA,
  DATA_TEMPLATE_SCHEMA,
  MATERIAL_TEMPLATE_SCHEMA,
  ITEM_TEMPLATE_UNION_SCHEMA,
  MAP_ITEM_SCHEMA,
  QUEST_TEMPLATE_SCHEMA,
  NPC_BASE_TEMPLATE_SCHEMA,
  NPC_TEMPLATE_SCHEMA,
  NODE_NPC_EXTENSION_SCHEMA,
  ENEMY_TEMPLATE_SCHEMA,
  CLOZE_PUZZLE_SCHEMA,
  CHOICE_PUZZLE_SCHEMA,
  TYPE_PUZZLE_SCHEMA,
  PUZZLE_SCHEMA,
  INTERACTION_SCHEMA,
  LOCAL_EXIT_SCHEMA,
  EPISODIC_SANCTUARY_RETURN_EXIT_SCHEMA,
  NODE_COMMON_SCHEMA,
  EPISODIC_NODE_SCHEMA,
  EPISODIC_ZONE_SCHEMA
);

//=============================================================================
// 15.5 领域组装：庇护所事件生成
//=============================================================================

export const SANCTUARY_EVENT_GENERATION_SCHEMA = schema(
  RULE_OUTPUT_JSON,
  T_SANCTUARY_STATE_KEY,
  FACILITY_TEMPLATE_SCHEMA,
  RESIDENT_SCHEMA,
  SANCTUARY_TEMPLATE_SCHEMA,
  SANCTUARY_EVENT_OUTPUT_SCHEMA
);

//=============================================================================
// 16. 领域组装：社交 LLM
//=============================================================================

export const SOCIAL_DIALOGUE_SCHEMA = schema(
  RULE_OUTPUT_JSON,
  SOCIAL_BEHAVIOR_RULE_SCHEMA,
  T_MOOD,
  T_ITEM_RARITY,
  T_WEAPON_TYPE,
  T_WEAPON_DAMAGE_TYPE,
  T_ATTRIBUTE_TYPE,
  T_VITAL_TYPE,
  T_ACCESSORY_EFFECT_TYPE,
  T_CONSUMABLE_EFFECT_TYPE,
  T_COMBAT_STYLE,
  T_GENDER,
  ATTRIBUTE_SCHEMA,
  VITAL_SCHEMA,
  WEAPON_TEMPLATE_SCHEMA,
  ARMOR_TEMPLATE_SCHEMA,
  ACCESSORY_TEMPLATE_SCHEMA,
  CONSUMABLE_TEMPLATE_SCHEMA,
  DATA_TEMPLATE_SCHEMA,
  MATERIAL_TEMPLATE_SCHEMA,
  ITEM_TEMPLATE_UNION_SCHEMA,
  NPC_BASE_TEMPLATE_SCHEMA,
  QUEST_TEMPLATE_SCHEMA,
  NPC_DIALOGUE_OUTPUT_SCHEMA
);

export const SOCIAL_REACTION_SCHEMA = schema(
  NPC_REACTION_OUTPUT_SCHEMA
);

export const SOCIAL_INTIMACY_SCHEMA = schema(
  RULE_OUTPUT_JSON,
  SOCIAL_BEHAVIOR_RULE_SCHEMA,
  NPC_INTIMACY_OUTPUT_SCHEMA
);

export const SOCIAL_MEMORY_SUMMARY_SCHEMA = schema(
  MEMORY_SUMMARY_OUTPUT_SCHEMA
);

export const SOCIAL_MEMORY_CONSOLIDATION_SCHEMA = schema(
  MEMORY_CONSOLIDATION_OUTPUT_SCHEMA
);