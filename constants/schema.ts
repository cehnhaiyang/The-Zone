/**
 * 地图/区域实体生成指令 Schema 定义 (v3.2)
 * 1. 严格区分【链式叙事】与【单元剧】的 Zone 和 Node 结构，从 Prompt 根源避免 AI 产生幻觉。
 * 2. 将各个独立的实体模板（物品、交互、谜题、卡牌、NPC、敌人）提取为单独的 Schema 字段。
 * 3. 使用者可根据当前的关卡生成模式，动态组装所需的字符串作为 System Prompt。
 * 4. 统一的 META_SCHEMA 常量整合所有分散的类型和接口定义。
 */

/**
 * 统一的 Meta Schema 常量
 * 整合所有分散的类型和接口定义
 */
export const META_SCHEMA = `
type CardEffectType = 
    // 伤害计算分流
    'melee_attack' | 'ranged_attack' | 'instant_attack' |
    // 状态维护与资源循环
    'block' | 'heal' | 'regen' | 'energy' |
    // 卡组流转控制
    'draw' | 'discard_hand' |
    // 短期强化
    'buff_str' | 'buff_agi' | 'buff_kno' | 'buff_per' |
    // 目标限制与劣化
    'stun' | 'freeze' | 'vulnerable' | 'weaken' |
    // 延时损伤挂载
    'bleed' | 'poison' | 'burn'

type CardTarget = 'self' | 'single_teammate' | 'all_teammates' | 'single_ally' | 'all_allies' | 'enemy' | 'all_enemies' | 'none'

type WeaponType = 'wave' | 'dagger' | 'blunt' | 'firearm' | 'explosive' | 'magical'

type AttributeType = 'strength' | 'agility' | 'knowledge' | 'perception'

type CardFeature = 'exhaust' | 'singleUse' | 'retain' | 'ethereal' | 'unplayable'

type VitalType = 'maxHp' | 'maxSanity' | 'maxStamina' | 'maxVigor'

type IntentType = 'attack' | 'buff' | 'debuff' | 'observe'

interface CombatIntent {
    type: IntentType
    desc: string
    value?: number
    targetId?: string
}

type CharacterStyle = 'attack' | 'burst' | 'tactical' | 'healer' | 'defense'

type AccessoryEffectType = 'strength' | 'agility' | 'knowledge' | 'perception' | 'maxHp' | 'maxSanity' | 'maxStamina' | 'maxVigor'

type ConsumableEffectType = AccessoryEffectType | 'heal_hp' | 'heal_sanity' | 'restore_battery' | 'repair_integrity'

type PuzzleType = 'riddle' | 'code' | 'sequence' | 'pattern' | 'logic' | 'cipher' | 'memory' | 'wire'

type SfxType = 'click' | 'hover' | 'text' | 'success' | 'error' | 'notification' | 'heartbeat' | 'scare' | 'glitch' | 'whisper' | 'scream' | 'breathing' | 'static' | 'distortion'
`;

/**
 * 【链式叙事】专用区域结构
 */
export const CHAIN_ZONE_SCHEMA = `
{
    "id": "string",                // 英文、snake_case
    "name": "string",              // 中文
    "theme": "string",             // 英文，美学主题
    "motif": "string",             // 英文，核心主旨
    "mainAxis": "string",          // 英文，叙事主轴
    "visualStyle": "string",       // 英文，用于AI绘图的提示词前缀
    "hiddenAxis": "string",        // 英文，埋设的暗线伏笔
    "generatedPlotPoints": [       // array，本区域生成的伏笔池
        {
            "id": "string",        // 英文、snake_case
            "type": "string",      // "main" | "side"
            "content": "string",   // 伏笔内容描述
            "hint": "string"       // 暗示揭示伏笔的方案（不能在本区域中，必须是“未来”的某个区域）
        }
    ],
    "initial": {
        "dilationFactor": number,  // 时间流速系数 (基准1.0)
        "entrance": "string",      // 起始节点ID (必须在nodes中有定义)
    },
    "nodes": {
        "node_unique_id": { ... }  // 节点对象列表
    }
}
`;

/**
 * 【单元剧】专用区域结构
 */
export const EPISODIC_ZONE_SCHEMA = `
{
    "id": "string",                // 英文、snake_case
    "name": "string",              // 中文
    "theme": "string",             // 英文，美学主题
    "visualStyle": "string",       // 英文，用于AI绘图的提示词前缀
    "initial": {
        "dilationFactor": number,  // 时间流速系数 (基准1.0)
        "entrance": "string",      // 起始节点ID (必须在nodes中有定义)
    },
    "nodes": {
        "node_unique_id": { ... }  // 节点对象列表
    }
}
`;

/**
 * 【链式叙事】专用节点结构
 */
export const CHAIN_NODE_SCHEMA = `
{
    "name": "string",                // 中文
    "desc": "string",                // 中文，三~四句生动描写
    "visualPrompt": "string",        // 英文，用于Ai绘图的提示词
    "threatLevel?": number,          // 取值1-20，无则视为安全节点
    "childrenIds?": Array<string>,   // 子节点id列表，用于构建更加立体、层级化的区域拓扑结构
    "events?": Array<string>,        // 每次进入该节点时可能触发的事件的详细描写
    "exits?": [                      // 出口列表
        {
            "type": "local",         // 节点转移类型
            "targetId": "string",    // 目标节点id
            "label": "string"
        },
        {
            "type": "zone_transfer",  // 区域转移类型
            "targetId": "string",     // 目标区域id
            "label": "string"
        },
        {
            "type": "sanctuary_return", // 庇护所返回类型
            "label": "string",
            "isEnding": false        // true表示叙事链完结，false表示中途挂起
        }
    ],
    "items?": [ ... ],               // 物品对象列表
    "interactions?": [ ... ],        // 交互对象列表
    "nodeNpc?": { ... },             // 节点npc对象
    "specificEnemy?": { ... },       // 节点固定刷新的、服务于叙事体验的敌人对象
    "enemySpawnCondition?": "string" // 特殊的敌人遭遇时机："on_enter" | "on_search" | "on_interact" | "on_sanity_critical"
}
`;

/**
 * 【单元剧】专用节点结构
 */
export const EPISODIC_NODE_SCHEMA = `
{
    "name": "string",                // 中文
    "desc": "string",                // 中文，三~四句生动描写
    "visualPrompt": "string",        // 英文，用于Ai绘图的提示词
    "threatLevel?": number,          // 取值1-20，无则视为安全节点
    "childrenIds?": Array<string>,   // 子节点id列表，用于构建更加立体、层级化的区域拓扑结构
    "events?": Array<string>,        // 每次进入该节点时可能触发的事件的详细描写
    "exits?": [                      // 出口列表
        {
            "type": "local",         // 节点转移类型
            "targetId": "string",    // 目标节点id
            "label": "string"
        },
        {
            "type": "sanctuary_return", // 庇护所返回类型
            "label": "string"
        }
    ],
    "items?": [ ... ],               // 物品列表
    "interactions?": [ ... ],        // 交互事件列表
    "nodeNpc?": { ... },             // 节点npc
    "specificEnemy?": { ... },       // 节点固定刷新的、服务于叙事体验的敌人
    "enemySpawnCondition?": "string" // 特殊的敌人遭遇时机："on_enter" | "on_search" | "on_interact" | "on_sanity_critical"
}
`;

/**
 * 物品模板
 */
export const ITEM_SCHEMA = `
基础字段：
    "id": "string",                    // 英文、snake_case
    "name": "string",                  // 中文
    "desc": "string",                  // 中文
    "type": "string",                  // "weapon" | "armor" | "accessory" | "consumable" | "document" | "audio" | "material"
    "rarity": "string",                // "common" | "rare" | "epic" | "cursed"
    "discoveryThreshold?": "number",   // 发现阈值，影响节点搜查次数，没有则视为立刻发现
    "quantity?": "number",             // 物品数量，没有则视为1

按type区分的特定字段：

- type = "weapon":
    "weaponType": "string",       // "sword" | "dagger" | "blunt" | "firearm" | "explosive" | "magical"
    "meleeDamage?": number,       // 武器的近战伤害
    "rangeDamage?": number,       // 武器的远程伤害
    "maxUses": number             // 武器的最大耐久

- type = "armor":
    "defense": number,            // 护甲的防御力
    "maxUses": number             // 护甲的最大耐久

- type = "accessory":
    "effects":Array<[
        AccessoryEffectType,
        number                    // 效果数值，正整数
    ]>

- type = "consumable":
    "effects": Array<[
        ConsumableEffectType,
        number,                   // 效果数值，正整数
        number?                   // 效果持续的回合数，正整数，没有则为即时生效
    ]>

- type = "document":
    "documentContent": "string"   // 文档内容

- type = "audio":
    "audioScript": "string"       // 音频内容

- type = "material":              // 无额外字段
`;

/**
 * 交互模板
 */
export const INTERACTION_SCHEMA = `
{
    "desc": "string",              // 触发交互的提示文本
    "requirements": {              // 完成交互所必须的条件
        "items?": Array<string>,   // 持有对应id的物品
        "staff?": Array<string>,   // 拥有对应id的同伴
        "puzzleSolved?": { ... }   // 完成交互必须要解决的谜题，内部是一个谜题对象
    },
    "results": {                   // 完成交互后的产生的副作用
        "time": number,            // 交互消耗的游戏回合数
        "soundEffect": "SfxType",
        "narrative": "string",     // 交互结果的描述性文本
        "stateChange?": {          // 交互成功是否产生游戏状态变更？
            "hp?": number,         // 不为零的任意实数，负为扣减、正为增加
            "sanity?": number,     // 不为零的任意实数，负为扣减、正为增加
            "lose?": Array<[
                Item['id']         // 将要失去的物品的id
                |
                Companion['id']    // 将要失去的同伴的id
            ]>,
            "gain?": [ ... ],      // 将要获得物品模板或NPC模板
            "spawnEnemy?": [ ... ] // 将要生成的敌人模板
            "unlock?": Array<[
                string,            // 交互成功将解锁的节点的id
                string             // 上锁节点的描述
            ]>
        }
    }
}
`;

/**
 * 谜题模板
 */
export const PUZZLE_SCHEMA = `
{
    "type": "PuzzleType",
    "title": "string",          // 标题，UI元素
    "desc": "string",           // 叙事描述，UI元素
    "solution": "string",       // 正确答案
    "data": { ... },            // 根据type不同结构不同，详见下方
    "hints": Array<string>,     // 解谜暗示数组
    "maxAttempts": number,      // 最大尝试次数
    "timeLimit?": 60,           // 时间限制，单位为GameTick
    "loreText": "string",       // 解谜成功后推送到游戏日志的叙事描述
    "penalty": {                // 解谜失败后的惩罚
        "hp?": number,          // 正数
        "sanity?": number,      // 正数
        "spawnEnemy?": {...},   // 生成的敌人模板
        "lock?": Node['id']     // 永久锁定的节点id
    }
}

【谜题数据结构】
- sequence: { "sequence": [1, null, 3], "missingIndex": 1, "options": [1,2,3], "correctOption": 2 }

- pattern: { "symbols": ["▲","■","●"], "pattern": ["▲",null,"●"], "correctPattern": ["▲","■","●"], "gridSize": 3 }

- logic: { "premises": ["前提1","前提2"], "question": "结论是？", "options": ["选项A","选项B"], "correctIndex": 0 }

- cipher: { "cipherText": "ifmmp", "cipherType": "caesar" /*或reverse, substitute, binary*/, "key?": 1, "plainText": "hello" }

- memory: { "sequence": ["★","♦","★"], "displayTime": 5, "inputLength": 3 }

- wire: { "wires": [{ "id":"w1", "color":"red", "label":"火线" }], "ports": [{ "id":"p1", "label":"端口A", "correctWireId":"w1" }] }

- riddle / code: {
    // 暂未定具体结构，不要使用该谜题类型
}
`;

/**
 * 卡牌模板
 */
export const CARD_SCHEMA = `
{
    "id": "string",                 // 英文、snake_case
    "name": "string",               // 中文
    "cost": number,                 // 打出后消耗的费用
    "rarity": "string",             // "common" | "rare" | "epic" | "cursed"
    "desc": "string",               // 中文
    "theme": {                      // 卡牌外观
        "borderColor": "#ff0000", // 卡牌边框颜色
        "shadowColor": "#aa0000", // 卡牌阴影颜色
        "bgGradient": "linear-gradient(to bottom, #1a1a1a, #0d0d0d)", // 背景渐变
        "textColor": "#575656"   // 文字颜色
    },
    "effects": Array<{            // 卡牌效果列表
        "type": CardEffectType,
        "value": number,          // 效果数值
        "target": CardTarget,     // 效果目标
        "scaling?": {             // 拥有该字段，效果值会受到对应属性加成
            "attribute": AttributeType,
            "factor": number      // 加成倍率
        },
        "requiredWeaponType?": WeaponType, // 若未装备对应类型武器，则效果数值减半
        "duration?": number       // 效果将持续的战斗回合数
    }>,
    "feature": CardFeature[]      // 卡牌特性
}
`;

/**
 * 节点Npc模板
 */
export const NODE_NPC_SCHEMA = `
{
    "id": "string",              // 英文、snake_case
    "name": "string",            // 中文
    "desc": "string",            // 中文，详细背景描述
    "gender?": "string",         // "male" | "female" | "both"
    "visualPrompt": "string",    // 英文，Ai提示词
    "hide": true,                // 占位字段，告诉引擎这是节点npc
    "style": CharacterStyle,
    "initialState": {
        "attribute": Record<AttributeType, number>,  // 起始属性值
        "vital": Record<VitalType, number>，         // 起始体征值
        "inventory": [ ... ],    // 起始物品模板数组
        "trust": number,         // 起始信任值
        "level": number,         // 起始等级
        "xp": number,            // 起始经验值
        "deck": [ ... ],         // 起始卡牌模板数组
        "equipState": {
            weapons: [Weapon | null,Weapon | null], // Weapon：完整的武器对象
            armors: Array<Armor | null>,            // Armor：完整的护甲对象
            accessories: Array<Accessory | null>    // Accessory：完整的饰品对象
        },
        "quest?": {
            "quest_id": {
                "desc": "string",     // 中文，任务描述
                "difficulty": number, // 正整数，任务难度
                "goals": [ ... ],     // 物品或NPC模板数组
                "rewards": [ ... ]    // 物品或NPC模板数组
            }
        }
    }
}
`;

/**
 * 敌人模板
 */
export const ENEMY_SCHEMA = `
{
    "id": "string",            // 英文、snake_case
    "name": "string",          // 中文
    "desc": "string",          // 中文，外观与行为描述
    "gender?": "string",       // "male" | "female" | "both"
    "visualPrompt": "string",  // 英文，Ai绘图提示词
    "initialState": {
        "attribute": Record<AttributeType, number>,  // 起始属性值
    },
    lootTable?: Array<
        ItemTemplate & {
            dropProbability: number  // 物品掉落的概率
        }>
    intentDistribution: Record<IntentType, number>
    nextIntent: CombatIntent
}
`;