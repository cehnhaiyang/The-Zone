
export const CHARACTERS = {
    // Players
    "player_warrior": {
        "id": "player_warrior",
        "name": "英勇战士",
        "class": "warrior",
        "maxHealth": 160,      // [平衡] 提升血量，确立坦克地位
        "maxEnergy": 80,       // [平衡] 标准精力
        "energy": 80,
        "deckSize": 24,        // 标准循环
        "observableCards": 3,  // 标准视野
        "intentPreview": 1,    // 只能看一步
        "deckQuality": 1.0,
        "perks": ["abi_warrior_roar"],
        "sequenceProfiles": {
            "offensive": "seq_warrior_offensive",
            "defensive": "seq_warrior_defensive",
            "critical": "seq_warrior_critical"
        }
    },
    "player_mage": {
        "id": "player_mage",
        "name": "奥术法师",
        "class": "mage",
        "maxHealth": 85,       // [平衡] 降低血量，更脆弱
        "maxEnergy": 150,      // [平衡] 极高精力上限，支持高费技能
        "energy": 150,
        "deckSize": 18,        // 较快循环，以便刷出攻击牌
        "observableCards": 5,  // [特色] 极高视野，便于规划
        "intentPreview": 2,    // [特色] 预知未来两步
        "deckQuality": 1.0,
        "perks": ["abi_mage_focus"],
        "sequenceProfiles": {
            "offensive": "seq_mage_offensive",
            "defensive": "seq_mage_defensive",
            "critical": "seq_mage_critical"
        }
    },
    "player_thief": {
        "id": "player_thief",
        "name": "暗影盗贼",
        "class": "thief",
        "maxHealth": 105,      // 中等血量
        "maxEnergy": 70,       // 精力一般，依赖低费高效
        "energy": 70,
        "deckSize": 22,
        "observableCards": 4,  // 较高的手牌视野
        "intentPreview": 3,    // [特色] 极致的敌人动作预判
        "deckQuality": 1.0,
        "perks": ["abi_thief_backstab"],
        "sequenceProfiles": {
            "offensive": "seq_thief_offensive",
            "defensive": "seq_thief_defensive",
            "critical": "seq_thief_critical"
        }
    },
    "player_priest": {
        "id": "player_priest",
        "name": "神圣牧师",
        "class": "priest",
        "maxHealth": 140,      // [平衡] 较高的血量，仅次于战士
        "maxEnergy": 110,      // 较高的精力用于治疗
        "energy": 110,
        "deckSize": 26,        // [平衡] 最大的牌库，循环慢，代表稳重
        "observableCards": 3,
        "intentPreview": 1,
        "deckQuality": 1.0,
        "perks": ["abi_priest_heal"],
        "sequenceProfiles": {
            "offensive": "seq_priest_offensive",
            "defensive": "seq_priest_defensive",
            "critical": "seq_priest_critical"
        }
    },
    "player_samurai": {
        "id": "player_samurai",
        "name": "流浪武士",
        "class": "samurai",
        "maxHealth": 95,       // [平衡] 较低血量，高风险
        "maxEnergy": 50,       // [平衡] 极低精力，限制技能释放频率，强调一击必杀
        "energy": 50,
        "deckSize": 16,        // [平衡] 极小牌库，快速过牌寻找关键一击
        "observableCards": 2,  // [特色] 视野狭窄，专注当下
        "intentPreview": 1,
        "deckQuality": 1.0,
        "perks": ["abi_samurai_iaido"],
        "sequenceProfiles": {
            "offensive": "seq_samurai_offensive",
            "defensive": "seq_samurai_defensive",
            "critical": "seq_samurai_critical"
        }
    },
    // Enemies
    "enemy_goblin": {
        "id": "enemy_goblin",
        "name": "哥布林斥候",
        "maxHealth": 90,       // 脆皮
        "maxEnergy": 100,
        "energy": 100,
        "deckSize": 10,        // 动作循环极快
        "observableCards": 1,
        "intentPreview": 1,
        "deckQuality": 1.0,
        "perks": ["abi_goblin_attack", "abi_goblin_frenzy"],
        "sequenceProfiles": {
            "critical": "seq_goblin_critical",
            "action": "seq_goblin_action"
        }
    },
    "enemy_orc_warrior": {
        "id": "enemy_orc_warrior",
        "name": "兽人督军",
        "maxHealth": 280,      // [平衡] 巨大的血库，考验玩家持续输出能力
        "maxEnergy": 150,
        "energy": 150,
        "deckSize": 24,
        "observableCards": 1,
        "intentPreview": 1,
        "deckQuality": 1.0,
        "perks": ["abi_orc_slam", "abi_orc_rage"],
        "sequenceProfiles": {
            "critical": "seq_orc_critical",
            "action": "seq_orc_action"
        }
    },
    "enemy_dark_mage": {
        "id": "enemy_dark_mage",
        "name": "腐化术士",
        "maxHealth": 120,      // 血量不高但伤害恐怖
        "maxEnergy": 200,
        "energy": 200,
        "deckSize": 16,
        "observableCards": 2,
        "intentPreview": 1,
        "deckQuality": 1.0,
        "perks": ["abi_dark_bolt", "abi_dark_curse"],
        "sequenceProfiles": {
            "critical": "seq_dark_mage_critical",
            "action": "seq_dark_mage_action"
        }
    }
};
