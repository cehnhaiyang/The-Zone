import React from 'react';
import { Puzzle } from '../meta';
import type { PuzzleInteractionController } from '../hooks/useInteraction';

interface PuzzlePanelProps {
  puzzle: Puzzle;
  controller: PuzzleInteractionController;
  onClose?: () => void;
}

const LockIcon: React.FC = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UnlockIcon: React.FC = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);

const KeypadInput: React.FC<{ controller: PuzzleInteractionController }> = ({ controller }) => {
  const handlePress = (key: string) => {
    if (controller.status !== 'idle') return;
    if (key === 'CLR') controller.handleInputChange('');
    else if (key === 'DEL') controller.handleInputChange(controller.input.slice(0, -1));
    else if (controller.input.length < 12) controller.handleInputChange(controller.input + key);
  };

  return (
    <>
      <div className={`w-full bg-black border-2 h-12 flex items-center justify-center px-4 font-mono text-lg tracking-[0.2em] ${controller.status === 'error' ? 'border-red-600 text-red-500' : controller.status === 'success' ? 'border-emerald-500 text-emerald-400' : 'border-cyan-800/50 text-cyan-100'}`}>
        <div className="w-full text-center">
          {controller.input.split('').map(() => '•').join('')}
          {controller.status === 'idle' && <span className="animate-pulse opacity-50 ml-1">_</span>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-6 mt-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} onClick={() => handlePress(String(n))} className="h-10 border border-gray-800 bg-[#121215] text-cyan-500 hover:bg-cyan-950/30 hover:border-cyan-700 hover:text-cyan-300 font-mono text-lg active:scale-95">{n}</button>
        ))}
        <button onClick={() => handlePress('CLR')} className="h-10 border border-red-900/30 text-red-500 hover:bg-red-950/30 text-xs font-mono">CLR</button>
        <button onClick={() => handlePress('0')} className="h-10 border border-gray-800 bg-[#121215] text-cyan-500 hover:bg-cyan-950/30 hover:border-cyan-700 font-mono text-lg">0</button>
        <button onClick={() => handlePress('DEL')} className="h-10 border border-amber-900/30 text-amber-500 hover:bg-amber-950/30 text-xs font-mono">DEL</button>
      </div>
    </>
  );
};

const MultiChoiceInput: React.FC<{ puzzle: Puzzle; controller: PuzzleInteractionController }> = ({ puzzle, controller }) => {
  if (puzzle.body.type !== 'choice') return null;

  return (
    <div className="space-y-3 mb-6">
      {puzzle.body.body.map((option, index) => (
        <button
          key={index}
          onClick={() => controller.handleOptionSelect(index)}
          disabled={controller.status !== 'idle'}
          className={`w-full p-3 border text-left font-mono text-sm transition-all ${controller.selectedOptions.includes(index)
            ? 'border-cyan-500 bg-cyan-950/30 text-cyan-100'
            : 'border-gray-800 bg-[#121215] text-gray-400 hover:border-cyan-800 hover:text-cyan-300'
            }`}
        >
          <span className="text-cyan-600 mr-2">[{index + 1}]</span>
          {option}
        </button>
      ))}
    </div>
  );
};

const PatternInputComponent: React.FC<{ puzzle: Puzzle; controller: PuzzleInteractionController }> = ({ puzzle, controller }) => {
  if (puzzle.body.type !== 'cloze') return null;

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {controller.patternInput.map((value: string, index: number) => (
          <button
            key={index}
            onClick={() => controller.handlePatternClick(index)}
            className="h-14 border border-cyan-900/40 bg-black/40 text-cyan-300 font-mono text-xl hover:border-cyan-500 transition-all"
          >
            {value || '?'}
          </button>
        ))}
      </div>
      <div className="text-[10px] font-mono text-gray-500 text-center">点击格子循环切换符号，重建正确图案。</div>
    </div>
  );
};

const PuzzlePanel: React.FC<PuzzlePanelProps> = ({ puzzle, controller, onClose }) => {
  return (
    <div className={`
      relative w-full max-w-3xl bg-[#0a0a0c] border border-cyan-900/50 shadow-[0_0_60px_rgba(6,182,212,0.15)]
      flex flex-col md:flex-row overflow-hidden
      ${controller.isShaking ? 'animate-shake-puzzle' : ''}
    `}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 left-0 w-full text-[8px] font-mono text-cyan-500 leading-none whitespace-pre-wrap break-all animate-matrix-scroll">
          {Array(1000).fill(0).map(() => Math.random() > 0.5 ? '1' : '0').join('')}
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-900/30 to-transparent" />

      <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-cyan-900/30 bg-[#0c0c0e] relative">
        <div className="absolute top-3 left-3 text-[9px] font-mono text-cyan-500/40 tracking-[0.2em]">SECURE_TERMINAL_V5</div>

        <div className="flex justify-between items-center mt-6 mb-4">
          <span className="text-[9px] font-mono text-cyan-600 font-bold tracking-widest px-2 py-1 border border-cyan-900/50 bg-cyan-950/20">
            {puzzle.body.type.toUpperCase()}
          </span>
          {puzzle.restrictions?.timeLimit && puzzle.restrictions.timeLimit > 0 && (
            <span className={`text-[9px] font-mono ${controller.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
              倒计时 {Math.floor(controller.timeLeft / 60)}:{(controller.timeLeft % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>

        <div className="flex justify-center mb-4">
          <div className={`transition-colors duration-500 ${controller.status === 'success' ? 'text-emerald-500' : controller.status === 'error' ? 'text-red-500' : 'text-cyan-500'}`}>
            {controller.status === 'success' ? <UnlockIcon /> : <LockIcon />}
          </div>
        </div>

        <h2 className="text-lg font-bold text-cyan-100 font-mono tracking-widest text-center mb-4 uppercase text-shadow-cyan">
          {puzzle.title}
        </h2>

        <div className="bg-black/40 border border-cyan-900/30 p-3 font-serif italic text-gray-400 text-sm leading-relaxed text-center mb-4 relative">
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-cyan-700" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-cyan-700" />
          "{puzzle.lore}"
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 mb-2">
          <span>SECURITY_LAYER</span>
          <div className="flex gap-1">
            {[...Array(controller.maxAttempts)].map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < (controller.maxAttempts - controller.attempts) ? 'bg-cyan-500/50' : 'bg-red-500/30'}`} />
            ))}
          </div>
        </div>

        {puzzle.hints?.length ? (
          <div className="mt-auto pt-3 border-t border-dashed border-gray-800">
            {controller.currentHints.map((hint: string, idx: number) => (
              <div key={idx} className="text-[10px] text-cyan-600 font-mono bg-cyan-950/20 p-2 border border-cyan-900/30 mb-2">
                <span className="text-cyan-400 mr-2 font-bold">HINT_{idx + 1}:</span>
                {hint}
              </div>
            ))}
            {controller.hintsUsed < (puzzle.hints?.length || 0) && (
              <button
                onClick={controller.handleUseHint}
                className="w-full py-2 border border-gray-800 text-[9px] text-gray-500 hover:text-cyan-400 hover:border-cyan-900/50 hover:bg-cyan-950/20 transition-all font-mono tracking-widest"
              >
                [ DECRYPT_HINT_{controller.hintsUsed + 1} ]
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="w-full md:w-1/2 p-6 bg-[#08080a] flex flex-col justify-center relative">
        {controller.showLore && puzzle.lore && (
          <div className="absolute inset-0 bg-black/95 z-10 flex items-center justify-center p-6 animate-in fade-in">
            <div className="text-center">
              <div className="text-emerald-400 text-lg font-mono mb-4">[ DATA_DECRYPTED ]</div>
              <div className="text-gray-300 text-sm leading-relaxed font-serif italic">
                {puzzle.lore}
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex justify-between text-[9px] font-mono text-gray-600 mb-1">
            <span>INPUT_STREAM</span>
            <span className={controller.status === 'error' ? 'text-red-500 animate-pulse' : 'text-cyan-600'}>
              {controller.statusMsg}
            </span>
          </div>

          {controller.type === 'type' && !(Array.isArray(puzzle.body?.answer) ? puzzle.body.answer.some(s => /^\d+$/.test(s)) : /^\d+$/.test(puzzle.body?.answer || '')) && (
            <input
              type="text"
              value={controller.input}
              onChange={(e) => controller.handleInputChange(e.target.value)}
              onKeyDown={controller.handleKeyDown}
              disabled={controller.status !== 'idle'}
              className={`w-full bg-black border-2 h-12 flex items-center px-4 font-mono text-lg tracking-[0.2em] uppercase placeholder-gray-800 ${controller.status === 'error' ? 'border-red-600 text-red-500' :
                controller.status === 'success' ? 'border-emerald-500 text-emerald-400' :
                  'border-cyan-800/50 text-cyan-100 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                }`}
              placeholder="ENTER_KEY..."
              autoComplete="off"
              autoFocus
            />
          )}
        </div>

        {controller.type === 'type' && (Array.isArray(puzzle.body?.answer) ? puzzle.body.answer.some(s => /^\d+$/.test(s)) : /^\d+$/.test(puzzle.body?.answer || '')) && <KeypadInput controller={controller} />}
        {controller.type === 'choice' && <MultiChoiceInput puzzle={puzzle} controller={controller} />}
        {controller.type === 'cloze' && <PatternInputComponent puzzle={puzzle} controller={controller} />}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-800 text-gray-500 hover:text-white hover:bg-gray-800 transition-all font-mono text-xs tracking-widest">ABORT</button>
          <button onClick={controller.handleSubmit} disabled={controller.status !== 'idle'} className={`flex-1 py-3 font-mono text-xs font-bold tracking-widest transition-all relative overflow-hidden group ${controller.status === 'idle' ? 'bg-cyan-950/40 border border-cyan-600 text-cyan-400 hover:bg-cyan-900/60 hover:text-white cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-black border border-gray-800 text-gray-600 cursor-not-allowed'}`}>
            <span className="relative z-10">
              {(controller.type === 'type' && (Array.isArray(puzzle.body?.answer) ? puzzle.body.answer.some(s => /^\d+$/.test(s)) : /^\d+$/.test(puzzle.body?.answer || ''))) ? 'ENTER' : 'EXECUTE'}
            </span>
            {controller.status === 'idle' && <div className="absolute inset-0 bg-cyan-500/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PuzzlePanel;