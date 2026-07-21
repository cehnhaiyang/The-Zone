
import { PerkData } from "../../types";

export const PERKS: Record<string, PerkData> = {
    // Warrior - 攻防一体
    "abi_warrior_roar": {
        "id": "abi_warrior_roar",
        "name": "战斗怒吼",
        "description": "消耗20精力。持续4回合。进入防御姿态，格挡率极大提升，攻击更稳定。",
        "consumes": "none",
        "cost": 20,
        "advancesBothSequences": true,
        "effects": [
            { "type": "apply_buff", "buffId": "buff_roar", "duration": 5, "target": "self" }
        ]
    },
    // Mage - 绝对命中
    "abi_mage_focus": {
        "id": "abi_mage_focus",
        "name": "奥术专注",
        "description": "消耗40精力。持续3回合。所有攻击必定命中，且大幅提升暴击链等级。",
        "consumes": "none",
        "cost": 40,
        "advancesBothSequences": true,
        "effects": [
            { "type": "apply_buff", "buffId": "buff_focus", "duration": 4, "target": "self" }
        ]
    },
    // Thief - 舍身一击
    "abi_thief_backstab": {
        "id": "abi_thief_backstab",
        "name": "暗影背刺",
        "description": "消耗25精力。直接造成18点伤害。下2回合暴击率激增，但无法进行防御(强制Fail)。",
        "consumes": "none",
        "cost": 25,
        "advancesBothSequences": true,
        "effects": [
            { "type": "apply_buff", "buffId": "buff_backstab", "duration": 3, "target": "self" },
            { "type": "damage", "baseAmount": 18, "damageType": "physical" }
        ]
    },
    // Priest - 强力恢复
    "abi_priest_heal": {
        "id": "abi_priest_heal",
        "name": "神圣治愈",
        "description": "消耗45精力。恢复35点生命值。获得3回合[神圣庇护]，格挡率提升至极限。",
        "consumes": "none",
        "cost": 45,
        "advancesBothSequences": true,
        "effects": [
            { "type": "apply_buff", "buffId": "buff_divine", "duration": 4, "target": "self" },
            { "type": "heal", "baseAmount": 35 } 
        ]
    },
    // Samurai - 决胜时刻
    "abi_samurai_iaido": {
        "id": "abi_samurai_iaido",
        "name": "居合·心眼",
        "description": "消耗30精力。造成25点伤害。下2回合必定暴击且暴击倍率提升至300%。",
        "consumes": "none",
        "cost": 30,
        "advancesBothSequences": true,
        "effects": [
            { "type": "apply_buff", "buffId": "buff_iaido", "duration": 3, "target": "self" },
            { "type": "damage", "baseAmount": 25, "damageType": "physical" }
        ]
    },

    // Enemy Perks (AI Skills)
    "abi_goblin_frenzy": { "id": "abi_goblin_frenzy", "name": "疯狂乱抓", "description": "", "consumes": "none", "cost": 0, "effects": [{ "type": "damage", "baseAmount": 12 }] },
    "abi_goblin_attack": { "id": "abi_goblin_attack", "name": "投掷石块", "description": "", "consumes": "none", "cost": 0, "effects": [{ "type": "damage", "baseAmount": 8 }] },
    
    "abi_orc_slam": { "id": "abi_orc_slam", "name": "撼地重击", "description": "", "consumes": "none", "cost": 0, "effects": [{ "type": "damage", "baseAmount": 30 }] },
    "abi_orc_rage": { "id": "abi_orc_rage", "name": "血怒冲撞", "description": "", "consumes": "none", "cost": 0, "effects": [{ "type": "damage", "baseAmount": 35 }] },
    
    "abi_dark_bolt": { "id": "abi_dark_bolt", "name": "暗影箭", "description": "", "consumes": "none", "cost": 0, "effects": [{ "type": "damage", "baseAmount": 22 }] },
    "abi_dark_curse": { "id": "abi_dark_curse", "name": "灵魂收割", "description": "", "consumes": "none", "cost": 0, "effects": [{ "type": "damage", "baseAmount": 15 }, { "type": "apply_buff", "buffId": "curse", "duration": 3, "target": "player" }] }
};
