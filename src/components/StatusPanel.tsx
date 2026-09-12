import React, { useState, useMemo } from 'react';
import {
  PlayerState, Entity, NpcTemplate, NpcDynamicState, Attribute, ItemInstance, Tactic, Settings,
  WeaponInstance, ArmorInstance, AccessoryInstance,
  isWeaponInstance, isArmorInstance, isAccessoryInstance, isConsumableInstance, hasDurability,
  normalizeEquipState,
} from '../meta';
import { RARITY_MAP } from '../constants';
import { AudioService } from '../services';

// 静态噪点纹理：由 neuralLink.noiseLevel 驱动的立绘图像后处理覆盖层
const NOISE_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E";

/** 效果值展示：正数补正号，负数保留负号 */
const formatEffectValue = (value: number): string => `${value >= 0 ? '+' : ''}${value}`;

interface EquipSummary {
  weapons: Array<WeaponInstance | null>;
  armors: Array<ArmorInstance | null>;
  accessories: Array<AccessoryInstance | null>;
  equipped: number;
  total: number;
}

// =====================
// 图表组件 (Charts)
// =====================

// === 属性雷达图 (5-point Pentagon Radar) ===
export const AttributeRadar = React.memo(({ attribute }: { attribute: Attribute }) => {
  const rawMax = Math.max(attribute.strength, attribute.agility, attribute.wisdom, attribute.perception, attribute.spiritual, 10);
  const maxVal = Math.ceil(rawMax / 5) * 5;
  const center = 50;
  const radius = 35;

  const getPoint = (value: number, angle: number) => {
    const r = (Math.min(value, maxVal) / maxVal) * radius;
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  };

  // 5个轴向：STR(0°), AGI(72°), WIS(144°), PER(216°), SPI(288°)
  const axes = [
    { key: 'strength', angle: 0, label: 'STR', color: 'fill-red-400' },
    { key: 'agility', angle: 72, label: 'AGI', color: 'fill-emerald-400' },
    { key: 'wisdom', angle: 144, label: 'WIS', color: 'fill-blue-400' },
    { key: 'perception', angle: 216, label: 'PER', color: 'fill-amber-400' },
    { key: 'spiritual', angle: 288, label: 'SPI', color: 'fill-purple-400' },
  ] as const;

  const points = axes.map(a => getPoint(attribute[a.key], a.angle));
  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  const gridRings = [0.25, 0.5, 0.75, 1].map((scale, i) => (
    <polygon
      key={i}
      points={axes.map(a => getPoint(maxVal * scale, a.angle)).map(p => `${p.x},${p.y}`).join(' ')}
      fill="none"
      stroke="rgba(6, 182, 212, 0.15)"
      strokeWidth="0.5"
      strokeDasharray={i === 3 ? '0' : '2 1'}
    />
  ));

  return (
    <div className="relative w-full aspect-square max-w-[150px] mx-auto group">
      <div className="absolute inset-0 bg-cyan-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]">
        {axes.map(a => {
          const rad = ((a.angle - 90) * Math.PI) / 180;
          return (
            <line
              key={a.key}
              x1={center} y1={center}
              x2={center + radius * Math.cos(rad)}
              y2={center + radius * Math.sin(rad)}
              stroke="rgba(6, 182, 212, 0.1)"
              strokeWidth="1"
            />
          );
        })}
        {gridRings}
        {/* 旋转扫描线 */}
        <line x1={center} y1={center} x2={center} y2={center - radius} stroke="rgba(34,211,238,0.35)" strokeWidth="0.75">
          <animateTransform attributeName="transform" type="rotate" from={`0 ${center} ${center}`} to={`360 ${center} ${center}`} dur="9s" repeatCount="indefinite" />
        </line>
        <polygon
          points={polyPoints}
          fill="rgba(6, 182, 212, 0.2)"
          stroke="#22d3ee"
          strokeWidth="1.5"
          className="filter drop-shadow-[0_0_5px_#22d3ee]"
        >
          <animate attributeName="opacity" values="0.6;0.8;0.6" dur="4s" repeatCount="indefinite" />
        </polygon>
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="1.5" fill="#fff" />
            <circle cx={p.x} cy={p.y} r="3" fill="none" stroke="#22d3ee" strokeWidth="0.5" opacity="0.6" />
          </g>
        ))}
        {axes.map(a => {
          const labelR = radius + 8;
          const rad = ((a.angle - 90) * Math.PI) / 180;
          return (
            <text
              key={a.key}
              x={center + labelR * Math.cos(rad)}
              y={center + labelR * Math.sin(rad)}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`text-[6px] ${a.color} font-mono font-bold tracking-wider`}
            >
              {a.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
});

// === 环形仪表盘 (Sci-Fi Gauge) ===
export const CircularGauge = React.memo(({
  value, max, color, label, icon, critical
}: {
  value: number; max: number; color: string; label: string; icon: string; critical?: boolean
}) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(1, value / max));
  const offset = circumference - percent * circumference;

  const ticks = Array.from({ length: 24 }).map((_, i) => {
    const angle = ((i * 360) / 24) * (Math.PI / 180);
    return (
      <line
        key={i}
        x1={50 + 30 * Math.cos(angle)} y1={50 + 30 * Math.sin(angle)}
        x2={50 + 32 * Math.cos(angle)} y2={50 + 32 * Math.sin(angle)}
        stroke="rgba(255,255,255,0.1)" strokeWidth="1"
      />
    );
  });

  return (
    <div className="relative w-24 h-24 flex items-center justify-center group select-none">
      <svg className="w-full h-full transform -rotate-90">
        <g>{ticks}</g>
        <circle cx="50%" cy="50%" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle
          cx="50%" cy="50%" r={radius}
          fill="transparent"
          stroke={critical ? '#ef4444' : color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-700 ease-out ${critical ? 'animate-pulse drop-shadow-[0_0_8px_#ef4444]' : ''}`}
          style={{ filter: `drop-shadow(0 0 2px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className={`text-lg mb-0.5 opacity-80 ${critical ? 'animate-bounce text-red-500' : 'text-gray-300'}`}>{icon}</div>
        <span className={`text-xs font-bold font-mono leading-none tabular-nums ${critical ? 'text-red-500' : 'text-white'}`}>
          {value.toFixed(3)}
        </span>
        <div className="h-px bg-gray-700/50 my-0.5 w-1/2"></div>
        <span className="text-[6px] text-gray-600 font-mono tabular-nums">{max.toFixed(0)}</span>
        <span className="text-[6px] text-gray-500 font-mono uppercase tracking-[0.1em] mt-0.5">{label}</span>
      </div>
      <div className="absolute inset-0 border border-white/5 rounded-full scale-90 group-hover:scale-100 transition-transform duration-500 pointer-events-none"></div>
    </div>
  );
});

// === 线性进度条 (Segmented Bar) ===
export const LinearBar = React.memo(({
  value, max, label, color
}: {
  value: number; max: number; label: string; color: string;
}) => {
  const percent = Math.min(100, (value / max) * 100);
  const segments = 20;
  const filledSegments = Math.ceil((percent / 100) * segments);
  const low = value < max * 0.3;

  return (
    <div className="w-full mb-1.5 group">
      <div className="flex justify-between items-end mb-0.5">
        <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase group-hover:text-gray-300 transition-colors">{label}</span>
        <span className={`text-[9px] font-mono tabular-nums ${low ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
          <span className="font-bold text-gray-200">{value.toFixed(3)}</span>
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
              }`}
          />
        ))}
      </div>
    </div>
  );
});

// =====================
// 升级系统面板 (Level Manager)
// =====================

const getXpCost = (level: number) => level * 100;

interface LevelManagerProps {
  player: PlayerState;
  onClose: () => void;
  onLevelUp?: (targetId: string, attr: string) => void;
}

const UpgradeRow: React.FC<{
  id: string;
  name: string;
  level: number;
  role: string;
  attribute: Attribute;
  playerXp: number;
  onLevelUp?: (targetId: string, attr: string) => void;
}> = ({ id, name, level, role, attribute, playerXp, onLevelUp }) => {
  const cost = getXpCost(level);
  const canAfford = playerXp >= cost;

  const attrs = [
    { attr: 'strength' as keyof Attribute, label: 'STR', val: attribute.strength, text: 'text-red-400', btn: 'border-red-900/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]', bar: 'bg-red-500' },
    { attr: 'agility' as keyof Attribute, label: 'AGI', val: attribute.agility, text: 'text-emerald-400', btn: 'border-emerald-900/50 hover:border-emerald-500 hover:shadow-[0_0_10px_rgba(16,185,129,0.3)]', bar: 'bg-emerald-500' },
    { attr: 'wisdom' as keyof Attribute, label: 'WIS', val: attribute.wisdom, text: 'text-blue-400', btn: 'border-blue-900/50 hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]', bar: 'bg-blue-500' },
    { attr: 'perception' as keyof Attribute, label: 'PER', val: attribute.perception, text: 'text-amber-400', btn: 'border-amber-900/50 hover:border-amber-500 hover:shadow-[0_0_10px_rgba(245,158,11,0.3)]', bar: 'bg-amber-500' },
    { attr: 'spiritual' as keyof Attribute, label: 'SPI', val: attribute.spiritual, text: 'text-purple-400', btn: 'border-purple-900/50 hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]', bar: 'bg-purple-500' },
  ];

  return (
    <div className="bg-[#121215]/80 border border-gray-800 p-4 rounded-sm hover:border-gray-600 transition-all duration-300 relative group overflow-hidden">
      {canAfford && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-100 tracking-wide">{name}</span>
              <span className="text-[9px] text-black bg-gray-400 px-1.5 py-0.5 rounded font-mono font-bold">Lv.{level}</span>
            </div>
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mt-1">{role}</div>
            <div className={`text-[9px] font-mono mt-1 tabular-nums ${canAfford ? 'text-emerald-500' : 'text-red-500/70'}`}>
              NEXT LEVEL: {cost} XP
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {attrs.map((opt) => (
            <div key={opt.attr} className="flex flex-col items-center gap-1">
              <button
                onClick={() => onLevelUp && onLevelUp(id, opt.attr)}
                disabled={!canAfford}
                className={`flex flex-col items-center justify-center w-12 h-12 border transition-all rounded-sm relative overflow-hidden group/btn active:scale-95 ${canAfford
                  ? `${opt.btn} bg-[#0a0a0c] cursor-pointer`
                  : 'border-gray-800 bg-black/50 text-gray-700 cursor-not-allowed opacity-40'
                  }`}
              >
                <span className={`text-[11px] font-mono font-bold mb-0.5 ${canAfford ? `${opt.text} opacity-90 group-hover/btn:scale-110 transition-transform` : 'text-gray-600'}`}>{opt.label}</span>
                <div className={`absolute inset-x-0 bottom-0 h-0.5 ${opt.bar} opacity-50`}></div>
                {canAfford && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>}
              </button>
              <span className={`text-[9px] font-mono font-bold tabular-nums ${opt.text}`}>{opt.label} {opt.val}</span>
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
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gradient-to-r from-gray-900 to-black shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-8 h-8 border border-emerald-500/30 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded-sm">▲</div>
          <div>
            <h2 className="text-sm font-mono text-white font-bold tracking-[0.2em] uppercase text-shadow-sm">System Upgrade</h2>
            <div className="text-[9px] font-mono text-gray-500 tracking-wider">ALLOCATE EXPERIENCE POINTS</div>
          </div>
        </div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="flex flex-col items-end">
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Available XP</div>
            <div className="text-xl font-mono font-bold text-emerald-400 text-shadow-green tabular-nums">{player.dynamic.xp}</div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border border-gray-700 text-gray-400 hover:text-white hover:border-gray-400 hover:bg-gray-800 transition-all rounded-sm active:scale-95"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-[#050505]">
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
            attribute={{
              strength: player.dynamic.strength,
              agility: player.dynamic.agility,
              wisdom: player.dynamic.wisdom,
              perception: player.dynamic.perception,
              spiritual: player.dynamic.spiritual,
            }}
            playerXp={player.dynamic.xp}
            onLevelUp={onLevelUp}
          />
        </section>
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
                  attribute={{
                    strength: comp.dynamic.strength,
                    agility: comp.dynamic.agility,
                    wisdom: comp.dynamic.wisdom,
                    perception: comp.dynamic.perception,
                    spiritual: comp.dynamic.spiritual,
                  }}
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

// =====================
// 生物识别与基础视图栏 (Bio Column)
// =====================

const NeuralChip: React.FC<{ label: string; value: number; max: number }> = ({ label, value, max }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const danger = pct <= 20;
  return (
    <div className={`flex items-center gap-1 bg-black/70 border rounded-sm px-1 py-0.5 backdrop-blur-sm ${danger ? 'border-red-900/70' : 'border-cyan-900/40'}`}>
      <span className={`text-[7px] font-mono w-5 ${danger ? 'text-red-400 animate-pulse' : 'text-cyan-500/80'}`}>{label}</span>
      <div className="w-10 h-1 bg-gray-800 rounded-sm overflow-hidden">
        <div className={`h-full transition-all duration-500 ${danger ? 'bg-red-500' : 'bg-cyan-500/70'}`} style={{ width: `${pct}%` }}></div>
      </div>
      <span className={`text-[7px] font-mono tabular-nums w-6 text-right ${danger ? 'text-red-400' : 'text-gray-400'}`}>{Math.round(pct)}%</span>
    </div>
  );
};

interface BioColumnProps {
  player: PlayerState;
  onManualGen?: () => void;
  isGenerating?: boolean;
  onRandomSwitch?: () => Promise<string | null>;
}

export const BioColumn: React.FC<BioColumnProps> = ({ player, onManualGen, isGenerating, onRandomSwitch }) => {
  const nl = player.neuralLink;
  const linkDead = nl.battery <= 0 || nl.integrity <= 0;
  // noiseLevel 为纯 UI 视觉字段：值越大，图像噪点越多，轮廓越清晰但信息越不可信
  const noiseOpacity = linkDead ? 0.75 : Math.min(0.7, Math.max(0, nl.noiseLevel) / 100);
  const hasPortrait = Boolean(player.dynamic.imageUrl);

  return (
    <div className="col-span-12 md:col-span-4 flex flex-col gap-3 md:min-h-0">
      {/* Portrait Card — 移动端固定比例，桌面端吞噬剩余高度 */}
      <div className="relative w-full aspect-[3/4] md:aspect-auto md:flex-1 md:min-h-0 bg-black/40 border border-gray-800/60 rounded-sm overflow-hidden group shadow-lg backdrop-blur-sm">
        {/* Holographic Border Effect */}
        <div className="absolute inset-0 pointer-events-none z-20 border border-cyan-500/10 group-hover:border-cyan-500/30 transition-colors duration-500"></div>
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500/50 z-20 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500/50 z-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500/50 z-20 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500/50 z-20 pointer-events-none"></div>

        {/* Scan Line Animation */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(6,182,212,0.05)_50%)] bg-[length:100%_4px] pointer-events-none z-10"></div>
        <div className="absolute top-0 w-full h-[2px] bg-cyan-400/30 shadow-[0_0_10px_#22d3ee] animate-scan-vertical pointer-events-none z-10 opacity-30"></div>

        {hasPortrait ? (
          <img
            src={player.dynamic.imageUrl}
            alt="Portrait"
            draggable={false}
            className={`w-full h-full object-cover transition-all duration-700 filter contrast-125 saturate-[0.85] group-hover:saturate-100 ${player.dynamic.sanity < 40 ? 'animate-glitch-image' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0c] relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.07),transparent_60%)] pointer-events-none"></div>
            <svg viewBox="0 0 24 24" className="w-14 h-14 text-gray-800 mb-3 animate-pulse" fill="currentColor" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
            </svg>
            <span className="text-[9px] font-mono text-cyan-800 tracking-[0.3em] blink-animation">NO_VISUAL_DATA</span>
            <span className="text-[8px] font-mono text-gray-600 mt-1.5 tracking-wider">PRESS ⇄ TO ACQUIRE FEED</span>
          </div>
        )}

        {/* Neural Noise Post-Processing Overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10 mix-blend-screen transition-opacity duration-500"
          style={{ opacity: noiseOpacity, backgroundImage: `url("${NOISE_URI}")`, backgroundSize: '140px 140px' }}
        ></div>

        {/* Signal Lost Overlay */}
        {linkDead && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-950/30 pointer-events-none">
            <span className="text-[10px] font-mono text-red-500 tracking-[0.4em] animate-pulse border border-red-500/40 px-3 py-1 bg-black/70">SIGNAL LOST</span>
          </div>
        )}

        {/* Neural Link Readout */}
        <div className="absolute top-2 left-2 z-30 flex flex-col gap-1 items-start pointer-events-none">
          <NeuralChip label="BAT" value={nl.battery} max={nl.maxBattery} />
          <NeuralChip label="INT" value={nl.integrity} max={nl.maxIntegrity} />
        </div>

        {/* Controls Overlay — 立绘资产按需请求，按钮常驻；无立绘时高亮引导 */}
        <div className="absolute top-2 right-2 z-30 flex gap-2">
          {onRandomSwitch && (
            <button
              onClick={() => { AudioService.playSfx('ui_click'); void onRandomSwitch(); }}
              disabled={isGenerating}
              className={`p-1.5 bg-black/60 border transition-all rounded-sm backdrop-blur-md active:scale-90 disabled:opacity-40 ${!hasPortrait
                ? 'border-amber-400/80 text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.45)] animate-pulse'
                : 'border-amber-900/50 text-amber-500 hover:text-amber-200 hover:border-amber-400 hover:bg-amber-950/50'
                }`}
              title="Random Switch Variant"
            >
              <span className="block w-3 h-3 text-xs leading-none flex items-center justify-center">⇄</span>
            </button>
          )}
          <button
            onClick={() => { AudioService.playSfx('search'); onManualGen && onManualGen(); }}
            disabled={isGenerating}
            className="p-1.5 bg-black/60 border border-cyan-900/50 text-cyan-500 hover:text-cyan-200 hover:border-cyan-400 hover:bg-cyan-950/50 transition-all rounded-sm backdrop-blur-md active:scale-90 disabled:opacity-40"
            title="Update Neural Portrait"
          >
            <span className={`block w-3 h-3 text-xs leading-none flex items-center justify-center ${isGenerating ? 'animate-spin' : ''}`}>
              {isGenerating ? '◌' : '↻'}
            </span>
          </button>
        </div>

        {/* ID Tag */}
        <div className="absolute bottom-3 left-3 z-30 pointer-events-none">
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-cyan-600 bg-black/80 px-1 py-0.5 inline-block w-fit">OPERATOR_ID</span>
            <span className="text-sm font-bold text-white tracking-widest drop-shadow-md font-mono">{player.static.name.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Vital Container - Unified Bar Layout */}
      <div className="shrink-0">
        <div className="bg-black/20 border border-gray-800 p-3 rounded-sm backdrop-blur-sm hover:border-gray-700 transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-gray-800/50 pb-1.5 mb-1.5">
            <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">Biometrics Stream</span>
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
          </div>
          {/* 上限取动态值：装备饰品会抬高 / 压低体征上限，读 static 模板值会比例错乱 */}
          <LinearBar value={player.dynamic.hp} max={player.dynamic.maxHp} label="Vital / 生命特征" color="bg-emerald-500" />
          <LinearBar value={player.dynamic.sanity} max={player.dynamic.maxSanity} label="PSYCHE / 精神阈值" color="bg-blue-500" />
          <LinearBar value={player.dynamic.stamina} max={player.dynamic.maxStamina} label="STAMINA / 肌肉耐力" color="bg-amber-500" />
          <LinearBar value={player.dynamic.vigor} max={player.dynamic.maxVigor} label="FOCUS / 神经聚焦" color="bg-purple-500" />
        </div>
      </div>
    </div>
  );
};

// =====================
// 数据与属性视图栏 (Stats Column)
// =====================

interface StatsColumnProps {
  player: PlayerState;
}

const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-gray-300' }) => (
  <div className="flex justify-between items-center py-1 border-b border-gray-800/30 hover:bg-white/5 px-2 transition-colors group">
    <span className="text-[9px] text-gray-500 uppercase font-mono tracking-wider group-hover:text-cyan-500/70 transition-colors">{label}</span>
    <span className={`text-[10px] font-mono font-bold tabular-nums ${color} drop-shadow-sm`}>{value}</span>
  </div>
);

export const StatsColumn: React.FC<StatsColumnProps> = React.memo(({ player }) => {
  const derived = useMemo(() => {
    const { strength, agility, wisdom, perception, spiritual } = player.dynamic;
    return {
      meleeDmg: (strength * 1.5).toFixed(3),
      carryWeight: (10 + strength / 2).toFixed(3),
      critChance: (agility * 2).toFixed(3) + '%',
      evasion: (agility * 1.5).toFixed(3) + '%',
      techSkill: (wisdom * 5).toFixed(3),
      discovery: (perception * 5).toFixed(3) + '%',
      // 与 utils.calculateCombatBonus 公式一致：clamp(1.0 + (WIS - 3) × 0.05, 0.5, 2.0)
      combatBonus: Math.max(0.5, Math.min(2.0, 1.0 + (wisdom - 3) * 0.05)).toFixed(2) + '×',
      // 与 utils.createActionPoint 公式一致：max(1, floor(speed / 5))，speed 默认等于敏捷
      apBase: String(Math.max(1, Math.floor(agility / 5))),
      spiritRes: (spiritual * 2).toFixed(3),
    };
  }, [player.dynamic]);

  const attrGrid = [
    { label: 'STR', val: player.dynamic.strength, col: 'text-red-400' },
    { label: 'AGI', val: player.dynamic.agility, col: 'text-emerald-400' },
    { label: 'WIS', val: player.dynamic.wisdom, col: 'text-blue-400' },
    { label: 'PER', val: player.dynamic.perception, col: 'text-amber-400' },
    { label: 'SPI', val: player.dynamic.spiritual, col: 'text-purple-400' },
  ];

  return (
    <div className="col-span-12 md:col-span-4 flex flex-col gap-3 md:min-h-0">
      {/* Attribute Radar Card */}
      <div className="shrink-0 bg-black/40 border border-gray-800/60 p-3 relative rounded-sm group overflow-hidden backdrop-blur-sm flex flex-col items-center hover:border-cyan-900/60 transition-colors duration-300">
        <div className="absolute top-0 left-0 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-mono text-cyan-400 border-b border-r border-gray-800/50 rounded-br">
          SYNC_RATE
        </div>
        <div className="my-1 w-full">
          <AttributeRadar attribute={player.dynamic} />
        </div>
        <div className="grid grid-cols-5 w-full mt-1.5 pt-2 border-t border-gray-800/50 gap-1">
          {attrGrid.map((attr) => (
            <div key={attr.label} className="flex flex-col items-center bg-black/30 py-0.5 rounded-sm border border-gray-800/30 hover:border-gray-600 transition-colors">
              <span className={`text-[8px] font-bold ${attr.col}`}>{attr.label}</span>
              <span className="text-xs font-mono text-gray-200 tabular-nums">{attr.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Derived Capabilities Data Grid */}
      <div className="flex-1 md:min-h-0 bg-black/20 border border-gray-800/60 rounded-sm overflow-hidden backdrop-blur-sm flex flex-col hover:border-gray-700 transition-colors duration-300">
        <div className="shrink-0 px-3 py-1.5 bg-gray-900/40 border-b border-gray-800/50 flex items-center justify-between">
          <div className="text-[9px] font-mono text-cyan-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-600 rounded-sm"></span>
            COMBAT_METRICS
          </div>
          <div className="text-[7px] text-gray-600 font-mono flex items-center gap-1">
            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
            LIVE_FEED
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
          <StatRow label="Melee Damage" value={derived.meleeDmg} color="text-red-300" />
          <StatRow label="Crit Chance" value={derived.critChance} color="text-emerald-300" />
          <StatRow label="Evasion Rate" value={derived.evasion} color="text-emerald-300" />
          <StatRow label="Tech Skill" value={derived.techSkill} color="text-blue-300" />
          <StatRow label="Discovery" value={derived.discovery} color="text-amber-300" />
          <StatRow label="Combat Bonus" value={derived.combatBonus} color="text-blue-300" />
          <StatRow label="Base AP" value={derived.apBase} color="text-cyan-300" />
          <StatRow label="Spirit Resonance" value={derived.spiritRes} color="text-purple-300" />
          <StatRow label="Carry Capacity" value={derived.carryWeight} />
        </div>
        <div className="shrink-0 h-1 w-full bg-gradient-to-r from-gray-800 via-cyan-900/30 to-gray-800"></div>
      </div>
    </div>
  );
});

// =====================
// 装备与小队管理视图栏 (Logistics Column)
// =====================

interface LogisticsColumnProps {
  player: PlayerState;
  equip: EquipSummary;
  onInteractWithCompanion: (npc: Entity<NpcTemplate, NpcDynamicState>) => void;
  onOpenEquipment: () => void;
}

const EquipmentSlot: React.FC<{ label: string; item: ItemInstance | undefined; type: 'weapon' | 'armor' | 'accessory'; onUnequip?: (item: ItemInstance) => void }> = ({ label, item, type, onUnequip }) => {
  const typeIcons: Record<typeof type, string> = {
    weapon: '†',
    armor: '⬡',
    accessory: '◈',
  };
  const styleClass = item
    ? 'rarity-cell'
    : 'border-gray-800 text-gray-700 bg-black/20 border-dashed';

  return (
    <div
      data-rarity={item?.rarity}
      data-intensity={item ? RARITY_MAP[item.rarity].intensity : undefined}
      style={
        item ? ({ ...RARITY_MAP[item.rarity].vars } as React.CSSProperties) : undefined
      }
      className={`relative h-20 border transition-all group p-2 flex flex-col justify-between ${styleClass} hover:bg-opacity-20`}
    >
      <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-current opacity-50 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-current opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-current opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-current opacity-50 pointer-events-none"></div>
      <div className="flex justify-between items-start">
        <span className="text-[7px] font-mono uppercase tracking-widest opacity-60">{label}</span>
        {item && hasDurability(item) && (
          <span className={`text-[8px] font-mono px-1 rounded-sm border tabular-nums ${item.currentUses < 3 ? 'text-red-400 border-red-900' : 'text-emerald-400 border-emerald-900/30'}`}>
            {item.currentUses}/{item.maxUses}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-1">
        <div className="text-2xl filter drop-shadow-md opacity-90 group-hover:scale-110 transition-transform duration-300">
          {item ? typeIcons[type] : '∅'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold truncate leading-tight">{item ? item.name : 'EMPTY SLOT'}</div>
          <div className="text-[8px] opacity-60 truncate font-mono mt-0.5">
            {item ? (
              isWeaponInstance(item) ? `DMG: ${item.damage}` :
                isArmorInstance(item) ? `DEF: ${(item.partialReduction * 100).toFixed(0)}%` :
                  isAccessoryInstance(item) && (item.effects?.length ?? 0) > 0 ? `MOD: ${item.effects[0][0]} ${formatEffectValue(item.effects[0][1])}` :
                    isConsumableInstance(item) && (item.effects?.length ?? 0) > 0 ? `USE: ${item.effects[0][0]} ${formatEffectValue(item.effects[0][1])}` :
                      item.desc
            ) : '---'}
          </div>
        </div>
        {item && onUnequip && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUnequip(item); }}
            className="shrink-0 border border-red-900/50 bg-red-950/30 px-2 py-1 text-[9px] font-bold tracking-widest text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:border-red-500 hover:bg-red-900/50 hover:shadow-[0_0_8px_rgba(239,68,68,0.4)]"
          >
            卸下
          </button>
        )}
      </div>
    </div>
  );
};

export const LogisticsColumn: React.FC<LogisticsColumnProps> = ({ player, equip, onInteractWithCompanion, onOpenEquipment }) => {
  const aliveCompanions = player.companions.filter((c: Entity<NpcTemplate, NpcDynamicState>) => c.dynamic.hp > 0);

  return (
    <div className="col-span-12 md:col-span-4 flex flex-col gap-3 md:min-h-0">
      {/* Equipment Entry Button */}
      <button
        onClick={onOpenEquipment}
        className="shrink-0 bg-black/40 border border-gray-800/60 p-3 rounded-sm backdrop-blur-sm hover:border-cyan-500/40 hover:bg-cyan-950/5 active:scale-[0.99] transition-all duration-300 group text-left"
      >
        <div className="flex justify-between items-center">
          <div className="text-[9px] font-mono text-cyan-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-600 rotate-45"></span>
            LOADOUT_CONFIG
          </div>
          <span className="text-[8px] text-gray-500 font-mono group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all">OPEN ▸</span>
        </div>
        <div className="mt-1.5 flex items-center gap-4">
          <span className="text-[10px] font-mono text-gray-400 tabular-nums">
            <span className="text-cyan-400 font-bold">{equip.equipped}</span>
            <span className="text-gray-600"> / {equip.total}</span>
            <span className="text-gray-600 ml-1">EQUIPPED</span>
          </span>
          <span className="text-[10px] font-mono text-gray-600 tabular-nums">{player.dynamic.inventory.length}/10 BACKPACK</span>
        </div>
        <div className="mt-1.5 flex gap-2 text-[9px] font-mono text-gray-500">
          {equip.weapons.filter(Boolean).slice(0, 2).map((w, i) => (
            <span key={`wp-${i}`} className="bg-gray-900/50 px-1.5 py-0.5 border border-gray-800 rounded-sm truncate max-w-[120px]">{w?.name}</span>
          ))}
          {equip.armors.filter(Boolean).slice(0, 1).map((a, i) => (
            <span key={`ar-${i}`} className="bg-gray-900/50 px-1.5 py-0.5 border border-gray-800 rounded-sm truncate max-w-[120px]">{a?.name}</span>
          ))}
          {equip.accessories.filter(Boolean).slice(0, 1).map((a, i) => (
            <span key={`ac-${i}`} className="bg-gray-900/50 px-1.5 py-0.5 border border-gray-800 rounded-sm truncate max-w-[120px]">{a?.name}</span>
          ))}
        </div>
      </button>

      {/* Squad Monitor */}
      <div className="flex-1 md:min-h-0 bg-black/20 border border-gray-800/60 rounded-sm backdrop-blur-sm flex flex-col overflow-hidden hover:border-gray-700 transition-colors duration-300">
        <div className="shrink-0 px-3 py-1.5 bg-gray-900/30 border-b border-gray-800/50 flex items-center justify-between">
          <div className="text-[9px] font-mono text-emerald-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
            SQUAD_UPLINK
          </div>
          <span className="text-[8px] text-gray-600 font-mono tabular-nums">{aliveCompanions.length} UNIT(S)</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          {aliveCompanions.length > 0 ? (
            aliveCompanions.map(c => {
              // 上限取动态值（同伴预设装备会改变上限），并防御除零
              const maxHp = c.dynamic.maxHp > 0 ? c.dynamic.maxHp : 1;
              const hpPercent = (c.dynamic.hp / maxHp) * 100;
              const critical = hpPercent <= 30;
              return (
                <button
                  key={c.static.id}
                  onClick={() => onInteractWithCompanion(c)}
                  className="w-full relative group border border-gray-800/50 bg-[#121215]/80 hover:border-cyan-500/40 hover:bg-cyan-950/10 active:scale-[0.98] transition-all rounded-sm overflow-hidden text-left p-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black/60 border border-gray-700 rounded-sm overflow-hidden flex-shrink-0">
                      {c.dynamic.imageUrl ? (
                        <img src={c.dynamic.imageUrl} alt={c.static.name} draggable={false} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-mono font-bold">
                          {c.static.name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-gray-200 truncate">{c.static.name}</div>
                      <div className="text-[8px] text-gray-500 font-mono uppercase">{c.static.style}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-[9px] font-mono tabular-nums ${critical ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                        {Math.round(c.dynamic.hp)}/{Math.round(maxHp)}
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 h-[2px] bg-red-900/30 w-full">
                    <div className={`h-full transition-all duration-500 ${critical ? 'bg-red-500 animate-pulse' : 'bg-red-500/60'}`} style={{ width: `${hpPercent}%` }}></div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-700 space-y-2 border border-dashed border-gray-800/50 rounded">
              <div className="text-2xl opacity-20 font-mono">◎</div>
              <div className="text-[9px] font-mono">NO_SIGNAL</div>
            </div>
          )}
        </div>
      </div>

      {/* System Telemetry Footer */}
      <div className="shrink-0 bg-black/40 border-t border-gray-800/50 p-1.5 flex justify-between text-[8px] font-mono text-gray-600 uppercase tracking-widest backdrop-blur-sm tabular-nums">
        <span>UPTIME: T+{player.currentGameRound.absoluteTick}</span>
        <span>DEPTH: {player.currentGameRound.explorationStep}</span>
        <span>KILLS: {player.killCount}</span>
        <span>SEARCH: {player.searchCount}</span>
      </div>
    </div>
  );
};

// =====================
// 状态总控制面板 (Status Panel Main Component)
// =====================

interface StatusPanelProps {
  player: PlayerState;
  settings: Settings;
  onInteractWithCompanion: (npc: Entity<NpcTemplate, NpcDynamicState>) => void;
  onManualGen?: () => void;
  isGenerating?: boolean;
  onLevelUp?: (targetId: string, attr: string) => void;
  onRandomSwitch?: () => Promise<string | null>;
  pendingTacticOptions?: Tactic[] | null;
  onSelectTactic?: (tacticId: string) => void;
  onUnequipItem?: (item: ItemInstance) => void;
}

const StatusPanel: React.FC<StatusPanelProps> = ({
  player,
  settings,
  onInteractWithCompanion,
  onManualGen,
  isGenerating,
  onLevelUp,
  onRandomSwitch,
  pendingTacticOptions,
  onSelectTactic,
  onUnequipItem,
}) => {
  const [showLevelManager, setShowLevelManager] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);

  // 武器槽恒为 2（元组硬约束）；护甲 / 饰品槽位读取全局配置 equipmentSlots
  const equip = useMemo<EquipSummary>(() => {
    const n = normalizeEquipState(player.dynamic.equipment, settings.gameConfig);
    const all = [...n.weapons, ...n.armors, ...n.accessories];
    return {
      weapons: [...n.weapons],
      armors: n.armors,
      accessories: n.accessories,
      equipped: all.filter(Boolean).length,
      total: all.length,
    };
  }, [player.dynamic.equipment, settings.gameConfig]);

  const canAnyLevelUp = useMemo(() => {
    if (player.dynamic.xp >= getXpCost(player.dynamic.level)) return true;
    return player.companions
      .filter((c: Entity<NpcTemplate, NpcDynamicState>) => c.dynamic.hp > 0)
      .some(c => player.dynamic.xp >= getXpCost(c.dynamic.level || 1));
  }, [player.dynamic.xp, player.dynamic.level, player.companions]);

  const zt = player.currentZoneTime;

  return (
    <div className="w-full h-full flex flex-col bg-transparent overflow-hidden relative font-sans">
      {/* Level Manager Overlay */}
      {showLevelManager && (
        <LevelManager player={player} onClose={() => setShowLevelManager(false)} onLevelUp={onLevelUp} />
      )}

      {/* Equipment Overlay */}
      {showEquipment && (
        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gradient-to-r from-gray-900 to-black shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-cyan-500/30 flex items-center justify-center bg-cyan-500/10 text-cyan-500 rounded-sm font-mono text-xs">EQ</div>
              <div>
                <h2 className="text-sm font-mono text-white font-bold tracking-[0.2em] uppercase">Loadout Configuration</h2>
                <div className="text-[9px] font-mono text-gray-500 tracking-wider tabular-nums">
                  {equip.equipped} / {equip.total} SLOTS EQUIPPED · BACKPACK {player.dynamic.inventory.length}/10
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowEquipment(false)}
              className="w-10 h-10 flex items-center justify-center border border-gray-700 text-gray-400 hover:text-white hover:border-gray-400 hover:bg-gray-800 transition-all rounded-sm active:scale-95"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-[#050505]">
            <section>
              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-800/50">
                <span className="w-1 h-3 bg-red-500"></span>
                <h3 className="text-xs font-mono text-red-500 uppercase tracking-widest">Weapons · {equip.weapons.length} Slots</h3>
              </div>
              <div className="space-y-2">
                {equip.weapons.map((item, i) => (
                  <EquipmentSlot key={`wep-${i}`} label={`SLOT ${i + 1}`} item={item ?? undefined} type="weapon" onUnequip={onUnequipItem} />
                ))}
              </div>
            </section>
            {equip.armors.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-800/50">
                  <span className="w-1 h-3 bg-blue-500"></span>
                  <h3 className="text-xs font-mono text-blue-500 uppercase tracking-widest">Armor · {equip.armors.length} Slots</h3>
                </div>
                <div className="space-y-2">
                  {equip.armors.map((item, i) => (
                    <EquipmentSlot key={`arm-${i}`} label={`SLOT ${i + 1}`} item={item ?? undefined} type="armor" onUnequip={onUnequipItem} />
                  ))}
                </div>
              </section>
            )}
            {equip.accessories.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-gray-800/50">
                  <span className="w-1 h-3 bg-purple-500"></span>
                  <h3 className="text-xs font-mono text-purple-500 uppercase tracking-widest">Accessories · {equip.accessories.length} Slots</h3>
                </div>
                <div className="space-y-2">
                  {equip.accessories.map((item, i) => (
                    <EquipmentSlot key={`acc-${i}`} label={`SLOT ${i + 1}`} item={item ?? undefined} type="accessory" onUnequip={onUnequipItem} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* Tactic Selection Overlay */}
      {pendingTacticOptions && pendingTacticOptions.length > 0 && (
        <div className="absolute inset-0 z-[110] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="h-20 border-b border-purple-900/40 flex items-center justify-between px-6 bg-gradient-to-r from-[#0a0a12] to-black shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-purple-500/30 flex items-center justify-center bg-purple-500/10 text-purple-400 rounded-sm font-mono text-sm">✦</div>
              <div>
                <h2 className="text-base font-mono text-white font-bold tracking-[0.15em] uppercase">Tactic Unlocked</h2>
                <div className="text-[10px] font-mono text-purple-400/70 tracking-wider">从以下战术中选择一个学习</div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#050510] flex items-center justify-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              {pendingTacticOptions.map((tactic) => {
                const isAttack = tactic.type === 'attack';
                return (
                  <button
                    key={tactic.id}
                    onClick={() => { AudioService.playSfx('ui_click'); onSelectTactic?.(tactic.id); }}
                    className={`group relative flex flex-col items-center p-5 rounded-sm border transition-all duration-300 text-left hover:-translate-y-1 active:scale-[0.98] ${isAttack
                      ? 'border-red-900/40 bg-red-950/10 hover:border-red-500/50 hover:bg-red-950/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                      : 'border-blue-900/40 bg-blue-950/10 hover:border-blue-500/50 hover:bg-blue-950/20 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                      }`}
                  >
                    <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-bl-sm ${isAttack ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {isAttack ? 'ATTACK' : 'DEFENSE'}
                    </div>
                    <div className={`text-lg font-mono font-bold ${isAttack ? 'text-red-400' : 'text-blue-400'} group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all mb-3`}>
                      {tactic.name}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed text-center mb-4 font-mono">{tactic.desc}</p>
                    <div className="w-full space-y-1">
                      {tactic.tacticEffect?.map((eff, ei) => {
                        const [target, attr, val, dur] = eff as [string, string, number, number | undefined];
                        const valStr = typeof val === 'number' ? (val > 0 ? `+${val}` : `${val}`) : '';
                        const durStr = dur !== undefined ? ` · ${dur}回合` : '';
                        const targetLabel = target === 'self' ? '自身'
                          : target === 'all_allies' ? '全体'
                            : target === 'enemy' ? '敌方'
                              : target;
                        return (
                          <div key={ei} className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-gray-600">{targetLabel} · {attr.toUpperCase()}</span>
                            <span className={typeof val === 'number' && val > 0 ? 'text-emerald-400' : 'text-red-400'}>{valStr}{durStr}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-800/50 w-full flex justify-between items-center">
                      <span className="text-[10px] font-mono text-gray-600">AP</span>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold tabular-nums">{tactic.apCost} AP</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top Header — 紧贴顶部，零上边距 */}
      <div className="shrink-0 h-12 px-4 border-b border-cyan-900/30 bg-gradient-to-r from-black via-gray-900/80 to-transparent flex justify-between items-center backdrop-blur-md relative z-20">
        <div className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent pointer-events-none"></div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-cyan-500 rounded-sm animate-pulse shadow-[0_0_10px_#06b6d4]"></div>
            <div className="absolute inset-0 border border-cyan-400 scale-150 opacity-30 animate-ping rounded-sm"></div>
          </div>
          <div>
            <h2 className="text-sm font-mono text-cyan-100 uppercase tracking-[0.3em] font-bold drop-shadow-[0_0_5px_rgba(6,182,212,0.5)] leading-none">TACTICAL_DASHBOARD</h2>
            <div className="text-[9px] text-cyan-700 font-mono tracking-widest flex gap-3 mt-1">
              <span className="text-gray-400 font-bold">{player.static.name.toUpperCase()}</span>
              <span className="opacity-50">|</span>
              <span>CLASS: {player.static.style.toUpperCase()}</span>
              <span className="opacity-50 hidden lg:inline">|</span>
              <span className="text-emerald-600 hidden lg:inline">ONLINE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zone Time Live Readout */}
          <div className="hidden md:flex flex-col items-end leading-none">
            <span className="text-[7px] font-mono text-gray-600 uppercase tracking-widest mb-0.5">ZONE_TIME</span>
            <span className="text-[11px] font-mono text-cyan-300 tabular-nums">D{zt.day}·C{zt.cycle}·T{zt.tick}</span>
          </div>

          {/* XP / Upgrade Button */}
          <button
            onClick={() => { AudioService.playSfx('ui_click'); setShowLevelManager(true); }}
            className={`group relative flex items-center gap-3 px-3 py-1.5 rounded-sm border transition-all duration-300 active:scale-[0.97] ${canAnyLevelUp
              ? 'bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-900/60 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-black/40 border-gray-800 hover:border-gray-600 hover:bg-gray-900/60'
              }`}
          >
            <div className="flex flex-col items-end leading-none">
              <div className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mb-1 group-hover:text-gray-400 transition-colors">XP POOL</div>
              <div className={`text-sm font-mono font-bold tracking-wider tabular-nums ${canAnyLevelUp ? 'text-emerald-400 text-shadow-green' : 'text-gray-300'}`}>
                {player.dynamic.xp}
              </div>
            </div>
            <div className={`w-7 h-7 flex items-center justify-center rounded-sm border transition-all ${canAnyLevelUp
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 animate-pulse'
              : 'border-gray-700 bg-gray-800 text-gray-500'
              }`}
            >
              <span className="text-xs">▲</span>
            </div>
            {canAnyLevelUp && (
              <>
                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-emerald-400 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-emerald-400 pointer-events-none"></div>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Grid — 桌面端锁定单屏，移动端纵向滚动 */}
      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar p-3 relative">
        {/* Layered Ambient Background */}
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/[0.04] rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] bg-purple-500/[0.04] rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.5))]"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-full max-w-[1600px] mx-auto">
          <BioColumn
            player={player}
            onManualGen={onManualGen}
            isGenerating={isGenerating}
            onRandomSwitch={onRandomSwitch}
          />
          <StatsColumn player={player} />
          <LogisticsColumn
            player={player}
            equip={equip}
            onInteractWithCompanion={onInteractWithCompanion}
            onOpenEquipment={() => setShowEquipment(true)}
          />
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;