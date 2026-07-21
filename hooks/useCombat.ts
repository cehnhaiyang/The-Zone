import { useState, useRef, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import {
    Entity, NpcTemplate, CardEffect,
    PlayerDynamicState, EnemyTemplate,
    CardInstance, GameState, PlayerState, LogType,
    StatusEffectType, StatusEffect, CombatVisualEvent, IntentType,
    createCardInstance, createStatusEffect, createEnemyEntity, createCombatantEntity,
    processDamageDeduction, applyCombatToPlayerDynamic, applyCombatToNpcDynamic,
    WeaponInstance, NpcDynamicState, CharacterTemplate, CombatDynamicState, CombatIntent,
} from '../meta';
import { ENEMY_TEMPLATES } from '../constants/enemy';
import { AudioService } from '../services';

const CC = {
    WEAKEN_MUL: 0.8,
    LOW_STAMINA_MELEE_MUL: 0.7,
    LOW_STAMINA_PCT: 0.3,
    LOW_VIGOR_PCT: 0.3,
    VULNERABLE_MUL: 1.5,
    DEFAULT_SCALING: 0.5,
    DRAW_COUNT: 5,
    BASE_ENERGY: 3,
    MIN_ATK: 6,
    ANIM_DELAY: 150,
} as const;

const STATUS_CAT = {
    DOT: ['bleed', 'poison', 'burn'] as const,
    DOT_N_REGEN: ['regen', 'bleed', 'poison', 'burn'] as const,
    DEBUFF_SFX: ['vulnerable', 'weaken', 'stun', 'freeze', 'bleed', 'poison', 'burn'] as const,
} as const;

/** 保留一位小数并确保非负 */
const fix1 = (v: number) => Math.max(0, parseFloat(v.toFixed(1)));

/** alliesRef[0] 永远是玩家 → targetId 恒为 'player' */
const toTargetId = (ally: { static: { id: string } }, idx: number): string =>
    idx === 0 ? 'player' : ally.static.id;

/** 仅重置护盾（每回合开始用） */
const resetShieldOnly = <T extends PlayerDynamicState | NpcDynamicState>(prev: T): T =>
    ({ ...prev, shield: 0 } as T);

/** 脱战净化：护盾 + 状态全清 */
const stripCombatState = <T extends PlayerDynamicState | NpcDynamicState>(prev: T): T =>
    ({ ...prev, shield: 0, status: [] } as T);

/** Fisher-Yates 洗牌 */
const shuffleArray = (cards: CardInstance[], silent = false): CardInstance[] => {
    const a = [...cards];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    if (!silent) AudioService.playSfx('card_shuffle');
    return a;
};

/** 规范命中判定：hitRatio = hitPower / dodgePower，≥1 必定命中，否则 hitRatio 为命中概率 */
const isDodged = (dodgePower: number, hitPower: number) => {
    const hitRatio = hitPower / dodgePower;
    return hitRatio < 1 && Math.random() >= hitRatio;
};

/** 增益标签映射 */
const BUFF_LABELS: Record<string, string> = { buff_str: 'STR+', buff_agi: 'AGI+', buff_kno: 'KNO+', buff_per: 'PER+' };

// ============================================================================
// 类型与接口
// ============================================================================

type AllyCombatEntity = Entity<CharacterTemplate, CombatDynamicState>;

interface UseCombatParams {
    playerState: PlayerState;
    companions: Entity<NpcTemplate, NpcDynamicState>[];
    setPlayerState: Dispatch<SetStateAction<PlayerState>>;
    setCompanions: Dispatch<SetStateAction<Entity<NpcTemplate, NpcDynamicState>[]>>;
    setGameState: Dispatch<SetStateAction<GameState>>;
    addLog: (text: string, type: LogType) => void;
    updatePlayer: (sanityDelta: number, hpDelta: number) => void;
    updateCompanion: (npcId: string, sanityDelta: number, hpDelta: number) => void;
}

interface UseCombatReturn {
    currentEnemy: Entity<EnemyTemplate, CombatDynamicState> | null;
    setCurrentEnemy: Dispatch<SetStateAction<Entity<EnemyTemplate, CombatDynamicState> | null>>;
    combatLog: string[];
    setCombatLog: Dispatch<SetStateAction<string[]>>;
    visualEvents: CombatVisualEvent[];
    spawnEnemy: (specificEnemyData?: Partial<EnemyTemplate>, currentZoneId?: string, threatLevel?: number) => void;
    isPlayerTurn: boolean;
    isActionInProgress: boolean;
    hand: CardInstance[];
    drawPile: CardInstance[];
    discardPile: CardInstance[];
    exhaustPile: CardInstance[];
    energy: number;
    maxEnergy: number;
    handlePlayCard: (card: CardInstance, manualTargetId?: string) => Promise<void>;
    handleEndTurn: () => Promise<void>;
    discardRequired: number;
    handleManualDiscard: (card: CardInstance) => void;
}

export const useCombat = ({
    playerState, companions, setPlayerState, setCompanions,
    setGameState, addLog, updatePlayer, updateCompanion,
}: UseCombatParams): UseCombatReturn => {

    // ---- UI 状态 ----
    const [currentEnemy, setCurrentEnemy] = useState<Entity<EnemyTemplate, CombatDynamicState> | null>(null);
    const [combatLog, setCombatLog] = useState<string[]>([]);
    const [hand, setHand] = useState<CardInstance[]>([]);
    const [drawPile, setDrawPile] = useState<CardInstance[]>([]);
    const [discardPile, setDiscardPile] = useState<CardInstance[]>([]);
    const [exhaustPile, setExhaustPile] = useState<CardInstance[]>([]);
    const [energy, setEnergy] = useState<number>(CC.BASE_ENERGY);
    const [maxEnergy, setMaxEnergy] = useState<number>(CC.BASE_ENERGY);
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const [discardRequired, setDiscardRequired] = useState(0);
    const [visualEvents, setVisualEvents] = useState<CombatVisualEvent[]>([]);

    // ---- 静默引用 ----
    const maxEnergyRef = useRef<number>(CC.BASE_ENERGY);
    const alliesRef = useRef<AllyCombatEntity[]>([]);
    const enemyRef = useRef<Entity<EnemyTemplate, CombatDynamicState> | null>(null);
    const pileRefs = useRef({
        hand: [] as CardInstance[], draw: [] as CardInstance[],
        discard: [] as CardInstance[], exhaust: [] as CardInstance[],
    });
    const visualTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const actionLockRef = useRef(false);
    const visualIdCounterRef = useRef(0);
    const playerStateRef = useRef(playerState);
    const companionsDataRef = useRef(companions);

    // ---- 同步 Ref ← Props（合并四个 useEffect） ----
    useEffect(() => {
        if (!currentEnemy) {
            alliesRef.current = [
                createCombatantEntity(playerState.static, playerState.dynamic) as AllyCombatEntity,
                ...companions.map(c => createCombatantEntity(c.static, c.dynamic) as AllyCombatEntity),
            ];
        }
        playerStateRef.current = playerState;
        companionsDataRef.current = companions;
        enemyRef.current = currentEnemy;
    }, [playerState, companions, currentEnemy]);

    useEffect(() => () => visualTimersRef.current.forEach(clearTimeout), []);

    // ---- 牌库 ref/state 双写辅助 ----
    const syncPile = useCallback((key: keyof typeof pileRefs.current, value: CardInstance[]) => {
        pileRefs.current[key] = value;
        const setter = { hand: setHand, draw: setDrawPile, discard: setDiscardPile, exhaust: setExhaustPile }[key];
        setter(value);
    }, []);

    // ---- 友方索引工具 ----
    const findAllyIndex = useCallback((targetId: string): number =>
        targetId === 'player' ? 0 : alliesRef.current.findIndex(e => e.static.id === targetId), []);

    // ---- 状态收敛器 ----
    const syncAllyState = useCallback((targetId: string, dynamic: CombatDynamicState) => {
        if (targetId === 'player') {
            setPlayerState(p => ({ ...p, dynamic: applyCombatToPlayerDynamic(p.dynamic, dynamic) }));
        } else {
            setCompanions(p => p.map(c => c.static.id === targetId
                ? { ...c, dynamic: applyCombatToNpcDynamic(c.dynamic, dynamic) } : c));
        }
    }, [setPlayerState, setCompanions]);

    // ---- 日志 & 视觉 ----
    const addCombatLog = useCallback((text: string) => {
        setCombatLog(p => [...p, text]);
        addLog(text, 'combat');
    }, [addLog]);

    const addVisualEvent = useCallback((type: CombatVisualEvent['type'], value: number | string, target: string) => {
        const id = `ve_${++visualIdCounterRef.current}`;
        setVisualEvents(p => [...p, { id, type, value, target, timestamp: Date.now() }]);
        const tid = setTimeout(() => {
            setVisualEvents(p => p.filter(e => e.id !== id));
            visualTimersRef.current = visualTimersRef.current.filter(t => t !== tid);
        }, 1200);
        visualTimersRef.current.push(tid);
    }, []);

    // ---- 敌方 ref+state 双写 ----
    const commitEnemy = useCallback((enemy: Entity<EnemyTemplate, CombatDynamicState>) => {
        enemyRef.current = enemy;
        setCurrentEnemy(enemy);
    }, []);

    // ---- 牌库流转 ----
    const drawCards = useCallback((count: number) => {
        AudioService.playSfx('card_draw');
        const piles = pileRefs.current;
        let curDraw = [...piles.draw], curDiscard = [...piles.discard], didShuffle = false;
        const curHand = [...piles.hand];

        for (let i = 0; i < count; i++) {
            if (!curDraw.length) {
                if (!curDiscard.length) break;
                curDraw = shuffleArray(curDiscard);
                curDiscard = [];
                didShuffle = true;
            }
            const c = curDraw.pop();
            if (c) curHand.push(c);
        }
        if (didShuffle) addCombatLog('重洗弃牌堆。');
        syncPile('draw', curDraw);
        syncPile('hand', curHand);
        syncPile('discard', curDiscard);
    }, [addCombatLog, syncPile]);

    const initDeck = useCallback((pile: CardInstance[]) => {
        syncPile('draw', pile);
        syncPile('discard', []);
        syncPile('exhaust', []);
        syncPile('hand', []);
    }, [syncPile]);

    // ---- 实体属性解构 ----
    const getCaster = useCallback((ownerId: string) => {
        const i = findAllyIndex(ownerId);
        return i >= 0 ? alliesRef.current[i] : undefined;
    }, [findAllyIndex]);

    const getWeapons = (e: AllyCombatEntity): WeaponInstance[] =>
        e.dynamic.equipment?.weapons.filter((w): w is WeaponInstance => w !== null) || [];

    const getArmorDef = (e: AllyCombatEntity): number =>
        (e.dynamic.equipment?.armors || []).reduce((s, a) => s + (a?.defense || 0), 0);

    // ---- 战斗数值引擎 ----
    const calculateDamage = useCallback((base: number, card: CardInstance, fx: CardEffect, targetId?: string): number => {
        const caster = getCaster(card.ownerId);
        if (!caster) return 0;

        let v = base;
        const weps = getWeapons(caster);
        const meleeDmg = weps.reduce((s, w) => s + (w.meleeDamage || 0), 0);
        const rangeDmg = weps.reduce((s, w) => s + (w.rangeDamage || 0), 0);

        if (fx.type === 'melee_attack') {
            v += caster.dynamic.attackPower + meleeDmg + (caster.dynamic.status.find(s => s.type === 'buff_str')?.value || 0);
        } else if (fx.type === 'ranged_attack') {
            const hasReq = fx.requiredWeaponType ? weps.some(w => w.weaponType === fx.requiredWeaponType) : true;
            if (!hasReq) {
                addCombatLog(`${caster.static.name} 缺失挂载【${fx.requiredWeaponType}】，效能腰斩！`);
                v *= 0.5;
            } else {
                v += rangeDmg + (caster.dynamic.status.find(s => s.type === 'buff_per')?.value || 0);
            }
        }

        if (fx.type !== 'instant_attack') {
            if (caster.dynamic.status.some(s => s.type === 'weaken')) v *= CC.WEAKEN_MUL;
            if (fx.type === 'melee_attack' && caster.dynamic.stamina < caster.static.initialState.vital.maxStamina * CC.LOW_STAMINA_PCT)
                v *= CC.LOW_STAMINA_MELEE_MUL;

            // 易伤检定：优先使用传入的 targetId，若无则回退到 fx.target 定义
            let isVulnerable = false;
            if (targetId) {
                if (targetId === 'enemy' || targetId === 'all_enemies') {
                    isVulnerable = enemyRef.current?.dynamic.status.some(s => s.type === 'vulnerable') || false;
                } else {
                    const idx = findAllyIndex(targetId);
                    if (idx >= 0) isVulnerable = alliesRef.current[idx].dynamic.status.some(s => s.type === 'vulnerable');
                }
            } else {
                isVulnerable = ['enemy', 'all_enemies'].includes(fx.target) && (enemyRef.current?.dynamic.status.some(s => s.type === 'vulnerable') || false);
            }

            if (isVulnerable) v *= CC.VULNERABLE_MUL;
        }

        v *= 1 + (caster.dynamic.combatBonus ?? 0) / 100;
        return fix1(v);
    }, [getCaster, addCombatLog, findAllyIndex]);

    const calculateBlock = useCallback((base: number, card: CardInstance, fx: CardEffect): number => {
        const caster = getCaster(card.ownerId);
        if (!caster) return base;
        let v = base;
        if (fx.scaling?.attribute)
            v += (caster.static.initialState.attribute[fx.scaling.attribute] || 0) * (fx.scaling.factor || CC.DEFAULT_SCALING);
        v += caster.dynamic.status.find(s => s.type === 'buff_agi')?.value || 0;
        return parseFloat(v.toFixed(1));
    }, [getCaster]);

    const checkHit = useCallback((card: CardInstance): boolean => {
        const caster = getCaster(card.ownerId);
        if (!caster || !enemyRef.current) return true;
        let hit = caster.dynamic.hitPower;
        if (caster.dynamic.vigor < caster.static.initialState.vital.maxVigor * CC.LOW_VIGOR_PCT)
            hit = Math.max(1, hit * 0.5);
        return !isDodged(enemyRef.current.dynamic.dodgePower, hit);
    }, [getCaster]);

    // ---- 伤害结算 ----
    const dealDamageToEnemy = useCallback((raw: number): number => {
        if (!enemyRef.current) return 0;
        const e = { ...enemyRef.current, dynamic: { ...enemyRef.current.dynamic } };
        const { newShield, actualDmg } = processDamageDeduction(e.dynamic.shield, raw);
        e.dynamic.shield = newShield;
        if (actualDmg > 0) e.dynamic.hp = fix1(e.dynamic.hp - actualDmg);
        commitEnemy(e);
        return actualDmg;
    }, [commitEnemy]);

    const dealDamageToAlly = useCallback((targetId: string, raw: number): number => {
        const i = findAllyIndex(targetId);
        const t = i >= 0 ? alliesRef.current[i] : undefined;
        if (!t) return 0;
        const mitigated = Math.max(0, raw - getArmorDef(t));
        const { newShield, actualDmg } = processDamageDeduction(t.dynamic.shield, mitigated);
        const dyn: CombatDynamicState = { ...t.dynamic, shield: newShield, hp: fix1(t.dynamic.hp - actualDmg) };
        alliesRef.current[i] = { ...t, dynamic: dyn };
        syncAllyState(targetId, dyn);
        if (actualDmg > 0) targetId === 'player' ? updatePlayer(0, -actualDmg) : updateCompanion(targetId, 0, -actualDmg);
        return actualDmg;
    }, [findAllyIndex, syncAllyState, updatePlayer, updateCompanion]);

    // ---- 状态效果挂载 ----
    const applyStatusEffect = useCallback((targetId: string, type: StatusEffectType, value: number, duration = 2, srcId = 'system', srcName = 'System') => {
        const newFx = createStatusEffect(type, duration, value, { entityId: srcId, entityName: srcName });
        const merge = (list: StatusEffect[]): StatusEffect[] => {
            const next = [...list];
            const idx = next.findIndex(s => s.type === type);
            if (idx >= 0) {
                const ex = next[idx];
                if (['weaken', 'vulnerable'].includes(type)) {
                    // 回合数（层数）累加
                    next[idx] = { ...ex, value: ex.value + value, duration: Math.max(ex.duration, ex.value + value) };
                } else if (STATUS_CAT.DOT_N_REGEN.includes(type as any)) {
                    // DOT/回血类：强度累加，持续时间取大值
                    next[idx] = { ...ex, value: ex.value + value, duration: Math.max(ex.duration, duration) };
                } else {
                    // 属性增强等：取最高值和最长持续时间
                    next[idx] = { ...ex, value: Math.max(ex.value, value), duration: Math.max(ex.duration, duration) };
                }
            } else next.push(newFx);
            return next;
        };

        if (targetId === 'enemy' || targetId === 'all_enemies') {
            if (!enemyRef.current) return;
            const e = { ...enemyRef.current, dynamic: { ...enemyRef.current.dynamic, status: merge(enemyRef.current.dynamic.status) } };
            commitEnemy(e);
        } else {
            const i = findAllyIndex(targetId);
            const t = i >= 0 ? alliesRef.current[i] : undefined;
            if (t) {
                const dyn: CombatDynamicState = { ...t.dynamic, status: merge(t.dynamic.status) };
                alliesRef.current[i] = { ...t, dynamic: dyn };
                syncAllyState(targetId, dyn);
            }
        }
        addVisualEvent('status', BUFF_LABELS[type] || type.toUpperCase(), targetId);
        AudioService.playSfx(STATUS_CAT.DEBUFF_SFX.includes(type as any) ? 'combat_debuff' : 'combat_buff');
    }, [syncAllyState, addVisualEvent, findAllyIndex, commitEnemy]);

    // ---- 状态 Tick ----
    const processStatus = useCallback((entity: AllyCombatEntity | Entity<EnemyTemplate, CombatDynamicState>, tickType: 'start' | 'end') => {
        let dmg = 0, heal = 0, stunned = false, frozen = false;

        const ticked = entity.dynamic.status.map(s => {
            const n = { ...s };
            if (tickType === 'start') {
                // 回合开始结算 DOT/Regen 和控制状态
                if (STATUS_CAT.DOT.includes(s.type as any)) dmg += s.value;
                if (s.type === 'regen') heal += s.value;
                if (s.type === 'stun') stunned = true;
                if (s.type === 'freeze') frozen = true;
            } else {
                // 回合结束结算持续时间/回合数扣除
                if (['weaken', 'vulnerable'].includes(s.type)) {
                    n.value -= 1;
                } else {
                    n.duration -= 1;
                }
            }
            return n;
        });

        const nextStatus = ticked.filter(s => (['weaken', 'vulnerable'].includes(s.type) ? s.value > 0 : s.duration > 0));
        const updatedDynamic: CombatDynamicState = { ...entity.dynamic, status: nextStatus };

        return { dmg, heal, stunned, frozen, updatedDynamic };
    }, []);

    // ---- 敌方意图生成 ----
    const generateNextIntent = useCallback((enemy: Entity<EnemyTemplate, CombatDynamicState>, allies: AllyCombatEntity[]): CombatIntent => {
        const dist = enemy.static.intentDistribution!;
        const total = Object.values(dist).reduce((a, b) => a + b, 0);
        let roll = Math.random() * total, type: IntentType = 'attack';
        for (const [t, w] of Object.entries(dist)) { roll -= w; if (roll <= 0) { type = t as IntentType; break; } }

        const bonus = 1 + (enemy.dynamic.combatBonus ?? 0) / 100;
        let desc = '';
        if (type === 'attack') desc = `${fix1((enemy.dynamic.attackPower ?? CC.MIN_ATK) * bonus)}`;
        else if (type === 'buff' || type === 'debuff') desc = `${fix1((type === 'buff' ? 3 : 2) * bonus)}`;

        const alive = allies.filter(e => e.dynamic.hp > 0);
        const target = alive.length > 0 ? alive[Math.floor(Math.random() * alive.length)] : allies[0];
        const tIdx = allies.findIndex(a => a.static.id === target.static.id);
        const targetId = type === 'buff' ? 'enemy' : toTargetId(target, tIdx);

        return { type, desc, targetId };
    }, []);

    // ---- 友方死亡检定 ----
    const checkAllyDeath = useCallback((): boolean => {
        for (let i = 0; i < alliesRef.current.length; i++) {
            const a = alliesRef.current[i];
            if (a.dynamic.hp <= 0) {
                const tid = toTargetId(a, i);
                if (i === 0) {
                    addCombatLog(`[系统警报] 操作者生命体征归零，指令链断裂。`);
                    addVisualEvent('status', 'FATAL', 'player');
                    AudioService.playSfx('scare');
                    setGameState(GameState.GAME_OVER);
                    return true;
                }
                addCombatLog(`[序列中断] ${a.static.name} 生命体征归零，强制脱队。`);
                addVisualEvent('status', 'FATAL', tid);
            }
        }
        return false;
    }, [addCombatLog, addVisualEvent, setGameState]);

    // ---- 击杀收尾 ----
    const handleEnemyDeath = useCallback(async (dead: Entity<EnemyTemplate, CombatDynamicState>) => {
        addCombatLog(`[实体抹除]: ${dead.static.name}`);
        const xp = 20 + Math.floor(Object.values(dead.static.initialState.attribute).reduce((a, b) => a + (b || 0), 0) * 2);
        addCombatLog(`提取数据：+${xp} XP`);
        addVisualEvent('status', `+${xp} XP`, 'player');

        setPlayerState(p => ({
            ...p,
            currentGameRound: { ...p.currentGameRound, combatTurn: 0 },
            dynamic: { ...stripCombatState(p.dynamic), xp: p.dynamic.xp + xp },
        }));
        setCompanions(p => p.map(c => ({ ...c, dynamic: stripCombatState(c.dynamic) })));
        AudioService.playSfx('success');
        AudioService.setTheme('exploration');
        setCurrentEnemy(null);
        setGameState(GameState.PLAYING);
    }, [setPlayerState, setCompanions, addCombatLog, addVisualEvent, setGameState]);

    // ---- 敌方回合 ----
    const executeEnemyTurn = useCallback(async () => {
        if (!enemyRef.current) return;
        const enemy = { ...enemyRef.current, dynamic: { ...enemyRef.current.dynamic } };
        enemy.dynamic.shield = 0;

        // ① 友方回合开始 Tick (DOT/Regen)
        for (let i = 0; i < alliesRef.current.length; i++) {
            const ally = alliesRef.current[i];
            const res = processStatus(ally, 'start');
            const dyn: CombatDynamicState = { ...res.updatedDynamic, hp: fix1(ally.dynamic.hp + res.heal - res.dmg) };
            alliesRef.current[i] = { ...ally, dynamic: dyn };
            syncAllyState(toTargetId(ally, i), dyn);
            if (res.dmg > 0 || res.heal > 0)
                i === 0 ? updatePlayer(0, res.heal - res.dmg) : updateCompanion(ally.static.id, 0, res.heal - res.dmg);
        }
        if (checkAllyDeath()) return;

        // ② 敌方回合开始 Tick (DOT/Regen + 控制检查)
        let sr = processStatus(enemy, 'start');
        if (sr.dmg > 0) {
            const { newShield, actualDmg } = processDamageDeduction(enemy.dynamic.shield, sr.dmg);
            enemy.dynamic.shield = newShield;
            enemy.dynamic.hp = fix1(enemy.dynamic.hp - actualDmg);
            if (actualDmg > 0) addVisualEvent('damage', actualDmg, 'enemy');
        }
        if (sr.heal > 0) {
            const maxHp = (enemy.static.initialState as { vital?: { maxHp?: number } }).vital?.maxHp ?? Infinity;
            enemy.dynamic.hp = Math.min(maxHp, enemy.dynamic.hp + sr.heal);
            addVisualEvent('heal', sr.heal, 'enemy');
        }

        // 更新敌方中间状态（用于后续行动判断）
        commitEnemy({ ...enemy, dynamic: sr.updatedDynamic });

        if (enemy.dynamic.hp <= 0) { await handleEnemyDeath(enemy); return; }

        // ③ 敌方行动
        if (!sr.stunned && !sr.frozen) {
            const intent = enemy.dynamic.nextIntent ?? generateNextIntent(enemy, alliesRef.current);
            const bonus = 1 + (enemy.dynamic.combatBonus ?? 0) / 100;
            let targetId = intent.targetId || 'player';
            const alive = targetId === 'enemy' || alliesRef.current.some((a, idx) => toTargetId(a, idx) === targetId && a.dynamic.hp > 0);
            if (!alive) {
                const liveAllies = alliesRef.current.filter(e => e.dynamic.hp > 0);
                const idx = liveAllies.length > 0 ? alliesRef.current.indexOf(liveAllies[Math.floor(Math.random() * liveAllies.length)]) : 0;
                targetId = toTargetId(alliesRef.current[idx], idx);
            }

            if (intent.type === 'attack') {
                let dmg = (enemy.dynamic.attackPower ?? CC.MIN_ATK);
                // 力量加成
                dmg += (enemy.dynamic.status.find(s => s.type === 'buff_str')?.value || 0);
                // 虚弱减益
                if (enemy.dynamic.status.some(s => s.type === 'weaken')) dmg *= CC.WEAKEN_MUL;
                // 全局加成
                dmg *= bonus;

                const di = findAllyIndex(targetId);
                const def = di >= 0 ? alliesRef.current[di] : undefined;
                if (def) {
                    // 易伤检定
                    if (def.dynamic.status.some(s => s.type === 'vulnerable')) dmg *= CC.VULNERABLE_MUL;
                    const finalDmg = fix1(dmg);

                    if (isDodged(def.dynamic.dodgePower, enemy.dynamic.hitPower)) {
                        addVisualEvent('miss', '闪避', targetId);
                        addCombatLog(`[未命中] 敌对实体计算落空。`);
                        AudioService.playSfx('combat_miss');
                    } else {
                        const final = dealDamageToAlly(targetId, finalDmg);
                        addVisualEvent('damage', final, targetId);
                        addCombatLog(`[重击] 目标 ${targetId} 承受 ${final} 点穿透伤害。`);
                        AudioService.playSfx('combat_dmg');
                        if (checkAllyDeath()) return;
                    }
                }
            } else if (intent.type === 'debuff' || intent.type === 'buff') {
                const fxType = intent.type === 'debuff'
                    ? (Math.random() > 0.5 ? 'weaken' : 'vulnerable')
                    : (Math.random() > 0.5 ? 'regen' : 'buff_str');
                const val = fix1((intent.type === 'buff' ? 3 : 2) * bonus);
                applyStatusEffect(intent.type === 'buff' ? 'enemy' : targetId, fxType as StatusEffectType, val, intent.type === 'buff' ? 3 : 2, 'enemy', enemy.static.name);
                addCombatLog(`[异常散播] 检测到环境向量变异：${fxType}`);
            }
        }

        enemy.dynamic.nextIntent = generateNextIntent(enemy, alliesRef.current);

        // ④ 敌方回合结束 Tick (持续时间扣除)
        const srEnd = processStatus({ ...enemy, dynamic: enemyRef.current!.dynamic }, 'end');
        commitEnemy({ ...enemy, dynamic: srEnd.updatedDynamic });
    }, [processStatus, dealDamageToAlly, applyStatusEffect, checkAllyDeath, updatePlayer, updateCompanion, addCombatLog, addVisualEvent, generateNextIntent, handleEnemyDeath, syncAllyState, findAllyIndex, commitEnemy]);

    // ---- 卡牌目标解析 ----
    const extractCardTargets = useCallback((fx: CardEffect, ownerId: string, manualId: string): string[] => {
        const t = fx.target;
        if (t === 'self') return [ownerId];
        if (t === 'enemy' || t === 'all_enemies') return ['enemy'];
        if (t === 'single_ally' || t === 'single_teammate') return [manualId];
        if (t === 'all_teammates') return alliesRef.current.map((e, i) => toTargetId(e, i)).filter(id => id !== ownerId);
        if (t === 'all_allies') return alliesRef.current.map((e, i) => toTargetId(e, i));
        if (t !== 'none') console.warn(`[extractCardTargets] 未识别 target: ${t}`);
        return [];
    }, []);

    // ---- 卡牌效果执行 ----
    const executeCardEffect = useCallback(async (fx: CardEffect, card: CardInstance, manualId: string): Promise<boolean> => {
        const wait = () => new Promise(r => setTimeout(r, CC.ANIM_DELAY));

        if (fx.type === 'draw') { drawCards(fx.value); await wait(); return false; }
        if (fx.type === 'discard_hand') { setDiscardRequired(p => p + (fx.value || 1)); await wait(); return false; }
        if (fx.type === 'energy') { setEnergy(p => Math.min(9, p + fx.value)); await wait(); return false; }

        const targets = extractCardTargets(fx, card.ownerId, manualId);
        const isAttack = (t: string) => ['melee_attack', 'ranged_attack', 'instant_attack'].includes(t);

        for (const tid of targets) {
            if (isAttack(fx.type)) {
                if (!checkHit(card)) { addVisualEvent('miss', '未命中', tid); AudioService.playSfx('combat_miss'); continue; }
                const dmg = calculateDamage(fx.value || 0, card, fx, tid);
                if (!dmg) continue;
                if (tid === 'enemy' || tid === 'all_enemies') {
                    const actual = dealDamageToEnemy(dmg);
                    actual > 0
                        ? (addVisualEvent('damage', actual, 'enemy'), addCombatLog(`有效倾泻 ${actual} 点动能。`), AudioService.playSfx('combat_hit'))
                        : (addCombatLog('火力被立场偏转。'), AudioService.playSfx('combat_block'));
                    if (enemyRef.current && enemyRef.current.dynamic.hp <= 0) { await handleEnemyDeath(enemyRef.current); return true; }
                } else {
                    const actual = dealDamageToAlly(tid, dmg);
                    if (actual > 0) { addVisualEvent('damage', actual, tid); addCombatLog(`误伤协议触发，${tid} 承受 ${actual} 点冲击。`); }
                }
            } else if (fx.type === 'block') {
                const blk = calculateBlock(fx.value, card, fx);
                const i = findAllyIndex(tid);
                const t = i >= 0 ? alliesRef.current[i] : undefined;
                if (t) {
                    const dyn: CombatDynamicState = { ...t.dynamic, shield: t.dynamic.shield + blk };
                    alliesRef.current[i] = { ...t, dynamic: dyn };
                    syncAllyState(tid, dyn);
                    addVisualEvent('block', `+${blk}`, tid);
                    addCombatLog(`[立场构筑] ${tid} 偏转矩阵 +${blk}`);
                    AudioService.playSfx('combat_block');
                }
            } else if (fx.type === 'heal') {
                tid === 'player' ? updatePlayer(0, fx.value) : updateCompanion(tid, 0, fx.value);
                addVisualEvent('heal', fx.value, tid);
                addCombatLog(`[组织重构] ${tid} 修复 ${fx.value} 点。`);
                AudioService.playSfx('combat_heal');
            } else {
                applyStatusEffect(tid, fx.type as StatusEffectType, fx.value || 1, fx.duration || 2, card.ownerId, card.ownerName);
                addCombatLog(`[模因注入] 目标：${tid}，负载：${fx.type}`);
            }
        }
        await wait();
        return false;
    }, [extractCardTargets, checkHit, calculateDamage, dealDamageToEnemy, dealDamageToAlly, handleEnemyDeath, addVisualEvent, addCombatLog, calculateBlock, findAllyIndex, syncAllyState, updatePlayer, updateCompanion, applyStatusEffect, drawCards]);

    // ---- 出牌 ----
    const handlePlayCard = useCallback(async (card: CardInstance, manualTargetId = 'enemy') => {
        const cost = card.cost;
        const caster = getCaster(card.ownerId);
        const isDisabled = caster?.dynamic.status.some(s => s.type === 'stun' || s.type === 'freeze');

        if (!isPlayerTurn || actionLockRef.current || !enemyRef.current || isDisabled || card.feature.includes('unplayable') || discardRequired > 0 || energy < cost) {
            if (isDisabled) addCombatLog(`[指令拦截] ${card.ownerName} 处于失能状态，无法执行指令。`);
            AudioService.playSfx('error'); return;
        }
        actionLockRef.current = true;
        setIsActionInProgress(true);

        try {
            const curHand = pileRefs.current.hand.filter(c => c.instanceId !== card.instanceId);

            if (card.feature.includes('singleUse')) {
                const filter = (d: CardInstance[]) => d.filter(c => c.instanceId !== card.instanceId);
                card.ownerId === 'player'
                    ? setPlayerState(p => ({ ...p, dynamic: { ...p.dynamic, deck: filter(p.dynamic.deck) } }))
                    : setCompanions(p => p.map(c => c.static.id === card.ownerId ? { ...c, dynamic: { ...c.dynamic, deck: filter(c.dynamic.deck) } } : c));
                addCombatLog(`[结构崩解] ${card.name} 遭到永久隔离。`);
            } else if (card.feature.includes('retain')) {
                curHand.push(card);
            } else if (card.feature.includes('exhaust')) {
                syncPile('exhaust', [...pileRefs.current.exhaust, card]);
            } else {
                syncPile('discard', [...pileRefs.current.discard, card]);
            }

            syncPile('hand', curHand);
            setEnergy(p => p - cost);
            AudioService.playSfx('card_discard');
            addVisualEvent('card_play', '', card.ownerId);
            addCombatLog(`>> 指令下达: [${card.ownerName}] 执行 ${card.name}`);

            for (const fx of card.effects) {
                if (!enemyRef.current || enemyRef.current.dynamic.hp <= 0) break;
                if (await executeCardEffect(fx, card, manualTargetId)) return;
            }
        } finally {
            actionLockRef.current = false;
            setIsActionInProgress(false);
        }
    }, [isPlayerTurn, discardRequired, energy, setPlayerState, setCompanions, addCombatLog, addVisualEvent, executeCardEffect, syncPile]);

    // ---- 回合交接 ----
    const handleEndTurn = useCallback(async () => {
        if (!isPlayerTurn || actionLockRef.current || !enemyRef.current) return;
        actionLockRef.current = true;
        setIsPlayerTurn(false);
        AudioService.playSfx('click');

        // 手牌分流
        const keep: CardInstance[] = [], disc: CardInstance[] = [], exh: CardInstance[] = [];
        for (const c of pileRefs.current.hand) {
            if (c.feature.includes('retain')) keep.push(c);
            else if (c.feature.includes('ethereal')) exh.push(c);
            else disc.push(c);
        }
        syncPile('hand', keep);
        syncPile('discard', [...pileRefs.current.discard, ...disc]);
        syncPile('exhaust', [...pileRefs.current.exhaust, ...exh]);

        // 玩家回合结束 Tick (持续时间扣除)
        for (let i = 0; i < alliesRef.current.length; i++) {
            const ally = alliesRef.current[i];
            const res = processStatus(ally, 'end');
            alliesRef.current[i] = { ...ally, dynamic: res.updatedDynamic };
            syncAllyState(toTargetId(ally, i), res.updatedDynamic);
        }

        await executeEnemyTurn();

        // 游戏状态守卫
        if (!enemyRef.current || enemyRef.current.dynamic.hp <= 0) { actionLockRef.current = false; return; }
        if (!(alliesRef.current.length > 0 && alliesRef.current[0].dynamic.hp > 0)) return;

        if (enemyRef.current.dynamic.hp > 0) {
            setEnergy(maxEnergyRef.current);
            setPlayerState(p => ({
                ...p,
                currentGameRound: { ...p.currentGameRound, combatTurn: p.currentGameRound.combatTurn + 1 },
                dynamic: resetShieldOnly(p.dynamic),
            }));
            setCompanions(p => p.map(c => ({ ...c, dynamic: resetShieldOnly(c.dynamic) })));
            alliesRef.current = alliesRef.current.map(e => ({ ...e, dynamic: { ...e.dynamic, shield: 0 } }));
            setIsPlayerTurn(true);
            drawCards(CC.DRAW_COUNT);
        }
        actionLockRef.current = false;
    }, [isPlayerTurn, executeEnemyTurn, setPlayerState, setCompanions, drawCards, syncPile]);

    // ---- 手动弃牌 ----
    const handleManualDiscard = useCallback((card: CardInstance) => {
        if (discardRequired <= 0) return;
        syncPile('hand', pileRefs.current.hand.filter(c => c.instanceId !== card.instanceId));
        syncPile('discard', [...pileRefs.current.discard, card]);
        setDiscardRequired(p => p - 1);
        AudioService.playSfx('card_discard');
    }, [discardRequired, syncPile]);

    // ---- 生成敌人 ----
    const spawnEnemy = useCallback((specificEnemyData?: Partial<EnemyTemplate>, currentZoneId?: string, threatLevel?: number) => {
        const templates = Object.values(ENEMY_TEMPLATES) as EnemyTemplate[];

        let enemyStatic: EnemyTemplate;
        if (specificEnemyData?.id) {
            const pre = templates.find(t => t.id === specificEnemyData.id);
            if (pre) {
                enemyStatic = { ...pre, ...specificEnemyData } as EnemyTemplate;
            } else if (specificEnemyData.initialState && specificEnemyData.intentDistribution && specificEnemyData.nextIntent) {
                enemyStatic = { ...specificEnemyData } as EnemyTemplate;
            } else {
                console.error('[spawnEnemy] 缺少必填字段，回退随机');
                enemyStatic = { ...templates[Math.floor(Math.random() * templates.length)] };
            }
        } else {
            let pool = currentZoneId ? templates.filter(t => t.zoneId?.includes(currentZoneId)) : templates;
            if (!pool.length || (currentZoneId && Math.random() >= 0.7)) pool = templates.filter(t => !t.zoneId);
            enemyStatic = { ...(pool[Math.floor(Math.random() * (pool.length || 1))] || templates[0]) };
        }

        const enemyEntity = createEnemyEntity(enemyStatic, threatLevel ?? 1);
        const cp = playerStateRef.current, cc = companionsDataRef.current;
        const allAllies = [
            createCombatantEntity(cp.static, cp.dynamic) as AllyCombatEntity,
            ...cc.map(c => createCombatantEntity(c.static, c.dynamic) as AllyCombatEntity),
        ];
        enemyEntity.dynamic.nextIntent = generateNextIntent(enemyEntity, allAllies);

        setCurrentEnemy(enemyEntity);
        setCombatLog([`[雷达预警] 锁定敌对生命体特征: ${enemyEntity.static.name}`, enemyEntity.static.desc]);
        setGameState(GameState.COMBAT);

        actionLockRef.current = false;
        setIsActionInProgress(false);

        setEnergy(CC.BASE_ENERGY);
        setMaxEnergy(CC.BASE_ENERGY);
        maxEnergyRef.current = CC.BASE_ENERGY;
        setIsPlayerTurn(true);
        setDiscardRequired(0);
        setVisualEvents([]);

        setPlayerState(p => ({
            ...p,
            currentGameRound: { ...p.currentGameRound, combatTurn: 1 },
            dynamic: stripCombatState(p.dynamic),
        }));
        setCompanions(p => p.map(c => ({ ...c, dynamic: stripCombatState(c.dynamic) })));

        const totalDeck = cp.dynamic.deck.map(c => ({ ...c, ownerId: 'player' }));
        cc.forEach(c => {
            if (c.dynamic.hp > 0) {
                const deck = c.dynamic.deck?.length ? c.dynamic.deck : c.static.initialState.deck?.map(t => createCardInstance(t, c.static.id, c.static.name)) ?? [];
                totalDeck.push(...deck);
                if (deck.length) addLog(`> ${c.static.name} 完成战术编队同步。`, 'info');
            }
        });

        initDeck(shuffleArray(totalDeck, true));
        queueMicrotask(() => requestAnimationFrame(() => drawCards(CC.DRAW_COUNT)));
    }, [generateNextIntent, setGameState, setPlayerState, setCompanions, addLog, initDeck, drawCards]);

    return {
        currentEnemy, setCurrentEnemy, combatLog, setCombatLog, visualEvents,
        spawnEnemy, isPlayerTurn, isActionInProgress,
        hand, drawPile, discardPile, exhaustPile,
        energy, maxEnergy, handlePlayCard, handleEndTurn,
        discardRequired, handleManualDiscard,
    };
};
