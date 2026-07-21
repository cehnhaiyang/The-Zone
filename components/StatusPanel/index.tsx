import React, { useState, useMemo, useEffect } from 'react';
import { PlayerState, Entity, NpcTemplate, NpcDynamicState, Attribute, ItemInstance, isWeaponInstance, isArmorInstance, isAccessoryInstance, isConsumableInstance, hasDurability } from '../../meta';
import { AudioService } from '../../services';

// ============================================================================
// 图表组件 (Charts)
// ============================================================================

// === 属性雷达图 (Hex-Tech Radar) ===
export const AttributeRadar = React.memo(({ Attribute }: { Attribute: Attribute }) => {
  const maxVal = 10;
  const center = 50;
  const radius = 35;

  const getPoint = (value: number, angle: number) => {
    const r = (Math.min(value, maxVal) / maxVal) * radius;
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad)
    };
  };

  // 4个轴向：上(STR), 右(AGI), 下(KNO), 左(PER)
  const points = [
    getPoint(Attribute.strength, 0),
    getPoint(Attribute.agility, 90),
    getPoint(Attribute.knowledge, 180),
    getPoint(Attribute.perception, 270)
  ];

  const polyPoints = points.map(p => `${p.x},${p.y} `).join(' ');

  // 背景网格 (同心圆/菱形)
  const renderGrid = () => {
    return [0.25, 0.5, 0.75, 1].map((scale, i) => {
      const gridPoints = [
        getPoint(maxVal * scale, 0),
        getPoint(maxVal * scale, 90),
        getPoint(maxVal * scale, 180),
        getPoint(maxVal * scale, 270)
      ].map(p => `${p.x},${p.y} `).join(' ');
      return (
        <polygon
          key={i}
          points={gridPoints}
          fill="none"
          stroke="rgba(6, 182, 212, 0.15)"
          strokeWidth="0.5"
          strokeDasharray={i === 3 ? "0" : "2 1"}
        />
      );
    });
  };

  return (
    <div className="relative w-full aspect-square max-w-[180px] mx-auto group">
      {/* 扫描动画背景 */}
      <div className="absolute inset-0 bg-cyan-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]">
        {/* 轴线 */}
        <line x1={center} y1={center - radius} x2={center} y2={center + radius} stroke="rgba(6, 182, 212, 0.1)" strokeWidth="1" />
        <line x1={center - radius} y1={center} x2={center + radius} y2={center} stroke="rgba(6, 182, 212, 0.1)" strokeWidth="1" />

        {/* 网格 */}
        {renderGrid()}

        {/* 数据区域 */}
        <polygon
          points={polyPoints}
          fill="rgba(6, 182, 212, 0.2)"
          stroke="#22d3ee"
          strokeWidth="1.5"
          className="filter drop-shadow-[0_0_5px_#22d3ee]"
        >
          <animate attributeName="opacity" values="0.6;0.8;0.6" dur="4s" repeatCount="indefinite" />
        </polygon>

        {/* 顶点装饰 */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="1.5" fill="#fff" />
            <circle cx={p.x} cy={p.y} r="3" fill="none" stroke="#22d3ee" strokeWidth="0.5" opacity="0.6" />
          </g>
        ))}

        {/* 标签 */}
        <text x={50} y={10} textAnchor="middle" className="text-[6px] fill-red-400 font-mono font-bold tracking-wider">STR</text>
        <text x={92} y={52} textAnchor="middle" className="text-[6px] fill-emerald-400 font-mono font-bold tracking-wider">AGI</text>
        <text x={50} y={94} textAnchor="middle" className="text-[6px] fill-blue-400 font-mono font-bold tracking-wider">KNO</text>
        <text x={8} y={52} textAnchor="middle" className="text-[6px] fill-amber-400 font-mono font-bold tracking-wider">PER</text>
      </svg>
    </div>
  );
});

// === 环形仪表盘 (Sci-Fi Gauge) ===
export const CircularGauge = React.memo(({
  value,
  max,
  color,
  label,
  icon,
  critical
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  icon: string;
  critical?: boolean
}) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(1, value / max));
  const offset = circumference - percent * circumference;

  // 生成刻度线
  const ticks = Array.from({ length: 24 }).map((_, i) => {
    const angle = (i * 360 / 24) * (Math.PI / 180);
    const r1 = 30;
    const r2 = 32;
    const x1 = 50 + r1 * Math.cos(angle);
    const y1 = 50 + r1 * Math.sin(angle);
    const x2 = 50 + r2 * Math.cos(angle);
    const y2 = 50 + r2 * Math.sin(angle);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
  });

  // 格式化显示：3位小数
  const displayValue = value.toFixed(3);

  return (
    <div className="relative w-24 h-24 flex items-center justify-center group select-none">
      <svg className="w-full h-full transform -rotate-90">
        {/* 刻度环 */}
        <g>{ticks}</g>

        {/* 背景轨道 */}
        <circle
          cx="50%" cy="50%" r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="4"
        />

        {/* 进度条 */}
        <circle
          cx="50%" cy="50%" r={radius}
          fill="transparent"
          stroke={critical ? '#ef4444' : color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-700 ease-out ${critical ? 'animate-pulse drop-shadow-[0_0_8px_#ef4444]' : ''} `}
          style={{ filter: `drop-shadow(0 0 2px ${color})` }}
        />
      </svg>

      {/* 中心内容 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className={`text-lg mb-0.5 opacity-80 ${critical ? 'animate-bounce text-red-500' : 'text-gray-300'} `}>{icon}</div>
        <div className="flex items-baseline">
          <span className={`text-xs font-bold font-mono leading-none ${critical ? 'text-red-500' : 'text-white'} `}>
            {displayValue}
          </span>
        </div>
        <div className="w-full h-px bg-gray-700/50 my-0.5 w-1/2"></div>
        <span className="text-[6px] text-gray-600 font-mono">{max.toFixed(0)}</span>
        <span className="text-[6px] text-gray-500 font-mono uppercase tracking-[0.1em] mt-0.5">{label}</span>
      </div>

      {/* 装饰性外环动画 */}
      <div className="absolute inset-0 border border-white/5 rounded-full scale-90 group-hover:scale-100 transition-transform duration-500"></div>
    </div>
  );
});

// === 线性进度条 (Segmented Bar) ===
export const LinearBar = React.memo(({
  value,
  max,
  label,
  color
}: {
  value: number;
  max: number;
  label: string;
  color: string; // Tailwind class like "bg-amber-500"
}) => {
  const percent = Math.min(100, (value / max) * 100);
  const segments = 20; // 增加分段数以提高精度感
  const filledSegments = Math.ceil((percent / 100) * segments);

  // 格式化显示：3位小数
  const displayValue = value.toFixed(3);

  return (
    <div className="w-full mb-3 group">
      <div className="flex justify-between items-end mb-1">
        <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase group-hover:text-gray-300 transition-colors">{label}</span>
        <span className={`text-[9px] font-mono ${value < max * 0.3 ? 'text-red-500 animate-pulse' : 'text-gray-400'} `}>
          <span className="font-bold text-gray-200">{displayValue}</span>
          <span className="text-gray-600 mx-1">/</span>
          <span className="text-gray-500">{max.toFixed(0)}</span>
        </span>
      </div>

      <div className="flex gap-[1px] h-2 w-full bg-black/40 p-[1px] border border-gray-800/50 rounded-sm">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-[1px] transition-all duration-300 ${i < filledSegments
              ? `${color} opacity-90 shadow-[0_0_4px_currentColor]`
              : 'bg-gray-800/20'
              } `}
          />
        ))}
      </div>
    </div>
  );
});


// ============================================================================
// 升级系统面板 (Level Manager)
// ============================================================================

const getXpCost = (level: number) => level * 100;

interface LevelManagerProps {
  player: PlayerState;
  onClose: () => void;
  onLevelUp?: (targetId: string, attr: Attribute) => void;
}

const UpgradeRow: React.FC<{
  id: string;
  name: string;
  level: number;
  role: string;
  attribute: Attribute;
  playerXp: number;
  onLevelUp?: (targetId: string, attr: Attribute) => void;
}> = ({ id, name, level, role, attribute, playerXp, onLevelUp }) => {
  const cost = getXpCost(level);
  const canAfford = playerXp >= cost;

  const attrs = [
    { attr: 'strength' as keyof Attribute, icon: '💪', label: 'STR', val: attribute.strength, color: 'red' },
    { attr: 'agility' as keyof Attribute, icon: '⚡', label: 'AGI', val: attribute.agility, color: 'emerald' },
    { attr: 'knowledge' as keyof Attribute, icon: '🧠', label: 'KNO', val: attribute.knowledge, color: 'blue' },
    { attr: 'perception' as keyof Attribute, icon: '👁️', label: 'PER', val: attribute.perception, color: 'amber' }
  ];

  return (
    <div className="bg-[#121215]/80 border border-gray-800 p-4 rounded-sm hover:border-gray-600 transition-all duration-300 relative group overflow-hidden">
      {/* Ambient Background Glow for Affordable Upgrades */}
      {canAfford && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        {/* Character Info */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-100 tracking-wide">{name}</span>
              <span className="text-[9px] text-black bg-gray-400 px-1.5 py-0.5 rounded font-mono font-bold">Lv.{level}</span>
            </div>
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mt-1">{role}</div>
            <div className={`text-[9px] font-mono mt-1 ${canAfford ? 'text-emerald-500' : 'text-red-500/70'}`}>
              NEXT LEVEL: {cost} XP
            </div>
          </div>
        </div>

        {/* Attribute Buttons */}
        <div className="flex gap-2">
          {attrs.map((opt) => (
            <div key={opt.attr} className="flex flex-col items-center gap-1">
              <button
                onClick={() => onLevelUp && onLevelUp(id, { [opt.attr]: attribute[opt.attr] + 1 } as Attribute)}
                disabled={!canAfford}
                className={`
                                    flex flex-col items-center justify-center w-12 h-12 border transition-all rounded-sm relative overflow-hidden group/btn
                                    ${canAfford
                    ? `border-${opt.color}-900/50 bg-[#0a0a0c] hover:border-${opt.color}-500 hover:shadow-[0_0_10px_rgba(var(--${opt.color}-rgb),0.3)] cursor-pointer`
                    : 'border-gray-800 bg-black/50 text-gray-700 cursor-not-allowed opacity-40'
                  }
                                `}
              >
                <span className={`text-base mb-0.5 ${canAfford ? 'opacity-90 group-hover/btn:scale-110 transition-transform' : 'grayscale'}`}>{opt.icon}</span>
                <div className={`absolute inset-x-0 bottom-0 h-0.5 bg-${opt.color}-500 opacity-50`}></div>

                {canAfford && (
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                )}
              </button>
              <span className={`text-[9px] font-mono font-bold text-${opt.color}-500`}>{opt.label} {opt.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const LevelManager: React.FC<LevelManagerProps> = ({ player, onClose, onLevelUp }) => {
  return (
    <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gradient-to-r from-gray-900 to-black shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none"></div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-8 h-8 border border-emerald-500/30 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded-sm">
            ▲
          </div>
          <div>
            <h2 className="text-sm font-mono text-white font-bold tracking-[0.2em] uppercase text-shadow-sm">System Upgrade</h2>
            <div className="text-[9px] font-mono text-gray-500 tracking-wider">ALLOCATE EXPERIENCE POINTS</div>
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="flex flex-col items-end">
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Available XP</div>
            <div className="text-xl font-mono font-bold text-emerald-400 text-shadow-green tabular-nums">
              {player.dynamic.xp}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border border-gray-700 text-gray-400 hover:text-white hover:border-gray-400 hover:bg-gray-800 transition-all rounded-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-[#050505]">
        {/* Player Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-800/50">
            <span className="w-1 h-3 bg-cyan-500"></span>
            <h3 className="text-xs font-mono text-cyan-500 uppercase tracking-widest">Operator Unit</h3>
          </div>
          <UpgradeRow
            id="player"
            name={player.static.name}
            level={player.dynamic.level}
            role={player.static.style.toUpperCase()}
            attribute={player.static.initialState.attribute}
            playerXp={player.dynamic.xp}
            onLevelUp={onLevelUp}
          />
        </section>

        {/* Companion Section */}
        {player.companions.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-800/50 mt-8">
              <span className="w-1 h-3 bg-blue-500"></span>
              <h3 className="text-xs font-mono text-blue-500 uppercase tracking-widest">Support Units</h3>
            </div>
            <div className="space-y-3">
              {player.companions.filter(c => c.dynamic.hp > 0).map(comp => (
                <UpgradeRow
                  key={comp.static.id}
                  id={comp.static.id}
                  name={comp.static.name}
                  level={comp.dynamic.level || 1}
                  role={comp.static.style.toUpperCase()}
                  attribute={comp.static.initialState.attribute}
                  playerXp={player.dynamic.xp}
                  onLevelUp={onLevelUp}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};


// ============================================================================
// 生物识别与基础视图栏 (Bio Column)
// ============================================================================

interface BioColumnProps {
  player: PlayerState;
  onManualGen?: () => void;
  isGenerating?: boolean;
  onRandomSwitch?: () => Promise<string | null>;
  hasMultipleVariants?: () => Promise<boolean>;
}

export const BioColumn: React.FC<BioColumnProps> = ({ player, onManualGen, isGenerating, onRandomSwitch, hasMultipleVariants }) => {
  const [hasVariants, setHasVariants] = useState(false);

  useEffect(() => {
    if (hasMultipleVariants) {
      hasMultipleVariants().then(setHasVariants);
    }
  }, [hasMultipleVariants, player.dynamic.imageUrl]);
  return (
    <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
      {/* Portrait Card */}
      <div className="relative w-full aspect-[3/4] bg-black/40 border border-gray-800/60 rounded-sm overflow-hidden group shadow-lg backdrop-blur-sm">
        {/* Holographic Border Effect */}
        <div className="absolute inset-0 pointer-events-none z-20 border border-cyan-500/10 group-hover:border-cyan-500/30 transition-colors"></div>
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500/50 z-20"></div>
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500/50 z-20"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500/50 z-20"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500/50 z-20"></div>

        {/* Scan Line Animation */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(6,182,212,0.05)_50%)] bg-[length:100%_4px] pointer-events-none z-10"></div>
        <div className="absolute top-0 w-full h-[2px] bg-cyan-400/30 shadow-[0_0_10px_#22d3ee] animate-scan-vertical pointer-events-none z-10 opacity-30"></div>

        {player.dynamic.imageUrl ? (
          <img
            src={player.dynamic.imageUrl}
            alt="Portrait"
            className={`w-full h-full object-cover transition-all duration-700 filter contrast-110 saturate-[0.8] group-hover:saturate-100 ${player.dynamic.sanity < 40 ? 'animate-glitch-image' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0c]">
            <div className="text-4xl grayscale opacity-20 mb-2 animate-pulse">👤</div>
            <span className="text-[9px] font-mono text-cyan-900 tracking-widest blink-animation">NO_VISUAL_DATA</span>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute top-2 right-2 z-30 flex gap-2">
          {onRandomSwitch && (
            <button
              onClick={async () => {
                AudioService.playSfx('click');
                const newUrl = await onRandomSwitch();
                if (newUrl) {
                  // URL update will be handled by parent component
                }
              }}
              disabled={isGenerating}
              className="p-1.5 bg-black/60 border border-amber-900/50 text-amber-500 hover:text-amber-200 hover:border-amber-400 hover:bg-amber-950/50 transition-all rounded-sm backdrop-blur-md group/btn"
              title="Random Switch Variant"
            >
              <span className="block w-3 h-3 text-xs leading-none flex items-center justify-center">🎲</span>
            </button>
          )}
          <button
            onClick={() => { AudioService.playSfx('scan'); onManualGen && onManualGen(); }}
            disabled={isGenerating}
            className="p-1.5 bg-black/60 border border-cyan-900/50 text-cyan-500 hover:text-cyan-200 hover:border-cyan-400 hover:bg-cyan-950/50 transition-all rounded-sm backdrop-blur-md group/btn"
            title="Update Neural Portrait"
          >
            <span className={`block w-3 h-3 text-xs leading-none flex items-center justify-center ${isGenerating ? 'animate-spin' : ''}`}>
              {isGenerating ? '◌' : '↻'}
            </span>
          </button>
        </div>

        {/* ID Tag */}
        <div className="absolute bottom-3 left-3 z-30">
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-cyan-600 bg-black/80 px-1 py-0.5 inline-block w-fit">OPERATOR_ID</span>
            <span className="text-sm font-bold text-white tracking-widest drop-shadow-md font-mono">{player.static.name.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Vital Container - Unified Bar Layout */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="bg-black/20 border border-gray-800 p-4 rounded-sm backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800/50 pb-2 mb-2">
            <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">Biometrics Stream</span>
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
          </div>

          <LinearBar
            value={player.dynamic.hp}
            max={player.static.initialState.vital.maxHp}
            label="Vital / 生命特征"
            color="bg-emerald-500"
          />

          <LinearBar
            value={player.dynamic.sanity}
            max={player.static.initialState.vital.maxSanity}
            label="PSYCHE / 精神阈值"
            color="bg-blue-500"
          />

          <LinearBar
            value={player.dynamic.stamina}
            max={player.static.initialState.vital.maxStamina}
            label="STAMINA / 肌肉耐力"
            color="bg-amber-500"
          />

          <LinearBar
            value={player.dynamic.vigor}
            max={player.static.initialState.vital.maxVigor}
            label="FOCUS / 神经聚焦"
            color="bg-purple-500"
          />
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// 数据与属性视图栏 (Stats Column)
// ============================================================================

interface StatsColumnProps {
  player: PlayerState;
}

const StatRow: React.FC<{ label: string; value: string; color?: string; trend?: 'up' | 'down' | 'neutral' }> = ({ label, value, color = "text-gray-300", trend }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-gray-800/30 hover:bg-white/5 px-2 transition-colors group">
    <span className="text-[9px] text-gray-500 uppercase font-mono tracking-wider group-hover:text-cyan-500/70 transition-colors">{label}</span>
    <div className="flex items-center gap-1">
      <span className={`text-[10px] font-mono font-bold ${color} drop-shadow-sm`}>{value}</span>
      {trend === 'up' && <span className="text-[8px] text-emerald-500">▲</span>}
    </div>
  </div>
);

export const StatsColumn: React.FC<StatsColumnProps> = React.memo(({ player }) => {
  // 衍生属性计算
  const derived = useMemo(() => {
    const { strength, agility, knowledge, perception } = player.static.initialState.attribute;
    return {
      meleeDmg: (strength * 1.5).toFixed(3),
      carryWeight: (10 + strength / 2).toFixed(3),
      critChance: (agility * 2).toFixed(3) + '%',
      evasion: (agility * 1.5).toFixed(3) + '%',
      techSkill: (knowledge * 5).toFixed(3),
      discovery: (perception * 5).toFixed(3) + '%'
    };
  }, [player.static.initialState.attribute]);

  return (
    <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
      {/* Attribute Radar Card */}
      <div className="bg-black/40 border border-gray-800/60 p-4 relative rounded-sm group overflow-hidden backdrop-blur-sm flex flex-col items-center">
        <div className="absolute top-0 left-0 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-mono text-cyan-400 border-b border-r border-gray-800/50 rounded-br">
          SYNC_RATE
        </div>

        <div className="my-2">
          <AttributeRadar Attribute={player.static.initialState.attribute} />
        </div>

        {/* Numeric Attribute Grid */}
        <div className="grid grid-cols-4 w-full mt-4 pt-3 border-t border-gray-800/50 gap-2">
          {[
            { label: 'STR', val: player.static.initialState.attribute.strength, col: 'text-red-400' },
            { label: 'AGI', val: player.static.initialState.attribute.agility, col: 'text-emerald-400' },
            { label: 'KNO', val: player.static.initialState.attribute.knowledge, col: 'text-blue-400' },
            { label: 'PER', val: player.static.initialState.attribute.perception, col: 'text-amber-400' },
          ].map((attr) => (
            <div key={attr.label} className="flex flex-col items-center bg-black/30 py-1 rounded-sm border border-gray-800/30">
              <span className={`text-[8px] font-bold ${attr.col}`}>{attr.label}</span>
              <span className="text-sm font-mono text-gray-200">{attr.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Derived Capabilities Data Grid */}
      <div className="bg-black/20 border border-gray-800/60 p-0 rounded-sm flex-1 overflow-hidden backdrop-blur-sm flex flex-col">
        <div className="px-3 py-2 bg-gray-900/40 border-b border-gray-800/50 flex items-center justify-between">
          <div className="text-[9px] font-mono text-cyan-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-600 rounded-sm"></span>
            COMBAT_METRICS
          </div>
          <div className="text-[7px] text-gray-600 font-mono">LIVE_FEED</div>
        </div>

        <div className="p-2 space-y-0.5">
          <StatRow label="Melee Damage" value={derived.meleeDmg} color="text-red-300" />
          <StatRow label="Crit Chance" value={derived.critChance} color="text-emerald-300" />
          <StatRow label="Evasion Rate" value={derived.evasion} color="text-emerald-300" />
          <StatRow label="Tech Skill" value={derived.techSkill} color="text-blue-300" />
          <StatRow label="Discovery" value={derived.discovery} color="text-amber-300" />
          <StatRow label="Carry Capacity" value={derived.carryWeight} />
        </div>

        {/* Decorative Footer */}
        <div className="mt-auto h-1 w-full bg-gradient-to-r from-gray-800 via-cyan-900/30 to-gray-800"></div>
      </div>
    </div>
  );
});


// ============================================================================
// 装备与小队管理视图栏 (Logistics Column)
// ============================================================================

interface LogisticsColumnProps {
  player: PlayerState;
  onInteractWithCompanion: (npc: Entity<NpcTemplate, NpcDynamicState>) => void;
}

const EquipmentSlot: React.FC<{ label: string; item: ItemInstance | undefined; type: 'mainHand' | 'accessory' }> = ({ label, item, type }) => {
  const rarityColors: Record<ItemInstance['rarity'], string> = {
    common: 'border-gray-700 text-gray-400',
    rare: 'border-blue-500/50 text-blue-300 bg-blue-950/10',
    epic: 'border-purple-500/50 text-purple-300 bg-purple-950/10',
    cursed: 'border-red-500/50 text-red-300 bg-red-950/10'
  };

  const styleClass = item ? rarityColors[item.rarity] || rarityColors.common : 'border-gray-800 text-gray-700 bg-black/20 border-dashed';

  return (
    <div className={`relative h-20 border transition-all group p-2 flex flex-col justify-between ${styleClass} hover:bg-opacity-20`}>
      {/* Corner Markers */}
      <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-current opacity-50"></div>
      <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-current opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-current opacity-50"></div>
      <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-current opacity-50"></div>

      <div className="flex justify-between items-start">
        <span className="text-[7px] font-mono uppercase tracking-widest opacity-60">{label}</span>
        {item && hasDurability(item) && (
          <span className={`text-[8px] font-mono px-1 rounded-sm border ${item.currentUses < 3 ? 'text-red-400 border-red-900' : 'text-emerald-400 border-emerald-900/30'}`}>
            {item.currentUses}/{item.maxUses}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-1">
        <div className="text-2xl filter drop-shadow-md opacity-90 group-hover:scale-110 transition-transform duration-300">
          {item ? (type === 'mainHand' ? '⚔️' : '💍') : '∅'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold truncate leading-tight">{item ? item.name : 'EMPTY SLOT'}</div>
          <div className="text-[8px] opacity-60 truncate font-mono mt-0.5">
            {item ? (
              isWeaponInstance(item) ? `DMG: ${item.meleeDamage ?? item.rangeDamage ?? 0}` :
                isArmorInstance(item) ? `DEF: ${item.defense}` :
                  isAccessoryInstance(item) && item.effects.length > 0 ? `MOD: ${item.effects[0][0]} +${item.effects[0][1]}` :
                    isConsumableInstance(item) && item.effects.length > 0 ? `USE: ${item.effects[0][0]} +${item.effects[0][1]}` :
                      item.desc
            ) : '---'}
          </div>
        </div>
      </div>
    </div>
  );
};

export const LogisticsColumn: React.FC<LogisticsColumnProps> = ({ player, onInteractWithCompanion }) => {
  const aliveCompanions = player.companions.filter((c: Entity<NpcTemplate, NpcDynamicState>) => c.dynamic.hp > 0);
  const { weapons, armors, accessories } = player.dynamic.equipment;
  const weapon = weapons[0] || undefined;
  const armor = armors[0] || undefined;
  const accessory = accessories[0] || undefined;

  return (
    <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
      {/* Equipment Grid */}
      <div className="bg-black/40 border border-gray-800/60 p-3 rounded-sm backdrop-blur-sm">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[9px] font-mono text-cyan-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-600 rotate-45"></span>
            LOADOUT_CONFIG
          </div>
          <span className="text-[8px] text-gray-500 font-mono">{player.dynamic.inventory.length}/10 CAP</span>
        </div>
        <div className="flex flex-col gap-2">
          <EquipmentSlot label="PRIMARY_WEAPON" item={weapon} type="mainHand" />
          <EquipmentSlot label="ARMOR" item={armor} type="accessory" />
          <EquipmentSlot label="TACTICAL_MODULE" item={accessory} type="accessory" />
        </div>
      </div>

      {/* Squad Monitor */}
      <div className="bg-black/20 border border-gray-800/60 p-0 rounded-sm flex-1 backdrop-blur-sm flex flex-col overflow-hidden">
        <div className="px-3 py-2 bg-gray-900/30 border-b border-gray-800/50 flex items-center justify-between">
          <div className="text-[9px] font-mono text-emerald-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
            SQUAD_UPLINK
          </div>
          <span className="text-[8px] text-gray-600">{aliveCompanions.length} UNIT(S)</span>
        </div>

        <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {aliveCompanions.length > 0 ? (
            aliveCompanions.map(c => {
              const hpPercent = (c.dynamic.hp / c.static.initialState.vital.maxHp) * 100;

              return (
                <button
                  key={c.static.id}
                  onClick={() => onInteractWithCompanion(c)}
                  className="w-full relative group border border-gray-800/50 bg-[#121215]/80 hover:border-cyan-500/40 hover:bg-cyan-950/10 transition-all rounded-sm overflow-hidden text-left p-2"
                >
                  <div className="flex items-center gap-3">
                    {/* NPC 肖像缩略图 */}
                    <div className="w-10 h-10 bg-black/60 border border-gray-700 rounded-sm overflow-hidden flex-shrink-0">
                      {c.dynamic.imageUrl ? (
                        <img
                          src={c.dynamic.imageUrl}
                          alt={c.static.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-lg">
                          👤
                        </div>
                      )}
                    </div>

                    {/* NPC 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-gray-200 truncate">{c.static.name}</div>
                      <div className="text-[8px] text-gray-500 font-mono uppercase">{c.static.style}</div>
                    </div>

                    {/* HP 状态 */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-[9px] font-mono text-emerald-400">
                        {Math.round(c.dynamic.hp)}/{c.static.initialState.vital.maxHp}
                      </div>
                    </div>
                  </div>

                  {/* HP 进度条 */}
                  <div className="absolute bottom-0 left-0 h-[2px] bg-red-900/30 w-full">
                    <div className="h-full bg-red-500/60 transition-all" style={{ width: `${hpPercent}%` }}></div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-700 space-y-2 border border-dashed border-gray-800/50 m-2 rounded">
              <div className="text-2xl opacity-20">📡</div>
              <div className="text-[9px] font-mono">NO_SIGNAL</div>
            </div>
          )}
        </div>
      </div>

      {/* System Log / Footer */}
      <div className="bg-black/40 border-t border-gray-800/50 p-2 flex justify-between text-[8px] font-mono text-gray-600 uppercase tracking-widest backdrop-blur-sm">
        <span>UPTIME: {(player.currentGameRound.absoluteTick)}H</span>
        <span>DEPTH: {player.currentGameRound.absoluteTick}</span>
      </div>
    </div>
  );
};


// ============================================================================
// 状态总控制面板 (Status Panel Main Component)
// ============================================================================

interface StatusPanelProps {
  player: PlayerState;
  onInteractWithCompanion: (npc: Entity<NpcTemplate, NpcDynamicState>) => void;
  onManualGen?: () => void;
  isGenerating?: boolean;
  onLevelUp?: (targetId: string, attr: Attribute) => void;
  onRandomSwitch?: () => Promise<string | null>;
  hasMultipleVariants?: () => Promise<boolean>;
}

const StatusPanel: React.FC<StatusPanelProps> = ({
  player,
  onInteractWithCompanion,
  onManualGen,
  isGenerating,
  onLevelUp,
  onRandomSwitch,
  hasMultipleVariants
}) => {
  const [showLevelManager, setShowLevelManager] = useState(false);

  const getXpCost = (level: number) => level * 100;

  // 检查是否有任意角色可升级
  const canAnyLevelUp = useMemo(() => {
    const aliveCompanions = player.companions.filter((c: Entity<NpcTemplate, NpcDynamicState>) => c.dynamic.hp > 0);
    if (player.dynamic.xp >= getXpCost(player.dynamic.level)) return true;
    return aliveCompanions.some(c => player.dynamic.xp >= getXpCost(c.dynamic.level || 1));
  }, [player.dynamic.xp, player.dynamic.level, player.companions]);

  return (
    <div className="w-full h-full flex flex-col bg-transparent overflow-hidden relative font-sans">
      {/* Level Manager Overlay */}
      {showLevelManager && (
        <LevelManager
          player={player}
          onClose={() => setShowLevelManager(false)}
          onLevelUp={onLevelUp}
        />
      )}

      {/* Top Header */}
      <div className="shrink-0 h-14 px-6 border-b border-cyan-900/30 bg-gradient-to-r from-black via-gray-900/80 to-transparent flex justify-between items-center backdrop-blur-md relative z-20">
        <div className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent"></div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-cyan-500 rounded-sm animate-pulse shadow-[0_0_10px_#06b6d4]"></div>
            <div className="absolute inset-0 border border-cyan-400 scale-150 opacity-30 animate-ping rounded-sm"></div>
          </div>
          <div>
            <h2 className="text-sm font-mono text-cyan-100 uppercase tracking-[0.3em] font-bold drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">
              TACTICAL_DASHBOARD
            </h2>
            <div className="text-[9px] text-cyan-700 font-mono tracking-widest flex gap-3 mt-0.5">
              <span className="text-gray-400 font-bold">{player.static.name.toUpperCase()}</span>
              <span className="opacity-50">|</span>
              <span>CLASS: {player.static.style.toUpperCase()}</span>
              <span className="opacity-50">|</span>
              <span className="text-emerald-600">ONLINE</span>
            </div>
          </div>
        </div>

        {/* XP / Upgrade Button */}
        <button
          onClick={() => { AudioService.playSfx('click'); setShowLevelManager(true); }}
          className={`
                        group relative flex items-center gap-4 px-4 py-2 rounded-sm border transition-all duration-300
                        ${canAnyLevelUp
              ? 'bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-900/60 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-black/40 border-gray-800 hover:border-gray-600 hover:bg-gray-900/60'}
                    `}
        >
          <div className="flex flex-col items-end leading-none">
            <div className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mb-1 group-hover:text-gray-400">XP POOL</div>
            <div className={`text-sm font-mono font-bold tracking-wider tabular-nums ${canAnyLevelUp ? 'text-emerald-400 text-shadow-green' : 'text-gray-300'}`}>
              {player.dynamic.xp}
            </div>
          </div>

          {/* Icon Indicator */}
          <div className={`
                        w-8 h-8 flex items-center justify-center rounded-sm border transition-all
                        ${canAnyLevelUp
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 animate-pulse'
              : 'border-gray-700 bg-gray-800 text-gray-500'}
                    `}>
            <span className="text-xs">▲</span>
          </div>

          {/* Corner Decoration */}
          {canAnyLevelUp && (
            <>
              <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-emerald-400"></div>
              <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-emerald-400"></div>
            </>
          )}
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
        {/* Background Grid Texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none -z-10"></div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full max-w-[1600px] mx-auto">
          <BioColumn
            player={player}
            onManualGen={onManualGen}
            isGenerating={isGenerating}
            onRandomSwitch={onRandomSwitch}
            hasMultipleVariants={hasMultipleVariants}
          />
          <StatsColumn player={player} />
          <LogisticsColumn
            player={player}
            onInteractWithCompanion={onInteractWithCompanion}
          />
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;