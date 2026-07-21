/**
 * InventoryPanel - 物品存储面板
 * 神经终端风格 - 透明背景、发光边框、无颜文字、扫描线质感
 */
import React, { useState, useMemo } from 'react';
import { PlayerState, ItemInstance } from '../meta/interface';
import {
  isWeaponInstance,
  isArmorInstance,
  isAccessoryInstance,
  isConsumableInstance,
  isAudioInstance,
  isMaterialInstance,
  hasDurability,
  isEquipmentInstance,
  isDocumentInstance
} from '../meta/utils';

interface InventoryPanelProps {
  player: PlayerState;
  onUseItem: (item: ItemInstance) => void;
  onDiscardItem: (item: ItemInstance) => void;
  gameActive?: boolean;
}

type CategoryTab = 'ALL' | 'EQUIPMENT' | 'CONSUMABLE' | 'MATERIAL' | 'DATA';

const InventoryPanel: React.FC<InventoryPanelProps> = ({
  player, onUseItem, onDiscardItem, gameActive = true
}) => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryTab>('ALL');

  const inventory = player.dynamic.inventory;
  const equipment = player.dynamic.equipment;

  // 缓存已装备物品 ID
  const equippedItemIds = useMemo(() => {
    const ids: string[] = [];
    [
      ...equipment.weapons,
      ...equipment.armors,
      ...equipment.accessories,
    ].forEach(item => {
      if (item && item.instanceId) {
        ids.push(item.instanceId);
      }
    });
    return new Set(ids);
  }, [equipment]);

  // 大类过滤逻辑
  const categorizedItems = useMemo(() => {
    return inventory.filter(item => {
      switch (activeTab) {
        case 'EQUIPMENT':
          return isEquipmentInstance(item);
        case 'CONSUMABLE':
          return isConsumableInstance(item);
        case 'MATERIAL':
          return isMaterialInstance(item);
        case 'DATA':
          return isAudioInstance(item) || isDocumentInstance(item);
        case 'ALL':
        default:
          return true;
      }
    });
  }, [inventory, activeTab]);

  // 稀有度与最终列表过滤
  const filteredItems = useMemo(() => {
    return selectedRarity
      ? categorizedItems.filter((i) => i.rarity === selectedRarity)
      : categorizedItems;
  }, [categorizedItems, selectedRarity]);

  // 统计当前大类下的稀有度数量
  const rarityCount = useMemo(() => ({
    common: categorizedItems.filter((i) => i.rarity === 'common').length,
    rare: categorizedItems.filter((i) => i.rarity === 'rare').length,
    epic: categorizedItems.filter((i) => i.rarity === 'epic').length,
    cursed: categorizedItems.filter((i) => i.rarity === 'cursed').length,
  }), [categorizedItems]);

  const handleItemClick = async (item: ItemInstance) => {
    if (isAudioInstance(item) && item.audioScript && !item.audioUrl) {
      setLoadingItemId(item.instanceId);
      await onUseItem(item);
      setLoadingItemId(null);
    } else {
      onUseItem(item);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent overflow-hidden font-mono select-none relative group/terminal">
      {/* 终端全局环境光效/扫描线暗纹 */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[length:100%_4px] z-0" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/40 z-0" />

      {/* 头部信息 */}
      <div className="shrink-0 px-5 py-4 border-b border-cyan-900/50 bg-black/40 backdrop-blur-md z-10 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-500/20" />
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-3 h-3 bg-cyan-400 animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
              <div className="absolute -inset-1 border border-cyan-400/30 animate-[spin_4s_linear_infinite]" />
            </div>
            <div>
              <h2 className="text-lg text-cyan-400 font-bold uppercase tracking-[0.3em] drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] leading-none">
                STORAGE_UNIT
              </h2>
              <div className="text-[10px] text-cyan-500/60 tracking-[0.2em] mt-1.5 flex gap-3">
                <span>SYS.CAPACITY // {inventory.length}_ENTITIES</span>
                <span className="opacity-50">|</span>
                <span className="animate-pulse">STATUS: ONLINE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主导航: 分类 Tabs */}
      <div className="shrink-0 px-4 pt-3 flex gap-1 z-10 relative bg-black/20">
        {(['ALL', 'EQUIPMENT', 'CONSUMABLE', 'MATERIAL', 'DATA'] as CategoryTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedRarity(null); }}
            className={`px-4 py-1.5 text-[10px] tracking-widest transition-all duration-200 border-t border-l border-r ${activeTab === tab
                ? 'border-cyan-500/60 text-cyan-300 bg-cyan-900/20 shadow-[0_-4px_10px_-2px_rgba(34,211,238,0.2)]'
                : 'border-transparent text-cyan-700/50 hover:text-cyan-500 hover:bg-cyan-950/10'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 次级导航: 稀有度过滤器 */}
      <div className="shrink-0 px-4 py-2 border-b border-t border-cyan-900/30 bg-black/40 flex flex-wrap gap-2 z-10 relative">
        <FilterButton label={`TOTAL [${categorizedItems.length}]`} isActive={!selectedRarity} onClick={() => setSelectedRarity(null)} colorClass="cyan" />
        {rarityCount.rare > 0 && <FilterButton label={`RARE [${rarityCount.rare}]`} isActive={selectedRarity === 'rare'} onClick={() => setSelectedRarity('rare')} colorClass="blue" />}
        {rarityCount.epic > 0 && <FilterButton label={`EPIC [${rarityCount.epic}]`} isActive={selectedRarity === 'epic'} onClick={() => setSelectedRarity('epic')} colorClass="purple" />}
        {rarityCount.cursed > 0 && <FilterButton label={`CURSED [${rarityCount.cursed}]`} isActive={selectedRarity === 'cursed'} onClick={() => setSelectedRarity('cursed')} colorClass="red" />}
      </div>

      {/* 物品列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 z-10 relative">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-60">
            <div className="text-cyan-700 text-4xl mb-4 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">[ EMPTY ]</div>
            <div className="text-center text-xs text-cyan-500/50 border border-dashed border-cyan-900/40 p-6 tracking-[0.2em] bg-black/20 backdrop-blur-sm">
              {selectedRarity ? `WARN: NO_${selectedRarity.toUpperCase()}_SIGNATURE_DETECTED` : 'SYS_MSG: STORAGE_SECTOR_VACANT'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
            {filteredItems.map((item: ItemInstance) => {
              const isEquipped = equippedItemIds.has(item.instanceId);
              const itemHasDurability = hasDurability(item);
              const durabilityPercent = itemHasDurability ? (item.currentUses / item.maxUses) * 100 : 100;

              // 安全提取 quantity
              const itemQuantity = 'quantity' in item && typeof item.quantity === 'number' ? item.quantity : 1;
              const shouldShowQuantity = (isMaterialInstance(item) || isConsumableInstance(item)) && itemQuantity > 1;

              // 视觉样式推导
              const styles = getRarityStyles(item.rarity, isEquipped);

              return (
                <div
                  key={item.instanceId}
                  className={`group relative flex flex-col p-4 bg-black/60 backdrop-blur-md border ${styles.border} ${styles.hoverBorder} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
                >
                  {/* 角落装饰 */}
                  <div className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${styles.cornerColor} opacity-50`} />
                  <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${styles.cornerColor} opacity-50`} />

                  {/* 背景光晕装饰 */}
                  <div className={`absolute inset-0 ${styles.bgGlow} opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none`} />
                  {item.rarity === 'cursed' && <div className="absolute inset-0 bg-red-900/10 pointer-events-none animate-[pulse_2s_ease-in-out_infinite]" />}

                  {/* 装备状态标记 */}
                  {isEquipped && (
                    <div className="absolute top-0 right-0 px-2 py-1 bg-emerald-950/90 border-b border-l border-emerald-500/50 text-[9px] text-emerald-400 font-bold tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)] flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      ACTIVE
                    </div>
                  )}

                  {/* 头部：名称与数量 */}
                  <div className="flex items-start justify-between mb-3 relative z-10 pr-16">
                    <span className={`text-sm font-bold tracking-widest truncate ${styles.text} ${styles.textShadow}`}>
                      {item.name}
                    </span>
                    {shouldShowQuantity && (
                      <span className="absolute top-0 right-0 text-[10px] text-cyan-400/80 font-mono bg-cyan-950/40 px-1.5 py-0.5 border border-cyan-900/50">
                        x{itemQuantity}
                      </span>
                    )}
                  </div>

                  {/* 属性数据区 (严整的网格布局) */}
                  <div className="mb-3 grid grid-cols-1 gap-1.5 bg-black/40 p-2 border border-white/5 relative z-10">
                    {isConsumableInstance(item) && item.effects.length > 0 && (
                      <StatRow label="EFFECT" value={`${item.effects[0][0].toUpperCase()} +${item.effects[0][1]}`} />
                    )}
                    {isWeaponInstance(item) && (
                      <>
                        <StatRow label="CLASS" value={item.weaponType.toUpperCase()} />
                        <StatRow label="PWR" value={item.meleeDamage ?? item.rangeDamage ?? 0} valueColor="text-red-400 drop-shadow-[0_0_2px_rgba(248,113,113,0.8)]" />
                      </>
                    )}
                    {isEquipmentInstance(item) && isArmorInstance(item) && (
                      <StatRow label="DEF" value={item.defense} valueColor="text-blue-400 drop-shadow-[0_0_2px_rgba(96,165,250,0.8)]" />
                    )}
                    {isEquipmentInstance(item) && isAccessoryInstance(item) && item.effects.length > 0 && (
                      <StatRow label="MODIFIER" value={`${item.effects[0][0].toUpperCase()} +${item.effects[0][1]}`} />
                    )}
                    {isAudioInstance(item) && (
                      <StatRow label="ENCRYPTION" value={item.audioUrl ? 'DECRYPTED' : 'ENCRYPTED'} valueColor={item.audioUrl ? 'text-emerald-400' : 'text-amber-400'} />
                    )}
                  </div>

                  {/* 耐久度条 */}
                  {itemHasDurability && (
                    <div className="mb-3 relative z-10">
                      <div className="flex justify-between text-[9px] text-gray-500 tracking-widest mb-1.5">
                        <span>INTEGRITY</span>
                        <span className={durabilityPercent < 30 ? 'text-red-400 animate-pulse' : 'text-cyan-500/80'}>
                          {item.currentUses} / {item.maxUses}
                        </span>
                      </div>
                      <div className="h-1.5 bg-black border border-gray-800 overflow-hidden relative">
                        {/* 背景网格纹理 */}
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjQiIGZpbGw9IiMzMzMiLz48L3N2Zz4=')] opacity-30" />
                        <div
                          className={`h-full transition-all duration-500 relative z-10 ${durabilityPercent < 30 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]'}`}
                          style={{ width: `${durabilityPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 描述文本 */}
                  <div className="relative z-10 flex-1 flex flex-col justify-end">
                    <p className="text-[10px] text-gray-400/80 line-clamp-3 leading-relaxed border-l-2 border-gray-800 pl-2 italic">
                      "{item.desc}"
                    </p>
                  </div>

                  {/* 操作按钮区 (悬浮显示) */}
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex flex-col items-center justify-center gap-3 p-4">
                    {gameActive && (
                      <button
                        onClick={() => handleItemClick(item)}
                        disabled={loadingItemId === item.instanceId}
                        className={`w-full py-2 text-[11px] tracking-[0.2em] font-bold border transition-all ${styles.btnStyle}`}
                      >
                        {loadingItemId === item.instanceId
                          ? '[ PROCESSING... ]'
                          : (isEquipmentInstance(item) ? (isEquipped ? '>> UNEQUIP <<' : '>> EQUIP <<') : '>> INITIALIZE <<')}
                      </button>
                    )}
                    <button
                      onClick={() => onDiscardItem(item)}
                      className="w-full py-1.5 text-[10px] tracking-[0.2em] text-red-500/70 hover:text-red-400 border border-red-900/40 hover:border-red-500/60 bg-red-950/20 hover:bg-red-900/40 transition-all shadow-inner"
                    >
                      [ PURGE_DATA ]
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 辅助组件 & 样式生成器
// ==========================================

const StatRow = ({ label, value, valueColor = 'text-gray-300' }: { label: string, value: string | number, valueColor?: string }) => (
  <div className="flex justify-between items-center text-[10px] tracking-wider">
    <span className="text-cyan-700/80">{label}</span>
    <span className={`${valueColor} font-bold`}>{value}</span>
  </div>
);

const FilterButton = ({ label, isActive, onClick, colorClass }: { label: string, isActive: boolean, onClick: () => void, colorClass: 'cyan' | 'blue' | 'purple' | 'red' }) => {
  const colorMap = {
    cyan: { active: 'border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)] bg-cyan-900/30', inactive: 'border-cyan-900/40 text-cyan-700 hover:border-cyan-700 hover:text-cyan-500' },
    blue: { active: 'border-blue-500 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)] bg-blue-900/30', inactive: 'border-blue-900/40 text-blue-700 hover:border-blue-700 hover:text-blue-500' },
    purple: { active: 'border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)] bg-purple-900/30', inactive: 'border-purple-900/40 text-purple-700 hover:border-purple-700 hover:text-purple-500' },
    red: { active: 'border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)] bg-red-900/30', inactive: 'border-red-900/40 text-red-700 hover:border-red-700 hover:text-red-500' },
  };

  const colors = colorMap[colorClass];

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-[9px] tracking-[0.15em] transition-all duration-300 border ${isActive ? colors.active : colors.inactive}`}
    >
      {label}
    </button>
  );
};

const getRarityStyles = (rarity: string, isEquipped: boolean) => {
  if (isEquipped) {
    return {
      border: 'border-emerald-500/50',
      hoverBorder: 'hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
      cornerColor: 'border-emerald-500',
      text: 'text-emerald-300',
      textShadow: 'drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]',
      bgGlow: 'bg-emerald-500',
      btnStyle: 'bg-emerald-950/80 border-emerald-600/60 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-900 hover:shadow-[0_0_12px_rgba(16,185,129,0.5)]'
    };
  }

  switch (rarity) {
    case 'epic':
      return {
        border: 'border-purple-600/40',
        hoverBorder: 'hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
        cornerColor: 'border-purple-500',
        text: 'text-purple-300',
        textShadow: 'drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]',
        bgGlow: 'bg-purple-600',
        btnStyle: 'bg-purple-950/60 border-purple-700/50 text-purple-300 hover:border-purple-400 hover:bg-purple-900/80 hover:shadow-[0_0_12px_rgba(168,85,247,0.4)]'
      };
    case 'rare':
      return {
        border: 'border-blue-600/40',
        hoverBorder: 'hover:border-blue-400/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
        cornerColor: 'border-blue-500',
        text: 'text-blue-300',
        textShadow: 'drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]',
        bgGlow: 'bg-blue-600',
        btnStyle: 'bg-blue-950/60 border-blue-700/50 text-blue-300 hover:border-blue-400 hover:bg-blue-900/80 hover:shadow-[0_0_12px_rgba(59,130,246,0.4)]'
      };
    case 'cursed':
      return {
        border: 'border-red-700/40',
        hoverBorder: 'hover:border-red-500/80 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]',
        cornerColor: 'border-red-600',
        text: 'text-red-400',
        textShadow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]',
        bgGlow: 'bg-red-600',
        btnStyle: 'bg-red-950/60 border-red-700/50 text-red-400 hover:border-red-400 hover:bg-red-900/80 hover:shadow-[0_0_12px_rgba(239,68,68,0.5)]'
      };
    default: // common
      return {
        border: 'border-cyan-900/40',
        hoverBorder: 'hover:border-cyan-600/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]',
        cornerColor: 'border-cyan-700',
        text: 'text-gray-200',
        textShadow: 'drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]',
        bgGlow: 'bg-cyan-900',
        btnStyle: 'bg-cyan-950/40 border-cyan-800/50 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-900/60 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)]'
      };
  }
};

export default InventoryPanel;