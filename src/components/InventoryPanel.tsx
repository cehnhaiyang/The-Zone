/**
 * 物品存储面板 - 神经终端风格
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  isWeaponInstance,
  isArmorInstance,
  isAccessoryInstance,
  isConsumableInstance,
  isDataInstance,
  isEquipmentInstance,
  hasDurability,
  getPercent,
  clamp,
} from '../meta';
import type {
  PlayerState,
  ItemInstance,
  ItemRarity,
  WeaponType,
  WeaponDamageType,
  ConsumableEffectType,
  MaterialInstance,
} from '../meta';
import { RARITY_MAP, RARITY_INDEX, RARITY_META } from '../constants';

// ——— 由 meta/utils.ts 迁移而来（本文件唯一使用方） ———
const isMaterialInstance = (item: ItemInstance): item is MaterialInstance =>
  item.type === 'material';

interface InventoryPanelProps {
  player: PlayerState;
  onUseItem: (item: ItemInstance) => void | Promise<void>;
  onDiscardItem: (item: ItemInstance) => void;
  gameActive?: boolean;
}

type CategoryTab = 'ALL' | 'EQUIPMENT' | 'CONSUMABLE' | 'MATERIAL' | 'DATA';
type RarityFilter = ItemRarity | 'all';
type SortMode = 'priority' | 'name' | 'quantity' | 'integrity';
type EffectTuple = [type: ConsumableEffectType, value: number, duration?: number];

const CATEGORY_TABS: ReadonlyArray<{ id: CategoryTab; label: string }> = [
  { id: 'ALL', label: '全部' },
  { id: 'EQUIPMENT', label: '装备' },
  { id: 'CONSUMABLE', label: '消耗品' },
  { id: 'MATERIAL', label: '材料' },
  { id: 'DATA', label: '数据' },
];

const CATEGORY_PREDICATE: Record<CategoryTab, (item: ItemInstance) => boolean> = {
  ALL: () => true,
  EQUIPMENT: isEquipmentInstance,
  CONSUMABLE: isConsumableInstance,
  MATERIAL: isMaterialInstance,
  DATA: isDataInstance,
};

const ITEM_TYPE_LABEL: Record<ItemInstance['type'], string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
  consumable: '消耗品',
  data: '数据',
  material: '材料',
};

const TYPE_BADGE: Record<ItemInstance['type'], string> = {
  weapon: 'border-red-500/30 bg-red-950/40 text-red-300/90',
  armor: 'border-blue-500/30 bg-blue-950/40 text-blue-300/90',
  accessory: 'border-purple-500/30 bg-purple-950/40 text-purple-300/90',
  consumable: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300/90',
  data: 'border-amber-500/30 bg-amber-950/40 text-amber-300/90',
  material: 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300/90',
};

const WEAPON_TYPE_LABEL: Record<WeaponType, string> = {
  magic: '法术',
  sniper_rifle: '狙击步枪',
  assault_rifle: '突击步枪',
  smg: '冲锋枪',
  pistol: '手枪',
  shotgun: '霰弹枪',
  sawed_off: '短管霰弹枪',
  crossbow: '弩',
  throw: '投掷',
  bow: '弓',
  wave: '挥动',
  both_wave: '双手挥动',
  prick: '刺击',
  both_prick: '双手刺击',
};

const DAMAGE_TYPE_LABEL: Record<WeaponDamageType, string> = {
  cold: '冷兵器',
  hot: '热武器',
  instant: '即时',
};

const EFFECT_LABEL: Record<ConsumableEffectType, string> = {
  strength: '力量',
  agility: '敏捷',
  wisdom: '智慧',
  perception: '感知',
  spiritual: '灵性',
  maxHp: '生命上限',
  maxSanity: '理智上限',
  maxStamina: '体力上限',
  maxVigor: '精力上限',
  heal_hp: '生命恢复',
  heal_sanity: '理智恢复',
  heal_stamina: '体力恢复',
  heal_vigor: '精力恢复',
  restore_battery: '电池恢复',
  repair_integrity: '完整度修复',
};

//==============================================================================
// 工具函数
//==============================================================================
const getQuantity = (item: ItemInstance): number => Math.max(1, item.quantity ?? 1);

const getDurabilityPercent = (item: ItemInstance): number => {
  if (!hasDurability(item)) return 100;
  if (item.maxUses <= 0) return 0;
  return getPercent(item.currentUses, item.maxUses);
};

const formatPercent = (ratio: number): string =>
  `${Math.round(clamp(ratio, 0, 1) * 100)}%`;

const formatEffect = ([type, value, duration]: EffectTuple): string => {
  const sign = value >= 0 ? '+' : '';
  const suffix = duration && duration > 0 ? ` / ${duration} 回合` : '';
  return `${EFFECT_LABEL[type]} ${sign}${value}${suffix}`;
};

const getWeaponDamage = (item: ItemInstance): number =>
  isWeaponInstance(item) ? item.damage : 0;

const getArmorValue = (item: ItemInstance): string =>
  isArmorInstance(item) ? formatPercent(item.partialReduction) : '0%';

const getSearchText = (item: ItemInstance): string => {
  const parts: string[] = [
    item.name,
    item.desc,
    ITEM_TYPE_LABEL[item.type],
    RARITY_MAP[item.rarity].name,
  ];
  if (isWeaponInstance(item)) {
    parts.push(
      WEAPON_TYPE_LABEL[item.weaponType],
      DAMAGE_TYPE_LABEL[item.weaponDamageType]
    );
  }
  if (isDataInstance(item)) {
    if (item.audioScript || item.audioUrl) {
      parts.push('音频', '解密', '播放');
    }
    if (item.documentContent) {
      parts.push('文档', '阅读', '文本');
    }
  }
  if (isAccessoryInstance(item) || isConsumableInstance(item)) {
    // 旧存档 / LLM 生成物可能缺失 effects，避免直取抛错
    (item.effects ?? []).forEach(([effectType]) => {
      parts.push(effectType, EFFECT_LABEL[effectType]);
    });
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
};

const getTypeMeta = (item: ItemInstance): { label: string; badge: string } => ({
  label: ITEM_TYPE_LABEL[item.type],
  badge: TYPE_BADGE[item.type],
});

const getActionLabel = (
  item: ItemInstance,
  isEquipped: boolean,
  isProcessing: boolean
): string => {
  if (isProcessing) return '处理中';
  if (isEquipmentInstance(item)) {
    return isEquipped ? '卸载' : '装备';
  }
  if (isDataInstance(item)) {
    if (item.audioUrl) return '播放音频';
    if (item.audioScript) return '解密音频';
    if (item.documentContent) return '读取文档';
    return '打开数据';
  }
  if (isConsumableInstance(item)) return '使用';
  if (isMaterialInstance(item)) return '处理';
  return '初始化';
};

const SORT_COMPARATORS: Record<SortMode, (a: ItemInstance, b: ItemInstance) => number> = {
  priority: (a, b) =>
    RARITY_INDEX[b.rarity] - RARITY_INDEX[a.rarity] || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  quantity: (a, b) =>
    getQuantity(b) - getQuantity(a) || a.name.localeCompare(b.name),
  integrity: (a, b) =>
    getDurabilityPercent(b) - getDurabilityPercent(a) || a.name.localeCompare(b.name),
};

//==============================================================================
// 基础子组件
//==============================================================================
interface StatRowProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}

const StatRow: React.FC<StatRowProps> = ({
  label,
  value,
  valueColor = 'text-gray-300',
}) => (
  <div className="flex items-center justify-between gap-2 text-[10px] tracking-wider">
    <span className="shrink-0 text-cyan-700/80">{label}</span>
    <span className={`${valueColor} break-words text-right font-bold`}>{value}</span>
  </div>
);

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  /** 传入稀有度时，按钮配色由 RARITY_META 的视觉变量驱动。 */
  rarity?: ItemRarity;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  label,
  isActive,
  onClick,
  rarity,
}) => {
  const active = rarity
    ? '[border-color:var(--r-accent)] [color:var(--r-text)] [box-shadow:0_0_10px_var(--r-glow)]'
    : 'border-cyan-500 text-cyan-300 bg-cyan-900/30 shadow-[0_0_10px_rgba(34,211,238,0.3)]';
  const inactive = rarity
    ? 'border-zinc-800 text-zinc-600 hover:[border-color:var(--r-border)] hover:[color:var(--r-text)]'
    : 'border-cyan-900/40 text-cyan-700 hover:border-cyan-700 hover:text-cyan-500';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      title={rarity ? RARITY_MAP[rarity].desc : undefined}
      style={
        rarity
          ? ({ ...RARITY_MAP[rarity].vars } as React.CSSProperties)
          : undefined
      }
      className={`border px-3 py-1 text-[10px] tracking-widest transition-all duration-300 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${isActive ? active : inactive}`}
    >
      {label}
    </button>
  );
};

const DurabilityBar: React.FC<{ item: ItemInstance }> = ({ item }) => {
  if (!hasDurability(item)) return null;
  const percent = getDurabilityPercent(item);
  const critical = percent < 30;
  return (
    <div className="relative z-10 mb-3">
      <div className="mb-1.5 flex justify-between text-[9px] tracking-widest text-gray-500">
        <span>耐久</span>
        <span className={critical ? 'animate-pulse text-red-400' : 'text-cyan-500/80'}>
          {item.currentUses} / {item.maxUses}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden border border-gray-800 bg-black">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:4px_100%] opacity-30" />
        <div
          className={`relative z-10 h-full transition-all duration-500 ${critical
            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
            : 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
            }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

interface EmptyStateProps {
  selectedRarity: RarityFilter;
  query: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ selectedRarity, query }) => {
  const message = query
    ? '未检测到匹配的物品签名'
    : selectedRarity !== 'all'
      ? `未检测到${RARITY_MAP[selectedRarity].name}物品`
      : '存储区为空';
  return (
    <div className="flex h-full flex-col items-center justify-center py-16 opacity-80">
      <div className="relative mb-6 h-12 w-12">
        <div className="absolute inset-0 rotate-45 border border-cyan-800/60" />
        <div className="absolute inset-1.5 animate-[spin_8s_linear_infinite] border border-cyan-600/40" />
        <div className="absolute inset-4 animate-pulse bg-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.4)]" />
      </div>
      <div className="mb-3 text-xl font-bold tracking-[0.5em] text-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
        暂无物品
      </div>
      <div className="border border-dashed border-cyan-900/40 bg-black/20 px-6 py-3 text-center text-[10px] tracking-[0.25em] text-cyan-500/50 backdrop-blur-sm">
        {message}
      </div>
    </div>
  );
};

//==============================================================================
// 物品卡片
//==============================================================================
interface ItemCardProps {
  item: ItemInstance;
  isEquipped: boolean;
  gameActive: boolean;
  isProcessing: boolean;
  isBusy: boolean;
  onUse: (item: ItemInstance) => void | Promise<void>;
  onDiscard: (item: ItemInstance) => void;
}

const ItemCard = React.memo(
  ({
    item,
    isEquipped,
    gameActive,
    isProcessing,
    isBusy,
    onUse,
    onDiscard,
  }: ItemCardProps) => {
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    const typeMeta = getTypeMeta(item);
    const quantity = getQuantity(item);
    const actionLabel = getActionLabel(item, isEquipped, isProcessing);
    const armorValue = getArmorValue(item);
    const showQuantity =
      (isMaterialInstance(item) || isConsumableInstance(item)) && quantity > 1;

    const handleDiscardClick = () => {
      if (!gameActive || isProcessing || isBusy) return;
      if (confirmingDiscard) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setConfirmingDiscard(false);
        onDiscard(item);
        return;
      }
      setConfirmingDiscard(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setConfirmingDiscard(false);
      }, 2600);
    };

    return (
      <div
        data-rarity={item.rarity}
        data-intensity={RARITY_MAP[item.rarity].intensity}
        data-equipped={isEquipped}
        style={{ ...RARITY_MAP[item.rarity].vars } as React.CSSProperties}
        className="rarity-card group relative flex min-h-[250px] flex-col bg-black/60 p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-1"
        aria-busy={isProcessing}
      >
        {/* 稀有度皮肤层：外层的 rarity-inner 承载滤镜/动效，内层的 rarity-skin
            承载底色/裁切/叠加纹样（分层以免 drop-shadow 被裁切） */}
        <div className="rarity-inner" aria-hidden>
          <div className="rarity-skin" />
        </div>
        <div className="absolute left-0 top-0 h-2 w-2 border-l-2 border-t-2 [border-color:var(--r-accent)] opacity-50 transition-all duration-300 group-hover:h-3.5 group-hover:w-3.5 group-hover:opacity-100" />
        <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 [border-color:var(--r-accent)] opacity-50 transition-all duration-300 group-hover:h-3.5 group-hover:w-3.5 group-hover:opacity-100" />
        {isEquipped && (
          <div className="absolute right-0 top-0 z-20 flex items-center gap-1 border-b border-l border-emerald-500/50 bg-emerald-950/90 px-2 py-1 text-[9px] font-bold tracking-widest text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            已装备
          </div>
        )}

        <div className="relative z-10 mb-3 pr-16">
          <div className="flex items-start justify-between gap-2">
            <span title={item.name} className="rarity-name truncate text-sm">
              {item.name}
            </span>
            {showQuantity && (
              <span className="shrink-0 border border-cyan-900/50 bg-cyan-950/40 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400/80">
                x{quantity}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={`border px-1.5 py-0.5 text-[9px] tracking-[0.2em] ${typeMeta.badge}`}
            >
              {typeMeta.label}
            </span>
            <span className="rarity-badge border px-1.5 py-0.5 text-[9px] tracking-[0.2em]">
              {RARITY_MAP[item.rarity].name}
            </span>
          </div>
        </div>

        <div className="relative z-10 mb-3 grid grid-cols-1 gap-1.5 border border-white/5 bg-black/40 p-2">
          {isWeaponInstance(item) && (
            <>
              <StatRow label="类型" value={WEAPON_TYPE_LABEL[item.weaponType]} />
              <StatRow
                label="威力"
                value={getWeaponDamage(item)}
                valueColor="text-red-400 drop-shadow-[0_0_2px_rgba(248,113,113,0.8)]"
              />
              <StatRow
                label="模式"
                value={DAMAGE_TYPE_LABEL[item.weaponDamageType]}
              />
              <StatRow
                label="射程"
                value={item.range <= 0 ? '无限' : `${item.range} 格`}
              />
            </>
          )}
          {isArmorInstance(item) && (
            <StatRow
              label="减伤"
              value={armorValue}
              valueColor="text-blue-400 drop-shadow-[0_0_2px_rgba(96,165,250,0.8)]"
            />
          )}
          {isAccessoryInstance(item) && (item.effects?.length ?? 0) > 0 && (
            <>
              {item.effects.slice(0, 2).map((effect, index) => (
                <StatRow
                  key={`accessory-effect-${item.instanceId}-${index}`}
                  label="模块"
                  value={formatEffect(effect)}
                />
              ))}
              {item.effects.length > 2 && (
                <StatRow label="额外" value={`+${item.effects.length - 2}`} />
              )}
            </>
          )}
          {isConsumableInstance(item) && (item.effects?.length ?? 0) > 0 && (
            <>
              {item.effects.slice(0, 2).map((effect, index) => (
                <StatRow
                  key={`consumable-effect-${item.instanceId}-${index}`}
                  label="效果"
                  value={formatEffect(effect)}
                />
              ))}
              {item.effects.length > 2 && (
                <StatRow label="额外" value={`+${item.effects.length - 2}`} />
              )}
            </>
          )}
          {isDataInstance(item) && (
            <>
              <StatRow
                label="格式"
                value={
                  item.audioScript || item.audioUrl
                    ? '音频'
                    : item.documentContent
                      ? '文档'
                      : '未知'
                }
              />
              {(item.audioScript || item.audioUrl) && (
                <StatRow
                  label="加密"
                  value={item.audioUrl ? '已解密' : '未解密'}
                  valueColor={item.audioUrl ? 'text-emerald-400' : 'text-amber-400'}
                />
              )}
            </>
          )}
          {isMaterialInstance(item) && <StatRow label="分类" value="原始资源" />}
        </div>

        <DurabilityBar item={item} />

        <div className="relative z-10 mb-3 flex-1">
          <p className="line-clamp-3 border-l-2 border-gray-800 pl-2 text-[10px] italic leading-relaxed text-gray-400/80">
            “{item.desc}”
          </p>
        </div>

        <div className="relative z-10 space-y-2 border-t border-white/5 pt-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] tracking-[0.3em] text-cyan-900">
              SIG:{(item.instanceId ?? '????').slice(-8).toUpperCase()}
            </span>
            <span className="font-mono text-[8px] tracking-[0.3em] text-cyan-900">
              {item.type.toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void onUse(item)}
            disabled={!gameActive || isProcessing || isBusy}
            className="rarity-btn w-full border py-2 text-[11px] font-bold tracking-[0.2em] transition-all outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {actionLabel}
          </button>
          <button
            type="button"
            onClick={handleDiscardClick}
            disabled={!gameActive || isProcessing || isBusy}
            aria-label={
              confirmingDiscard ? `确认销毁 ${item.name}` : `销毁 ${item.name}`
            }
            className={`w-full border py-1.5 text-[10px] tracking-[0.2em] transition-all outline-none focus-visible:ring-1 focus-visible:ring-red-400/60 disabled:cursor-not-allowed disabled:opacity-40 ${confirmingDiscard
              ? 'border-red-500/80 bg-red-900/50 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
              : 'border-red-900/40 bg-red-950/20 text-red-500/70 hover:border-red-500/60 hover:bg-red-900/40 hover:text-red-400'
              }`}
          >
            {confirmingDiscard ? '确认销毁' : '销毁'}
          </button>
          {!gameActive && (
            <div className="text-center text-[9px] tracking-[0.3em] text-cyan-700">
              系统已锁定
            </div>
          )}
        </div>
      </div>
    );
  }
);
ItemCard.displayName = 'ItemCard';

//==============================================================================
// 主面板
//==============================================================================
const InventoryPanel: React.FC<InventoryPanelProps> = ({
  player,
  onUseItem,
  onDiscardItem,
  gameActive = true,
}) => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<RarityFilter>('all');
  const [activeTab, setActiveTab] = useState<CategoryTab>('ALL');
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const mountedRef = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const inventory = player.dynamic.inventory;

  const equippedItemIds = useMemo(() => {
    const { weapons = [null, null], armors = [], accessories = [] } =
      player.dynamic.equipment;
    const ids = new Set<string>();
    [...weapons, ...armors, ...accessories].forEach((slot) => {
      if (slot) ids.add(slot.instanceId);
    });
    return ids;
  }, [player.dynamic.equipment]);

  const categoryCount = useMemo<Record<CategoryTab, number>>(() => {
    const counts: Record<CategoryTab, number> = {
      ALL: inventory.length,
      EQUIPMENT: 0,
      CONSUMABLE: 0,
      MATERIAL: 0,
      DATA: 0,
    };
    inventory.forEach((item) => {
      if (isEquipmentInstance(item)) counts.EQUIPMENT += 1;
      else if (isConsumableInstance(item)) counts.CONSUMABLE += 1;
      else if (isMaterialInstance(item)) counts.MATERIAL += 1;
      else if (isDataInstance(item)) counts.DATA += 1;
    });
    return counts;
  }, [inventory]);

  const categorizedItems = useMemo(
    () => inventory.filter(CATEGORY_PREDICATE[activeTab]),
    [inventory, activeTab]
  );

  const rarityCount = useMemo<Record<ItemRarity, number>>(() => {
    const counts = Object.fromEntries(
      RARITY_META.map((meta) => [meta.level, 0])
    ) as Record<ItemRarity, number>;
    categorizedItems.forEach((item) => {
      counts[item.rarity] += 1;
    });
    return counts;
  }, [categorizedItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const list = categorizedItems.filter((item) => {
      if (selectedRarity !== 'all' && item.rarity !== selectedRarity) return false;
      if (!normalizedQuery) return true;
      return getSearchText(item).includes(normalizedQuery);
    });
    return [...list].sort(SORT_COMPARATORS[sortMode]);
  }, [categorizedItems, selectedRarity, query, sortMode]);

  const zoneTime = player.currentZoneTime;
  const batteryPct = Math.round(
    getPercent(player.neuralLink.battery, player.neuralLink.maxBattery)
  );
  const batteryCells = Math.ceil(batteryPct / 10);

  const handleTabChange = useCallback((tab: CategoryTab) => {
    setActiveTab(tab);
    setSelectedRarity('all');
  }, []);

  const handleUseItem = useCallback(
    async (item: ItemInstance) => {
      if (!gameActive || busyRef.current) return;
      busyRef.current = true;
      setLoadingItemId(item.instanceId);
      try {
        await onUseItem(item);
      } catch (error) {
        console.error('[InventoryPanel] 使用物品失败:', error);
      } finally {
        busyRef.current = false;
        if (mountedRef.current) {
          setLoadingItemId(null);
        }
      }
    },
    [gameActive, onUseItem]
  );

  const handleDiscardItem = useCallback(
    (item: ItemInstance) => {
      if (!gameActive) return;
      try {
        onDiscardItem(item);
      } catch (error) {
        console.error('[InventoryPanel] 销毁物品失败:', error);
      }
    },
    [gameActive, onDiscardItem]
  );

  return (
    <div className="relative flex h-full w-full select-none flex-col overflow-hidden bg-transparent font-mono">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[length:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

      <div className="relative z-10 shrink-0 border-b border-cyan-900/50 bg-black/40 px-5 py-4 backdrop-blur-md">
        <div className="absolute left-0 top-0 h-px w-full bg-cyan-500/20" />
        <div className="absolute bottom-0 left-0 h-px w-full overflow-hidden">
          <div className="h-px w-1/3 animate-pulse bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-3 w-3 shrink-0">
              <div className="h-3 w-3 animate-pulse bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
              <div className="absolute -inset-1 animate-[spin_4s_linear_infinite] border border-cyan-400/30" />
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase leading-none tracking-[0.3em] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                物品终端
                <span className="ml-1.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-cyan-400/90 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] tracking-[0.2em] text-cyan-500/60">
                <span>容量 {inventory.length} 件</span>
                <span className="text-cyan-900">//</span>
                <span>挂载 {equippedItemIds.size} 件</span>
                <span className="text-cyan-900">//</span>
                <span>可见 {filteredItems.length} 件</span>
                <span className="text-cyan-900">//</span>
                <span
                  className={
                    gameActive
                      ? 'text-emerald-400/80'
                      : 'animate-pulse text-red-400/80'
                  }
                >
                  {gameActive ? '链路在线' : '系统锁定'}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-4 sm:flex">
            <div className="text-right">
              <div className="text-[8px] tracking-[0.35em] text-cyan-800">
                区域时间
              </div>
              <div className="mt-0.5 text-sm font-bold tracking-[0.2em] text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]">
                D{zoneTime.day}·C{zoneTime.cycle}·T{zoneTime.tick}
              </div>
            </div>
            <div className="h-8 w-px bg-cyan-900/50" />
            <div className="text-right">
              <div className="text-[8px] tracking-[0.35em] text-cyan-800">
                链接电力
              </div>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <div className="flex h-2.5 items-stretch gap-px border border-cyan-900/60 bg-black/60 p-px">
                  {Array.from({ length: 10 }, (_, index) => (
                    <div
                      key={`battery-cell-${index}`}
                      className={`w-1 transition-colors duration-300 ${index < batteryCells
                        ? batteryPct <= 20
                          ? 'bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.8)]'
                          : 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.6)]'
                        : 'bg-cyan-950/80'
                        }`}
                    />
                  ))}
                </div>
                <span
                  className={`text-[10px] font-bold ${batteryPct <= 20
                    ? 'animate-pulse text-red-400'
                    : 'text-cyan-400/90'
                    }`}
                >
                  {batteryPct}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 shrink-0 bg-black/20 px-4 pt-3">
        <div className="flex flex-wrap gap-1" role="tablist">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`border-l border-r border-t px-4 py-1.5 text-[10px] tracking-widest transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 ${activeTab === tab.id
                ? 'border-cyan-500/60 bg-cyan-900/20 text-cyan-300 shadow-[0_-4px_10px_-2px_rgba(34,211,238,0.2)]'
                : 'border-transparent text-cyan-700/50 hover:bg-cyan-950/10 hover:text-cyan-500'
                }`}
            >
              {tab.label} [{categoryCount[tab.id]}]
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-3 pt-3">
          <div className="relative min-w-[180px] flex-1">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-cyan-700">
              {'>'}
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索名称 / 类型 / 效果"
              aria-label="搜索物品"
              className="h-7 w-full border border-cyan-900/50 bg-black/60 pl-6 pr-14 text-[10px] tracking-widest text-cyan-200 outline-none placeholder:text-cyan-800 focus:border-cyan-500/70 focus:shadow-[0_0_10px_rgba(34,211,238,0.15)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="清除搜索"
                className="absolute right-1 top-1/2 -translate-y-1/2 px-1 text-cyan-700 transition-colors hover:text-cyan-300"
              >
                清除
              </button>
            )}
          </div>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            aria-label="排序方式"
            className="h-7 cursor-pointer border border-cyan-900/50 bg-black/70 px-2 text-[10px] tracking-widest text-cyan-400 outline-none focus:border-cyan-500/70"
          >
            <option value="priority">排序：优先级</option>
            <option value="name">排序：名称</option>
            <option value="quantity">排序：数量</option>
            <option value="integrity">排序：耐久</option>
          </select>
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-t border-cyan-900/30 bg-black/40 px-4 py-2">
        <FilterButton
          label={`全部 [${categorizedItems.length}]`}
          isActive={selectedRarity === 'all'}
          onClick={() => setSelectedRarity('all')}
        />
        {RARITY_META.filter(
          (meta) => rarityCount[meta.level] > 0 || selectedRarity === meta.level
        ).map((meta) => (
          <FilterButton
            key={meta.level}
            rarity={meta.level}
            label={`${meta.name} [${rarityCount[meta.level]}]`}
            isActive={selectedRarity === meta.level}
            onClick={() => setSelectedRarity(meta.level)}
          />
        ))}
      </div>

      <div
        className="custom-scrollbar relative z-10 flex-1 overflow-y-auto p-4"
        aria-live="polite"
      >
        {filteredItems.length === 0 ? (
          <EmptyState selectedRarity={selectedRarity} query={query} />
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.instanceId}
                item={item}
                isEquipped={equippedItemIds.has(item.instanceId)}
                gameActive={gameActive}
                isProcessing={loadingItemId === item.instanceId}
                isBusy={Boolean(loadingItemId)}
                onUse={handleUseItem}
                onDiscard={handleDiscardItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPanel;