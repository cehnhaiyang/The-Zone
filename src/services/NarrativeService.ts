import { safeDeepClone } from '../meta';
import type {
    PlayerState,
    PlotPoint,
    MainPlotPoint,
    SidePlotPoint,
    StoryConfig,
    StoryArc,
    ArchivedStoryArc,
    ChainNarrative,
    Entity,
    NpcTemplate,
    NpcDynamicState,
    NarrativePacing,
    NarrativePhase,
    EmotionalTone,
    DyNarrative,
    StateTrend,
    DynamicVitalType,
    Vital,
} from '../meta';
import {
    getSeverity,
    HP_STATE_CONFIG,
    SANITY_STATE_CONFIG,
    STAMINA_STATE_CONFIG,
    VIGOR_STATE_CONFIG,
    NEURAL_LINK_CONFIG,
    EQUIPMENT_STATE_CONFIG,
} from '../constants';

type HiddenAxisRecord = NonNullable<PlayerState['archivedHiddenAxis']>[number];
type PlotPointNetTuple = [MainPlotPoint[], SidePlotPoint[]];

interface PacingPreset {
    foreshadowMult: number;
    callbackMult: number;
    tensionBase: number;
    tensionMult: number;
    nodeBase: number;
    nodeVar: number;
    progressMult: number;
}

interface RuntimeSnapshot {
    hpRatio: number;
    sanityRatio: number;
    staminaRatio: number;
    vigorRatio: number;
    fatigueLevel: number;
    neuralStress: number;
    isWeaponBroken: boolean;
    aliveCompanions: Array<Entity<NpcTemplate, NpcDynamicState>>;
    companionDistress: number;
    companionTraumaCount: number;
    absoluteTick: number;
    activeArc?: StoryArc;
    openPlots: PlotPoint[];
    plotPoints: PlotPoint[];
    arcDepth: number;
    arcLength: number;
    arcProgress: number;
}

// ---------- 基础工具 ----------
const safeNumber = (value: unknown, fallback = 0): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const clamp = (value: number, min: number, max: number): number => {
    if (Number.isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
};

const ratio = (value: unknown, max: unknown): number =>
    clamp(safeNumber(value) / Math.max(1, safeNumber(max, 100)), 0, 1);

const toDurabilityPercent = (current: number | undefined, max: number | undefined): number => {
    const currentValue = safeNumber(current, 0);
    const maxValue = safeNumber(max, 0);

    if (maxValue <= 0) {
        return currentValue > 0 ? 100 : 0;
    }

    return Math.round(clamp((currentValue / maxValue) * 100, 0, 100));
};

// ---------- 静态核心配置 ----------
const PACING_PRESETS: Record<NarrativePacing, PacingPreset> = {
    slow: {
        foreshadowMult: 1.5,
        callbackMult: 0.7,
        tensionBase: 300,
        tensionMult: 0.8,
        nodeBase: 18,
        nodeVar: 3,
        progressMult: 0.8,
    },
    balanced: {
        foreshadowMult: 1.0,
        callbackMult: 1.0,
        tensionBase: 500,
        tensionMult: 1.0,
        nodeBase: 15,
        nodeVar: 2,
        progressMult: 1.0,
    },
    fast: {
        foreshadowMult: 0.6,
        callbackMult: 1.5,
        tensionBase: 700,
        tensionMult: 1.3,
        nodeBase: 12,
        nodeVar: 2,
        progressMult: 1.3,
    },
    psych: {
        foreshadowMult: 2.0,
        callbackMult: 0.5,
        tensionBase: 400,
        tensionMult: 1.4,
        nodeBase: 14,
        nodeVar: 3,
        progressMult: 0.9,
    },
};

const DEFAULT_RULES: ChainNarrative['rule'] = {
    pacingWeights: {
        health: 0.25,
        sanity: 0.35,
        plots: 0.2,
        depth: 0.1,
        companions: 0.1,
    },
    foreshadowingRules: {
        earlyGameChance: 0.7,
        midGameChance: 0.4,
        lateGameChance: 0.2,
        maxConcurrent: 5,
    },
    climaxParameters: {
        depthMultiplier: 300,
        sanityThreshold: 0.5,
        companionImpact: 200,
        plotPressureMax: 200,
    },
    nodeCountRange: {
        min: 5,
        max: 30,
        base: 15,
    },
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
function getMaxHpForCompanion(c: Entity<NpcTemplate, NpcDynamicState>): number {
    return Math.max(1, safeNumber(c.dynamic.maxHp, 100));
}

function getMaxSanityForCompanion(c: Entity<NpcTemplate, NpcDynamicState>): number {
    return Math.max(1, safeNumber(c.dynamic.maxSanity, 100));
}

function buildSnapshot(state: PlayerState): RuntimeSnapshot {
    const { currentGameRound, neuralLink, dynamic, companions = [] } = state;

    const maxHp = Math.max(1, safeNumber(dynamic.maxHp, 100));
    const maxSanity = Math.max(1, safeNumber(dynamic.maxSanity, 100));
    const maxStamina = Math.max(1, safeNumber(dynamic.maxStamina, 100));
    const maxVigor = Math.max(1, safeNumber(dynamic.maxVigor, 100));

    const hpRatio = ratio(dynamic.hp, maxHp);
    const sanityRatio = ratio(dynamic.sanity, maxSanity);
    const staminaRatio = ratio(dynamic.stamina, maxStamina);
    const vigorRatio = ratio(dynamic.vigor, maxVigor);

    const fatigueLevel = clamp(1 - (staminaRatio + vigorRatio) / 2, 0, 1);
    const neuralStress = clamp(1 - ratio(neuralLink.integrity, neuralLink.maxIntegrity), 0, 1);

    const weapons = dynamic.equipment?.weapons ?? [];
    const isWeaponBroken = !weapons.some(w => !!w && safeNumber(w.currentUses) > 0);

    const alive = companions.filter(c => safeNumber(c.dynamic.hp) > 0);

    let distress = 0;
    let trauma = 0;

    if (alive.length > 0) {
        distress =
            alive.reduce((sum, c) => {
                let d = 0;
                const cHpRatio = ratio(c.dynamic.hp, getMaxHpForCompanion(c));
                const cSanRatio = ratio(c.dynamic.sanity, getMaxSanityForCompanion(c));

                if (cHpRatio < 0.3) d += 0.4;
                if (cSanRatio < 0.3) d += 0.4;
                if (safeNumber(c.dynamic.trust) < 30) d += 0.2;

                return sum + d;
            }, 0) / alive.length;

        trauma = alive.reduce((sum, c) => sum + safeNumber(c.dynamic.memory?.δ?.length), 0);
    }

    const absoluteTick = safeNumber(currentGameRound.absoluteTick);
    const activeArc = state.activeArc;

    const arcLength = activeArc ? Math.max(1, safeNumber(activeArc.length, 1)) : 1;
    const arcDepth = activeArc ? safeNumber(activeArc.currentIndex) : 0;
    const arcProgress = activeArc ? clamp(safeNumber(activeArc.progress), 0, 1000) : 0;

    const plotPoints = activeArc ? [...activeArc.plotPoints[0], ...activeArc.plotPoints[1]] : [];
    const openPlots = plotPoints.filter(p => !p.isSolved);

    return {
        hpRatio,
        sanityRatio,
        staminaRatio,
        vigorRatio,
        fatigueLevel,
        neuralStress,
        isWeaponBroken,
        aliveCompanions: alive,
        companionDistress: distress,
        companionTraumaCount: trauma,
        absoluteTick,
        activeArc,
        openPlots,
        plotPoints,
        arcDepth,
        arcLength,
        arcProgress,
    };
}

function calcChainTension(snap: RuntimeSnapshot, pacing: NarrativePacing): number {
    const preset = PACING_PRESETS[pacing];
    const weights = DEFAULT_RULES.pacingWeights;
    const climax = DEFAULT_RULES.climaxParameters;

    const depthRatio = clamp(snap.arcDepth / snap.arcLength, 0, 1);

    const depthDread = Math.min(
        200,
        Math.pow(depthRatio, 1.35) *
        220 *
        (safeNumber(climax.depthMultiplier, 300) / 300) *
        (weights.depth / 0.1)
    );

    let tension = preset.tensionBase + depthDread;

    const healthF = (1 - snap.hpRatio) * 200 * (weights.health / 0.25);
    const sanityF = (1 - snap.sanityRatio) * 250 * (weights.sanity / 0.35);
    const fatigueF = snap.fatigueLevel * 150;
    const neuralF = snap.neuralStress * 150;
    const weaponF = snap.isWeaponBroken ? 150 : 0;
    const companionF =
        snap.companionDistress * climax.companionImpact * (weights.companions / 0.1);
    const traumaF = Math.min(120, snap.companionTraumaCount * 8);

    const rawPlotPressure =
        Math.min(climax.plotPressureMax, snap.openPlots.length * 70) +
        (snap.openPlots.length > 6 ? 100 : 0);

    const plotPressure = rawPlotPressure * (weights.plots / 0.2);

    let resonance = 1.0;

    if (snap.hpRatio < climax.sanityThreshold && snap.sanityRatio < climax.sanityThreshold) {
        resonance += 0.5;
    }

    if (snap.isWeaponBroken && snap.openPlots.length > 3) {
        resonance += 0.3;
    }

    if (snap.companionDistress > 0.6 && snap.fatigueLevel > 0.7) {
        resonance += 0.4;
    }

    tension +=
        ((healthF + sanityF) * resonance +
            fatigueF +
            companionF +
            plotPressure +
            neuralF +
            weaponF +
            traumaF) *
        preset.tensionMult;

    tension += Math.sin((snap.absoluteTick * Math.PI) / 6) * (40 + tension * 0.06);

    const resolvedCount = snap.plotPoints.length - snap.openPlots.length;
    if (resolvedCount > 0) {
        tension -= Math.min(300, resolvedCount * 50);
    }

    return Math.round(clamp(tension, 0, 1000));
}

function calcChainProgress(snap: RuntimeSnapshot, pacing: NarrativePacing): number {
    const preset = PACING_PRESETS[pacing];

    const resolvedMain = snap.plotPoints.filter(pp => pp.type === 'main' && pp.isSolved).length;
    const resolvedSide = snap.plotPoints.filter(pp => pp.type === 'side' && pp.isSolved).length;

    const lengthRatio = clamp(snap.arcDepth / snap.arcLength, 0, 1);
    const lengthScore = Math.min(450, lengthRatio * 450);
    const plotScore = resolvedMain * 200 + resolvedSide * 50;

    const progress = (plotScore + lengthScore) * preset.progressMult;

    const baseline = snap.activeArc
        ? Math.max(safeNumber(snap.activeArc.progress), progress)
        : progress;

    return Math.round(clamp(baseline, 0, 1000));
}

function calcChainPhase(progress: number, tension: number): NarrativePhase {
    if (progress < 250) return 'setup';
    if (progress >= 1000) return 'resolution';
    if (progress >= 900 && tension < 800) return 'falling';
    if (progress >= 850 && tension >= 800) return 'climax';
    return 'rising';
}

function calcChainForeshadowHints(
    snap: RuntimeSnapshot,
    pacing: NarrativePacing
): { main: number; side: number } {
    const preset = PACING_PRESETS[pacing];
    const rules = DEFAULT_RULES.foreshadowingRules;

    const mainCount = snap.openPlots.filter(pp => pp.type === 'main').length;
    const sideCount = snap.openPlots.filter(pp => pp.type === 'side').length;

    if (mainCount + sideCount >= rules.maxConcurrent) {
        return { main: 0, side: 0 };
    }

    const result = { main: 0, side: 0 };

    const baseMainChance =
        snap.arcProgress >= 700
            ? rules.lateGameChance
            : snap.arcProgress >= 350
                ? rules.midGameChance
                : rules.earlyGameChance;

    const mainChance = clamp(preset.foreshadowMult * baseMainChance, 0, 0.95);
    const sideChance = clamp(preset.foreshadowMult * (baseMainChance + 0.15), 0, 0.95);

    if (mainCount < 2 && snap.arcProgress < 700 && Math.random() < mainChance) {
        result.main += 1;
    }

    if (sideCount < 5 && Math.random() < sideChance) {
        result.side += 1;
    }

    return result;
}

function calcChainNodeCount(
    snap: RuntimeSnapshot,
    pacing: NarrativePacing,
    tension: number,
    phase: NarrativePhase
): number {
    const preset = PACING_PRESETS[pacing];
    const range = DEFAULT_RULES.nodeCountRange;

    let n = preset.nodeBase || range.base;

    if (snap.hpRatio < 0.25) n -= 3;
    if (snap.sanityRatio < 0.25) n -= 2;
    if (snap.fatigueLevel > 0.7) n -= 2;
    if (snap.arcProgress > 850) n += 2;
    if (tension > 850) n -= 3;
    if (phase === 'climax') n -= 4;

    n += Math.floor(Math.random() * preset.nodeVar) - Math.floor(preset.nodeVar / 2);

    return Math.max(range.min, Math.min(range.max, Math.round(n)));
}

function calcChainPlotsToResolve(snap: RuntimeSnapshot, pacing: NarrativePacing): number {
    if (!snap.openPlots.length) return 0;

    const preset = PACING_PRESETS[pacing];

    let chance = clamp(0.1 * preset.callbackMult + snap.openPlots.length * 0.12, 0, 0.95);

    if (snap.arcProgress > 800) chance += 0.6;
    if (snap.openPlots.length > 3) chance += 0.2;

    chance = clamp(chance, 0, 0.95);

    if (Math.random() >= chance) return 0;

    return snap.openPlots.length > 4 && Math.random() < 0.5 ? 2 : 1;
}

function determineTone(snap: RuntimeSnapshot): EmotionalTone {
    if (snap.sanityRatio > 0.7 && snap.hpRatio > 0.7 && snap.fatigueLevel < 0.3) {
        return 'hopeful';
    }

    if (snap.sanityRatio < 0.25 || snap.neuralStress > 0.7) {
        return 'desperate';
    }

    if (snap.companionDistress > 0.5 || snap.isWeaponBroken) {
        return 'anxious';
    }

    if ((snap.sanityRatio < 0.4 && snap.hpRatio < 0.4) || snap.fatigueLevel > 0.8) {
        return 'numb';
    }

    return 'determined';
}

function resolveStateTrend(valueRatio: number): StateTrend {
    if (valueRatio < 0.3) return 'declining';
    if (valueRatio > 0.8) return 'improving';
    return 'stable';
}

/**
 * @服务 链式叙事引擎 (Chain Narrative Service)
 * @契约 强依赖 `ChainNarrative['analysis']`
 *
 * 核心职责：
 * - 生命周期：接管长线叙事容器（StoryArc）的状态机流转（挂载、中断、恢复、封存归档）。
 * - 引擎调控：基于底层快照（Snapshot），执行基于正弦波动与压力模型的张力（Tension）及进度（Progress）演算。
 * - 稳态输出：输出标准结构化分析结果，精确调度阶段相位（Phase）切分、节点生成数阈值以及伏笔（PlotPoint）的注入与回收水位。
 *
 * @边界 纯粹的领域服务层（Domain Service），禁止持有任何内部可变状态；拦截一切针对单元剧（Episodic）模式的越权调用。
 */
export class ChainNarrativeService {
    private static isChainArc(state: PlayerState): boolean {
        return state.activeArc?.config.mode.id === 'chain';
    }

    /** 严格对齐 interface ChainNarrative['analysis'] 约束 */
    static analyzeChainNarrative(state: PlayerState): ChainNarrative['analysis'] {
        const snap = buildSnapshot(state);

        if (!snap.activeArc || snap.activeArc.config.mode.id !== 'chain') {
            return this.defaultChainAnalysis();
        }

        const pacing = snap.activeArc.config.pacing.id;

        const tension = calcChainTension(snap, pacing);
        const progress = calcChainProgress(snap, pacing);
        const phase = calcChainPhase(progress, tension);

        const shouldEnd = progress >= 1000 || (progress >= 900 && tension >= 850);

        const foreshadowHints = calcChainForeshadowHints(snap, pacing);
        const nodeCount = calcChainNodeCount(snap, pacing, tension, phase);
        const plotsToResolve = calcChainPlotsToResolve(snap, pacing);

        return {
            params: {
                progress: {
                    macro: phase,
                    micro: progress,
                },
                tension,
                shouldTriggerEnding: shouldEnd,
                activePlotPoints: [snap.activeArc.plotPoints[0], snap.activeArc.plotPoints[1]],
            },
            output: {
                ppToGenerate: {
                    m: foreshadowHints.main,
                    s: foreshadowHints.side,
                },
                nodeToGenerate: nodeCount,
                ppToSolve: plotsToResolve,
            },
        };
    }

    /**
     * 同步链式叙事分析结果到 PlayerState.narrative，
     * 并在链式模式下回写 StoryArc.progress，保证后续 UI / LLM 读取到最新进度。
     */
    static syncChainAnalysis(state: PlayerState): PlayerState {
        const analysis = this.analyzeChainNarrative(state);
        const next = safeDeepClone(state);

        next.narrative = analysis;

        if (next.activeArc && next.activeArc.config.mode.id === 'chain') {
            next.activeArc.progress = analysis.params.progress.micro;
        }

        return next;
    }

    static startChainArc(state: PlayerState, config: StoryConfig): PlayerState {
        const source =
            state.activeArc &&
                state.activeArc.config.mode.id === 'chain' &&
                state.activeArc.status !== 'concluded'
                ? this.concludeChainArc(state, '自动封存：新的叙事链启动。')
                : state;

        const next = safeDeepClone(source);

        if (!Array.isArray(next.archivedArcs)) next.archivedArcs = [];
        if (!Array.isArray(next.archivedHiddenAxis)) next.archivedHiddenAxis = [];

        const chainConfig: StoryConfig = {
            ...config,
            mode: {
                ...config.mode,
                id: 'chain' as const,
            },
        };

        const themeId = chainConfig.theme.id;
        const motifId = chainConfig.motif?.id ?? 'nomotif';
        const mainAxisId = chainConfig.mainAxis?.id ?? 'noaxis';
        const length = Math.max(1, safeNumber(chainConfig.nodeCount, 1));

        const id = `${themeId}_${motifId}_${mainAxisId}_${length}` as StoryArc['id'];

        const startTime = {
            zone: { ...next.currentZoneTime },
            tick: safeNumber(next.currentGameRound.absoluteTick),
        };

        next.activeArc = {
            id,
            config: chainConfig,
            length,
            status: 'ongoing',
            progress: 0,
            plotPoints: [[], []] as PlotPointNetTuple,
            currentIndex: 0,
            hiddenAxis: {
                prevDesc: '',
                newDesc: '',
                isRevealed: false,
            },
            startTime,
        };

        return next;
    }

    static suspendChainArc(state: PlayerState): PlayerState {
        if (!this.isChainArc(state) || state.activeArc?.status !== 'ongoing') {
            return state;
        }

        const next = safeDeepClone(state);

        if (next.activeArc) {
            next.activeArc.status = 'suspended';
        }

        return next;
    }

    static resumeChainArc(state: PlayerState): PlayerState {
        if (!this.isChainArc(state) || state.activeArc?.status !== 'suspended') {
            return state;
        }

        const next = safeDeepClone(state);

        if (next.activeArc) {
            next.activeArc.status = 'ongoing';
        }

        return next;
    }

    /**
     * 推进叙事链当前索引。
     * 若未传入 nextIndex，则默认 +1。
     */
    static advanceChainIndex(state: PlayerState, nextIndex?: number): PlayerState {
        if (!this.isChainArc(state)) {
            return state;
        }

        const next = safeDeepClone(state);

        if (next.activeArc) {
            const length = safeNumber(next.activeArc.length);
            const current = safeNumber(next.activeArc.currentIndex);
            const target =
                typeof nextIndex === 'number' && Number.isFinite(nextIndex)
                    ? nextIndex
                    : current + 1;

            next.activeArc.currentIndex = clamp(Math.round(target), 0, Math.max(0, length));
        }

        return next;
    }

    static addChainPlotPoint(state: PlayerState, plot: PlotPoint): PlayerState {
        if (!this.isChainArc(state)) {
            return state;
        }

        const next = safeDeepClone(state);

        if (!next.activeArc) {
            return next;
        }

        const plotId =
            plot.id ||
            `pp_${safeNumber(state.currentGameRound.absoluteTick)}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;

        if (plot.type === 'main') {
            const mainPlot: MainPlotPoint = {
                ...plot,
                id: plotId,
                isSolved: plot.isSolved ?? false,
            };
            next.activeArc.plotPoints[0].push(mainPlot);
        } else {
            const sidePlot: SidePlotPoint = {
                ...plot,
                id: plotId,
                isSolved: plot.isSolved ?? false,
            };
            next.activeArc.plotPoints[1].push(sidePlot);
        }

        return next;
    }

    static resolveChainPlotPoint(state: PlayerState, plotId: string): PlayerState {
        if (!this.isChainArc(state)) {
            return state;
        }

        const next = safeDeepClone(state);

        if (!next.activeArc) {
            return next;
        }

        const resolveIn = (arr: PlotPoint[]): boolean => {
            const target = arr.find(p => p.id === plotId && !p.isSolved);
            if (!target) return false;
            target.isSolved = true;
            return true;
        };

        if (!resolveIn(next.activeArc.plotPoints[0])) {
            resolveIn(next.activeArc.plotPoints[1]);
        }

        return next;
    }

    static updateChainHiddenAxis(
        state: PlayerState,
        prevDesc: string,
        newDesc: string,
        isRevealed = false
    ): PlayerState {
        if (!this.isChainArc(state)) {
            return state;
        }

        const next = safeDeepClone(state);

        if (next.activeArc) {
            next.activeArc.hiddenAxis = {
                prevDesc,
                newDesc,
                isRevealed,
            };
        }

        return next;
    }

    static resolveChainHiddenAxis(state: PlayerState, isCorrect: boolean): PlayerState {
        if (!this.isChainArc(state)) {
            return state;
        }

        const next = safeDeepClone(state);

        if (next.activeArc?.hiddenAxis) {
            next.activeArc.hiddenAxis.isRevealed = isCorrect;
        }

        return next;
    }

    static concludeChainArc(state: PlayerState, summary: string): PlayerState {
        if (!this.isChainArc(state)) {
            return state;
        }

        const next = safeDeepClone(state);

        if (!next.activeArc) {
            return next;
        }

        const arc = next.activeArc;
        arc.status = 'concluded';

        const endTime = {
            zone: { ...next.currentZoneTime },
            tick: safeNumber(next.currentGameRound.absoluteTick),
        };

        const archived: ArchivedStoryArc = {
            ...arc,
            endTime,
            summary: summary || '未提供叙事链总结。',
        };

        const archivedArcs: ArchivedStoryArc[] = next.archivedArcs ?? [];
        archivedArcs.push(archived);
        next.archivedArcs = archivedArcs;

        if (arc.hiddenAxis.isRevealed) {
            const theme = arc.config.theme.id;
            const motif = arc.config.motif?.id ?? '';
            const mainAxis = arc.config.mainAxis?.id ?? '';

            const hiddenAxes: HiddenAxisRecord[] = next.archivedHiddenAxis ?? [];

            const exists = hiddenAxes.some(
                a => a.theme === theme && a.motif === motif && a.mainAxis === mainAxis
            );

            if (!exists) {
                hiddenAxes.push({
                    theme,
                    motif,
                    mainAxis,
                    desc: arc.hiddenAxis.newDesc,
                });
            }

            next.archivedHiddenAxis = hiddenAxes;
        }

        next.activeArc = undefined;

        return next;
    }

    static shouldChainArcEnd(state: PlayerState): boolean {
        const snap = buildSnapshot(state);

        if (
            !snap.activeArc ||
            snap.activeArc.config.mode.id !== 'chain' ||
            snap.activeArc.status !== 'ongoing'
        ) {
            return false;
        }

        const pacing = snap.activeArc.config.pacing.id;
        const progress = calcChainProgress(snap, pacing);
        const tension = calcChainTension(snap, pacing);

        return progress >= 1000 || (progress >= 900 && tension >= 850);
    }

    static getChainNarrativeHealth(state: PlayerState): number {
        if (!this.isChainArc(state)) {
            return 0;
        }

        const snap = buildSnapshot(state);

        const plotBalance = Math.max(0, 200 - Math.abs(snap.openPlots.length - 2.5) * 60);

        const stability =
            ((snap.hpRatio + snap.sanityRatio + (1 - snap.fatigueLevel)) / 3) * 200;

        const progressHealth = snap.arcProgress > 0 && snap.arcProgress < 1000 ? 100 : 0;

        return Math.round(clamp(500 + plotBalance + stability + progressHealth, 0, 1000));
    }

    private static defaultChainAnalysis(): ChainNarrative['analysis'] {
        return {
            params: {
                progress: {
                    macro: 'setup',
                    micro: 0,
                },
                tension: 0,
                shouldTriggerEnding: false,
                activePlotPoints: [[], []],
            },
            output: {
                ppToGenerate: {
                    m: 0,
                    s: 0,
                },
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
 * - 状态推演：降维提取 `PlayerState` 的碎片化变量，收敛为确定的生理演化趋势（StateTrend）与边界触发器（Triggers）。
 * - 指令合成：基于推演矩阵，严格输出供大模型（LLM）消费的控制面指令（Directives），强制锚定节点渲染的文本基调与感官压迫感。
 *
 * @边界 仅接管微观节点的动态氛围映射，绝对隔离于宏观剧本流程之外。
 */
export class DynamicNarrativeService {
    /**
     * 将运行时碎片化状态静态计算，推断状态走向与底层触发器。
     */
    static analyzeDynamicState(state: PlayerState): DyNarrative {
        const snap = buildSnapshot(state);

        const stateTrend: Array<[DynamicVitalType, StateTrend]> = [
            ['hp', resolveStateTrend(snap.hpRatio)],
            ['sanity', resolveStateTrend(snap.sanityRatio)],
            ['stamina', resolveStateTrend(snap.staminaRatio)],
            ['vigor', resolveStateTrend(snap.vigorRatio)],
        ];

        const currentVital: Vital = {
            maxHp: Math.max(1, safeNumber(state.dynamic.maxHp, 100)),
            maxSanity: Math.max(1, safeNumber(state.dynamic.maxSanity, 100)),
            maxStamina: Math.max(1, safeNumber(state.dynamic.maxStamina, 100)),
            maxVigor: Math.max(1, safeNumber(state.dynamic.maxVigor, 100)),
        };

        const vitalRecord: PlayerState['vitalRecord'] = {
            prevVital: {
                prevTick: safeNumber(state.vitalRecord?.prevVital?.prevTick, snap.absoluteTick),
                prevVital: state.vitalRecord?.prevVital?.prevVital ?? currentVital,
            },
            currentVital: {
                currentTick: snap.absoluteTick,
                currentVital,
            },
        };

        const armors = state.dynamic.equipment?.armors ?? [];

        return {
            emotionalTone: determineTone(snap),
            vitalRecord,
            stateTrend,
            triggers: {
                isNearDeath: snap.hpRatio <= 0.2,
                isExhausted: snap.fatigueLevel >= 0.8,
                isWeaponless: snap.isWeaponBroken,
                isArmorless: armors.every(a => !a || safeNumber(a.currentUses) <= 0),
                hasCompanionNearDeath: snap.aliveCompanions.some(
                    c => ratio(c.dynamic.hp, getMaxHpForCompanion(c)) <= 0.2
                ),
                isNeuralCollapsing: snap.neuralStress >= 0.8,
            },
        };
    }

    static generateDyDirectives(state: PlayerState): string {
        const funcContext = this.analyzeDynamicState(state);
        const directives: string[] = [];

        const isChain = state.activeArc?.config.mode.id === 'chain';

        if (state.activeArc?.status === 'suspended') {
            return '【状态：修整】队伍已撤回安全区。聚焦内心反思与物资整理，避免直接冲突。';
        }

        // 情绪基调锚定。
        directives.push(`【基调】${TONE_MAP[funcContext.emotionalTone]}`);

        // 链式模式下宏观阶段交由 ChainNarrativeService 主控，动态叙事只保留微观状态指令。
        if (!isChain) {
            const analysis = ChainNarrativeService.analyzeChainNarrative(state);
            directives.push(`【叙事阶段】${PHASE_MAP[analysis.params.progress.macro]}`);
        }

        // 躯干与底层生理异常反馈。
        if (funcContext.triggers.isNearDeath) {
            directives.push('【躯体：濒死】强化生理剧痛描写：血腥味、模糊视线、撕裂呼吸。');
        }

        if (funcContext.triggers.isExhausted) {
            directives.push('【躯体：极度力竭】强调重力失常感、灌铅四肢、跨越障碍的巨大代价。');
        }

        if (funcContext.triggers.isNeuralCollapsing) {
            directives.push(
                `【机制：神经链接受损】完整度${safeNumber(state.neuralLink.integrity)}%，混入赛博失常元素。`
            );
        }

        // 装备劣势压迫。
        if (funcContext.triggers.isWeaponless) {
            directives.push('【装备：手无寸铁】强调生理脆弱与被猎杀的恐慌，只能狼狈规避。');
        }

        if (funcContext.triggers.isArmorless) {
            directives.push('【装备：无防御】感知对环境极其敏感，任何微小刮擦都可能致命。');
        }

        // 实体社交矩阵劣化。
        if (funcContext.triggers.hasCompanionNearDeath) {
            directives.push(
                '【团队：血肉拖累】同伴濒死，强调其痛苦、呼吸粗重与彻底沦为负资产的现实。'
            );
        }

        // 暗线隐秘下发。
        const motifId = state.activeArc?.config.motif?.id;
        if (state.activeArc?.hiddenAxis && !state.activeArc.hiddenAxis.isRevealed && motifId) {
            directives.push(`【暗线提示】隐晦埋下与"${motifId}"相关的象征线索。`);
        }

        // 融合状态层：基于实际数值生成具象叙事素材，供 LLM 参考意象。
        const maxHp = Math.max(1, safeNumber(state.dynamic.maxHp, 100));
        const maxSan = Math.max(1, safeNumber(state.dynamic.maxSanity, 100));
        const maxStm = Math.max(1, safeNumber(state.dynamic.maxStamina, 100));
        const maxVgr = Math.max(1, safeNumber(state.dynamic.maxVigor, 100));

        const equipmentItems: Array<{
            slot: 'weapon' | 'armor' | 'accessory';
            name: string;
            durabilityPercent: number;
        }> = [];

        const weapons = state.dynamic.equipment?.weapons ?? [];
        for (const w of weapons) {
            if (!w) continue;
            equipmentItems.push({
                slot: 'weapon',
                name: w.name,
                durabilityPercent: toDurabilityPercent(w.currentUses, w.maxUses),
            });
        }

        const armors = state.dynamic.equipment?.armors ?? [];
        for (const a of armors) {
            if (!a) continue;
            equipmentItems.push({
                slot: 'armor',
                name: a.name,
                durabilityPercent: toDurabilityPercent(a.currentUses, a.maxUses),
            });
        }

        const companionStates = (state.companions ?? [])
            .filter(c => safeNumber(c.dynamic.hp) > 0)
            .map(c => ({
                name: c.static.name,
                hpPercent: ratio(c.dynamic.hp, getMaxHpForCompanion(c)) * 100,
                sanityPercent: ratio(c.dynamic.sanity, getMaxSanityForCompanion(c)) * 100,
                trust: safeNumber(c.dynamic.trust, 50),
            }));

        const stateLayer = this.buildDynamicNarrativeStates(
            (safeNumber(state.dynamic.hp) / maxHp) * 100,
            (safeNumber(state.dynamic.sanity) / maxSan) * 100,
            (safeNumber(state.dynamic.stamina) / maxStm) * 100,
            (safeNumber(state.dynamic.vigor) / maxVgr) * 100,
            equipmentItems.length > 0 ? equipmentItems : undefined,
            {
                battery: safeNumber(state.neuralLink.battery),
                integrity: safeNumber(state.neuralLink.integrity),
                noiseLevel: safeNumber(state.neuralLink.noiseLevel),
            },
            companionStates.length > 0 ? companionStates : undefined
        );

        if (stateLayer) {
            directives.push(`\n【状态层】\n${stateLayer}`);
        }

        return directives.join(' ');
    }

    /**
     * 构造可直接传给 LLM / 渲染层的动态叙事上下文。
     */
    static buildDyGenerationContext(state: PlayerState): {
        location: PlayerState['location'];
        directives: string;
    } {
        return {
            location: state.location,
            directives: this.generateDyDirectives(state),
        };
    }

    // ========================================================================
    // 状态描述 (State Description)
    // ========================================================================

    /**
     * 构建动态叙事状态层（供玩家及全局旁白注入）
     */
    static buildDynamicNarrativeStates(
        hpPercent: number,
        sanityPercent: number,
        staminaPercent: number,
        vigorPercent: number,
        equipment?: Array<{
            slot: 'weapon' | 'armor' | 'accessory';
            name: string;
            durabilityPercent: number;
        }>,
        neuralLink?: { battery: number; integrity: number; noiseLevel: number },
        companions?: Array<{ name: string; hpPercent: number; sanityPercent: number; trust: number }>
    ): string {
        const layers: Array<string | false | undefined> = [
            HP_STATE_CONFIG[getSeverity(hpPercent, HP_STATE_CONFIG)].narrative(hpPercent),
            SANITY_STATE_CONFIG[getSeverity(sanityPercent, SANITY_STATE_CONFIG)].narrative(
                sanityPercent
            ),
            STAMINA_STATE_CONFIG[getSeverity(staminaPercent, STAMINA_STATE_CONFIG)].narrative(
                staminaPercent
            ),
            VIGOR_STATE_CONFIG[getSeverity(vigorPercent, VIGOR_STATE_CONFIG)].narrative(
                vigorPercent
            ),

            neuralLink &&
            neuralLink.integrity < NEURAL_LINK_CONFIG.glitch.threshold &&
            NEURAL_LINK_CONFIG.glitch.narrative(neuralLink.integrity),

            neuralLink &&
            neuralLink.noiseLevel > NEURAL_LINK_CONFIG.noise.threshold &&
            NEURAL_LINK_CONFIG.noise.narrative(neuralLink.noiseLevel),

            neuralLink &&
            neuralLink.battery < NEURAL_LINK_CONFIG.lowBattery.threshold &&
            NEURAL_LINK_CONFIG.lowBattery.narrative(neuralLink.battery),

            sanityPercent < 30 &&
            vigorPercent < 30 &&
            `【认知湮灭】理智与精力双重崩塌。现实已不再是逻辑的产物，几何结构呈现令人作呕的非欧形态。`,

            sanityPercent < 30 &&
            vigorPercent > 70 &&
            `【躁狂性多疑】精神高度紧绷，感官异常敏锐。每一个阴影都在试图执行刺杀协议。`,

            staminaPercent < 20 &&
            hpPercent < 40 &&
            `【肉体极限】灵魂正在被腐朽的肉体排斥。痛苦成为唯一能证明还活着的锚点。`,
        ];

        if (equipment?.length) {
            let hasWeapon = false;

            equipment.forEach(e => {
                if (e.slot === 'weapon') hasWeapon = true;

                if (e.durabilityPercent < EQUIPMENT_STATE_CONFIG.broken.threshold) {
                    layers.push(
                        EQUIPMENT_STATE_CONFIG.broken.narrative(e.name, e.durabilityPercent)
                    );
                } else if (e.durabilityPercent < EQUIPMENT_STATE_CONFIG.worn.threshold) {
                    layers.push(EQUIPMENT_STATE_CONFIG.worn.narrative(e.name, e.durabilityPercent));
                }
            });

            if (!hasWeapon) layers.push(EQUIPMENT_STATE_CONFIG.unarmed.narrative());
        } else {
            layers.push(EQUIPMENT_STATE_CONFIG.unarmed.narrative());
        }

        if (companions) {
            companions.forEach(c => {
                if (c.hpPercent < 25) {
                    layers.push(
                        `【同伴危急】${c.name}的生命体征正在衰竭(HP ${c.hpPercent.toFixed(0)}%)。鲜血和绝望的气味在蔓延。`
                    );
                } else if (c.trust < 20) {
                    layers.push(
                        `【信任崩塌】${c.name}投来的目光如同注视一具即将尸变的残骸(信任 ${c.trust.toFixed(0)}%)。防备随时可能演变为背叛。`
                    );
                }
            });
        }

        return layers.filter((layer): layer is string => Boolean(layer)).join('\n');
    }
}