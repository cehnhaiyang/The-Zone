/**
 * schema.ts
 * LLM 输出契约 (v6.1)
 *
 * 警告：本文件的唯一读者是 LLM！它是喂给模型的输出契约，不是项目文档，也不是运行时类型定义！
 * 修改本文件前，必须逐条确认以下铁律，任何一条都不许违背！
 *
 * 【一、只写 LLM 本次生成必须产出的东西】
 * 1. 只写本次生成必须产出的字段！运行时字段、引擎注入字段、由常量预定义的字段，一个都不许出现！
 * 2. 不需要的字段，连出现一次都不许！严禁「先列出字段、再叮嘱 LLM 不要生成」这种自相矛盾的写法！
 * 3. 领域 schema 只挂载该领域生成真正需要的原子块，不许整包塞入！链式叙事、单元剧、庇护所、社交各自只看到自己领域需要的字段！多一个字段就是多一分对模型的噪音！
 *
 * 【二、必须写：不写 LLM 就只能猜的东西】
 * 4. 字段结构：字段名、类型、必填与可选标记、枚举与字面量联合类型的全部取值！
 * 5. 字段意义：这个数值在引擎里代表什么、正负号含义、字段之间的硬关联（大于等于、互斥、数量必须相等之类）、引擎如何使用这个字段！不解释清楚，LLM 就无法输出！
 * 6. 引擎硬性数值域与刻度对照：取值区间（0-100、0~1、正整数之类），以及「数值 ↔ 语义档位」的分级与档位参照表（属性分级、体征分级、射程档位、难度分级之类）！这是数值的坐标系，缺了它 LLM 只能生猜，必须保留！
 * 7. 语言与格式硬约束：使用中文、英文 AI 绘图提示词、snake_case、字数长度限制之类！
 *
 * 【三、不许写：自作聪明的「建议」】
 * 8. 不要在内部注释里“建议”LLM 怎么做，尤其是“建议”某个属性的的“取值范围”！你给出建议 LLM 就只会一直遵循建议，不会再进行任何发散！内部注释只能说明引擎的数值范围！除了引擎明确规定的硬性限制外，任何软性的建议都不要有！
 * 9. 「建议 X-Y」「常见为 X-Y」「推荐」「可用」这类软性数值带一律不许写！不许替 LLM 做平衡、风格、取舍上的裁量！
 * 10. 引擎侧未声明的缺省值（工具函数里的兜底默认值）不是生成规范，不许当作「引擎定值」写进来！
 * 11. 同一个参照系只写一次！别处只引用它已有的数值域，不许再写一份不详细的重复说明！
 * 12. 不许把项目上下文带进来！实现细节、注册表、兜底逻辑、内部命名与约定一律不写！不要以你自己的视角污染提示词！
 *
 * 【四、与 meta 对齐】
 * 13. 一切字段名、枚举取值、字面量联合类型必须与 meta/type.ts、meta/interface.ts 严格一致！不许改名、增删、臆造！引擎尚未支持的结构不许写入！
 * 14. 原子 schema 独立维护，同一结构只定义一次，其余结构通过组合引用！
 *
 * 【五、执行】
 * 15. 上述标准已经完备，遇到边界项按本注释自行判断，不要拿「这个要不要删」回头问用户！
 * 16. 每次改动后逐条回对本注释自检！违背任何一条，都是把噪音塞给模型、降低生成质量！
 * 
 * 上述注释在未经用户允许前不许删改！
 *
 * @version 6.1.0
 * @see ../meta/type.ts
 * @see ../meta/interface.ts
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

export const T_ITEM_GRADE = `
type ItemGrade =
  | 'salvaged'
  | 'standard'
  | 'reinforced'
  | 'military'
  | 'corporate'
  | 'foundation'
  | 'prototype'
  | 'ark_prime';
`.trim();

export const T_WEAPON_TYPE = `
type WeaponType =
  | 'wave'
  | 'both_wave'
  | 'prick'
  | 'both_prick'
  | 'shield'
  | 'both_shield'
  | 'sniper_rifle'
  | 'assault_rifle'
  | 'smg'
  | 'pistol'
  | 'shotgun'
  | 'sawed_off'
  | 'crossbow'
  | 'throw'
  | 'bow'
  | 'magic';
`.trim();

export const T_WEAPON_DAMAGE_TYPE = `
type WeaponDamageType = 'melee' | 'range' | 'instant';
`.trim();

export const T_ATTRIBUTE_TYPE = `
type AttributeType = 'strength' | 'agility' | 'wisdom' | 'awareness' | 'will' | 'cthulhu';
`.trim();

export const T_VITAL_TYPE = `
type VitalType = 'maxHp' | 'maxSanity' | 'maxStamina' | 'maxVigor';
`.trim();

export const T_DYNAMIC_VITAL_TYPE = `
type DynamicVitalType = 'hp' | 'sanity' | 'stamina' | 'vigor';
`.trim();

export const T_ACCESSORY_EFFECT_TYPE = `
type AccessoryEffectType = AttributeType | VitalType;
`.trim();

export const T_CONSUMABLE_EFFECT_TYPE = `
type ConsumableEffectType =
  | AccessoryEffectType
  | DynamicVitalType
  | 'battery'
  | 'integrity';
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

export const T_PLOT_POINT_TYPE = `
type PlotPointType = 'M' | 'S';
`.trim();

export const T_MOOD = `
type Mood = 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'neutral';
`.trim();

export const NECESSARY_RESOURCE_SCHEMA = `
NecessaryResource = {
  "food": number,
  "water": number
}
约束：
必要资源是所有庇护所共有、引擎必然消费的资源，只有食物与饮水两项，不得增删。
数值为当前数量，不小于 0 的浮点数。
`.trim();

export const UNIQUE_RESOURCE_SCHEMA = `
UniqueResource = {
  "id": string,
  "name": string,
  "desc": string,
  "icon": string,
  "value": number,
  "consumptionRate?": number
}
约束：
id 使用英文 snake_case，为该庇护所内独特资源的唯一标识，不得使用 food 与 water（它们是必要资源）。
name、desc 使用中文。
icon 为该资源的 SVG 图标标记。
value 为当前数量，大于 0 的浮点数。
consumptionRate 为每人每天的自动消耗速率；不随日常消耗的资源省略该字段。
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
  "awareness": number,
  "will": number,
  "cthulhu": number
}
约束：
六项必须全部存在，缺一不可。
每项取值 0-100。
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

export const ITEM_BASE_TEMPLATE_SCHEMA = `
BaseItemTemplate = {
  "id": string,
  "name": string,
  "desc": string,
  "grade": ItemGrade,
  "size": [number, number],
  "fleshFusionState?": number,
  "cognitiveErosionState?": number,
  "causalInversionState?": number
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
grade 为物品品质，取值必须为 ItemGrade 的八个取值之一。
size 为物品在背包网格中的占地 [列, 行]，两项均为正整数。
fleshFusionState、cognitiveErosionState、causalInversionState 为物品的异常态读数，取值 0-100 的整数；
不承载对应异常态的物品省略该字段。
`.trim();

export const WEAPON_TEMPLATE_SCHEMA = `
WeaponTemplate = BaseItemTemplate & {
  "type": "weapon",
  "weaponType": WeaponType,
  "weaponDamageType": WeaponDamageType,
  "range": number,
  "damage": number,
  "crit": {
    "chance": number,
    "bonus": number
  },
  "maxUses": number
}
约束：
weaponDamageType：melee 对应近程、range 对应远程，instant 仅用于 magic 类型。
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
damage 为正整数：命中时武器伤害即为 damage，擦伤时在 0~damage 之间波动。
crit.chance 为 0~1 的浮点数；crit.bonus 为正整数，暴击时武器伤害在 damage~(damage + crit.bonus) 之间波动。
maxUses 为正整数，每次攻击消耗 1 点耐久。
武器作为防御道具的效率由 weaponType 决定，不在模板中给出。
`.trim();

export const ARMOR_TEMPLATE_SCHEMA = `
ArmorTemplate = BaseItemTemplate & {
  "type": "armor",
  "defense": number,
  "maxUses": number
}
约束：
defense 为恒定减伤比，取值 -1~1 的浮点数；负值会放大所受伤害。
maxUses 为正整数，每次受击消耗 1 点耐久。
`.trim();

export const ACCESSORY_TEMPLATE_SCHEMA = `
AccessoryTemplate = BaseItemTemplate & {
  "type": "accessory",
  "effects": Array<[AccessoryEffectType, number]>
}
约束：
effects 每项第二项为整数，装备后持续生效。
`.trim();

export const STORAGE_TEMPLATE_SCHEMA = `
StorageTemplate = BaseItemTemplate & {
  "type": "storage"
}
`.trim();

export const CONSUMABLE_TEMPLATE_SCHEMA = `
ConsumableTemplate = BaseItemTemplate & {
  "type": "consumable",
  "effects": Array<[ConsumableEffectType, number, number?]>
}
约束：
effects 每项第二项为整数：hp / sanity / stamina / vigor 表示对当前体征的恢复量，battery / integrity 表示对神经链接仪电量 / 完整度的补充量，均为正数。
effects 每项第三项为可选持续回合数（仅 buff 类效果需要）。
`.trim();

export const DATA_TEMPLATE_SCHEMA = `
DataTemplate = BaseItemTemplate & {
  "type": "data",
  "documentContent?": string,
  "audioScript?": string
}
约束：
documentContent、audioScript 至少存在一项。
`.trim();

export const MATERIAL_TEMPLATE_SCHEMA = `
MaterialTemplate = BaseItemTemplate & {
  "type": "material"
}
`.trim();

export const ITEM_TEMPLATE_UNION_SCHEMA = `
ItemTemplate = WeaponTemplate | ArmorTemplate | AccessoryTemplate | StorageTemplate | ConsumableTemplate | DataTemplate | MaterialTemplate;
`.trim();

export const ITEM_SCHEMA = `
Item = ItemTemplate & {
  "discoveryThreshold?": number,
  "quantity?": number
}
约束：
Item 用于节点物品列表。
quantity 为正整数，不设则为 1。
discoveryThreshold 为非负数，表示需要达到多少搜查次数才能发现该物品；无则视为搜查时立刻获得。
`.trim();

//=============================================================================
// 4. 任务模板
//=============================================================================

export const QUEST_TEMPLATE_SCHEMA = `
QuestTemplate = {
  "id": string,
  "desc": string,
  "difficulty": number,
  "goals": Array<ItemTemplate | NodeNpcTemplate["id"]>,
  "rewards": Array<ItemTemplate | CompanionTemplate>
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
goals 中若为人员，只能填写已存在的节点 NPC id（字符串），不得内联新的 NPC 模板。
rewards 中若为人员，必须给出完整 CompanionTemplate（该同伴会永久加入队伍）。
`.trim();

//=============================================================================
// 5. 实体模板
//=============================================================================

export const PLAYER_TEMPLATE_SCHEMA = `
PlayerTemplate = {
  "id": string,
  "name": string,
  "gender?": Gender,
  "desc": string,
  "visualPrompt": string,
  "style": CombatStyle,
  "initialState": {
    "attribute": Attribute,
    "vital": Vital,
    "inventory?": ItemTemplate[]
  }
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
visualPrompt 使用英文 AI 绘图提示词。
style 决定该角色在战斗中的行为倾向。
`.trim();

export const NPC_TEMPLATE_SCHEMA = `
NodeNpcTemplate = PlayerTemplate & {
  "initialState": PlayerTemplate["initialState"] & {
    "trust": number,
    "quests?": QuestTemplate[]
  },
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
    "isSanctuarySafe?": Record<keyof NecessaryResource | UniqueResource["id"], number>
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
trust 为 0-100 的整数，表示节点 NPC 对玩家的初始信任，必填。
quests 数组中的任务排列顺序决定玩家接取顺序：必须完成前一个任务，后一个任务才会显示并可接取。
无 canBeInvited 字段表示该 NPC 不可被邀请。
canBeInvited.replacement 可以直接是 NPC ID 字符串，也可以是详细职责要求对象。
canBeInvited.isSanctuarySafe 仅用于庇护所 NPC；键为 food、water 或该庇护所独特资源的 id，值为离开所需的最低数量。
无 willRoam 字段表示该 NPC 始终停留在原位节点。
willRoam.speed 表示多少个 tick 移动一次。
willRoam.passNodes 与 willRoam.route 互斥，只能存在其一。
`.trim();

export const COMPANION_TEMPLATE_SCHEMA = `
CompanionTemplate = PlayerTemplate & {
  "initialState": PlayerTemplate["initialState"] & {
    "affinity": number,
    "needs": QuestTemplate[]
  }
}
约束：
入队后该角色走「好感」轴，不再使用 trust。
affinity 为初始好感，取值 -100 到 100 的整数；0 表示刚刚建立同行关系。
affinity 为负值时，同伴会随时间推移尝试离队。
needs 为该同伴的个人需求，结构与 QuestTemplate 一致，按数组顺序依次解锁。
`.trim();

//=============================================================================
// 6. 敌人模板
//=============================================================================

export const ENEMY_TEMPLATE_SCHEMA = `
CthulhuEnemyTemplate = {
  "type": "cthulhu",
  "id": string,
  "name": string,
  "gender?": Gender,
  "desc": string,
  "visualPrompt": string,
  "range": number,
  "speed": number,
  "damage": number,
  "defense": number,
  "evasion": number,
  "lootTable?": Array<ItemTemplate & { "dropProbability": number }>,
  "intentDistribution": Record<IntentType, number>
}

ImmovableEnemyTemplate = 同上，但：
  "type" 为 "immovable"。
  省略 evasion。
  省略 intentDistribution。

EnemyTemplate = CthulhuEnemyTemplate | ImmovableEnemyTemplate;

约束：
id 使用英文 snake_case。
name、desc 使用中文。
visualPrompt 使用英文 AI 绘图提示词。
speed：速度，影响行动频率。
damage：攻击力。
defense：防御力，影响最低减伤比。
evasion：闪避力，影响最高减伤比，必须 ≥ defense。
range 为攻击距离（战场格数），取值 1-12 的整数。
intentDistribution 五个键必须全部存在（仅 cthulhu 类型）。
intentDistribution 每个值取值 0-1。
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
  "results": {
    "timeCost": number,
    "soundEffect": SoundType,
    "narrative": string,
    "stateChange?": {
      "hp?": number,
      "sanity?": number,
      "lose?": string[],
      "gain?": Array<ItemTemplate | CompanionTemplate>,
      "spawnEnemy?": EnemyTemplate[],
      "unlock?": Array<[string, string]>
    }
  },
  "requirements?": {
    "items?": string[],
    "staff?": string[],
    "puzzleSolved?": Puzzle
  }
}
约束：
desc、narrative 使用中文。
requirements 为可选；若存在，至少包含 items、staff、puzzleSolved 中的一项。
hp、sanity 正数为恢复，负数为扣除。
lose 只需要物品或人员的 ID。
gain 必须提供完整模板。
gain 中若为人员，使用 CompanionTemplate（该同伴会永久加入队伍）。
unlock 每项为二元组：第一项为节点 ID，第二项为中文行动按钮描述。
`.trim();

//=============================================================================
// 9. 出口模板
//=============================================================================

export const LOCAL_EXIT_SCHEMA = `
Local = {
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
ZoneTransfer = {
  "type": "zone_transfer",
  "label": string
}
约束：
label 使用中文。
用于触发新区域生成，不需要目标 ID。
`.trim();

export const CHAIN_SANCTUARY_RETURN_EXIT_SCHEMA = `
SanctuaryReturn = {
  "type": "sanctuary_return",
  "label": string,
  "isEnding"?: boolean
}
约束：
label 使用中文。
链式叙事必须给出 isEnding：为 true 表示叙事链完结，为 false 表示叙事链中途挂起。
`.trim();

export const EPISODIC_SANCTUARY_RETURN_EXIT_SCHEMA = `
SanctuaryReturn = {
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
  "isDangerous?": number |
  {
    "isAmbushed": number,
    "level": number
  } |
  EnemyTemplate[],
  "childrenIds?": string[],
  "interactions?": Interaction[],
  "nodeNpc?": NodeNpcTemplate,
  "items?": Item[]
}
约束：
name、desc 使用中文。
desc 应为三到四句生动描写。
visualPrompt 使用英文 AI 绘图提示词。
isDangerous 三选一：
- number：威胁等级，取值 1-50 的整数，等级越高遇敌越频繁、敌人越多；
- { "isAmbushed": number, "level": number }：伏击节点，玩家一旦进入节点便触发战斗，且敌我双方部署区间更加不利于我方；isAmbushed 为 0~1 的不利系数，level 为威胁等级、取值 1-50 的整数；
- EnemyTemplate[]：固定遭遇，该节点的遇敌将仅产生数组中的敌人。
未设置 isDangerous 表示安全节点，永远不会遇敌。
childrenIds 中的节点之间会自动建立双向连接，不需要再显式定义彼此出口。
非 childrenIds 关系且逻辑上可往返的节点，必须双向显式定义出口。
单向出口仅用于陷阱、特殊拓扑或明确叙事设计。
`.trim();

export const CHAIN_NODE_SCHEMA = `
NodeTemplate = NodeCommon & {
  "exits?": Array<Local | ZoneTransfer | SanctuaryReturn>
}
`.trim();

export const EPISODIC_NODE_SCHEMA = `
NodeTemplate = NodeCommon & {
  "exits?": Array<Local | SanctuaryReturn>
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

export const ZONE_TEMPLATE_SCHEMA = `
ZoneTemplate = {
  "id": string,
  "name": string,
  "background": string,
  "topology": string,
  "nodesCount": number,
  "visualStyle": string,
  "entrance": string,
  "dilationFactor": number,
  "nodes": Record<string, NodeTemplate>
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
  "function": Record<string, number>
}
约束：
id 使用英文 snake_case。
name、desc 使用中文。
nodeMounted 为设施挂载的节点 ID，必须是庇护所 nodes 中已定义的节点键名。
function 为设施每日的资源作用：键必须是该庇护所资源的 id（erosion 亦可用于侵蚀度），值为正数表示产出、负数表示消耗。
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
    "necessaryResource": NecessaryResource,
    "uniqueResource": UniqueResource[],
    "population": number,
    "erosion": number,
    "facility": FacilityTemplate[]
  },
  "nodes": Record<string, NodeTemplate>
}
约束：
nodes 应包含生活区、生产设施、防御节点等。
entrance 必须是 nodes 中已定义的节点 ID。
initialState 为该庇护所的初始资源、初始人口、初始侵蚀度与初始设施。
uniqueResource 只写该庇护所独有的资源；食物与饮水写在 necessaryResource。
population 为初始在册人口，引擎据此生成初始居民池。
facility 数组中的每个设施会按日产生 function 中声明的资源变化。
`.trim();

export const SANCTUARY_EVENT_OUTPUT_SCHEMA = `
SanctuaryEvent = {
  "desc": string,
  "choices": Array<{
    "desc": string,
    "impact": {
      "erosion?": number,
      "resource?": Record<keyof NecessaryResource | UniqueResource["id"], number>,
      "residents?": number
        | Array<
            | Resident
            | Resident["id"]
            | [Resident["id"], 1 | 2 | 3 | 4, number]
          >,
      "spawnEnemy?": number
    }
  }>
}
约束：
desc 使用中文，营造生存恐怖氛围。
choices 至少 2 个、至多 4 个，方案间应有明显取舍。
impact 为该选项对庇护所资源与居民的即时影响。
impact.resource 的键只能是 food、water 或该庇护所 uniqueResource 中出现过的 id，正数为增加、负数为减少；erosion 不是资源，只能写在 impact.erosion。
impact.erosion 正数为侵蚀加剧、负数为侵蚀缓解。
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
spawnEnemy 为该选项从本地敌人常量中随机抽取的敌人数；0 或省略表示不引出战斗。
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
      "relationChange": number,
      "mood": Mood,
      "quest?": QuestTemplate
    }
约束：
第一种结构用于请求检索本地历史对话。
needMemorySearch 为若干个独立关键词，使用英文逗号分隔。
第二种结构用于记忆充足时生成最终角色回复。
thought 为角色内心独白或检索原因。
response 为角色实际对玩家说的话。
relationChange 为 -100 到 100 之间的整数：
  - 面对节点 NPC 时表示「信任」变化量；
  - 面对同伴时表示「好感」变化量。
  仅在一次发言确实改变了对方对你的判断时才给出非零值。
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
  T_ITEM_GRADE,
  T_WEAPON_TYPE,
  T_WEAPON_DAMAGE_TYPE,
  T_ATTRIBUTE_TYPE,
  T_VITAL_TYPE,
  T_DYNAMIC_VITAL_TYPE,
  T_ACCESSORY_EFFECT_TYPE,
  T_CONSUMABLE_EFFECT_TYPE,
  T_COMBAT_STYLE,
  T_GENDER,
  T_INTENT_TYPE,
  T_PLOT_POINT_TYPE,
  NECESSARY_RESOURCE_SCHEMA,
  UNIQUE_RESOURCE_SCHEMA,
  T_SOUND_TYPE,
  ATTRIBUTE_SCHEMA,
  VITAL_SCHEMA,
  ITEM_BASE_TEMPLATE_SCHEMA,
  WEAPON_TEMPLATE_SCHEMA,
  ARMOR_TEMPLATE_SCHEMA,
  ACCESSORY_TEMPLATE_SCHEMA,
  STORAGE_TEMPLATE_SCHEMA,
  CONSUMABLE_TEMPLATE_SCHEMA,
  DATA_TEMPLATE_SCHEMA,
  MATERIAL_TEMPLATE_SCHEMA,
  ITEM_TEMPLATE_UNION_SCHEMA,
  ITEM_SCHEMA,
  QUEST_TEMPLATE_SCHEMA,
  PLAYER_TEMPLATE_SCHEMA,
  NPC_TEMPLATE_SCHEMA,
  COMPANION_TEMPLATE_SCHEMA,
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
  ZONE_TEMPLATE_SCHEMA
);

//=============================================================================
// 15. 领域组装：单元剧区域生成
//=============================================================================

export const EPISODIC_ZONE_GENERATION_SCHEMA = schema(
  RULE_OUTPUT_JSON,
  T_ITEM_GRADE,
  T_WEAPON_TYPE,
  T_WEAPON_DAMAGE_TYPE,
  T_ATTRIBUTE_TYPE,
  T_VITAL_TYPE,
  T_DYNAMIC_VITAL_TYPE,
  T_ACCESSORY_EFFECT_TYPE,
  T_CONSUMABLE_EFFECT_TYPE,
  T_COMBAT_STYLE,
  T_GENDER,
  T_INTENT_TYPE,
  NECESSARY_RESOURCE_SCHEMA,
  UNIQUE_RESOURCE_SCHEMA,
  T_SOUND_TYPE,
  ATTRIBUTE_SCHEMA,
  VITAL_SCHEMA,
  ITEM_BASE_TEMPLATE_SCHEMA,
  WEAPON_TEMPLATE_SCHEMA,
  ARMOR_TEMPLATE_SCHEMA,
  ACCESSORY_TEMPLATE_SCHEMA,
  STORAGE_TEMPLATE_SCHEMA,
  CONSUMABLE_TEMPLATE_SCHEMA,
  DATA_TEMPLATE_SCHEMA,
  MATERIAL_TEMPLATE_SCHEMA,
  ITEM_TEMPLATE_UNION_SCHEMA,
  ITEM_SCHEMA,
  QUEST_TEMPLATE_SCHEMA,
  PLAYER_TEMPLATE_SCHEMA,
  NPC_TEMPLATE_SCHEMA,
  COMPANION_TEMPLATE_SCHEMA,
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
  ZONE_TEMPLATE_SCHEMA
);

//=============================================================================
// 15.5 领域组装：庇护所事件生成
//=============================================================================

export const SANCTUARY_EVENT_GENERATION_SCHEMA = schema(
  RULE_OUTPUT_JSON,
  NECESSARY_RESOURCE_SCHEMA,
  UNIQUE_RESOURCE_SCHEMA,
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
  T_ITEM_GRADE,
  T_WEAPON_TYPE,
  T_WEAPON_DAMAGE_TYPE,
  T_ATTRIBUTE_TYPE,
  T_VITAL_TYPE,
  T_DYNAMIC_VITAL_TYPE,
  T_ACCESSORY_EFFECT_TYPE,
  T_CONSUMABLE_EFFECT_TYPE,
  T_COMBAT_STYLE,
  T_GENDER,
  ATTRIBUTE_SCHEMA,
  VITAL_SCHEMA,
  ITEM_BASE_TEMPLATE_SCHEMA,
  WEAPON_TEMPLATE_SCHEMA,
  ARMOR_TEMPLATE_SCHEMA,
  ACCESSORY_TEMPLATE_SCHEMA,
  STORAGE_TEMPLATE_SCHEMA,
  CONSUMABLE_TEMPLATE_SCHEMA,
  DATA_TEMPLATE_SCHEMA,
  MATERIAL_TEMPLATE_SCHEMA,
  ITEM_TEMPLATE_UNION_SCHEMA,
  PLAYER_TEMPLATE_SCHEMA,
  COMPANION_TEMPLATE_SCHEMA,
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
