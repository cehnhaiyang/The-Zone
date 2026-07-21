import { useEffect, useCallback, useMemo } from 'react';
import { PlayerState, GameState, LogType, ItemInstance, SanctuaryState } from '../meta';
import { AudioService } from '../services';

const SANCTUARY_CONFIG = {
    BACKPACK_CAPACITY: 10,
    BASE_STORAGE_CAPACITY: 20,
    RESOURCE_EXCHANGE_RATE: 2,
    MEDICINE_HEAL_VALUE: 15,
    COMPANION_RECOVERY_RATE: 0.8,
    MORALE_THRESHOLD: { CRITICAL_LOW: 20, HIGH: 80 }
} as const;

const CUSTOM_REST_CONFIG = {
    MIN_HOURS: 1,
    MAX_HOURS: 24,
    BASE_HOURLY_HP_RECOVERY: 0.05,
    BASE_HOURLY_SANITY_RECOVERY: 0.03,
    HOURLY_FOOD_CONSUMPTION: 0.1,
    HOURLY_WATER_CONSUMPTION: 0.15,
    HOURLY_ELECTRICITY_CONSUMPTION: 0.05,
    HOURLY_NEURAL_DAMAGE: 1,
    EFFICIENCY_THRESHOLDS: {
        HIGH: 12,
        MEDIUM: 18,
        LOW: 24
    }
} as const;

export interface CustomRestConfig {
    hours: number;
    hpRecovery: number;
    sanityRecovery: number;
    foodConsumption: number;
    waterConsumption: number;
    electricityConsumption: number;
    neuralDamage: number;
    efficiency: number;
}

const calculateCustomRestConfig = (hours: number, playerCount: number): CustomRestConfig => {
    let efficiency = 1;
    if (hours > CUSTOM_REST_CONFIG.EFFICIENCY_THRESHOLDS.LOW) {
        efficiency = 0.6;
    } else if (hours > CUSTOM_REST_CONFIG.EFFICIENCY_THRESHOLDS.MEDIUM) {
        efficiency = 0.8;
    } else if (hours > CUSTOM_REST_CONFIG.EFFICIENCY_THRESHOLDS.HIGH) {
        efficiency = 0.9;
    }

    const hpRecovery = hours * CUSTOM_REST_CONFIG.BASE_HOURLY_HP_RECOVERY * efficiency;
    const sanityRecovery = hours * CUSTOM_REST_CONFIG.BASE_HOURLY_SANITY_RECOVERY * efficiency;

    const foodConsumption = hours * CUSTOM_REST_CONFIG.HOURLY_FOOD_CONSUMPTION * playerCount;
    const waterConsumption = hours * CUSTOM_REST_CONFIG.HOURLY_WATER_CONSUMPTION * playerCount;
    const electricityConsumption = hours * CUSTOM_REST_CONFIG.HOURLY_ELECTRICITY_CONSUMPTION;
    const neuralDamage = hours * CUSTOM_REST_CONFIG.HOURLY_NEURAL_DAMAGE;

    return {
        hours,
        hpRecovery,
        sanityRecovery,
        foodConsumption,
        waterConsumption,
        electricityConsumption,
        neuralDamage,
        efficiency
    };
};

const validateRestResources = (
    config: CustomRestConfig,
    currentResources: { food: number; water: number; electricity: number; medicine: number }
): { isValid: boolean; missingResources: string[] } => {
    const missingResources: string[] = [];

    if (currentResources.food < config.foodConsumption) {
        missingResources.push(`食物 ${config.foodConsumption.toFixed(1)} 单位`);
    }
    if (currentResources.water < config.waterConsumption) {
        missingResources.push(`水 ${config.waterConsumption.toFixed(1)} 单位`);
    }
    if (currentResources.electricity < config.electricityConsumption) {
        missingResources.push(`电力 ${config.electricityConsumption.toFixed(1)} 单位`);
    }

    return {
        isValid: missingResources.length === 0,
        missingResources
    };
};

const calculateMoraleChange = (hours: number, currentMorale: number): number => {
    const moraleChange = Math.floor(hours * 0.5);
    return Math.min(100, currentMorale + moraleChange);
};

interface UseSanctuaryParams {
    player: PlayerState;
    setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
    addLog: (text: string, type: LogType) => void;
    gameState: GameState;
}

interface UseSanctuaryReturn {
    getStorageCapacity: () => number;
    transferItem: (item: ItemInstance, toStorage: boolean) => void;
    handleRest: (hours: number) => void;
    handleResourceTrade: (target: keyof SanctuaryState, amount: number) => void;
    handleUseMedicine: (amount?: number) => void;
    getCustomRestConfig: (hours: number) => CustomRestConfig | null;
    morale: number;
    isLowMorale: boolean;
    maxStorage: number;
}

export const useSanctuary = ({
    player,
    setPlayer,
    addLog,
    gameState
}: UseSanctuaryParams): UseSanctuaryReturn => {

    const checkMoraleEffects = useCallback(() => {
        const morale = player.sanctuary.morale;

        if (morale < SANCTUARY_CONFIG.MORALE_THRESHOLD.CRITICAL_LOW) {
            addLog("警告：庇护所士气极低，同伴可能会离开。", "warning");
        } else if (morale > SANCTUARY_CONFIG.MORALE_THRESHOLD.HIGH) {
            addLog("庇护所士气高昂，各项效率提升。", "success");
        }
    }, [player.sanctuary.morale, addLog]);

    useEffect(() => {
        if (gameState === GameState.SANCTUARY) {
            checkMoraleEffects();
        }
    }, [gameState, checkMoraleEffects]);

    const getStorageCapacity = useCallback((): number => {
        return SANCTUARY_CONFIG.BASE_STORAGE_CAPACITY;
    }, []);

    const transferItem = useCallback((item: ItemInstance, toStorage: boolean) => {
        setPlayer(prev => {
            if (!toStorage && prev.dynamic.inventory.length >= SANCTUARY_CONFIG.BACKPACK_CAPACITY) {
                addLog(`背包已满 (${SANCTUARY_CONFIG.BACKPACK_CAPACITY}/${SANCTUARY_CONFIG.BACKPACK_CAPACITY})。`, "warning");
                AudioService.playSfx('error');
                return prev;
            }

            const maxStorage = getStorageCapacity();
            const currentStorageCount = prev.sanctuary.storage.length;

            if (toStorage && currentStorageCount >= maxStorage) {
                addLog(`仓库已满 (${currentStorageCount}/${maxStorage})。`, "warning");
                AudioService.playSfx('error');
                return prev;
            }

            const newInventory = [...prev.dynamic.inventory];
            const newStorage = [...prev.sanctuary.storage];

            if (toStorage) {
                const itemIndex = newInventory.findIndex(i => i.instanceId === item.instanceId);
                if (itemIndex === -1) {
                    addLog("物品不存在于背包中。", "warning");
                    return prev;
                }
                newInventory.splice(itemIndex, 1);
                newStorage.push(item);
                addLog(`存入仓库: ${item.name}`, "info");
            } else {
                const itemIndex = newStorage.findIndex(i => i.instanceId === item.instanceId);
                if (itemIndex === -1) {
                    addLog("物品不存在于仓库中。", "warning");
                    return prev;
                }
                newStorage.splice(itemIndex, 1);
                newInventory.push(item);
                addLog(`取出物品: ${item.name}`, "info");
            }

            AudioService.playSfx('click');
            return {
                ...prev,
                dynamic: { ...prev.dynamic, inventory: newInventory },
                sanctuary: { ...prev.sanctuary, storage: newStorage }
            };
        });
    }, [addLog, getStorageCapacity, setPlayer]);

    const handleRest = useCallback((hours: number) => {
        if (hours < CUSTOM_REST_CONFIG.MIN_HOURS || hours > CUSTOM_REST_CONFIG.MAX_HOURS) {
            addLog(`休息时间必须在${CUSTOM_REST_CONFIG.MIN_HOURS}-${CUSTOM_REST_CONFIG.MAX_HOURS}小时之间`, "warning");
            AudioService.playSfx('error');
            return;
        }

        const playerCount = 1 + player.companions.length;
        const config = calculateCustomRestConfig(hours, playerCount);

        const currentResources = {
            food: player.sanctuary.food,
            water: player.sanctuary.water,
            electricity: player.sanctuary.electricity,
            medicine: player.sanctuary.medicine
        };

        const validation = validateRestResources(config, currentResources);
        if (!validation.isValid) {
            addLog(`资源不足，无法开始休息。缺少：${validation.missingResources.join('、')}`, "warning");
            AudioService.playSfx('error');
            return;
        }

        setPlayer(prev => {
            try {
                const newIntegrity = Math.max(0, prev.neuralLink.integrity - config.neuralDamage);
                const currentMorale = prev.sanctuary.morale;
                const newMorale = calculateMoraleChange(hours, currentMorale);

                const maxHp = prev.static.initialState.vital.maxHp;
                const maxSanity = prev.static.initialState.vital.maxSanity;
                const hpRecovery = Math.floor(maxHp * config.hpRecovery);
                const sanityRecovery = Math.floor(maxSanity * config.sanityRecovery);

                const nextCompanions = prev.companions.map(companion => {
                    const cMaxHp = companion.static.initialState.vital.maxHp;
                    const cMaxSanity = companion.static.initialState.vital.maxSanity;
                    const sanityHeal = Math.floor(cMaxSanity * config.sanityRecovery * SANCTUARY_CONFIG.COMPANION_RECOVERY_RATE);
                    const hpHeal = Math.floor(cMaxHp * config.hpRecovery * SANCTUARY_CONFIG.COMPANION_RECOVERY_RATE);

                    return {
                        ...companion,
                        dynamic: {
                            ...companion.dynamic,
                            hp: Math.min(cMaxHp, companion.dynamic.hp + hpHeal),
                            sanity: Math.min(cMaxSanity, companion.dynamic.sanity + sanityHeal)
                        }
                    };
                });

                const newFood = Math.max(0, currentResources.food - config.foodConsumption);
                const newWater = Math.max(0, currentResources.water - config.waterConsumption);
                const newElectricity = Math.max(0, currentResources.electricity - config.electricityConsumption);

                addLog(`完成了${hours}小时休息。消耗食物${config.foodConsumption.toFixed(1)}单位、水${config.waterConsumption.toFixed(1)}单位、电力${config.electricityConsumption.toFixed(1)}单位。`, "event");
                AudioService.playSfx('success');

                return {
                    ...prev,
                    dynamic: {
                        ...prev.dynamic,
                        hp: Math.min(maxHp, prev.dynamic.hp + hpRecovery),
                        sanity: Math.min(maxSanity, prev.dynamic.sanity + sanityRecovery)
                    },
                    neuralLink: {
                        ...prev.neuralLink,
                        integrity: newIntegrity
                    },
                    sanctuary: {
                        ...prev.sanctuary,
                        food: newFood,
                        water: newWater,
                        electricity: newElectricity,
                        morale: newMorale
                    },
                    companions: nextCompanions
                };
            } catch (error) {
                addLog("休息计算过程发生严重异常，状态回滚。", "critical");
                AudioService.playSfx('error');
                return prev;
            }
        });
    }, [addLog, setPlayer, player.companions.length, player.sanctuary]);

    const handleUseMedicine = useCallback((amount: number = 1) => {
        if (amount <= 0 || !Number.isInteger(amount)) {
            addLog("药品数量必须为正整数", "warning");
            AudioService.playSfx('error');
            return;
        }

        const currentMedicine = player.sanctuary.medicine;
        if (currentMedicine < amount) {
            addLog("庇护所药品储备不足。", "warning");
            AudioService.playSfx('error');
            return;
        }

        setPlayer(prev => {
            try {
                const healAmount = amount * SANCTUARY_CONFIG.MEDICINE_HEAL_VALUE;
                const maxHp = prev.static.initialState.vital.maxHp;
                const newHp = Math.min(maxHp, prev.dynamic.hp + healAmount);

                addLog(`消耗 ${amount} 单位药品。生命体征已部分修复。`, "success");
                AudioService.playSfx('success');

                return {
                    ...prev,
                    sanctuary: {
                        ...prev.sanctuary,
                        medicine: currentMedicine - amount
                    },
                    dynamic: {
                        ...prev.dynamic,
                        hp: newHp
                    }
                };
            } catch (error) {
                addLog("使用药品时发生异常", "critical");
                AudioService.playSfx('error');
                return prev;
            }
        });
    }, [player.sanctuary.initial.medicine, addLog, setPlayer]);

    const getCustomRestConfig = useCallback((hours: number): CustomRestConfig | null => {
        if (hours < CUSTOM_REST_CONFIG.MIN_HOURS || hours > CUSTOM_REST_CONFIG.MAX_HOURS) {
            return null;
        }
        const playerCount = 1 + player.companions.length;
        return calculateCustomRestConfig(hours, playerCount);
    }, [player.companions.length]);

    const handleResourceTrade = useCallback((target: keyof SanctuaryState, amount: number) => {
        if (amount <= 0 || !Number.isInteger(amount)) {
            addLog("兑换数量必须为正整数", "warning");
            AudioService.playSfx('error');
            return;
        }

        setPlayer(prev => {
            try {
                const cost = amount * SANCTUARY_CONFIG.RESOURCE_EXCHANGE_RATE;
                const currentScraps = prev.sanctuary.scraps;

                if (currentScraps < cost) {
                    addLog(`碎片不足，无法兑换 ${amount} 单位物资。`, "warning");
                    AudioService.playSfx('error');
                    return prev;
                }

                const currentTarget = prev.sanctuary[target as keyof typeof prev.sanctuary];

                addLog(`消耗 ${cost} 碎片兑换了 ${amount} 单位 ${target}。`, "info");
                AudioService.playSfx('click');

                return {
                    ...prev,
                    sanctuary: {
                        ...prev.sanctuary,
                        scraps: currentScraps - cost,
                        [target]: (typeof currentTarget === 'number' ? currentTarget : 0) + amount
                    }
                };
            } catch (error) {
                addLog("物资构筑交换时发生异常", "critical");
                AudioService.playSfx('error');
                return prev;
            }
        });
    }, [setPlayer, addLog]);

    const morale = useMemo(() => player.sanctuary.morale, [player.sanctuary.morale]);

    const isLowMorale = useMemo(() => morale < 30, [morale]);

    const maxStorage = useMemo(() => getStorageCapacity(), [getStorageCapacity]);

    return {
        getStorageCapacity,
        transferItem,
        handleRest,
        handleResourceTrade,
        handleUseMedicine,
        getCustomRestConfig,
        morale,
        isLowMorale,
        maxStorage,
    }
}