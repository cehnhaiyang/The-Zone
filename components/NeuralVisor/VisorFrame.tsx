/**
 * VisorFrame - 神经成像仪框架
 */
import React from 'react';

interface VisorFrameProps {
  integrity: number;      // 设备完整度 0-100
  battery: number;        // 电池 0-100
  noiseLevel: number;     // 噪点/增益 0-1
  onSetNoiseLevel?: (v: number) => void;
  sanity: number;         // 理智百分比 0-100
  isBooting: boolean;     // 是否正在启动/切换
  glitchIntensity: number; // 故障强度 0-1
  children: React.ReactNode;
  onOpenSettings?: () => void;
  isVisualMode?: boolean; // 仅在视觉模式显示噪点控制
}

export const VisorFrame: React.FC<VisorFrameProps> = ({
  integrity,
  battery,
  sanity,
  glitchIntensity,
  children
}) => {
  const isCritical = integrity < 30 || sanity < 20 || battery < 10;
  
  return (
    <div className="relative w-full h-full flex flex-col bg-transparent">
      {/* 主内容区域 - 全透明，无边距 */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </div>
      
      {/* 扫描线效果 - 降低可见度 */}
      <div className="absolute inset-0 pointer-events-none z-20 visor-scanlines opacity-15" />
      
      {/* 故障效果 */}
      {glitchIntensity > 0.3 && (
        <div 
          className="absolute inset-0 pointer-events-none z-25 visor-glitch"
          style={{ opacity: glitchIntensity * 0.4 }}
        />
      )}
      
      {/* 边缘渐变 - 更轻微 */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.25)_100%)]" />
      
      {/* 危急状态闪烁边框 - 更轻微 */}
      {isCritical && (
        <div className="absolute inset-0 pointer-events-none z-30 border border-red-500/20 animate-pulse" />
      )}
    </div>
  );
};
