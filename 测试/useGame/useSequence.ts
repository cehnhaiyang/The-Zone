
import { useCallback } from 'react';
import { SEQUENCES } from '../../constants/sequence';
import { SequenceProfile } from '../../types';

/**
 * 序列修正参数接口
 * 用于在生成序列时动态调整权重或升级概率 (通常由 Buff/Debuff 提供)
 */
export interface SequenceModifiers {
    weights?: Record<string, number>; // 权重修正: { hit: 1.5, dodge: 0.5 } (乘法叠加)
    upgradeChance?: number;           // 升级概率: 0-1 (将低级结果升级为高级结果)
    quality?: number;                 // 牌库质量系数 (0-1)，影响正面结果的权重
}

// 定义正面结果类型，受质量衰减影响
const POSITIVE_RESULTS = new Set(['hit', 'critical', 'block', 'dodge', 'skill']);

/**
 * 序列生成引擎 Hook
 * 负责根据配置动态生成战斗序列
 */
export const useSequence = () => {
    
    /**
     * 生成加权随机序列 (Weighted Sequence)
     * 核心逻辑：基于属性状态的完全动态生成。
     * 更新：支持 quality 参数进行全局质量衰减
     * 
     * @param profile 序列配置
     * @param length 生成长度
     * @param modifiers 动态修正参数 (调整权重)
     */
    const generateWeightedSequence = (profile: SequenceProfile, length: number, modifiers?: SequenceModifiers): string[] => {
        const sequence: string[] = [];
        const quality = modifiers?.quality ?? 1.0; // 默认质量 1.0
        
        // 1. 计算各项的最终权重 (基础权重 * 修正倍率 * 质量系数)
        const options = Object.entries(profile.results).map(([key, value]) => {
            // 应用修正: 乘法叠加
            let mod = modifiers?.weights?.[key] ?? 1.0;
            
            // 应用质量衰减: 仅对正面结果生效
            if (POSITIVE_RESULTS.has(key)) {
                mod *= quality;
            }

            return {
                type: key,
                weight: Math.max(0, value.weight * mod) // 确保权重非负
            };
        });
        
        // 2. 构建累积权重区间 (用于随机抽样)
        let totalWeight = 0;
        const weightedOptions = options.map(option => {
            totalWeight += option.weight;
            return { ...option, cumulativeWeight: totalWeight };
        });

        // 3. 随机生成序列
        for (let i = 0; i < length; i++) {
            const random = Math.random() * totalWeight;
            // 找到第一个累积权重 >= 随机值的项
            const selected = weightedOptions.find(opt => opt.cumulativeWeight >= random);
            
            let resultType = 'normal';
            if (selected) {
                resultType = selected.type;
            } else {
                resultType = weightedOptions[0]?.type || 'normal';
            }

            // 额外升级逻辑 (如将 normal 升级为 critical)
            if (modifiers?.upgradeChance && modifiers.upgradeChance > 0) {
                if (resultType === 'normal' && Math.random() < modifiers.upgradeChance) {
                    resultType = 'critical';
                }
            }

            // --- 预计算数值逻辑 (Deterministic Values) ---
            let finalResult = resultType;

            if (resultType === 'graze') {
                // 擦伤：造成 1% - 99% 的伤害
                // 默认全范围，未来可以在 profile 中配置
                const pct = Math.floor(Math.random() * 99) + 1;
                finalResult = `graze:${pct}`;
            } else if (resultType === 'block') {
                // 格挡：减免 X% 伤害
                // 优先读取 profile 中的范围配置
                const blockConfig = profile.results['block'];
                let min = 0.10, max = 0.90; // 默认 10% - 90%
                
                if (blockConfig && blockConfig.damageReduction) {
                    min = blockConfig.damageReduction.min;
                    max = blockConfig.damageReduction.max;
                }
                
                const range = max - min;
                // 受质量影响，格挡的减免比例也会略微浮动（可选特性，此处暂只影响出现概率）
                const randomPct = Math.random() * range + min;
                const pctInt = Math.floor(randomPct * 100);
                finalResult = `block:${pctInt}`;
            }

            sequence.push(finalResult);
        }

        return sequence;
    };

    /**
     * 核心接口：生成序列
     * 根据配置ID和目标类型自动分发生成逻辑
     */
    const generateSequence = useCallback((
        profileId: string, 
        target: 'player' | 'enemy' = 'player', 
        modifiers?: SequenceModifiers,
        overrideLength?: number // 支持自定义长度
    ): string[] => {
        const profile = SEQUENCES[profileId];
        
        // 错误处理：配置不存在
        if (!profile) {
            console.warn(`[GameEngine] Sequence Profile not found: ${profileId}`);
            return Array(10).fill('normal');
        }

        // 默认长度兜底 (虽然调用方通常会传入 deckSize)
        const length = overrideLength || (target === 'player' ? 32 : 16);

        return generateWeightedSequence(profile, length, modifiers);
    }, []);

    /**
     * UI 辅助：获取序列项的显示文本
     * 支持解析 graze:50 这种带数值的格式
     */
    const getDisplayText = (fullResult: string, type: string) => {
        const [baseType, val] = fullResult.split(':');

        const displayTexts: Record<string, Record<string, string>> = {
            offensive: { hit: '命中', graze: '擦伤', miss: '未命中' },
            defensive: { dodge: '闪避', block: '格挡', fail: '失败' },
            critical: { normal: '普击', critical: '暴击!' },
            'enemy-action': { attack: '攻击', defend: '防御', skill: '技能' },
            'enemy-critical': { normal: '普击', critical: '暴击!' }
        };

        const text = displayTexts[type]?.[baseType] || baseType;

        // 如果带有数值，附加显示
        if (val) {
            return `${text} ${val}%`;
        }
        return text;
    };

    return {
        generateSequence,
        getDisplayText
    };
};