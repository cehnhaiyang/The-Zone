import { PlayerState, PlotPoint, MainPlotPoint, SidePlotPoint, StoryConfig, StoryArc, ArchivedStoryArc, ChainNarrative, Entity, NpcTemplate, NpcDynamicState, NarrativePacing, NarrativePhase, EmotionalTone, DyNarrative, StateTrend, safeDeepClone, DynamicVitalType, Vital } from '../meta';

// ---------- 静态核心配置 ----------

const PACING_PRESETS: Record<NarrativePacing, {
    foreshadowMult: number; callbackMult: number; tensionBase: number; tensionMult: number;
    nodeBase: number; nodeVar: number; progressMult: number;
}> = {
    slow: { foreshadowMult: 1.5, callbackMult: 0.7, tensionBase: 300, tensionMult: 0.8, nodeBase: 18, nodeVar: 3, progressMult: 0.8 },
    balanced: { foreshadowMult: 1.0, callbackMult: 1.0, tensionBase: 500, tensionMult: 1.0, nodeBase: 15, nodeVar: 2, progressMult: 1.0 },
    fast: { foreshadowMult: 0.6, callbackMult: 1.5, tensionBase: 700, tensionMult: 1.3, nodeBase: 12, nodeVar: 2, progressMult: 1.3 },
    psych: { foreshadowMult: 2.0, callbackMult: 0.5, tensionBase: 400, tensionMult: 1.4, nodeBase: 14, nodeVar: 3, progressMult: 0.9 },
};

const DEFAULT_RULES: ChainNarrative['rule'] = {
    pacingWeights: { health: 0.25, sanity: 0.35, plots: 0.2, depth: 0.1, companions: 0.1 },
    foreshadowingRules: { earlyGameChance: 0.7, midGameChance: 0.4, lateGameChance: 0.2, maxConcurrent: 5 },
    climaxParameters: { depthMultiplier: 300, sanityThreshold: 0.5, companionImpact: 200, plotPressureMax: 200 },
    nodeCountRange: { min: 5, max: 30, base: 15 },
};

const TONE_MAP: Record<EmotionalTone, string> = {
    hopeful: '暗存生机：微光或残留温情，但仍保持废土/诡异风格。',
    desperate: '深渊绝望：极度压抑、令人窒息的修辞，强调无力感。',
    anxious: '焦躁不安：强调环境不可控与躁动感。',
    numb: '冰冷麻木：冷酷、抽离，着重腐朽与麻木。',
    determined: '破釜沉舟：干脆利落，凸显坚定意志。',
};

const PHASE_MAP: Record<NarrativePhase, string> = {
    setup: '铺垫阶段：刻画诡异细节、埋设悬念，勿发生正面冲突。',
    rising: '发展阶段：引入实质性威胁或严峻挑战。',
    climax: '高潮阶段：（强制指令）极具张力和压迫感！创造决定性冲突场面！',
    falling: '余波阶段：描写战后残骸与精疲力竭。',
    resolution: '终局阶段：一切尘埃落定，适合升华主题或留下余味。',
};

// ---------- 纯函数数据流管道 ----------

interface RuntimeSnapshot {
    hpRatio: number; sanityRatio: number; staminaRatio: number; vigorRatio: number;
    fatigueLevel: number; neuralStress: number; isWeaponBroken: boolean;
    aliveCompanions: Entity<NpcTemplate, NpcDynamicState>[];
    companionDistress: number; companionTraumaCount: number;
    absoluteTick: number; activeArc?: StoryArc;
    openPlots: PlotPoint[]; plotPoints: PlotPoint[];
    arcDepth: number; arcProgress: number;
}

function getMaxHpForCompanion(c: Entity<NpcTemplate, NpcDynamicState>): number {
    return Math.max(1, c.dynamic.maxHp || 100);
}

function buildSnapshot(state: PlayerState): RuntimeSnapshot {
    const { currentGameRound, neuralLink, dynamic, companions = [] } = state;

    // 除零保护处理
    const maxHp = Math.max(1, dynamic.maxHp || 100);
    const maxSanity = Math.max(1, dynamic.maxSanity || 100);
    const maxStamina = Math.max(1, dynamic.maxStamina || 100);
    const maxVigor = Math.max(1, dynamic.maxVigor || 100);
    const maxNeuralIntegrity = Math.max(1, neuralLink.maxIntegrity);

    const hpRatio = dynamic.hp / maxHp;
    const sanityRatio = dynamic.sanity / maxSanity;
    const staminaRatio = dynamic.stamina / maxStamina;
    const vigorRatio = dynamic.vigor / maxVigor;
    const fatigueLevel = Math.max(0, 1 - (staminaRatio + vigorRatio) / 2);
    const neuralStress = Math.max(0, 1 - neuralLink.integrity / maxNeuralIntegrity);

    const isWeaponBroken = !dynamic.equipment.weapons.some(w => w && w.currentUses > 0);

    const alive = companions.filter(c => !c.dynamic.deathReason);
    let distress = 0, trauma = 0;

    if (alive.length > 0) {
        distress = alive.reduce((sum, c) => {
            let d = 0;
            const cMaxHp = getMaxHpForCompanion(c);
            const cMaxSan = Math.max(1, c.dynamic.maxSanity || 100);

            if (c.dynamic.hp < cMaxHp * 0.3) d += 0.4;
            if (c.dynamic.sanity < cMaxSan * 0.3) d += 0.4;
            if ((c.dynamic.trust || 0) < 30) d += 0.2;

            return sum + d;
        }, 0) / alive.length;
        trauma = alive.reduce((sum, c) => sum + (c.dynamic.memory.δ?.length || 0), 0);
    }

    const absoluteTick = currentGameRound.absoluteTick;
    // 性能优化：快照仅供只读使用，剔除深拷贝以阻断内存溢出风险
    const activeArc = state.activeArc;
    const arcDepth = activeArc ? Math.max(0, absoluteTick - (activeArc.startTime.tick || 0)) : absoluteTick;
    const arcProgress = activeArc ? activeArc.progress : Math.min(1000, absoluteTick * 20);
    const plotPoints = activeArc ? [...activeArc.plotPoints[0], ...activeArc.plotPoints[1]] : [];
    const openPlots = plotPoints.filter(p => !p.isSolved);

    return {
        hpRatio, sanityRatio, staminaRatio, vigorRatio, fatigueLevel,
        neuralStress, isWeaponBroken, aliveCompanions: alive,
        companionDistress: distress, companionTraumaCount: trauma,
        absoluteTick, activeArc, openPlots, plotPoints, arcDepth, arcProgress
    };
}

function calcChainTension(snap: RuntimeSnapshot, pacing: NarrativePacing): number {
    const p = PACING_PRESETS[pacing];
    const c = DEFAULT_RULES.climaxParameters;
    const depthDread = Math.min(200, Math.pow(snap.arcDepth / 10, 1.5) * 15);

    let tension = Math.max(p.tensionBase, p.tensionBase + depthDread);
    const healthF = (1 - snap.hpRatio) * 200;
    const sanityF = (1 - snap.sanityRatio) * 250;
    const fatigueF = snap.fatigueLevel * 150;
    const neuralF = snap.neuralStress * 150;
    const weaponF = snap.isWeaponBroken ? 150 : 0;
    const companionF = snap.companionDistress * c.companionImpact;
    const plotPressure = Math.min(c.plotPressureMax, snap.openPlots.length * 70) + (snap.openPlots.length > 6 ? 100 : 0);

    let resonance = 1.0;
    if (snap.hpRatio < c.sanityThreshold && snap.sanityRatio < c.sanityThreshold) resonance += 0.5;
    if (snap.isWeaponBroken && snap.openPlots.length > 3) resonance += 0.3;
    if (snap.companionDistress > 0.6 && snap.fatigueLevel > 0.7) resonance += 0.4;

    tension += ((healthF + sanityF) * resonance + fatigueF + companionF + plotPressure + neuralF + weaponF) * p.tensionMult;
    tension += Math.sin((snap.arcDepth * Math.PI) / 6) * (50 + tension * 0.1);

    const resolvedCount = snap.plotPoints.length - snap.openPlots.length;
    if (resolvedCount > 0) {
        tension -= Math.min(300, resolvedCount * 50);
    }

    return Math.max(0, Math.min(1000, Math.round(tension)));
}

function calcChainProgress(snap: RuntimeSnapshot, pacing: NarrativePacing): number {
    const p = PACING_PRESETS[pacing];
    const resolvedMain = snap.plotPoints.filter(pp => pp.type === 'main' && pp.isSolved).length;
    const resolvedSide = snap.plotPoints.filter(pp => pp.type === 'side' && pp.isSolved).length;
    const progress = (resolvedMain * 200 + resolvedSide * 50 + Math.min(450, snap.arcDepth * 18)) * p.progressMult;

    return Math.min(1000, Math.round(snap.activeArc ? Math.max(snap.activeArc.progress, progress) : progress));
}

function calcChainPhase(progress: number, tension: number): NarrativePhase {
    if (progress < 250) return 'setup';
    if (progress < 750) return 'rising';
    if (progress >= 850 && tension >= 800) return 'climax';
    if (progress >= 900 && tension < 800) return 'falling';
    return progress >= 1000 ? 'resolution' : 'rising';
}

function calcChainForeshadowHints(snap: RuntimeSnapshot, pacing: NarrativePacing): { main: number; side: number } {
    const p = PACING_PRESETS[pacing];
    const f = DEFAULT_RULES.foreshadowingRules;
    const mainCount = snap.openPlots.filter(pp => pp.type === 'main').length;
    const sideCount = snap.openPlots.filter(pp => pp.type === 'side').length;

    if (mainCount + sideCount >= f.maxConcurrent) return { main: 0, side: 0 };

    const res = { main: 0, side: 0 };
    if (mainCount < 2 && snap.arcProgress < 700 && Math.random() < p.foreshadowMult * f.earlyGameChance) res.main++;
    if (sideCount < 5 && Math.random() < p.foreshadowMult * 0.8) res.side++;
    return res;
}

function calcChainNodeCount(snap: RuntimeSnapshot, pacing: NarrativePacing, tension: number, phase: NarrativePhase): number {
    const p = PACING_PRESETS[pacing];
    const r = DEFAULT_RULES.nodeCountRange;
    let n = p.nodeBase;

    if (snap.hpRatio < 0.25) n -= 3;
    if (snap.sanityRatio < 0.25) n -= 2;
    if (snap.fatigueLevel > 0.7) n -= 2;
    if (snap.arcProgress > 850) n += 2;
    if (tension > 850) n -= 3;
    if (phase === 'climax') n -= 4;

    n += Math.floor(Math.random() * p.nodeVar) - Math.floor(p.nodeVar / 2);
    return Math.max(r.min, Math.min(r.max, n));
}

function calcChainPlotsToResolve(snap: RuntimeSnapshot, pacing: NarrativePacing): number {
    if (!snap.openPlots.length) return 0;
    const p = PACING_PRESETS[pacing];
    let chance = 0.1 * p.callbackMult + snap.openPlots.length * 0.12;

    if (snap.arcProgress > 800) chance += 0.6;
    if (snap.openPlots.length > 3) chance += 0.2;

    return Math.random() < chance ? (snap.openPlots.length > 4 && Math.random() < 0.5 ? 2 : 1) : 0;
}

function determineTone(snap: RuntimeSnapshot): EmotionalTone {
    if (snap.sanityRatio > 0.7 && snap.hpRatio > 0.7 && snap.fatigueLevel < 0.3) return 'hopeful';
    if (snap.sanityRatio < 0.25 || snap.neuralStress > 0.7) return 'desperate';
    if (snap.companionDistress > 0.5 || snap.isWeaponBroken) return 'anxious';
    if ((snap.sanityRatio < 0.4 && snap.hpRatio < 0.4) || snap.fatigueLevel > 0.8) return 'numb';
    return 'determined';
}

function resolveStateTrend(ratio: number): StateTrend {
    return ratio < 0.3 ? 'declining' : ratio > 0.8 ? 'improving' : 'stable';
}

/**
 * @服务 链式叙事引擎 (Chain Narrative Service)
 * @契约 强依赖 `ChainNarrative['analysis']`
 *
 * 核心职责：
 * 1. 生命周期：接管长线叙事容器（StoryArc）的状态机流转（挂载、中断、恢复、封存归档）。
 * 2. 引擎调控：基于底层快照（Snapshot），执行基于正弦波动与压力模型的张力（Tension）及进度（Progress）演算。
 * 3. 稳态输出：输出标准结构化分析结果，精确调度阶段相位（Phase）切分、节点生成数阈值以及伏笔（PlotPoint）的注入与回收水位。
 *
 * @边界 纯粹的领域服务层（Domain Service），禁止持有任何内部可变状态；拦截一切针对单元剧（Episodic）模式的越权调用。
 */
export class ChainNarrativeService {

    /** 严格对齐 interface ChainNarrative['analysis'] 约束 */
    static analyzeChainNarrative(state: PlayerState): ChainNarrative['analysis'] {
        const snap = buildSnapshot(state);
        if (!snap.activeArc) return this.defaultChainAnalysis();

        const pacing = snap.activeArc.config.pacing.id;
        const tension = calcChainTension(snap, pacing);
        const progress = calcChainProgress(snap, pacing);
        const phase = calcChainPhase(progress, tension);
        const shouldEnd = progress >= 900 && tension >= 850;
        const foreshadowHints = calcChainForeshadowHints(snap, pacing);
        const nodeCount = calcChainNodeCount(snap, pacing, tension, phase);
        const plotsToResolve = calcChainPlotsToResolve(snap, pacing);

        return {
            params: {
                progress: { marco: phase, micro: progress },
                tension,
                shouldTriggerEnding: shouldEnd,
                activePlotPoints: [snap.activeArc.plotPoints[0], snap.activeArc.plotPoints[1]],
            },
            output: {
                ppToGenerate: { m: foreshadowHints.main, s: foreshadowHints.side },
                nodeToGenerate: nodeCount,
                ppToSolve: plotsToResolve,
            },
        };
    }

    static startChainArc(state: PlayerState, config: StoryConfig): PlayerState {
        const next = safeDeepClone(state);
        const themeId = config.theme.id;
        const motifId = config.motif?.id ?? 'nomotif';
        const mainAxisId = config.mainAxis?.id ?? 'noaxis';
        const length = config.nodeCount ?? 0;
        const id = `${themeId}_${motifId}_${mainAxisId}_${length}` as StoryArc['id'];
        next.activeArc = {
            id,
            config,
            length,
            status: 'ongoing',
            progress: 0,
            plotPoints: [[], []],
            currentIndex: 0,
            hiddenAxis: { prevDesc: '', newDesc: '', isRevealed: false },
            startTime: {
                real: new Date(next.currentRealTime),
                zone: { ...next.currentZoneTime },
                tick: next.currentGameRound.absoluteTick
            },
        };
        return next;
    }

    static suspendChainArc(state: PlayerState): PlayerState {
        if (!state.activeArc || state.activeArc.status !== 'ongoing') return state;
        const next = safeDeepClone(state);
        next.activeArc!.status = 'suspended';
        return next;
    }

    static resumeChainArc(state: PlayerState): PlayerState {
        if (!state.activeArc || state.activeArc.status !== 'suspended') return state;
        const next = safeDeepClone(state);
        next.activeArc!.status = 'ongoing';
        return next;
    }

    static addChainPlotPoint(state: PlayerState, plot: PlotPoint): PlayerState {
        const next = safeDeepClone(state);
        if (!next.activeArc) return next;

        const newPlot = { ...plot };
        if (plot.type === 'main') next.activeArc.plotPoints[0].push(newPlot as MainPlotPoint);
        else next.activeArc.plotPoints[1].push(newPlot as SidePlotPoint);

        return next;
    }

    static resolveChainPlotPoint(state: PlayerState, plotId: string): PlayerState {
        const next = safeDeepClone(state);
        const resolve = (arr: PlotPoint[]) => {
            const t = arr.find(p => p.id === plotId && !p.isSolved);
            if (t) {
                t.isSolved = true;
                return true;
            }
            return false;
        };

        if (next.activeArc) {
            resolve(next.activeArc.plotPoints[0]) || resolve(next.activeArc.plotPoints[1]);
        }
        return next;
    }

    static updateChainHiddenAxis(state: PlayerState, prevDesc: string, newDesc: string, isRevealed = false): PlayerState {
        const next = safeDeepClone(state);
        if (next.activeArc) {
            next.activeArc.hiddenAxis = { prevDesc, newDesc, isRevealed };
        }
        return next;
    }

    static resolveChainHiddenAxis(state: PlayerState, isCorrect: boolean): PlayerState {
        const next = safeDeepClone(state);
        if (next.activeArc?.hiddenAxis) {
            next.activeArc.hiddenAxis.isRevealed = isCorrect;
        }
        return next;
    }

    static concludeChainArc(state: PlayerState, summary: string): PlayerState {
        if (!state.activeArc) return state;
        const next = safeDeepClone(state);
        const arc = next.activeArc!;
        arc.status = 'concluded';

        const archived: ArchivedStoryArc = {
            ...arc,
            endTime: {
                real: new Date(next.currentRealTime),
                zone: { ...next.currentZoneTime },
                tick: next.currentGameRound.absoluteTick
            },
            summary,
        };

        next.archivedArcs.push(archived);

        if (arc.hiddenAxis?.isRevealed) {
            const theme = arc.config.theme.id;
            const motif = arc.config.motif?.id ?? '';
            const main = arc.config.mainAxis?.id ?? '';

            const axisExists = next.archivedHiddenAxis.some(a => a.theme === theme && a.mainAxis === main);
            if (!axisExists) {
                next.archivedHiddenAxis.push({ theme, motif, mainAxis: main, desc: arc.hiddenAxis.newDesc });
            }
        }
        next.activeArc = undefined;
        return next;
    }

    static shouldChainArcEnd(state: PlayerState): boolean {
        const snap = buildSnapshot(state);
        return !!(snap.activeArc && snap.activeArc.status === 'ongoing' && snap.arcProgress >= 900 && calcChainTension(snap, snap.activeArc.config.pacing.id) >= 850);
    }

    static getChainNarrativeHealth(state: PlayerState): number {
        const snap = buildSnapshot(state);
        const plotBalance = Math.max(0, 200 - Math.abs(snap.openPlots.length - 2.5) * 60);
        const stability = ((snap.hpRatio + snap.sanityRatio + (1 - snap.fatigueLevel)) / 3) * 200;
        const progressHealth = snap.arcProgress > 0 && snap.arcProgress < 1000 ? 100 : 0;

        return Math.round(Math.max(0, Math.min(1000, 500 + plotBalance + stability + progressHealth)));
    }

    private static defaultChainAnalysis(): ChainNarrative['analysis'] {
        return {
            params: {
                progress: { marco: 'setup', micro: 0 },
                tension: 0,
                shouldTriggerEnding: false,
                activePlotPoints: [[], []],
            },
            output: {
                ppToGenerate: { m: 0, s: 0 },
                nodeToGenerate: 8,
                ppToSolve: 0,
            },
        };
    }
}

/**
 * @服务 动态叙事引擎 (Dynamic Narrative Service)
 * @契约 强依赖 `DyNarrative`
 *
 * 核心职责：
 * 1. 状态推演：降维提取 `PlayerState` 的碎片化变量，收敛为确定的生理演化趋势（StateTrend）与边界触发器（Triggers）。
 * 2. 指令合成：基于推演矩阵，严格输出供大模型（LLM）消费的控制面指令（Directives），强制锚定节点渲染的文本基调与感官压迫感。
 *
 * @边界 仅接管微观节点的动态氛围映射，绝对隔离于宏观剧本流程之外。
 */
export class DynamicNarrativeService {

    /**
     * 将运行时碎片化状态静态计算，推断状态走向与底层触发器
     */
    static analyzeDynamicState(state: PlayerState): DyNarrative {
        const snap = buildSnapshot(state);

        const stateTrend: Array<[DynamicVitalType, StateTrend]> = [
            ['hp', resolveStateTrend(snap.hpRatio)],
            ['sanity', resolveStateTrend(snap.sanityRatio)],
            ['stamina', resolveStateTrend(snap.staminaRatio)],
            ['vigor', resolveStateTrend(snap.vigorRatio)]
        ];

        const currentVital: Vital = { maxHp: 100, maxSanity: 100, maxStamina: 100, maxVigor: 100 };

        const vitalRecord = {
            prevVital: {
                prevTick: snap.absoluteTick,
                prevVital: { ...currentVital }
            },
            currentVital: {
                currentTick: snap.absoluteTick,
                currentVital: { ...currentVital }
            }
        };

        return {
            emotionalTone: determineTone(snap),
            vitalRecord,
            stateTrend,
            triggers: {
                isNearDeath: snap.hpRatio <= 0.2,
                isExhausted: snap.fatigueLevel >= 0.8,
                isWeaponless: snap.isWeaponBroken,
                isArmorless: state.dynamic.equipment.armors.every(id => !id),
                hasCompanionNearDeath: snap.aliveCompanions.some(c => (c.dynamic.hp / getMaxHpForCompanion(c)) <= 0.2),
                hasCompanionDistrust: snap.aliveCompanions.some(c => (c.dynamic.trust || 0) < 30),
                isNeuralCollapsing: snap.neuralStress >= 0.8,
                hasQuest: (state.questAccepted || []).some(q => q.status === 'on')
            }
        };
    }

    static generateDyDirectives(state: PlayerState): string {
        // 链式叙事模式的焦点交由引擎主控，屏蔽单节点动态干扰
        if (state.activeArc?.config.mode.id === 'chain') {
            return '';
        }

        const analysis = ChainNarrativeService.analyzeChainNarrative(state);
        const funcContext = this.analyzeDynamicState(state);
        const directives: string[] = [];

        if (state.activeArc?.status === 'suspended') {
            return '【状态：修整】队伍已撤回安全区。聚焦内心反思与物资整理，避免直接冲突。';
        }

        // 情绪基调锚定与叙事阶段推演
        directives.push(`【基调】${TONE_MAP[funcContext.emotionalTone]}`);
        directives.push(`【叙事阶段】${PHASE_MAP[analysis.params.progress.marco]}`);

        // 躯干与底层生理异常反馈
        if (funcContext.triggers.isNearDeath) directives.push('【躯体：濒死】强化生理剧痛描写：血腥味、模糊视线、撕裂呼吸。');
        if (funcContext.triggers.isExhausted) directives.push('【躯体：极度力竭】强调重力失常感、灌铅四肢、跨越障碍的巨大代价。');
        if (funcContext.triggers.isNeuralCollapsing) directives.push(`【机制：神经链接受损】完整度${state.neuralLink.integrity}%，混入赛博失常元素。`);

        // 装备劣势压迫
        if (funcContext.triggers.isWeaponless) directives.push('【装备：手无寸铁】强调生理脆弱与被猎杀的恐慌，只能狼狈规避。');
        if (funcContext.triggers.isArmorless) directives.push('【装备：无防御】感知对环境极其敏感，任何微小刮擦都可能致命。');

        // 实体社交矩阵劣化
        if (funcContext.triggers.hasCompanionNearDeath) directives.push('【团队：血肉拖累】同伴濒死，强调其痛苦、呼吸粗重与彻底沦为负资产的现实。');
        if (funcContext.triggers.hasCompanionDistrust) directives.push('【团队：信任冰点】同伴充满戒备，气氛压抑，暗示可能发生的背叛或抗命先兆。');

        // 暗线隐秘下发
        if (state.activeArc?.hiddenAxis && !state.activeArc.hiddenAxis.isRevealed) {
            directives.push(`【暗线提示】隐晦埋下与"${state.activeArc.config.motif?.id}"相关的象征线索。`);
        }

        return directives.join(' ');
    }
}