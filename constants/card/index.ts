import { CardTemplate } from '../../meta';
import * as GENERAL from './general';
import * as INVESTIGATOR from './investigator';
import * as VETERAN from './veteran';
import * as OCCULTIST from './occultist';
import * as GUARDIAN from './guardian';
import * as NURSE from './nurse';
import * as GLITCH from './glitch';

export * from './general';
export * from './investigator';
export * from './veteran';
export * from './occultist';
export * from './guardian';
export * from './nurse';
export * from './glitch';

/**
 * 默认基础卡组
 */
export const DEFAULT_DECK = ['strike', 'strike', 'strike', 'defend', 'defend'];

/**
 * 卡牌库映射
 */
export const CARD_LIBRARY: Record<string, CardTemplate> = {
    // General
    ...createMap(GENERAL),
    // Investigator
    ...createMap(INVESTIGATOR),
    // Veteran
    ...createMap(VETERAN),
    // Occultist
    ...createMap(OCCULTIST),
    // Guardian
    ...createMap(GUARDIAN),
    // Nurse
    ...createMap(NURSE),
    // Glitch
    ...createMap(GLITCH)
};

// Helper to spread card exports into the map
function createMap(module: any): Record<string, CardTemplate> {
    const map: Record<string, CardTemplate> = {};
    Object.values(module).forEach((card: any) => {
        if (card && card.id) {
            map[card.id] = card;
        }
    });
    return map;
}

/**
 * 根据模板ID获取卡牌模板
 */
export const getCardTemplate = (templateId: string): CardTemplate => {
    return CARD_LIBRARY[templateId] || CARD_LIBRARY['strike'];
};
