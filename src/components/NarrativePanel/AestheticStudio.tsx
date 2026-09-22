/**
 * AestheticStudio.tsx
 *
 * 恐怖美学工作台。
 *
 * 玩家在此搭建自己的叙事素材体系，三张工作台互为依赖：
 * - 恐怖域：提供折射滤镜，是美学主控域与渗透域的取值来源；
 * - 恐怖元：最小恐惧素材原子，被美学的骨架 / 血肉 / 共鸣引用；
 * - 恐怖美学：由域与元调配而成的最终产物，也是叙事流程中真正被选择的对象。
 *
 * 所有写入前先经元契约校验（id 唯一性、dominance 归一、引用存在性），
 * 删除前经引用检查，保证本地库始终自洽。校验与落盘由 useGameState 承担，
 * 本组件只负责收集草稿与呈现校验结果。
 */

import React, { useMemo, useState } from 'react';

import type {
    HorrorAesthetic,
    HorrorAtom,
    HorrorDomain,
    NarrativePhase,
} from '../../meta';
import type { NarrativeMutationResult } from '../../hooks';
import { AudioService } from '../../services';

/** 显化阶段取值，与 NarrativePhase 一致。 */
const REVEAL_PHASES: NarrativePhase[] = ['setup', 'rising', 'climax', 'falling', 'resolution'];

/** 共鸣类型取值，与契约的 resonance 判别联合一致。 */
const RESONANCE_TYPES = ['symbiosis', 'polarization', 'parasitism', 'herald'] as const;
type ResonanceType = (typeof RESONANCE_TYPES)[number];

const RESONANCE_TYPE_LABEL: Record<ResonanceType, string> = {
    symbiosis: '共生融合',
    polarization: '认知拮抗',
    parasitism: '寄生重写',
    herald: '因果先兆',
};

type StudioTab = 'aesthetic' | 'atom' | 'domain';

interface AestheticStudioProps {
    /** 预设 + 自建的合并视图。 */
    domains: HorrorDomain[];
    atoms: HorrorAtom[];
    aesthetics: HorrorAesthetic[];
    /** 仅自建内容，用于判定条目是否可删除。 */
    customDomains: HorrorDomain[];
    customAtoms: HorrorAtom[];
    customAesthetics: HorrorAesthetic[];
    isSaving: boolean;
    onUpsertDomain: (draft: HorrorDomain, isNew: boolean) => Promise<NarrativeMutationResult>;
    onUpsertAtom: (draft: HorrorAtom, isNew: boolean) => Promise<NarrativeMutationResult>;
    onUpsertAesthetic: (draft: HorrorAesthetic, isNew: boolean) => Promise<NarrativeMutationResult>;
    onRemoveDomain: (id: string) => Promise<NarrativeMutationResult>;
    onRemoveAtom: (id: string) => Promise<NarrativeMutationResult>;
    onRemoveAesthetic: (id: string) => Promise<NarrativeMutationResult>;
    onClose: () => void;
}

const emptyDomain = (): HorrorDomain => ({ id: '', name: '', desc: '', prompt: '' });
const emptyAtom = (): HorrorAtom => ({ id: '', name: '', desc: '', prompt: '' });
const emptyAesthetic = (primaryDomain: string): HorrorAesthetic => ({
    id: '',
    name: '',
    desc: '',
    prompt: '',
    primaryDomain,
    interferingDomains: [],
    structure: { skeleton: [], flesh: [], resonance: [] },
});

/** 单行文本输入。 */
const Field: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    mono?: boolean;
    hint?: string;
}> = ({ label, value, onChange, placeholder, mono, hint }) => (
    <label className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-widest text-slate-500 font-mono">{label}</span>
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-black/60 border border-slate-800/80 text-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/70 transition-colors ${mono ? 'font-mono' : ''}`}
        />
        {hint && <span className="text-[10px] text-slate-600 font-mono leading-relaxed">{hint}</span>}
    </label>
);

/** 多行文本输入。 */
const TextArea: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    placeholder?: string;
}> = ({ label, value, onChange, rows = 3, placeholder }) => (
    <label className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-widest text-slate-500 font-mono">{label}</span>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="w-full bg-black/60 border border-slate-800/80 text-slate-200 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-emerald-500/70 transition-colors resize-none"
        />
    </label>
);

/** 校验失败提示。 */
const IssueList: React.FC<{ issues: { field: string; message: string }[] }> = ({ issues }) => {
    if (issues.length === 0) return null;
    return (
        <div className="p-4 border border-red-900/50 bg-red-950/20 space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-red-500 font-mono">校验未通过</div>
            {issues.map((issue, index) => (
                <div key={`${issue.field}-${index}`} className="text-xs text-red-300/90 leading-relaxed">
                    <span className="font-mono text-red-500/80">[{issue.field}]</span> {issue.message}
                </div>
            ))}
        </div>
    );
};

/** 通用操作按钮。 */
const ActionButton: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    tone?: 'emerald' | 'red' | 'slate';
    disabled?: boolean;
}> = ({ onClick, children, tone = 'slate', disabled }) => {
    const tones = {
        emerald: 'border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/30',
        red: 'border-red-900/60 text-red-400 hover:bg-red-900/30',
        slate: 'border-slate-700/60 text-slate-400 hover:bg-slate-800/40',
    } as const;

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`px-5 py-2 border text-xs font-bold tracking-widest uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}
        >
            {children}
        </button>
    );
};

// =============================================================================
// 恐怖域 / 恐怖元表单
// =============================================================================

interface NarFormProps<T> {
    draft: T;
    isNew: boolean;
    issues: { field: string; message: string }[];
    isSaving: boolean;
    onChange: (draft: T) => void;
    onSubmit: () => void;
    onReset: () => void;
}

const DomainForm: React.FC<NarFormProps<HorrorDomain>> = ({
    draft, isNew, issues, isSaving, onChange, onSubmit, onReset,
}) => (
    <div className="space-y-5">
        <Field
            label="ID"
            value={draft.id}
            onChange={(id) => onChange({ ...draft, id })}
            placeholder="snake_case 或 camelCase"
            mono
            hint={isNew ? '仅字母、数字与下划线，且以字母开头；保存后不可与其他域重复。' : '编辑既有条目时 id 不可改。'}
        />
        <Field label="名称" value={draft.name} onChange={(name) => onChange({ ...draft, name })} placeholder="如：身体域" />
        <TextArea
            label="描述"
            value={draft.desc}
            onChange={(desc) => onChange({ ...draft, desc })}
            placeholder="该域侵犯的是什么？【域偏转规约】如何折射进入其中的一切？"
        />
        <TextArea
            label="提示词"
            value={draft.prompt}
            onChange={(prompt) => onChange({ ...draft, prompt })}
            rows={5}
            placeholder="[DOMAIN: XXX] ... DEFLECTION: ... FORBIDDEN: ..."
        />
        <IssueList issues={issues} />
        <div className="flex gap-3">
            <ActionButton onClick={onSubmit} tone="emerald" disabled={isSaving}>
                {isNew ? '写入本地' : '保存修改'}
            </ActionButton>
            <ActionButton onClick={onReset}>新建</ActionButton>
        </div>
    </div>
);

const AtomForm: React.FC<NarFormProps<HorrorAtom>> = ({
    draft, isNew, issues, isSaving, onChange, onSubmit, onReset,
}) => (
    <div className="space-y-5">
        <Field
            label="ID"
            value={draft.id}
            onChange={(id) => onChange({ ...draft, id })}
            placeholder="snake_case 或 camelCase"
            mono
            hint={isNew ? '仅字母、数字与下划线，且以字母开头。' : '编辑既有条目时 id 不可改。'}
        />
        <Field label="名称" value={draft.name} onChange={(name) => onChange({ ...draft, name })} placeholder="如：血肉齿轮" />
        <TextArea
            label="描述"
            value={draft.desc}
            onChange={(desc) => onChange({ ...draft, desc })}
            placeholder="一句话呈现这个恐惧素材的具体形态。"
        />
        <TextArea
            label="提示词"
            value={draft.prompt}
            onChange={(prompt) => onChange({ ...draft, prompt })}
            rows={4}
            placeholder="英文绘图 / 叙事提示词。"
        />
        <IssueList issues={issues} />
        <div className="flex gap-3">
            <ActionButton onClick={onSubmit} tone="emerald" disabled={isSaving}>
                {isNew ? '写入本地' : '保存修改'}
            </ActionButton>
            <ActionButton onClick={onReset}>新建</ActionButton>
        </div>
    </div>
);

// =============================================================================
// 恐怖美学表单
// =============================================================================

const AestheticForm: React.FC<
    NarFormProps<HorrorAesthetic> & { domains: HorrorDomain[]; atoms: HorrorAtom[] }
> = ({ draft, isNew, issues, isSaving, domains, atoms, onChange, onSubmit, onReset }) => {
    const structure = draft.structure;
    const dominanceSum = structure.skeleton.reduce((sum, entry) => sum + (entry.dominance || 0), 0);
    const dominanceOk = structure.skeleton.length > 0 && Math.abs(dominanceSum - 1) < 1e-6;

    const patchStructure = (patch: Partial<HorrorAesthetic['structure']>) =>
        onChange({ ...draft, structure: { ...structure, ...patch } });

    const toggleInterfering = (domainId: string) => {
        const current = draft.interferingDomains ?? [];
        const next = current.includes(domainId)
            ? current.filter((id) => id !== domainId)
            : [...current, domainId];
        onChange({ ...draft, interferingDomains: next });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
                <Field
                    label="ID"
                    value={draft.id}
                    onChange={(id) => onChange({ ...draft, id })}
                    placeholder="snake_case 或 camelCase"
                    mono
                    hint={isNew ? '仅字母、数字与下划线，且以字母开头。' : '编辑既有条目时 id 不可改。'}
                />
                <Field label="名称" value={draft.name} onChange={(name) => onChange({ ...draft, name })} placeholder="如：生物机械恐怖" />
            </div>

            <TextArea
                label="描述"
                value={draft.desc}
                onChange={(desc) => onChange({ ...draft, desc })}
                placeholder="这套美学在感官上是什么样的？"
            />
            <TextArea
                label="提示词"
                value={draft.prompt}
                onChange={(prompt) => onChange({ ...draft, prompt })}
                rows={5}
                placeholder="[AESTHETIC: XXX] SENSORY: ... VISUAL: ... RULE: ... SANITY TRIGGER: ... FORBIDDEN: ..."
            />

            {/* 主控域：决定美学的本体论基调 */}
            <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 font-mono">主控域 / PRIMARY DOMAIN</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {domains.map((domain) => {
                        const selected = draft.primaryDomain === domain.id;
                        return (
                            <button
                                key={domain.id}
                                onClick={() => onChange({ ...draft, primaryDomain: domain.id })}
                                className={`p-3 border text-left transition-colors ${selected ? 'border-emerald-500/80 bg-emerald-950/30 text-emerald-300' : 'border-slate-800/70 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                            >
                                <div className="text-xs font-bold">{domain.name}</div>
                                <div className="text-[10px] font-mono opacity-60 mt-1">{domain.id}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 渗透域：叠加异质折射 */}
            <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 font-mono">
                    渗透域 / INTERFERING DOMAINS <span className="text-slate-700">（可多选，不可与主控域重复）</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {domains.map((domain) => {
                        const selected = (draft.interferingDomains ?? []).includes(domain.id);
                        const isPrimary = draft.primaryDomain === domain.id;
                        return (
                            <button
                                key={domain.id}
                                onClick={() => toggleInterfering(domain.id)}
                                disabled={isPrimary}
                                className={`px-3 py-1.5 border text-[11px] font-mono transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${selected ? 'border-cyan-500/70 bg-cyan-950/30 text-cyan-300' : 'border-slate-800/70 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                            >
                                {domain.id}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 骨架：主导度之和必须为 1.0 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500 font-mono">骨架 / SKELETON</div>
                    <div className={`text-[11px] font-mono ${dominanceOk ? 'text-emerald-500' : 'text-amber-500'}`}>
                        主导度之和 {dominanceSum.toFixed(3)} / 1.000
                    </div>
                </div>
                <div className="space-y-2">
                    {structure.skeleton.map((entry, index) => (
                        <div key={index} className="flex gap-3 items-center">
                            <select
                                value={entry.atomId}
                                onChange={(e) => {
                                    const next = [...structure.skeleton];
                                    next[index] = { ...entry, atomId: e.target.value };
                                    patchStructure({ skeleton: next });
                                }}
                                className="flex-1 bg-black/60 border border-slate-800/80 text-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500/70"
                            >
                                <option value="">— 选择恐怖元 —</option>
                                {atoms.map((atom) => (
                                    <option key={atom.id} value={atom.id}>{atom.name}（{atom.id}）</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                value={entry.dominance}
                                onChange={(e) => {
                                    const next = [...structure.skeleton];
                                    next[index] = { ...entry, dominance: Number(e.target.value) };
                                    patchStructure({ skeleton: next });
                                }}
                                className="w-24 bg-black/60 border border-slate-800/80 text-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500/70"
                            />
                            <button
                                onClick={() => patchStructure({ skeleton: structure.skeleton.filter((_, i) => i !== index) })}
                                className="px-3 py-2 border border-red-900/50 text-red-500 text-xs hover:bg-red-900/30 transition-colors"
                            >
                                移除
                            </button>
                        </div>
                    ))}
                    <ActionButton
                        onClick={() => patchStructure({ skeleton: [...structure.skeleton, { atomId: '', dominance: 0 }] })}
                    >
                        添加骨架元
                    </ActionButton>
                </div>
            </div>

            {/* 血肉：显化阶段 */}
            <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 font-mono">
                    血肉 / FLESH <span className="text-slate-700">（显化阶段仅对链式叙事有效）</span>
                </div>
                <div className="space-y-2">
                    {(structure.flesh ?? []).map((entry, index) => (
                        <div key={index} className="flex gap-3 items-center">
                            <select
                                value={entry.atomId}
                                onChange={(e) => {
                                    const next = [...(structure.flesh ?? [])];
                                    next[index] = { ...entry, atomId: e.target.value };
                                    patchStructure({ flesh: next });
                                }}
                                className="flex-1 bg-black/60 border border-slate-800/80 text-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500/70"
                            >
                                <option value="">— 选择恐怖元 —</option>
                                {atoms.map((atom) => (
                                    <option key={atom.id} value={atom.id}>{atom.name}（{atom.id}）</option>
                                ))}
                            </select>
                            <select
                                value={entry.revealPhase ?? ''}
                                onChange={(e) => {
                                    const next = [...(structure.flesh ?? [])];
                                    next[index] = {
                                        ...entry,
                                        revealPhase: (e.target.value || undefined) as NarrativePhase | undefined,
                                    };
                                    patchStructure({ flesh: next });
                                }}
                                className="w-36 bg-black/60 border border-slate-800/80 text-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500/70"
                            >
                                <option value="">— 阶段 —</option>
                                {REVEAL_PHASES.map((phase) => (
                                    <option key={phase} value={phase}>{phase}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => patchStructure({ flesh: (structure.flesh ?? []).filter((_, i) => i !== index) })}
                                className="px-3 py-2 border border-red-900/50 text-red-500 text-xs hover:bg-red-900/30 transition-colors"
                            >
                                移除
                            </button>
                        </div>
                    ))}
                    <ActionButton
                        onClick={() => patchStructure({ flesh: [...(structure.flesh ?? []), { atomId: '' }] })}
                    >
                        添加血肉元
                    </ActionButton>
                </div>
            </div>

            {/* 共鸣：元与元之间的本体论作用机制 */}
            <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 font-mono">
                    共鸣 / RESONANCE <span className="text-slate-700">（多个元 id 用英文逗号分隔）</span>
                </div>
                <div className="space-y-2">
                    {(structure.resonance ?? []).map((entry, index) => {
                        const isAtomList = 'atomId' in entry;
                        const resonanceList = structure.resonance ?? [];
                        return (
                            <div key={index} className="p-3 border border-slate-800/70 bg-black/30 space-y-2">
                                <div className="flex gap-3 items-center">
                                    <select
                                        value={entry.type}
                                        onChange={(e) => {
                                            const type = e.target.value as ResonanceType;
                                            const next = [...resonanceList];
                                            // 切换形态时重建条目：两类形态的字段不兼容，不能保留旧字段。
                                            next[index] = type === 'symbiosis' || type === 'polarization'
                                                ? { atomId: [], type }
                                                : { source: [], target: [], type };
                                            patchStructure({ resonance: next });
                                        }}
                                        className="w-40 bg-black/60 border border-slate-800/80 text-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500/70"
                                    >
                                        {RESONANCE_TYPES.map((type) => (
                                            <option key={type} value={type}>{RESONANCE_TYPE_LABEL[type]}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => patchStructure({ resonance: resonanceList.filter((_, i) => i !== index) })}
                                        className="ml-auto px-3 py-2 border border-red-900/50 text-red-500 text-xs hover:bg-red-900/30 transition-colors"
                                    >
                                        移除
                                    </button>
                                </div>
                                {isAtomList ? (
                                    <input
                                        value={entry.atomId.join(', ')}
                                        onChange={(e) => {
                                            const next = [...resonanceList];
                                            next[index] = {
                                                atomId: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                                type: entry.type,
                                            };
                                            patchStructure({ resonance: next });
                                        }}
                                        placeholder="atom_a, atom_b"
                                        className="w-full bg-black/60 border border-slate-800/80 text-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500/70"
                                    />
                                ) : (
                                    <div className="flex gap-3">
                                        <input
                                            value={entry.source.join(', ')}
                                            onChange={(e) => {
                                                const next = [...resonanceList];
                                                next[index] = {
                                                    ...entry,
                                                    source: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                                };
                                                patchStructure({ resonance: next });
                                            }}
                                            placeholder="source_a, source_b"
                                            className="flex-1 bg-black/60 border border-slate-800/80 text-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500/70"
                                        />
                                        <span className="self-center text-slate-600 font-mono text-xs">→</span>
                                        <input
                                            value={entry.target.join(', ')}
                                            onChange={(e) => {
                                                const next = [...resonanceList];
                                                next[index] = {
                                                    ...entry,
                                                    target: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                                };
                                                patchStructure({ resonance: next });
                                            }}
                                            placeholder="target_a, target_b"
                                            className="flex-1 bg-black/60 border border-slate-800/80 text-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500/70"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <ActionButton
                        onClick={() => patchStructure({ resonance: [...(structure.resonance ?? []), { atomId: [], type: 'symbiosis' }] })}
                    >
                        添加共鸣
                    </ActionButton>
                </div>
            </div>

            <IssueList issues={issues} />
            <div className="flex gap-3">
                <ActionButton onClick={onSubmit} tone="emerald" disabled={isSaving}>
                    {isNew ? '写入本地' : '保存修改'}
                </ActionButton>
                <ActionButton onClick={onReset}>新建</ActionButton>
            </div>
        </div>
    );
};

// =============================================================================
// 工作台主体
// =============================================================================

const AestheticStudio: React.FC<AestheticStudioProps> = ({
    domains,
    atoms,
    aesthetics,
    customDomains,
    customAtoms,
    customAesthetics,
    isSaving,
    onUpsertDomain,
    onUpsertAtom,
    onUpsertAesthetic,
    onRemoveDomain,
    onRemoveAtom,
    onRemoveAesthetic,
    onClose,
}) => {
    const [tab, setTab] = useState<StudioTab>('aesthetic');

    const [aestheticDraft, setAestheticDraft] = useState<HorrorAesthetic>(() =>
        emptyAesthetic(domains[0]?.id ?? ''),
    );
    const [domainDraft, setDomainDraft] = useState<HorrorDomain>(emptyDomain);
    const [atomDraft, setAtomDraft] = useState<HorrorAtom>(emptyAtom);

    const [isNewAesthetic, setIsNewAesthetic] = useState(true);
    const [isNewDomain, setIsNewDomain] = useState(true);
    const [isNewAtom, setIsNewAtom] = useState(true);

    const [issues, setIssues] = useState<{ field: string; message: string }[]>([]);

    // 自定义条目的 id 集合，用于把「预设」与「自建」在列表中区分开。
    const customDomainIds = useMemo(() => new Set(customDomains.map((d) => d.id)), [customDomains]);
    const customAtomIds = useMemo(() => new Set(customAtoms.map((a) => a.id)), [customAtoms]);
    const customAestheticIds = useMemo(() => new Set(customAesthetics.map((a) => a.id)), [customAesthetics]);

    const handleResult = (result: NarrativeMutationResult) => {
        setIssues(result.issues);
        if (result.ok) {
            AudioService.playSfx('success');
        } else {
            AudioService.playSfx('error');
        }
    };

    const startNewAesthetic = () => {
        setAestheticDraft(emptyAesthetic(domains[0]?.id ?? ''));
        setIsNewAesthetic(true);
        setIssues([]);
    };

    const startNewDomain = () => {
        setDomainDraft(emptyDomain());
        setIsNewDomain(true);
        setIssues([]);
    };

    const startNewAtom = () => {
        setAtomDraft(emptyAtom());
        setIsNewAtom(true);
        setIssues([]);
    };

    /**
     * 载入列表条目到表单。
     *
     * 预设条目只读：直接编辑会与「预设库由常量维护」这一分层冲突。
     * 因此点击预设时以它为模板转入新建态（清空 id 待玩家另起新名），
     * 点击自建条目才进入真正的编辑态。
     */
    const loadAesthetic = (item: HorrorAesthetic, isCustom: boolean) => {
        setIssues([]);
        if (isCustom) {
            setAestheticDraft(item);
            setIsNewAesthetic(false);
            return;
        }
        setAestheticDraft({ ...item, id: '' });
        setIsNewAesthetic(true);
    };

    const loadDomain = (item: HorrorDomain, isCustom: boolean) => {
        setIssues([]);
        if (isCustom) {
            setDomainDraft(item);
            setIsNewDomain(false);
            return;
        }
        setDomainDraft({ ...item, id: '' });
        setIsNewDomain(true);
    };

    const loadAtom = (item: HorrorAtom, isCustom: boolean) => {
        setIssues([]);
        if (isCustom) {
            setAtomDraft(item);
            setIsNewAtom(false);
            return;
        }
        setAtomDraft({ ...item, id: '' });
        setIsNewAtom(true);
    };

    const tabs: { id: StudioTab; label: string; count: number }[] = [
        { id: 'aesthetic', label: '恐怖美学', count: aesthetics.length },
        { id: 'atom', label: '恐怖元', count: atoms.length },
        { id: 'domain', label: '恐怖域', count: domains.length },
    ];

    return (
        <div className="fixed inset-0 z-[210] bg-[#030305]/90 flex flex-col items-center justify-center backdrop-blur-xl animate-in fade-in duration-500 overflow-hidden select-none">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, #064e3b40 0%, transparent 70%)' }} />
            <div className="relative w-full h-full flex flex-col border-0 bg-emerald-950/20 shadow-2xl">
                {/* 标题栏 */}
                <div className="px-8 py-5 border-b border-emerald-900/50 bg-black/60 backdrop-blur-md flex-shrink-0 relative">
                    <div className="absolute bottom-0 left-0 h-[1px] w-1/3 bg-gradient-to-r from-white/20 to-transparent" />
                    <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full flex items-baseline gap-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-emerald-500 tracking-[0.15em] drop-shadow-[0_0_10px_currentColor]">
                            恐怖美学工作台
                        </h1>
                        <span className="text-xs text-emerald-500 opacity-70 font-mono uppercase tracking-[0.2em]">
                            AESTHETIC_STUDIO · 自建内容保存在本地，跨存档可用
                        </span>
                        <button
                            onClick={() => { AudioService.playSfx('ui_click'); onClose(); }}
                            className="ml-auto self-center text-emerald-700 hover:text-emerald-400 transition-colors p-2"
                            aria-label="关闭工作台"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 页签 */}
                <div className="border-b border-emerald-900/30 bg-black/40 flex-shrink-0">
                    <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full flex">
                        {tabs.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setTab(item.id); setIssues([]); AudioService.playSfx('ui_click'); }}
                                className={`px-8 py-4 font-mono text-xs tracking-widest uppercase transition-colors border-b-2 ${tab === item.id ? 'text-emerald-300 border-emerald-400 bg-emerald-950/20' : 'text-slate-600 border-transparent hover:text-slate-400'}`}
                            >
                                {item.label} <span className="opacity-50">[{item.count}]</span>
                            </button>
                        ))}
                        {isSaving && (
                            <div className="ml-auto self-center px-6 text-[11px] font-mono text-emerald-600 animate-pulse">
                                写入本地中...
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="max-w-7xl xl:max-w-[90rem] mx-auto w-full h-full flex">
                        {/* 列表栏 */}
                        <div className="w-80 border-r border-emerald-900/30 overflow-y-auto p-4 space-y-2 shrink-0 scrollbar-thin scrollbar-thumb-emerald-900/50">
                            <ActionButton
                                onClick={
                                    tab === 'aesthetic' ? startNewAesthetic : tab === 'atom' ? startNewAtom : startNewDomain
                                }
                                tone="emerald"
                            >
                                + 新建
                            </ActionButton>

                            <p className="text-[10px] text-slate-600 font-mono leading-relaxed pb-1">
                                点击预设条目可将其载入表单作为模板，改 id 后另存为自建条目；预设本身只读。
                            </p>

                        {tab === 'aesthetic' &&
                            aesthetics.map((item) => {
                                const isCustom = customAestheticIds.has(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className={`group p-3 border transition-colors cursor-pointer ${aestheticDraft.id === item.id && !isNewAesthetic ? 'border-emerald-500/70 bg-emerald-950/20' : 'border-slate-800/60 hover:border-slate-600'}`}
                                        onClick={() => loadAesthetic(item, isCustom)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs text-slate-200 truncate">{item.name}</span>
                                            {isCustom ? (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!confirm(`确认删除自建美学「${item.name}」？`)) return;
                                                        handleResult(await onRemoveAesthetic(item.id));
                                                        if (aestheticDraft.id === item.id) startNewAesthetic();
                                                    }}
                                                    className="shrink-0 text-[10px] text-red-700 hover:text-red-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    删除
                                                </button>
                                            ) : (
                                                <span className="shrink-0 text-[10px] text-slate-700 font-mono">预设</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-600 mt-1 truncate">
                                            {item.id} · {item.primaryDomain}
                                        </div>
                                    </div>
                                );
                            })}

                        {tab === 'atom' &&
                            atoms.map((item) => {
                                const isCustom = customAtomIds.has(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className={`group p-3 border transition-colors cursor-pointer ${atomDraft.id === item.id && !isNewAtom ? 'border-emerald-500/70 bg-emerald-950/20' : 'border-slate-800/60 hover:border-slate-600'}`}
                                        onClick={() => loadAtom(item, isCustom)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs text-slate-200 truncate">{item.name}</span>
                                            {isCustom ? (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!confirm(`确认删除自建恐怖元「${item.name}」？`)) return;
                                                        handleResult(await onRemoveAtom(item.id));
                                                        if (atomDraft.id === item.id) startNewAtom();
                                                    }}
                                                    className="shrink-0 text-[10px] text-red-700 hover:text-red-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    删除
                                                </button>
                                            ) : (
                                                <span className="shrink-0 text-[10px] text-slate-700 font-mono">预设</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-600 mt-1 truncate">{item.id}</div>
                                    </div>
                                );
                            })}

                        {tab === 'domain' &&
                            domains.map((item) => {
                                const isCustom = customDomainIds.has(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className={`group p-3 border transition-colors cursor-pointer ${domainDraft.id === item.id && !isNewDomain ? 'border-emerald-500/70 bg-emerald-950/20' : 'border-slate-800/60 hover:border-slate-600'}`}
                                        onClick={() => loadDomain(item, isCustom)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs text-slate-200 truncate">{item.name}</span>
                                            {isCustom ? (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!confirm(`确认删除自建恐怖域「${item.name}」？`)) return;
                                                        handleResult(await onRemoveDomain(item.id));
                                                        if (domainDraft.id === item.id) startNewDomain();
                                                    }}
                                                    className="shrink-0 text-[10px] text-red-700 hover:text-red-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    删除
                                                </button>
                                            ) : (
                                                <span className="shrink-0 text-[10px] text-slate-700 font-mono">预设</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-600 mt-1 truncate">{item.id}</div>
                                    </div>
                                );
                            })}
                    </div>

                    {/* 表单栏 */}
                    <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-emerald-900/50">
                        {tab === 'aesthetic' && (
                            <AestheticForm
                                draft={aestheticDraft}
                                isNew={isNewAesthetic}
                                issues={issues}
                                isSaving={isSaving}
                                domains={domains}
                                atoms={atoms}
                                onChange={setAestheticDraft}
                                onSubmit={async () => handleResult(await onUpsertAesthetic(aestheticDraft, isNewAesthetic))}
                                onReset={startNewAesthetic}
                            />
                        )}
                        {tab === 'atom' && (
                            <AtomForm
                                draft={atomDraft}
                                isNew={isNewAtom}
                                issues={issues}
                                isSaving={isSaving}
                                onChange={setAtomDraft}
                                onSubmit={async () => handleResult(await onUpsertAtom(atomDraft, isNewAtom))}
                                onReset={startNewAtom}
                            />
                        )}
                        {tab === 'domain' && (
                            <DomainForm
                                draft={domainDraft}
                                isNew={isNewDomain}
                                issues={issues}
                                isSaving={isSaving}
                                onChange={setDomainDraft}
                                onSubmit={async () => handleResult(await onUpsertDomain(domainDraft, isNewDomain))}
                                onReset={startNewDomain}
                            />
                        )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AestheticStudio;
