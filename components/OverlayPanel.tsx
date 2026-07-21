/**
 * OverlayPanel - 统一全屏覆盖面板
 *
 * 职责：
 * - 统一承载主菜单、过场、加载、结局等全屏场景。
 * - 让各类覆盖层共享同一套背景特效与分发入口。
 * - 将复杂谜题逻辑收敛到独立组件，避免覆盖层容器继续膨胀。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NodeTemplate, OverlayType } from '../meta';
import { ORIGIN_TEMPLATES } from '../constants/origin';
import { AudioService } from '../services';

interface OverlayPanelProps {
  /** 覆盖层显示类型 */
  type: OverlayType;

  // 主菜单数据
  onOpenSettings?: () => void;
  onInitGame?: (originId: string) => void;

  // 过场动画数据
  node?: NodeTemplate;
  nodeId?: string;
  onCutsceneComplete?: () => void;

  // 游戏结束数据
  deathReason?: string;
  onReset?: () => void;

  // 过渡/加载文本
  transitionText?: string;
  status?: string;
  modelName?: string;
  startTime?: number;
  error?: string;
  onCancel?: () => void;

}

const OverlayPanel: React.FC<OverlayPanelProps> = (props) => {
  const { type } = props;

  if (type === 'menu') {
    return <MainMenuContent {...props} />;
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-[#030305]" />
      <BackgroundEffects type={type} />
      <div className="absolute inset-0 pointer-events-none overlay-scanlines" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {type === 'cutscene' && <CutsceneContent {...props} />}
        {type === 'gameover' && <GameOverContent {...props} />}
        {type === 'transition' && <TransitionContent {...props} />}
        {type === 'loading' && <GenerationContent {...props} />}
      </div>
    </div>
  );
};

const BackgroundEffects: React.FC<{ type: OverlayType }> = ({ type }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; speed: number }>>([]);

  useEffect(() => {
    const count = type === 'gameover' ? 30 : 15;
    const nextParticles = Array.from({ length: count }, (_, index) => ({
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 20 + 10
    }));
    setParticles(nextParticles);
  }, [type]);

  const bgColor = useMemo(() => {
    switch (type) {
      case 'gameover':
        return 'rgba(80, 0, 0, 0.15)';
      case 'cutscene':
        return 'rgba(0, 40, 60, 0.1)';
      default:
        return 'rgba(30, 30, 40, 0.1)';
    }
  }, [type]);

  const particleColor = useMemo(() => {
    switch (type) {
      case 'gameover':
        return 'bg-red-500/30';
      case 'cutscene':
        return 'bg-cyan-500/20';
      default:
        return 'bg-gray-500/20';
    }
  }, [type]);

  return (
    <>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 30%, ${bgColor} 0%, transparent 60%)` }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 70%, ${bgColor} 0%, transparent 60%)` }} />

      {particles.map(particle => (
        <div
          key={particle.id}
          className={`absolute rounded-full ${particleColor} animate-float-particle`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            animationDuration: `${particle.speed}s`,
            animationDelay: `${-particle.id * 0.5}s`
          }}
        />
      ))}

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px] animate-grid-drift" />
    </>
  );
};

const MainMenuContent: React.FC<OverlayPanelProps> = ({ onOpenSettings, onInitGame }) => {
  const [selectedOriginId, setSelectedOriginId] = useState<string>(ORIGIN_TEMPLATES[0].id);

  return (
    <div className="h-screen w-full bg-[#09090b] flex flex-col items-center justify-center relative overflow-hidden font-serif">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(50,0,0,0.15),transparent)] z-0" />

      <div className="z-10 text-center mb-8">
        <h1 className="text-7xl md:text-9xl text-gray-100 font-bold tracking-tighter mb-4 mix-blend-screen text-glow-red glitch-container">
          THE ZONE
        </h1>
      </div>

      <div className="z-10 w-full max-w-5xl px-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {ORIGIN_TEMPLATES.map(origin => {
            const companionName = Array.isArray(origin.companion)
              ? origin.companion[0]?.name
              : (origin.companion as { name?: string } | undefined)?.name;

            return (
              <button
                key={origin.id}
                onClick={() => setSelectedOriginId(origin.id)}
                className={`p-5 border rounded-sm transition-all text-left group relative overflow-hidden flex flex-col h-48 ${selectedOriginId === origin.id
                  ? 'bg-red-950/20 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                  : 'bg-black/40 border-gray-800 hover:border-gray-500'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`text-xl font-bold font-serif ${selectedOriginId === origin.id ? 'text-red-100' : 'text-gray-400 group-hover:text-gray-200'}`}>
                    {origin.title}
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 font-mono mb-2 flex gap-2">
                  <span className="bg-gray-900 px-1 border border-gray-800">{origin.player.style.toUpperCase()}</span>
                </div>

                <div className="text-xs text-gray-400 font-serif leading-relaxed opacity-80 line-clamp-3">
                  {origin.desc}
                </div>

                {origin.companion && (
                  <div className="mt-auto pt-2 border-t border-gray-800/50 flex items-center gap-2 opacity-70">
                    <span className="text-lg">同伴</span>
                    <span className="text-[10px] font-mono text-gray-500">
                      {companionName}
                    </span>
                  </div>
                )}

                {selectedOriginId === origin.id && (
                  <div className="absolute top-0 right-0 p-1 bg-red-900/50 text-red-200 text-[9px] font-mono">SELECTED</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
          <button
            onClick={onOpenSettings}
            className="w-full py-3 bg-gray-900/40 border border-gray-700 hover:border-emerald-500 hover:bg-emerald-950/10 text-emerald-500 font-mono text-xs flex items-center justify-center gap-2 transition-all rounded-sm backdrop-blur-sm"
          >
            [系统配置]
          </button>

          <button
            onClick={() => onInitGame?.(selectedOriginId)}
            className="w-full py-5 bg-red-950/20 border border-red-900/50 hover:bg-red-900/40 hover:border-red-500 text-red-500 hover:text-red-200 transition-all uppercase tracking-[0.2em] font-bold text-lg btn-scan mt-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
          >
            启动序列
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 text-center text-gray-700 text-[9px] font-mono opacity-60">
        AI-DIRECTED SURVIVAL HORROR // HYBRID AI MODE
      </div>
    </div>
  );
};

const CutsceneContent: React.FC<OverlayPanelProps> = ({ node, nodeId, onCutsceneComplete }) => {
  const [stage, setStage] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!node) return;

    let mounted = true;
    const addTimer = (fn: () => void, ms: number) => {
      const timerId = setTimeout(() => {
        if (mounted) fn();
      }, ms);
      timerRef.current.push(timerId);
      return timerId;
    };

    const sequence = async () => {
      await new Promise<void>(resolve => {
        addTimer(() => resolve(), 100);
      });
      if (!mounted) return;
      AudioService.playSfx('scan');

      setGlitchActive(true);
      await new Promise<void>(resolve => {
        addTimer(() => resolve(), 200);
      });
      setGlitchActive(false);

      await new Promise<void>(resolve => {
        addTimer(() => resolve(), 100);
      });
      if (!mounted) return;
      setStage(1);

      await new Promise<void>(resolve => {
        addTimer(() => resolve(), 1000);
      });
      if (!mounted) return;
      setStage(2);
      AudioService.playSfx('text');

      await new Promise<void>(resolve => {
        addTimer(() => resolve(), 800);
      });
      if (!mounted) return;
      setStage(3);
    };

    sequence();

    return () => {
      mounted = false;
      timerRef.current.forEach(clearTimeout);
      timerRef.current = [];
    };
  }, [node, nodeId]);

  if (!node) return null;

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-8 cursor-pointer select-none ${glitchActive ? 'animate-glitch-shake' : ''}`}
      onClick={stage >= 3 ? onCutsceneComplete : undefined}
    >
      <div className="max-w-5xl w-full flex flex-col items-center">
        <div className={`transition-all duration-1000 ${stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <span className="text-[10px] font-mono text-cyan-500/60 tracking-[0.5em] uppercase">Sector Entry</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>

          <h1 className={`text-5xl md:text-7xl font-bold text-gray-100 mb-3 tracking-tight font-serif text-center ${stage >= 1 ? 'animate-text-glow' : ''}`}>
            {node.name}
          </h1>

          <div className="text-[10px] font-mono text-gray-600 tracking-[0.3em] text-center">
            {nodeId?.toUpperCase()}
          </div>
        </div>

        <div className={`transition-all duration-700 mt-8 max-w-3xl ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-gray-300 text-lg font-serif leading-relaxed text-center italic">
            {node.desc}
          </p>
        </div>

        <div className={`mt-12 transition-all duration-500 ${stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="group relative px-8 py-3 bg-cyan-950/30 border border-cyan-800/50 hover:bg-cyan-900/40 hover:border-cyan-600/60 transition-all cursor-pointer overflow-hidden rounded">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <span className="text-xs font-mono tracking-[0.3em] text-cyan-400 group-hover:text-cyan-300 uppercase relative z-10">
              开始探索
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const GameOverContent: React.FC<OverlayPanelProps> = ({ deathReason, onReset }) => {
  const [stage, setStage] = useState(0);
  const [glitchText, setGlitchText] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    AudioService.playSfx('scare');

    let mounted = true;
    const addTimer = (fn: () => void, ms: number) => {
      const timerId = setTimeout(() => {
        if (mounted) fn();
      }, ms);
      timerRef.current.push(timerId);
      return timerId;
    };

    const sequence = async () => {
      await new Promise<void>(resolve => {
        addTimer(() => resolve(), 300);
      });
      setStage(1);
      await new Promise<void>(resolve => {
        addTimer(() => resolve(), 800);
      });
      setStage(2);
      await new Promise<void>(resolve => {
        addTimer(() => resolve(), 600);
      });
      setStage(3);
    };

    sequence();

    const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>/?~`█▓▛▅';
    const intervalId = setInterval(() => {
      setGlitchText(Array(30).fill(0).map(() => glitchChars[Math.floor(Math.random() * glitchChars.length)]).join(''));
    }, 100);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      timerRef.current.forEach(clearTimeout);
      timerRef.current = [];
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <div className="text-red-900/10 text-[200px] font-bold font-mono whitespace-nowrap animate-glitch-text">
          {glitchText}
        </div>
      </div>

      <div className={`transition-all duration-1000 ${stage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
        <h1 className="text-6xl md:text-8xl font-bold text-red-600 tracking-[0.2em] mb-4 font-mono animate-text-glow-red">
          终结
        </h1>
        <div className="text-red-500/50 text-xs font-mono tracking-[0.5em] uppercase">
          NEURAL_LINK::TERMINATED
        </div>
      </div>

      <div className={`mt-8 max-w-2xl transition-all duration-700 ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="border border-red-900/40 bg-red-950/20 p-6 rounded">
          <div className="text-[10px] font-mono text-red-500/60 uppercase tracking-widest mb-2">
            终止原因
          </div>
          <p className="text-gray-300 font-serif text-xl italic leading-relaxed">
            "{deathReason}"
          </p>
        </div>
      </div>

      <div className={`mt-12 transition-all duration-500 ${stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button
          onClick={onReset}
          className="group relative px-10 py-4 bg-red-950/30 border border-red-800/50 hover:bg-red-900/40 hover:border-red-600/60 transition-all cursor-pointer overflow-hidden rounded"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <span className="text-sm font-mono tracking-[0.3em] text-red-400 group-hover:text-red-300 uppercase relative z-10">
            重启系统
          </span>
        </button>
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <div className="text-[8px] font-mono text-red-900/40 tracking-widest">
          CONNECTION_LOST // SIGNAL_TERMINATED // REALITY_COLLAPSED
        </div>
      </div>
    </div>
  );
};

const TransitionContent: React.FC<OverlayPanelProps> = ({ transitionText }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-cyan-500 text-sm font-mono tracking-widest animate-pulse">
        {transitionText || 'LOADING...'}
      </div>
      <div className="mt-4 w-32 h-1 bg-gray-800 rounded overflow-hidden">
        <div className="h-full bg-cyan-500 animate-loading-bar" />
      </div>
    </div>
  );
};

const GenerationContent: React.FC<OverlayPanelProps> = ({
  status,
  modelName,
  startTime,
  error,
  onCancel
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const intervalId = setInterval(() => setElapsed(Date.now() - startTime), 50);
    return () => clearInterval(intervalId);
  }, [startTime]);

  const formatElapsed = (ms: number): string => `${(ms / 1000).toFixed(2)}s`;
  const formatStatus = (value: string): string => value.replace(/\.+$/, '').split('::')[0].replace(/_/g, ' ');

  return (
    <div className="flex flex-col items-center gap-8 max-w-lg w-full px-6">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <span className="text-[10px] font-mono text-zinc-400 tracking-wider uppercase">
          Running on {modelName}
        </span>
      </div>

      <div className="flex flex-col items-center text-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-zinc-200 border-r-zinc-200 border-b-transparent border-l-transparent animate-spin" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
            {status ? formatStatus(status) : 'WORLD_CONSTRUCTION'}
          </h2>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            {status && status !== formatStatus(status) ? status : 'PROCESSING NEURAL MATRIX...'}
          </p>
        </div>
      </div>

      <div className="text-zinc-600 font-mono text-sm tabular-nums">
        {formatElapsed(elapsed)}
      </div>

      {error && (
        <div className="w-full p-4 rounded bg-red-950/20 border border-red-900/50 text-red-400 text-sm font-mono text-center">
          Error: {error}
        </div>
      )}

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 px-6 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-all border border-transparent hover:border-zinc-700"
        >
          Cancel Operation
        </button>
      )}
    </div>
  );
};

export default OverlayPanel;
