import {
    WeaponTemplate,
    ArmorTemplate,
    AccessoryTemplate,
    ConsumableTemplate,
    DocumentTemplate,
    AudioTemplate,
    MaterialTemplate
} from '../meta';

// --- 文档与记录 ---

/** 文档基础模板：文本类道具，承载叙事内容 */
export const document: DocumentTemplate = {
    id: 'document',
    name: '文档',
    desc: '一份文档。',
    type: 'document',
    rarity: 'common',
    documentContent: ''
};

/** 录音基础模板：音频类道具，承载叙事内容 */
export const recorder: AudioTemplate = {
    id: 'recorder',
    name: '录音笔',
    desc: '一台录音设备。',
    type: 'audio',
    rarity: 'rare',
    audioScript: ''
};

// --- 消耗品 ---

/** 药品基础模板：恢复HP的消耗品 */
export const medicine: ConsumableTemplate = {
    id: 'medicine',
    name: '药品',
    desc: '恢复少量HP。',
    type: 'consumable',
    rarity: 'common',
    effects: [
        ['heal_hp', 20]
    ]
};

/** 镇静剂基础模板：恢复理智的消耗品 */
export const sedative: ConsumableTemplate = {
    id: 'sedative',
    name: '镇静剂',
    desc: '恢复理智。',
    type: 'consumable',
    rarity: 'common',
    effects: [
        ['heal_sanity', 25]
    ]
};

/** 口粮基础模板：食物类消耗品 */
export const ration: ConsumableTemplate = {
    id: 'ration',
    name: '口粮',
    desc: '恢复少量HP。',
    type: 'consumable',
    rarity: 'common',
    effects: [
        ['heal_hp', 10]
    ]
};

/** 增益剂基础模板：提供临时增益的消耗品 */
export const stimulant: ConsumableTemplate = {
    id: 'stimulant',
    name: '增益剂',
    desc: '暂时提升战斗能力。',
    type: 'consumable',
    rarity: 'rare',
    effects: [
        ['strength', 5, 3] // 提升5点力量，持续3个回合（战斗或探索轮次）
    ]
};

/** 电池基础模板：为神经链路充电 (本质为消耗品) */
export const battery: ConsumableTemplate = {
    id: 'battery',
    name: '电池',
    desc: '可以为设备充电。',
    type: 'consumable',
    rarity: 'common',
    effects: [
        ['restore_battery', 50]
    ]
};

// --- 武器与护甲 (分离 EquipmentTemplate) ---

/** 近战武器基础模板（匕首类） */
export const melee_weapon: WeaponTemplate = {
    id: 'melee_weapon',
    name: '近战武器',
    desc: '一把刀。',
    type: 'weapon',
    rarity: 'common',
    weaponType: 'dagger',
    meleeDamage: 4,
    maxUses: 15
};

/** 钝器基础模板 */
export const blunt_weapon: WeaponTemplate = {
    id: 'blunt_weapon',
    name: '钝器',
    desc: '沉重的打击工具。',
    type: 'weapon',
    rarity: 'common',
    weaponType: 'blunt',
    meleeDamage: 7,
    maxUses: 8
};

/** 远程武器基础模板（枪械类） */
export const ranged_weapon: WeaponTemplate = {
    id: 'ranged_weapon',
    name: '枪械',
    desc: '一把枪。',
    type: 'weapon',
    rarity: 'common',
    weaponType: 'firearm',
    meleeDamage: 2,
    rangeDamage: 5,
    maxUses: 6
};

/** 爆炸物基础模板 */
export const explosive_weapon: WeaponTemplate = {
    id: 'explosive_weapon',
    name: '爆炸物',
    desc: '使用后消耗。',
    type: 'weapon',
    rarity: 'rare',
    weaponType: 'explosive',
    rangeDamage: 15,
    maxUses: 1
};

/** 魔法武器基础模板 */
export const magic_weapon: WeaponTemplate = {
    id: 'magic_weapon',
    name: '仪式器具',
    desc: '刻有符文的器具。',
    type: 'weapon',
    rarity: 'rare',
    weaponType: 'magical',
    meleeDamage: 4,
    maxUses: 10
};

/** 简易武器基础模板 */
export const improvised_weapon: WeaponTemplate = {
    id: 'improvised_weapon',
    name: '简易武器',
    desc: '粗糙但致命。',
    type: 'weapon',
    rarity: 'common',
    weaponType: 'blunt',
    meleeDamage: 3,
    maxUses: 5
};

/** 简易护甲基础模板 */
export const basic_armor: ArmorTemplate = {
    id: 'basic_armor',
    name: '简易护甲',
    desc: '提供基础物理防御。',
    type: 'armor',
    rarity: 'common',
    defense: 3,
    maxUses: 20
};

// ============================================================================
// 饰品基础模板
// ============================================================================
export const accessory: AccessoryTemplate = {
    id: 'accessory',
    name: '饰品',
    desc: '可装备的配件。',
    type: 'accessory',
    rarity: 'common',
    effects: [
        ['maxHp', 10] // 装备期间增加10点最大HP
    ]
};

// --- 材料与杂项 (统一归为 Material) ---

/** 工具基础模板 */
export const tool: MaterialTemplate = {
    id: 'tool',
    name: '工具',
    desc: '一种工具。',
    type: 'material',
    rarity: 'common'
};

/** 遗物基础模板 */
export const relic: MaterialTemplate = {
    id: 'relic',
    name: '遗物',
    desc: '来源不明的物品。',
    type: 'material',
    rarity: 'rare'
};

/** 杂项基础模板 */
export const misc: MaterialTemplate = {
    id: 'misc',
    name: '杂物',
    desc: '用途不明的物品。',
    type: 'material',
    rarity: 'common'
};

/** 电子设备基础模板 */
export const electronics: MaterialTemplate = {
    id: 'electronics',
    name: '电子设备',
    desc: '一台电子设备。',
    type: 'material',
    rarity: 'common'
};

/** 钥匙基础模板 */
export const key_ItemTemplate: MaterialTemplate = {
    id: 'key_ItemTemplate',
    name: '钥匙',
    desc: '可以打开某些锁。',
    type: 'material',
    rarity: 'rare'
}