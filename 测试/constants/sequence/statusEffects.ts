
export const STATUS_EFFECTS = [
    {
        id: "poison",
        name: "中毒",
        description: "每回合受到伤害",
        stackable: true,
        maxStacks: 5,
        type: 'debuff',
        effects: [{ type: "periodic_damage", amount: 3 }]
    },
    {
        id: "curse",
        name: "诅咒",
        description: "降低攻击力",
        stackable: false,
        type: 'debuff',
        effects: [{ type: "damage_reduction", amount: 0.25 }]
    }
];
