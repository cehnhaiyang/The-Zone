/**
 * ArchivesPanel - 统一神经档案面板
 * 神经终端风格 - 融合任务指令、伏笔异常与暗线协议的中央数据库
 */
import React, { useState, useMemo } from 'react';
import { PlayerState, PlotPointNet, PlotPoint, Quest } from '../meta';

interface ArchivesPanelProps {
  player: PlayerState;
}

const ArchivesPanel: React.FC<ArchivesPanelProps> = ({ player }) => {
  const [activeTab, setActiveTab] = useState<'directives' | 'anomalies' | 'truths'>('directives');
  const [showCompletedDirectives, setShowCompletedDirectives] = useState(false);

  const extractPlots = (net?: PlotPointNet): PlotPoint[] => {
    if (!net || !Array.isArray(net) || net.length < 2) return [];
    return [...(net[0] || []), ...(net[1] || [])];
  };

  const isResolved = (plot: PlotPoint): boolean => {
    return !!plot.isSolved;
  };

  const { activePlots, solvedPlots, allPlotsLength } = useMemo(() => {
    const activePlotsExtracted = extractPlots(player.activeArc?.plotPoints);
    const archivedPlotsExtracted = (player.archivedArcs || []).flatMap(arc => extractPlots(arc.plotPoints));

    const all = [...activePlotsExtracted, ...archivedPlotsExtracted];

    return {
      activePlots: all.filter(p => !isResolved(p)),
      solvedPlots: all.filter(p => isResolved(p)),
      allPlotsLength: all.length
    };
  }, [player]);

  const weavedAxis = player.activeArc?.hiddenAxis;
  const activeHiddenDesc = weavedAxis ? (weavedAxis.newDesc || weavedAxis.prevDesc) : null;
  const isHiddenResolved = weavedAxis ? weavedAxis.isRevealed : false;
  const archivedHidden = player.archivedHiddenAxis || [];

  const { allQuestsLength, activeQuests, completedQuests, failedQuests } = useMemo(() => {
    const all = (Array.isArray(player.questAccepted)
      ? player.questAccepted
      : (player.questAccepted ? Object.values(player.questAccepted) : [])) as Quest[];

    return {
      allQuestsLength: all.length,
      activeQuests: all.filter((q: Quest) => q.status === 'on'),
      completedQuests: all.filter((q: Quest) => q.status === 'done'),
      failedQuests: all.filter((q: Quest) => q.status === 'failed')
    };
  }, [player]);

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] overflow-hidden text-gray-300 font-mono relative">
      {/* 终端扫描线背景 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(transparent_50%,#000_50%)] bg-[length:100%_4px] z-0" />

      {/* 屏幕边缘暗角/眩光效果 */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] z-0" />

      {/* ================= 头部信息 ================= */}
      <div className="relative z-10 shrink-0 px-4 py-3 border-b border-cyan-900/40 bg-black/40 backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-cyan-500 text-lg drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse">◫</div>
            <div>
              <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.3em] drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
                档案
              </h2>
              <div className="text-[8px] text-cyan-600/70 tracking-[0.2em] mt-0.5 flex gap-2">
                <span>CONNECTION_ESTABLISHED</span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-500">ROOT_ACCESS</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-gray-500 tracking-widest">
              VOL._ {player.currentGameRound?.absoluteTick || '0000'}
            </div>
            <div className="text-[8px] text-gray-600 tracking-wider flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-amber-500/70">DRV:{allQuestsLength}</span>
              <span className="text-gray-700">|</span>
              <span className="text-cyan-600/70">ANM:{allPlotsLength}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 统一标签导航 ================= */}
      <div className="relative z-10 flex shrink-0 border-b border-gray-800/50 bg-black/20">
        <button
          onClick={() => setActiveTab('directives')}
          className={`flex-1 py-2.5 text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'directives'
            ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-950/20 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]'
            : 'text-gray-600 hover:text-amber-700 hover:bg-amber-950/10'
            }`}
        >
          任务指令
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`flex-1 py-2.5 text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 border-l border-gray-800/50 ${activeTab === 'anomalies'
            ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20 drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]'
            : 'text-gray-600 hover:text-cyan-700 hover:bg-cyan-950/10'
            }`}
        >
          异常矩阵
        </button>
        <button
          onClick={() => setActiveTab('truths')}
          className={`flex-1 py-2.5 text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 border-l border-gray-800/50 ${activeTab === 'truths'
            ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-950/20 drop-shadow-[0_0_4px_rgba(168,85,247,0.5)]'
            : 'text-gray-600 hover:text-purple-800 hover:bg-purple-950/10'
            }`}
        >
          深层协议
        </button>
      </div>

      {/* ================= 统一内容视窗 ================= */}
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8 pb-12">

        {/* ----------------- TAB: 任务指令 ----------------- */}
        {activeTab === 'directives' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 子分类控制条 */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-800/50">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse" />
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] drop-shadow-[0_0_2px_rgba(245,158,11,0.5)]">
                  行动流
                </span>
                <span className="text-[9px] text-amber-500/70 bg-amber-950/30 px-1.5 py-0.5 border border-amber-900/30">
                  {showCompletedDirectives ? (completedQuests.length + failedQuests.length) : activeQuests.length}
                </span>
              </div>
              <button
                onClick={() => setShowCompletedDirectives(!showCompletedDirectives)}
                className={`px-2 py-1 text-[8px] tracking-wider transition-all border ${showCompletedDirectives
                  ? 'border-emerald-700/40 text-emerald-500 hover:text-emerald-300 bg-emerald-950/20'
                  : 'border-amber-700/30 text-amber-600 hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-950/10'
                  }`}
              >
                {showCompletedDirectives ? 'SWITCH_TO_ACTIVE' : 'SWITCH_TO_HISTORY'}
              </button>
            </div>

            {!showCompletedDirectives ? (
              // 渲染进行中的任务
              activeQuests.length === 0 ? (
                <div className="w-full py-12 border border-dashed border-amber-900/30 bg-black/20 flex flex-col items-center justify-center">
                  <div className="text-amber-900/50 text-xl mb-3 animate-pulse">▷</div>
                  <div className="text-[9px] text-amber-700/70 tracking-[0.2em] text-center leading-relaxed">
                    NO_ACTIVE_DIRECTIVES<br />INTERACT_WITH_ENVIRONMENT_TO_ACQUIRE
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeQuests.map((quest: any, index) => {
                    const qType = quest.type || 'explore';
                    const qTitle = quest.title || 'UNNAMED_DIRECTIVE';
                    const qIssuer = quest.issuerName || 'UNKNOWN_ENTITY';

                    return (
                      <div key={quest.id || index} className="relative bg-black/40 border border-amber-900/20 overflow-hidden group hover:border-amber-700/50 hover:bg-amber-950/10 transition-all duration-300">
                        <div className={`absolute left-0 top-0 bottom-0 w-[2px] transition-all ${qType === 'kill' ? 'bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.6)] group-hover:bg-red-400' :
                          qType === 'fetch' ? 'bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.6)] group-hover:bg-blue-400' :
                            'bg-amber-600 shadow-[0_0_6px_rgba(217,119,6,0.6)] group-hover:bg-amber-400'
                          }`}
                        />
                        <div className="p-3 pl-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className={`text-[8px] uppercase px-1.5 py-0.5 border bg-black/40 ${qType === 'kill' ? 'border-red-900/40 text-red-400' :
                              qType === 'fetch' ? 'border-blue-900/40 text-blue-400' :
                                'border-amber-900/40 text-amber-400'
                              }`}>
                              {qType === 'kill' ? 'ELIMINATE' : qType === 'fetch' ? 'RETRIEVE' : 'EXPLORE'}
                            </span>
                            <span className="text-[8px] text-amber-500/80 tracking-wider">STATUS: ACTIVE</span>
                          </div>
                          <h3 className="text-xs text-gray-200 mb-2 group-hover:text-amber-100 transition-colors">
                            {qTitle}
                          </h3>
                          <p className="text-[10px] text-gray-500 leading-relaxed mb-3 italic">
                            "{quest.desc}"
                          </p>
                          <div className="flex items-center gap-2 pt-2 border-t border-amber-900/20 opacity-70 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] text-gray-600">SOURCE:</span>
                            <span className="text-[9px] text-amber-600/80 uppercase">{qIssuer}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // 渲染历史 (已完成/已失败) 任务
              <div className="space-y-4">
                {completedQuests.length === 0 && failedQuests.length === 0 ? (
                  <div className="text-center py-8 text-emerald-900/50 text-[9px] tracking-widest uppercase border border-dashed border-gray-800/50">
                    NO_HISTORICAL_RECORDS
                  </div>
                ) : (
                  <>
                    {completedQuests.map((quest: any, index) => (
                      <div key={quest.id || index} className="relative bg-black/20 border border-emerald-900/20 opacity-70 hover:opacity-100 transition-opacity">
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-emerald-700 shadow-[0_0_4px_rgba(4,120,87,0.4)]" />
                        <div className="p-3 pl-4 flex flex-col gap-1.5">
                          <div className="flex justify-between items-center">
                            <h3 className="text-[11px] text-emerald-400/60 line-through decoration-emerald-900">{quest.title || 'UNNAMED_DIRECTIVE'}</h3>
                            <span className="text-[8px] text-emerald-500 tracking-widest bg-emerald-950/40 px-1 py-0.5">◆ RESOLVED</span>
                          </div>
                          <p className="text-[9px] text-gray-600 italic">"{quest.desc}"</p>
                        </div>
                      </div>
                    ))}
                    {failedQuests.map((quest: any, index) => (
                      <div key={quest.id || index} className="relative bg-black/20 border border-red-900/20 opacity-50">
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-800 shadow-[0_0_4px_rgba(153,27,27,0.4)]" />
                        <div className="p-3 pl-4 flex justify-between items-center">
                          <h3 className="text-[11px] text-red-500/50 line-through decoration-red-900/50">{quest.title || 'UNNAMED_DIRECTIVE'}</h3>
                          <span className="text-[8px] text-red-600 tracking-widest">◇ FAILED</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB: 异常矩阵 ----------------- */}
        {activeTab === 'anomalies' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 未解决异常区 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-ping" />
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] drop-shadow-[0_0_2px_rgba(239,68,68,0.5)]">
                  未决异常
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-red-900/50 to-transparent" />
                <span className="text-[9px] text-red-500 font-bold bg-red-950/40 px-2 py-0.5 border border-red-900/30">
                  {activePlots.length}
                </span>
              </div>

              {activePlots.length === 0 ? (
                <div className="w-full py-8 border border-dashed border-cyan-900/20 bg-cyan-950/5 flex flex-col items-center justify-center">
                  <div className="text-cyan-800/40 mb-2">◇</div>
                  <div className="text-[9px] text-cyan-600/50 tracking-[0.2em] text-center">
                    LOGIC_STABLE<br />NO_ANOMALIES_DETECTED
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activePlots.map((plot) => {
                    // 判断是否为主线异常，这里依据类型字典中 MainPlotPoint type = 'main'
                    const isMain = plot.type === 'main';
                    return (
                      <div
                        key={plot.id}
                        className={`relative group bg-black/40 border transition-all duration-300 ${isMain ? 'border-red-900/40 hover:border-red-600/60 hover:bg-red-950/20' : 'border-orange-900/20 hover:border-orange-700/50 hover:bg-orange-950/10'
                          }`}
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-[2px] transition-colors ${isMain
                          ? 'bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.6)] group-hover:bg-red-400 group-hover:shadow-[0_0_10px_rgba(248,113,113,0.8)]'
                          : 'bg-orange-800 group-hover:bg-orange-500 group-hover:shadow-[0_0_8px_rgba(249,115,22,0.6)]'
                          }`} />
                        <div className="p-3 pl-4">
                          <div className={`flex justify-between items-center mb-2 pb-1 border-b ${isMain ? 'border-red-900/30' : 'border-orange-900/20'}`}>
                            <span className={`text-[8px] tracking-widest font-bold ${isMain ? 'text-red-400' : 'text-orange-500/80'}`}>
                              {isMain ? 'MAIN_AXIS' : 'SIDE_AXIS'} // ID:{plot.id.slice(-6)}
                            </span>
                          </div>
                          <p className={`text-xs leading-relaxed transition-colors ${isMain ? 'text-gray-200 group-hover:text-red-50' : 'text-gray-400 group-hover:text-orange-100'}`}>
                            "{plot.content}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 已解决真相区 */}
            <section>
              <div className="flex items-center gap-2 mb-4 pt-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] drop-shadow-[0_0_2px_rgba(52,211,153,0.3)]">
                  已解明节点
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-emerald-900/50 to-transparent" />
                <span className="text-[9px] text-emerald-500 font-bold bg-emerald-950/30 px-2 py-0.5 border border-emerald-900/30">
                  {solvedPlots.length}
                </span>
              </div>

              {solvedPlots.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-800/50 text-gray-700 text-[9px] tracking-widest uppercase">
                  AWAITING_REVELATION
                </div>
              ) : (
                <div className="space-y-2 opacity-70 hover:opacity-100 transition-opacity duration-500">
                  {solvedPlots.map((plot) => (
                    <div key={plot.id} className="relative bg-black/20 border border-emerald-900/20">
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-emerald-800" />
                      <div className="p-3 pl-4 flex flex-col gap-2">
                        <div className="text-[10px] text-emerald-200/50 line-through decoration-emerald-800/80">
                          {plot.content}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 text-[8px]">◆</span>
                          {/* 这里依赖 PP 接口的 hint 字段展示是如何被解密的，或者仅展示通用解密状态 */}
                          <span className="text-[8px] text-emerald-400/80 uppercase tracking-widest bg-emerald-950/40 px-1 py-0.5">
                            {plot.hint ? `HINT_APPLIED: ${plot.hint}` : 'STATUS: DECRYPTED_SUCCESS'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ----------------- TAB: 深层协议 ----------------- */}
        {activeTab === 'truths' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 正在编织的暗线 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" />
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] drop-shadow-[0_0_4px_rgba(168,85,247,0.4)]">
                  当前编织
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-purple-900/50 to-transparent" />
              </div>

              {!activeHiddenDesc ? (
                <div className="w-full py-8 border border-dashed border-purple-900/30 bg-purple-950/5 flex flex-col items-center justify-center">
                  <div className="text-purple-900/50 text-xl mb-2">◬</div>
                  <div className="text-[9px] text-purple-600/50 tracking-[0.2em] text-center">
                    NO_ACTIVE_HIDDEN_AXIS<br />DATA_INSUFFICIENT
                  </div>
                </div>
              ) : (
                <div className="relative bg-[#0d0514] border border-purple-800/30 p-4 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]">
                  <div className="absolute top-0 right-0 p-2 opacity-20 text-purple-500 text-2xl leading-none">◬</div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`px-1.5 py-0.5 bg-purple-900/40 border border-purple-500/30 text-[8px] tracking-widest uppercase ${isHiddenResolved ? 'text-emerald-400' : 'text-purple-300'}`}>
                      STATUS: {isHiddenResolved ? 'DECRYPTED_SUCCESS' : 'ENCRYPTING...'}
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-purple-100/80 font-serif tracking-wide relative z-10 text-justify">
                    {activeHiddenDesc}
                  </p>
                </div>
              )}
            </section>

            {/* 历史解明的暗线 */}
            <section>
              <div className="flex items-center gap-2 mb-4 pt-2">
                <div className="w-1.5 h-1.5 bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] drop-shadow-[0_0_2px_rgba(59,130,246,0.3)]">
                  归档阴谋
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-blue-900/50 to-transparent" />
                <span className="text-[9px] text-blue-500 font-bold bg-blue-950/30 px-2 py-0.5 border border-blue-900/30">
                  {archivedHidden.length}
                </span>
              </div>

              {archivedHidden.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-800/50 text-blue-900/50 text-[9px] tracking-widest uppercase">
                  ARCHIVES_EMPTY
                </div>
              ) : (
                <div className="space-y-4">
                  {archivedHidden.map((axis, idx) => (
                    <div key={idx} className="bg-black/30 border border-blue-900/30 border-l-[3px] border-l-blue-600/50 p-3 hover:border-blue-500/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-[10px] text-blue-400 font-bold tracking-wider uppercase">
                          {axis.theme}
                        </div>
                        <div className="text-[8px] text-blue-600 tracking-widest bg-blue-950/50 px-1.5 py-0.5 border border-blue-900/40">
                          {axis.motif}
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 pb-2 border-b border-blue-900/20">
                        AXIS: {axis.mainAxis}
                      </div>
                      <p className="text-[10px] text-blue-100/60 leading-relaxed font-serif">
                        {axis.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* 全局自定义滚动条样式 (注入) */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.2);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.4);
        }
      `}} />
    </div>
  );
};

export default ArchivesPanel;