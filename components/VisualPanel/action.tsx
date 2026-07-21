import React, { useMemo } from 'react';
import { NodeTemplate, Exit } from '../../meta';
import { AudioService } from '../../services';

interface ActionProps {
    currentNodeId: string;
    currentNode: NodeTemplate | null;
    onAction: (actionType: 'move_local' | 'move_zone' | 'search' | 'interact_obj' | 'interact_npc' | 'generate_video' | 'unlock' | 'sanctuary_return', target?: string, label?: string) => void;
    isSanctuary?: boolean;
    onToggleSanctuaryUI?: () => void;
    nodes?: Record<string, NodeTemplate>;
}

/**
 * 节点关系类型 → 主题色映射
 * * 设计原则：
 * - 庇护所出口：琥珀色（安全/温暖）
 * - 跨区出口：红色（危险预警）
 * - 子节点（深入）：紫色（未知/探索）
 * - 父节点（返回）：翡翠色（安全/回退）
 * - 兄弟节点（同层横向）：天蓝色（平行/选择）
 * - 孤立节点（无层级关系）：灰色（中性/默认）
 */
interface NodeTheme {
    border: string;
    hoverBorder: string;
    bg: string;
    hoverBg: string;
    text: string;
    hoverText: string;
    glowColor: string;
    icon: string;
}

const NODE_THEMES: Record<string, NodeTheme> = {
    sanctuary: {
        border: 'border-amber-700/50',
        hoverBorder: 'hover:border-amber-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-amber-950/30',
        text: 'text-amber-500',
        hoverText: 'hover:text-amber-100',
        glowColor: 'via-amber-400/50',
        icon: '⌂ ',
    },
    zoneExit: {
        border: 'border-red-800/50',
        hoverBorder: 'hover:border-red-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-red-950/30',
        text: 'text-red-500',
        hoverText: 'hover:text-red-100',
        glowColor: 'via-red-400/50',
        icon: '⇥ ',
    },
    child: {
        border: 'border-violet-800/50',
        hoverBorder: 'hover:border-violet-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-violet-950/30',
        text: 'text-violet-400',
        hoverText: 'hover:text-violet-100',
        glowColor: 'via-violet-400/50',
        icon: '↳ ',
    },
    parent: {
        border: 'border-emerald-700/50',
        hoverBorder: 'hover:border-emerald-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-emerald-950/30',
        text: 'text-emerald-400',
        hoverText: 'hover:text-emerald-100',
        glowColor: 'via-emerald-400/50',
        icon: '↰ ',
    },
    sibling: {
        border: 'border-sky-800/50',
        hoverBorder: 'hover:border-sky-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-sky-950/30',
        text: 'text-sky-400',
        hoverText: 'hover:text-sky-100',
        glowColor: 'via-sky-400/50',
        icon: '↔ ',
    },
    isolated: {
        border: 'border-zinc-700/50',
        hoverBorder: 'hover:border-zinc-400',
        bg: 'bg-transparent',
        hoverBg: 'hover:bg-zinc-900/30',
        text: 'text-zinc-400',
        hoverText: 'hover:text-zinc-200',
        glowColor: 'via-zinc-400/30',
        icon: '',
    },
};

/**
 * 安全的按钮色彩样式字典，防止 Tailwind 生产环境树摇导致样式丢失。
 */
const COLOR_SCHEMES = {
    amber: {
        border: 'border-amber-800/60',
        hoverBorder: 'hover:border-amber-400',
        hoverBg: 'hover:bg-amber-950/30',
        text: 'text-amber-500',
        hoverText: 'group-hover:text-amber-100',
        glow: 'via-amber-400/50'
    },
    cyan: {
        border: 'border-cyan-800/60',
        hoverBorder: 'hover:border-cyan-400',
        hoverBg: 'hover:bg-cyan-950/30',
        text: 'text-cyan-500',
        hoverText: 'group-hover:text-cyan-100',
        glow: 'via-cyan-400/50'
    },
    blue: {
        border: 'border-blue-800/60',
        hoverBorder: 'hover:border-blue-400',
        hoverBg: 'hover:bg-blue-950/30',
        text: 'text-blue-500',
        hoverText: 'group-hover:text-blue-100',
        glow: 'via-blue-400/50'
    }
} as const;

type ColorSchemeKey = keyof typeof COLOR_SCHEMES;

/** 统一动作按钮 */
const ActionButton: React.FC<{
    onClick: () => void;
    colorScheme: ColorSchemeKey;
    children: React.ReactNode;
    className?: string;
}> = React.memo(({ onClick, colorScheme, children, className = '' }) => {
    const scheme = COLOR_SCHEMES[colorScheme];

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => AudioService.playSfx('hover')}
            className={`group relative overflow-hidden bg-transparent border px-5 py-2.5 text-center transition-all rounded-sm shrink-0 btn-scan-sweep
                ${scheme.border} ${scheme.hoverBg} ${scheme.hoverBorder} ${className}`}
        >
            <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${scheme.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className={`${scheme.text} font-bold text-xs tracking-wide ${scheme.hoverText} relative z-10 transition-colors duration-200 whitespace-nowrap`}>
                {children}
            </div>
        </button>
    );
});

/** 移动按钮（使用预定义主题） */
const MoveButton: React.FC<{
    theme: NodeTheme;
    label: string;
    onClick: () => void;
}> = React.memo(({ theme, label, onClick }) => (
    <button
        onClick={onClick}
        onMouseEnter={() => AudioService.playSfx('hover')}
        className={`group relative px-5 py-2.5 text-center border rounded-sm transition-all shrink-0 overflow-hidden btn-scan-sweep
            ${theme.border} ${theme.hoverBorder} ${theme.bg} ${theme.hoverBg} ${theme.text} ${theme.hoverText}`}
    >
        <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${theme.glowColor} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        <div className="font-bold text-xs tracking-wide relative z-10 whitespace-nowrap">
            {theme.icon}{label}
        </div>
    </button>
));

/**
 * 判断目标节点与当前节点的关系类型
 * 兄弟节点定义：与当前节点共享同一个父节点（即某个节点的 childrenIds 同时包含当前节点和目标节点）
 */
const getNodeRelation = (
    currentNodeId: string,
    currentNode: NodeTemplate,
    targetId?: string,
    nodes?: Record<string, NodeTemplate>
): keyof typeof NODE_THEMES => {
    if (!targetId || !nodes) return 'isolated';

    const targetNode = nodes[targetId];
    if (!targetNode) return 'isolated';

    // 子节点：当前节点的 childrenIds 包含目标
    if (currentNode.childrenIds?.includes(targetId)) return 'child';

    // 父节点：目标节点的 childrenIds 包含当前节点
    if (targetNode.childrenIds?.includes(currentNodeId)) return 'parent';

    // 兄弟节点：存在某个节点的 childrenIds 同时包含当前节点和目标节点
    for (const nodeId in nodes) {
        const node = nodes[nodeId];
        if (node.childrenIds &&
            node.childrenIds.includes(currentNodeId) &&
            node.childrenIds.includes(targetId)) {
            return 'sibling';
        }
    }

    return 'isolated';
};

/**
 * 动作面板 - 底部操作区
 * * 布局：按钮从中心向两侧自然铺开，超出屏幕宽度时提供横向滚动
 */
const Action: React.FC<ActionProps> = ({ currentNodeId, currentNode, onAction, isSanctuary, onToggleSanctuaryUI, nodes }) => {
    if (!currentNode) return null;

    const interactions = currentNode.interactions;

    // 预计算所有出口的节点关系类型，基于 interface.ts 中的强类型校验
    const exitRelations = useMemo(() => {
        return (currentNode.exits || []).map((exit: Exit) => {
            if (exit.type === 'sanctuary_return') return 'sanctuary' as const;
            if (exit.type === 'zone_transfer') return 'zoneExit' as const;

            return getNodeRelation(currentNodeId, currentNode, exit.targetId, nodes);
        });
    }, [currentNode, nodes, currentNodeId]);

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            {/* 横向滚动容器：按钮从中心铺开，溢出时可滚动 */}
            <div className="w-full h-full flex items-center justify-center">
                <div
                    className="flex gap-2 items-center px-4 py-1 overflow-x-auto justify-start md:justify-center"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(255,255,255,0.15) transparent',
                        maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
                    }}
                >
                    {/* 庇护所管理 */}
                    {isSanctuary && (
                        <ActionButton
                            onClick={() => { AudioService.playSfx('click'); onToggleSanctuaryUI?.(); }}
                            colorScheme="amber"
                        >
                            庇护所
                        </ActionButton>
                    )}

                    {/* 搜查 */}
                    <ActionButton onClick={() => onAction('search')} colorScheme="cyan">
                        搜查
                    </ActionButton>

                    {/* NPC 交互 */}
                    {currentNode.nodeNpc && (
                        <ActionButton onClick={() => onAction('interact_npc')} colorScheme="blue">
                            接触: {currentNode.nodeNpc.name || "陌生人"}
                        </ActionButton>
                    )}

                    {/* 节点交互：逐一渲染所有可用的交互按钮 */}
                    {interactions?.map((interaction, index) => {
                        // V4 大一统：不再在前端预判类型，统一由后端 handleObjectInteraction 处理逻辑流
                        const actionType = 'interact_obj';

                        return (
                            <ActionButton
                                key={`interact-${interaction.desc || 'action'}-${index}`}
                                onClick={() => onAction(actionType, index.toString())}
                                colorScheme="amber"
                            >
                                {interaction.desc || '交互'}
                            </ActionButton>
                        );
                    })}

                    {/* 移动出口：根据节点关系类型应用主题色与逻辑路由 */}
                    {(currentNode.exits || []).map((exit: Exit, idx: number) => {
                        const relation = exitRelations[idx];
                        const theme = NODE_THEMES[relation];

                        // 路由决策逻辑
                        const handleMoveClick = () => {
                            if (exit.type === 'sanctuary_return') {
                                // SanctuaryReturn 类型的出口不需要 targetId
                                // @ts-ignore: onAction 内部或引擎层需要适配 sanctuary_return
                                onAction('sanctuary_return', undefined, exit.label);
                            } else if (exit.type === 'zone_transfer') {
                                onAction('move_zone', exit.targetId, exit.label);
                            } else {
                                onAction('move_local', exit.targetId, exit.label);
                            }
                        };

                        return (
                            <MoveButton
                                // fallback 兜底：如果 targetId 未定义（如 sanctuary_return），则结合类型与序号作为 key
                                key={exit.targetId || `${exit.type}-${idx}`}
                                theme={theme}
                                label={exit.label}
                                onClick={handleMoveClick}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default React.memo(Action);