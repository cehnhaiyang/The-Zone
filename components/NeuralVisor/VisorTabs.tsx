/**
 * VisorTabs - 神经成像仪面板切换标签 (Minimalist Bottom Bar)
 */
import React from 'react';
import { VisorPanelType, PanelTabConfig } from '../../meta';
import { AudioService } from '../../services';

interface VisorTabsProps {
  tabs: PanelTabConfig[];
  activeTab: VisorPanelType;
  onTabChange: (tab: VisorPanelType) => void;
  disabled?: boolean;
}

export const VisorTabs: React.FC<VisorTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  disabled = false
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center gap-8 bg-transparent pointer-events-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isAvailable = tab.available;

        return (
          <button
            key={tab.id}
            onClick={() => {
              if (isAvailable && !disabled) {
                AudioService.playSfx('click');
                onTabChange(tab.id);
              }
            }}
            disabled={!isAvailable || disabled}
            className={`
              relative w-10 h-10 flex items-center justify-center
              text-lg font-mono font-bold transition-all duration-300
              group
              ${isActive
                ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] scale-110'
                : isAvailable
                  ? 'text-gray-600 hover:text-cyan-200 hover:scale-105'
                  : 'text-gray-800 cursor-not-allowed opacity-50'
              }
            `}
            title={tab.label}
          >
            {/* 极简文字：首字母 */}
            <span className="relative z-10">
              {tab.label.charAt(0)}
            </span>

            {/* 激活时的底部光点 */}
            {isActive && (
              <div className="absolute -bottom-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(34,211,238,1)] animate-pulse" />
            )}

            {/* 悬停时的微弱背景 */}
            {isAvailable && !isActive && (
              <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 rounded-full transition-colors duration-300" />
            )}
          </button>
        );
      })}
    </div>
  );
};
