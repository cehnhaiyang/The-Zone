/**
 * AI 服务层入口 (AI Service Barrel)
 *
 * 整个 AI 服务层的唯一对外出口。
 * 所有外部模块（游戏引擎、UI 等）通过此文件获取 AI 能力，
 * 不直接导入 Zone.ts / Npc.ts / providers 等内部模块。
 */

import { generateZone, getZonePrompt } from './Zone';
import { generateNPCDialogue, generateNPCReaction, generateNPCIntimacy, extractNpcMemorySummaries, consolidateNpcMemories } from './Social';
import { generateVisual, generateVideo, generateSpeech, constructVisualFilename } from './Media';
import { generateDyNarrative } from './DyNarrative';
import { generateSanctuaryEvent, getSanctuaryEventPrompt } from './Sanctuary';
import { priceFacilityUpgrade, getFacilityUpgradePrompt } from './FacilityUpgrade';

class AiServiceTmpl {
    // --- 区域与世界生成 ---
    public generateZone = generateZone;
    public getZonePrompt = getZonePrompt;

    // --- NPC 智能 ---
    public generateNPCDialogue = generateNPCDialogue;
    public generateNPCReaction = generateNPCReaction;
    public generateNPCIntimacy = generateNPCIntimacy;
    public extractNpcMemorySummaries = extractNpcMemorySummaries;
    public consolidateNpcMemories = consolidateNpcMemories;

    // --- 动态叙事 ---
    public generateDyNarrative = generateDyNarrative;

    // --- 庇护所事件 ---
    public generateSanctuaryEvent = generateSanctuaryEvent;
    public getSanctuaryEventPrompt = getSanctuaryEventPrompt;

    // --- 设施升级定价 ---
    public priceFacilityUpgrade = priceFacilityUpgrade;
    public getFacilityUpgradePrompt = getFacilityUpgradePrompt;

    // --- 多媒体生成 ---
    public generateVisual = generateVisual;
    public generateVideo = generateVideo;
    public generateSpeech = generateSpeech;

    // --- 工具函数 ---
    public constructVisualFilename = constructVisualFilename;
}

export const AiService = new AiServiceTmpl();
