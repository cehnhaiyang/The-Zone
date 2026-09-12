import React, { useEffect, useMemo } from 'react';
import type { Puzzle } from '../meta';
import type { PuzzleInteractionController } from '../hooks/useInteraction';

interface PuzzlePanelProps {
  puzzle: Puzzle;
  controller: PuzzleInteractionController;
  onClose?: () => void;
}

const TYPE_LABEL: Record<Puzzle['body']['type'], string> = {
  type: '键入',
  choice: '选择',
  cloze: '填空',
};

const formatTime = (t: number): string => {
  const total = Math.max(0, Math.floor(t));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const LockIcon: React.FC = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UnlockIcon: React.FC = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);

const KeypadInput: React.FC<{ controller: PuzzleInteractionController }> = ({ controller }) => {
  const locked = controller.status !== 'idle';
  const handlePress = (key: string) => {
    if (locked) return;
    if (key === 'CLR') controller.handleInputChange('');
    else if (key === 'DEL') controller.handleInputChange(controller.input.slice(0, -1));
    else if (controller.input.length < 12) controller.handleInputChange(controller.input + key);
  };
  const numBtn =
    'h-11 border border-gray-800 bg-[#101114] text-cyan-400 hover:bg-cyan-950/40 hover:border-cyan-600 hover:text-cyan-200 hover:shadow-[0_0_10px_rgba(34,211,238,0.15)] font-mono text-lg active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none';
  return (
    <>
      <div
        className={`w-full bg-black/80 border-2 h-14 flex items-center justify-center px-4 font-mono text-xl tracking-[0.35em] transition-colors ${controller.status === 'error'
          ? 'border-red-600 text-red-500'
          : controller.status === 'success'
            ? 'border-emerald-500 text-emerald-400'
            : 'border-cyan-800/50 text-cyan-100'
          }`}
      >
        <div className="w-full text-center">
          {controller.input.split('').map(() => '•').join('')}
          {controller.status === 'idle' && <span className="animate-pulse opacity-50 ml-1">_</span>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-6 mt-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} disabled={locked} onClick={() => handlePress(String(n))} className={numBtn}>
            {n}
          </button>
        ))}
        <button
          disabled={locked}
          onClick={() => handlePress('CLR')}
          className="h-11 border border-red-900/40 text-red-400 hover:bg-red-950/30 hover:border-red-700 text-[10px] font-mono tracking-widest active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          CLR
        </button>
        <button disabled={locked} onClick={() => handlePress('0')} className={numBtn}>
          0
        </button>
        <button
          disabled={locked}
          onClick={() => handlePress('DEL')}
          className="h-11 border border-amber-900/40 text-amber-400 hover:bg-amber-950/30 hover:border-amber-700 text-[10px] font-mono tracking-widest active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          DEL
        </button>
      </div>
    </>
  );
};

const MultiChoiceInput: React.FC<{ puzzle: Puzzle; controller: PuzzleInteractionController }> = ({
  puzzle,
  controller,
}) => {
  if (puzzle.body.type !== 'choice') return null;
  const locked = controller.status !== 'idle';
  return (
    <div className="space-y-3 mb-6">
      {puzzle.body.body.map((option, index) => {
        const selected = controller.selectedOptions.includes(index);
        return (
          <button
            key={index}
            disabled={locked}
            onClick={() => controller.handleOptionSelect(index)}
            className={`w-full p-3.5 border text-left font-mono text-sm flex items-center gap-2 transition-all duration-200 disabled:pointer-events-none ${selected
              ? 'border-cyan-400 bg-cyan-950/40 text-cyan-100 pl-5 shadow-[0_0_14px_rgba(34,211,238,0.15)]'
              : 'border-gray-800 bg-[#101114] text-gray-400 hover:border-cyan-700 hover:text-cyan-200 hover:translate-x-1'
              }`}
          >
            <span className={selected ? 'text-amber-400 mr-1' : 'text-cyan-600 mr-1'}>
              [{String(index + 1).padStart(2, '0')}]
            </span>
            <span className="flex-1">{option}</span>
            {selected && (
              <span className="text-[8px] tracking-[0.25em] text-cyan-400">LOCKED_IN</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

const ClozePatternInput: React.FC<{ puzzle: Puzzle; controller: PuzzleInteractionController }> = ({
  puzzle,
  controller,
}) => {
  const grid = useMemo(() => {
    if (puzzle.body.type !== 'cloze') return [];
    // 空白格必须使用扁平下标（body 展开后的绝对位置），与 useInteraction
    // 的 clozeBlankIndices / patternInput 语义一致；历史实现按显示顺序
    // 编号（0,1,2...）导致除"扁平下标恰好等于顺序号"的格子外全部无法交互。
    let flat = 0;
    return puzzle.body.body.map((row) =>
      row.map((cell) => {
        const idx = flat++;
        return cell !== ''
          ? { fixed: true as const, value: cell }
          : { fixed: false as const, index: idx };
      })
    );
  }, [puzzle]);

  if (puzzle.body.type !== 'cloze') return null;
  const locked = controller.status !== 'idle';
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col items-center gap-1.5 p-4 bg-black/50 border border-cyan-900/30 overflow-x-auto">
        {grid.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((cell, c) =>
              cell.fixed ? (
                <div
                  key={c}
                  className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center border border-cyan-900/50 bg-cyan-950/20 text-cyan-200 font-mono text-lg select-none"
                >
                  {cell.value}
                </div>
              ) : (
                <button
                  key={c}
                  disabled={locked}
                  onClick={() => controller.handlePatternClick(cell.index)}
                  className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center border font-mono text-lg transition-all active:scale-90 disabled:pointer-events-none ${controller.patternInput[cell.index]
                    ? 'border-amber-500/70 bg-amber-950/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'border-dashed border-cyan-700/60 bg-black/60 text-cyan-600 hover:border-cyan-400 hover:text-cyan-300 hover:shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                    }`}
                >
                  {controller.patternInput[cell.index] || '?'}
                </button>
              )
            )}
          </div>
        ))}
      </div>
      <div className="text-[10px] font-mono text-gray-500 text-center tracking-wider">
        点击格子循环切换符号，重建正确图案。
      </div>
    </div>
  );
};

const PuzzlePanel: React.FC<PuzzlePanelProps> = ({ puzzle, controller, onClose }) => {
  const isNumericAnswer = puzzle.body.type === 'type' && /^\d+$/.test(puzzle.body.answer);
  const timeLimit = puzzle.restrictions.timeLimit ?? 0;
  const hasTimeLimit = timeLimit > 0;
  const timeRatio = hasTimeLimit ? Math.max(0, Math.min(1, controller.timeLeft / timeLimit)) : 1;
  const timeCritical = hasTimeLimit && controller.timeLeft < 10;
  const remainingAttempts = Math.max(0, controller.maxAttempts - controller.attempts);

  const matrixBits = useMemo(
    () => Array.from({ length: 2600 }, () => (Math.random() > 0.5 ? '1' : '0')).join(''),
    []
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && controller.status === 'idle') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller.status, onClose]);

  const lockTone =
    controller.status === 'success'
      ? 'text-emerald-400 drop-shadow-[0_0_16px_rgba(52,211,153,0.45)]'
      : controller.status === 'error'
        ? 'text-red-500 drop-shadow-[0_0_16px_rgba(239,68,68,0.45)]'
        : 'text-cyan-400 drop-shadow-[0_0_16px_rgba(34,211,238,0.35)]';

  return (
    <div
      className={`fixed inset-0 z-50 w-full h-full bg-[#07080b] text-cyan-100 flex flex-col overflow-hidden ${controller.isShaking ? 'animate-shake-puzzle' : ''
        }`}
    >
      {/* 环境层：矩阵雨 / 扫描线 / 暗角 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 left-0 w-full text-[8px] font-mono text-cyan-500 leading-[1.4] whitespace-pre-wrap break-all animate-matrix-scroll">
          {matrixBits}
        </div>
      </div>
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, #000 3px, #000 4px)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.9) 100%)',
        }}
      />

      {/* 顶部状态条 */}
      <header className="relative z-10 shrink-0 border-b border-cyan-900/40 bg-[#0a0b0e]/90">
        <div className="flex items-center justify-between h-10 px-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-1.5 h-1.5 rounded-full ${controller.status === 'success'
                ? 'bg-emerald-400'
                : controller.status === 'error'
                  ? 'bg-red-500'
                  : 'bg-cyan-400 animate-pulse'
                }`}
            />
            <span className="text-[9px] font-mono tracking-[0.3em] text-cyan-500/70">
              SECURE_TERMINAL_V5 // ABYSS_PROTOCOL
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono tracking-widest px-2 py-0.5 border border-cyan-900/60 bg-cyan-950/30 text-cyan-300">
              {puzzle.body.type.toUpperCase()}_{TYPE_LABEL[puzzle.body.type]}
            </span>
            {hasTimeLimit && (
              <span
                className={`text-[10px] font-mono tabular-nums ${timeCritical ? 'text-red-400 animate-pulse' : 'text-amber-400/80'
                  }`}
              >
                T-{formatTime(controller.timeLeft)}
              </span>
            )}
          </div>
        </div>
        {hasTimeLimit ? (
          <div className="h-0.5 w-full bg-gray-900">
            <div
              className={`h-full transition-[width] duration-1000 ease-linear ${timeCritical ? 'bg-red-500' : 'bg-cyan-500/60'
                }`}
              style={{ width: `${timeRatio * 100}%` }}
            />
          </div>
        ) : (
          <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        )}
      </header>

      {/* 主区域 */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* 左栏：封印状态 / 标题 / 背景叙事 / 提示 */}
        <section className="w-full md:w-1/2 md:min-h-0 p-6 lg:p-10 border-b md:border-b-0 md:border-r border-cyan-900/30 bg-[#0b0c0f]/85 flex flex-col md:overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-cyan-500/40 tracking-[0.25em]">
              CIPHER_LOCK_INTERFACE
            </span>
            <span className="text-[9px] font-mono text-gray-600 tabular-nums">
              ATTEMPTS {controller.attempts}/{controller.maxAttempts}
            </span>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-gray-600 mb-6">
            <span>COST/ATTEMPT :: {puzzle.restrictions?.timeCostPerAttempt ?? 0} TICKS</span>
            <span>{puzzle.hints?.length ?? 0} HINTS_CACHED</span>
          </div>

          <div className="flex justify-center mb-5">
            <div className={`transition-colors duration-500 ${lockTone}`}>
              {controller.status === 'success' ? <UnlockIcon /> : <LockIcon />}
            </div>
          </div>

          <h2 className="text-2xl lg:text-3xl font-bold font-mono tracking-[0.2em] text-center uppercase text-shadow-cyan text-cyan-100 mb-2">
            {puzzle.title}
          </h2>
          <div className="text-center text-[9px] font-mono text-cyan-600/60 tracking-[0.45em] mb-6">
            // SECURITY_BARRIER //
          </div>

          <div className="bg-black/40 border border-cyan-900/30 p-4 font-serif italic text-gray-400 text-sm leading-relaxed text-center mb-5 relative">
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t border-l border-amber-600/70" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b border-r border-amber-600/70" />
            "{puzzle.lore}"
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-amber-500/70 mb-2">
            <span className="tracking-[0.25em]">INTEGRITY_SEAL</span>
            <div className="flex gap-1.5 items-center">
              {controller.maxAttempts <= 10 ? (
                [...Array(controller.maxAttempts)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rotate-45 transition-colors duration-300 ${i < remainingAttempts
                      ? 'bg-cyan-400/80 shadow-[0_0_6px_rgba(34,211,238,0.6)]'
                      : 'bg-red-900/60 border border-red-500/40'
                      }`}
                  />
                ))
              ) : (
                <span
                  className={`tabular-nums ${remainingAttempts <= 2 ? 'text-red-400' : 'text-cyan-300'}`}
                >
                  {remainingAttempts}/{controller.maxAttempts}
                </span>
              )}
            </div>
          </div>

          {puzzle.hints.length > 0 && (
            <div className="mt-auto pt-4 border-t border-dashed border-gray-800/80">
              <div className="text-[9px] font-mono text-gray-600 tracking-[0.3em] mb-2">
                DECRYPTION_ASSIST
              </div>
              {controller.currentHints.map((hint: string, idx: number) => (
                <div
                  key={idx}
                  className="text-[10px] leading-relaxed text-cyan-500/90 font-mono bg-cyan-950/20 border border-cyan-900/40 border-l-2 border-l-amber-500/60 p-2.5 mb-2"
                >
                  <span className="text-amber-400 mr-2 font-bold">
                    HINT_{String(idx + 1).padStart(2, '0')}
                  </span>
                  {hint}
                </div>
              ))}
              {controller.hintsUsed < puzzle.hints.length && (
                <button
                  onClick={controller.handleUseHint}
                  disabled={controller.status !== 'idle'}
                  className="w-full py-2.5 border border-gray-800 text-[9px] text-gray-500 hover:text-amber-300 hover:border-amber-900/60 hover:bg-amber-950/20 disabled:opacity-30 disabled:pointer-events-none transition-all font-mono tracking-[0.25em]"
                >
                  [ DECRYPT_HINT_{String(controller.hintsUsed + 1).padStart(2, '0')} ]
                </button>
              )}
            </div>
          )}
        </section>

        {/* 右栏：输入流 / 操作 */}
        <section className="w-full md:w-1/2 md:min-h-0 p-6 lg:p-10 bg-[#08090c]/85 flex flex-col md:justify-center md:overflow-y-auto">
          <div className="mb-5">
            <div className="flex justify-between text-[9px] font-mono tracking-[0.25em] text-gray-600 mb-2">
              <span>INPUT_STREAM</span>
              <span
                className={
                  controller.status === 'error'
                    ? 'text-red-400 animate-pulse'
                    : controller.status === 'success'
                      ? 'text-emerald-400'
                      : 'text-cyan-600'
                }
              >
                {controller.statusMsg}
              </span>
            </div>
            {controller.type === 'type' && !isNumericAnswer && (
              <input
                type="text"
                value={controller.input}
                onChange={(e) => controller.handleInputChange(e.target.value)}
                onKeyDown={controller.handleKeyDown}
                disabled={controller.status !== 'idle'}
                className={`w-full bg-black/80 border-2 h-14 px-4 font-mono text-lg tracking-[0.25em] uppercase placeholder-gray-800 transition-all ${controller.status === 'error'
                  ? 'border-red-600 text-red-500'
                  : controller.status === 'success'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-cyan-800/50 text-cyan-100 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  }`}
                placeholder="ENTER_KEY..."
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
            )}
          </div>

          {controller.type === 'type' && isNumericAnswer && <KeypadInput controller={controller} />}
          {controller.type === 'choice' && <MultiChoiceInput puzzle={puzzle} controller={controller} />}
          {controller.type === 'cloze' && (
            <ClozePatternInput puzzle={puzzle} controller={controller} />
          )}

          <div className="flex gap-3 mt-2">
            {onClose && (
              <button
                onClick={onClose}
                disabled={controller.status === 'success'}
                className="flex-1 py-3.5 border border-gray-800 text-gray-500 hover:text-red-300 hover:border-red-800 hover:bg-red-950/20 disabled:opacity-30 disabled:pointer-events-none transition-all font-mono text-xs tracking-[0.3em]"
              >
                ABORT
              </button>
            )}
            <button
              onClick={controller.handleSubmit}
              disabled={controller.status !== 'idle'}
              className={`flex-1 py-3.5 font-mono text-xs font-bold tracking-[0.3em] transition-all relative overflow-hidden group ${controller.status === 'idle'
                ? 'bg-cyan-950/40 border border-cyan-500 text-cyan-300 hover:bg-cyan-900/60 hover:text-white cursor-pointer shadow-[0_0_14px_rgba(34,211,238,0.25)]'
                : controller.status === 'success'
                  ? 'bg-emerald-950/30 border border-emerald-700 text-emerald-400 cursor-default'
                  : 'bg-black border border-gray-800 text-gray-600 cursor-not-allowed'
                }`}
            >
              <span className="relative z-10">
                {controller.status === 'success'
                  ? 'GRANTED'
                  : controller.status === 'error'
                    ? 'REJECTED'
                    : isNumericAnswer
                      ? 'ENTER'
                      : 'EXECUTE'}
              </span>
              {controller.status === 'idle' && (
                <div className="absolute inset-0 bg-cyan-400/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
              )}
            </button>
          </div>
          {onClose && (
            <div className="mt-3 text-center text-[8px] font-mono text-gray-700 tracking-[0.35em]">
              [ESC] ABORT_LINK
            </div>
          )}
        </section>
      </main>

      {/* 底部会话栏 */}
      <footer className="relative z-10 shrink-0 h-7 border-t border-cyan-900/40 bg-[#0a0b0e]/90 flex items-center justify-between px-4 text-[8px] font-mono tracking-[0.3em] text-gray-600">
        <span className="truncate">SESSION::{puzzle.title.toUpperCase()}</span>
        <span className="hidden sm:block">THE_ABYSS_FOUNDATION :: UNAUTHORIZED_ACCESS_FATAL</span>
        <span>{hasTimeLimit ? 'TIMELOCK::ACTIVE' : 'TIMELOCK::NONE'}</span>
      </footer>

      {/* 解密成功全屏覆盖层 */}
      {controller.showLore && puzzle.lore && (
        <div className="absolute inset-0 z-30 bg-black/95 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in">
          <div className="max-w-xl w-full text-center">
            <div className="text-[10px] font-mono tracking-[0.5em] text-emerald-500/70 mb-3">
              ACCESS_GRANTED
            </div>
            <div className="text-emerald-400 text-2xl font-mono tracking-[0.2em] mb-6 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]">
              [ DATA_DECRYPTED ]
            </div>
            <div className="text-gray-300 text-sm lg:text-base leading-loose font-serif italic border-y border-emerald-900/40 py-6 px-2">
              {puzzle.lore}
            </div>
            {(puzzle.rewards?.items?.length || puzzle.rewards?.sanity) && (
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-[10px] font-mono">
                {puzzle.rewards?.items?.map((item) => (
                  <span
                    key={item.id}
                    className="px-2 py-1 border border-emerald-900/60 bg-emerald-950/20 text-emerald-300"
                  >
                    + {item.name}
                  </span>
                ))}
                {puzzle.rewards?.sanity ? (
                  <span className="px-2 py-1 border border-emerald-900/60 bg-emerald-950/20 text-emerald-300">
                    + {puzzle.rewards.sanity} SANITY
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PuzzlePanel;