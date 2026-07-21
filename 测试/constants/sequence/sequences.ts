
import { SequenceProfile } from "../../types";

export const SEQUENCES: Record<string, SequenceProfile> = {
    // --- Warrior (坦克/稳健) ---
    "seq_warrior_offensive": {
        "id": "seq_warrior_offensive", "name": "战士攻击", "type": "offensive",
        // 命中率尚可，很少花里胡哨
        "results": { "hit": { "weight": 65 }, "graze": { "weight": 25 }, "miss": { "weight": 10 } }
    },
    "seq_warrior_defensive": {
        "id": "seq_warrior_defensive", "name": "战士防御", "type": "defensive",
        // 核心：极高的格挡权重，且格挡减伤下限很高(50%起)
        "results": { "block": { "weight": 75, "damageReduction": { "min": 0.5, "max": 0.85 } }, "dodge": { "weight": 5 }, "fail": { "weight": 20 } }
    },
    "seq_warrior_critical": {
        "id": "seq_warrior_critical", "name": "战士暴击", "type": "critical",
        // 暴击率一般
        "results": { "normal": { "weight": 85 }, "critical": { "weight": 15 } }
    },
    
    // --- Mage (爆发/脆弱) ---
    "seq_mage_offensive": {
        "id": "seq_mage_offensive", "name": "法师攻击", "type": "offensive",
        // 攻击要么精准命中，要么被打断(Miss)，几乎没有擦伤
        "results": { "hit": { "weight": 75 }, "graze": { "weight": 5 }, "miss": { "weight": 20 } }
    },
    "seq_mage_defensive": {
        "id": "seq_mage_defensive", "name": "法师防御", "type": "defensive",
        // 防御极差，格挡效果也弱
        "results": { "block": { "weight": 40, "damageReduction": { "min": 0.2, "max": 0.4 } }, "dodge": { "weight": 10 }, "fail": { "weight": 50 } }
    },
    "seq_mage_critical": {
        "id": "seq_mage_critical", "name": "法师暴击", "type": "critical",
        // 暴击潜力较高
        "results": { "normal": { "weight": 75 }, "critical": { "weight": 25 } }
    },
    
    // --- Thief (闪避/敏捷) ---
    "seq_thief_offensive": {
        "id": "seq_thief_offensive", "name": "盗贼攻击", "type": "offensive",
        // 依靠高频率的擦伤(Graze)削血
        "results": { "hit": { "weight": 35 }, "graze": { "weight": 60 }, "miss": { "weight": 5 } }
    },
    "seq_thief_defensive": {
        "id": "seq_thief_defensive", "name": "盗贼防御", "type": "defensive",
        // 极端防御：要么完全闪避(45%)，要么直接失败(45%)，很难格挡
        "results": { "dodge": { "weight": 45 }, "block": { "weight": 10, "damageReduction": { "min": 0.1, "max": 0.3 } }, "fail": { "weight": 45 } }
    },
    "seq_thief_critical": {
        "id": "seq_thief_critical", "name": "盗贼暴击", "type": "critical",
        // 较高的暴击率
        "results": { "normal": { "weight": 70 }, "critical": { "weight": 30 } }
    },

    // --- Priest (消耗/铁壁) ---
    "seq_priest_offensive": {
        "id": "seq_priest_offensive", "name": "牧师攻击", "type": "offensive",
        // 攻击极弱，甚至很难命中
        "results": { "hit": { "weight": 25 }, "graze": { "weight": 50 }, "miss": { "weight": 25 } }
    },
    "seq_priest_defensive": {
        "id": "seq_priest_defensive", "name": "牧师防御", "type": "defensive",
        // 铁壁防御：85% 概率格挡，且十分稳定
        "results": { "block": { "weight": 85, "damageReduction": { "min": 0.4, "max": 0.75 } }, "dodge": { "weight": 5 }, "fail": { "weight": 10 } }
    },
    "seq_priest_critical": {
        "id": "seq_priest_critical", "name": "牧师暴击", "type": "critical",
        // 几乎不暴击
        "results": { "normal": { "weight": 95 }, "critical": { "weight": 5 } }
    },

    // --- Samurai (一击/居合) ---
    "seq_samurai_offensive": {
        "id": "seq_samurai_offensive", "name": "武士攻击", "type": "offensive",
        // 居合道：看破即命中，否则挥空。无擦伤。
        "results": { "hit": { "weight": 55 }, "graze": { "weight": 5 }, "miss": { "weight": 40 } }
    },
    "seq_samurai_defensive": {
        "id": "seq_samurai_defensive", "name": "武士防御", "type": "defensive",
        // 招架(Block)能力中等，依赖心眼闪避
        "results": { "block": { "weight": 40, "damageReduction": { "min": 0.3, "max": 0.6 } }, "dodge": { "weight": 25 }, "fail": { "weight": 35 } }
    },
    "seq_samurai_critical": {
        "id": "seq_samurai_critical", "name": "武士暴击", "type": "critical",
        // [特色] 极高的暴击链占比 (40%)，一旦命中往往就是暴击
        "results": { "normal": { "weight": 60 }, "critical": { "weight": 40 } }
    },

    // --- Enemies ---
    "seq_goblin_action": {
        "id": "seq_goblin_action", "name": "哥布林行动", "type": "enemy-action",
        // 攻击频率高，偶尔防御
        "results": { "attack": { "weight": 70 }, "defend": { "weight": 10 }, "skill": { "weight": 20 } }
    },
    "seq_goblin_critical": {
        "id": "seq_goblin_critical", "name": "哥布林暴击", "type": "enemy-critical",
        "results": { "normal": { "weight": 95 }, "critical": { "weight": 5 } }
    },
    
    "seq_orc_action": {
        "id": "seq_orc_action", "name": "兽人行动", "type": "enemy-action",
        // 笨重，攻击权重适中，但配合高伤
        "results": { "attack": { "weight": 50 }, "defend": { "weight": 20 }, "skill": { "weight": 30 } }
    },
    "seq_orc_critical": {
        "id": "seq_orc_critical", "name": "兽人暴击", "type": "enemy-critical",
        "results": { "normal": { "weight": 85 }, "critical": { "weight": 15 } }
    },
    
    "seq_dark_mage_action": {
        "id": "seq_dark_mage_action", "name": "术士行动", "type": "enemy-action",
        // 极高概率释放技能(Skill)，普通攻击少
        "results": { "attack": { "weight": 20 }, "defend": { "weight": 20 }, "skill": { "weight": 60 } }
    },
    "seq_dark_mage_critical": {
        "id": "seq_dark_mage_critical", "name": "术士暴击", "type": "enemy-critical",
        "results": { "normal": { "weight": 80 }, "critical": { "weight": 20 } }
    }
};
