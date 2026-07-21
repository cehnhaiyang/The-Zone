/**
 * 配置模板
 * 复制为 config.ts 并填入你自己的 API Key 即可使用
 *   cp constants/config.example.ts constants/config.ts
 *
 * 不需要的 Provider 可以留空数组。
 */
import { Settings } from '../meta';

export const MODEL_PROVIDER = [
    { id: 'google',       baseUrl: 'https://generativelanguage.googleapis.com',                keyField: 'googleKeys',       proxyField: 'useProxyGoogle' },
    { id: 'groq',         baseUrl: 'https://api.groq.com/openai/v1',                           keyField: 'groqKeys',         proxyField: 'useProxyGroq' },
    { id: 'pollinations', baseUrl: 'https://gen.pollinations.ai',                              keyField: 'pollinationsKeys', proxyField: 'useProxyPollinations' },
    { id: 'zhipu',        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',                     keyField: 'zhipuKeys',        proxyField: 'useProxyZhipu' },
    { id: 'chat2api',     baseUrl: 'http://127.0.0.1:8080/v1/chat/completions',               keyField: 'chat2apiKeys',     proxyField: 'useProxyChat2api' },
    { id: 'deapi',        baseUrl: 'https://oai.deapi.ai/v1',                                  keyField: 'deapiKeys',        proxyField: 'useProxyDeapi' },
    { id: 'qwenstudio',   baseUrl: 'http://localhost:20260/v1',                                keyField: 'qwenstudioKeys',   proxyField: 'useProxyQwenstudio' },
    { id: 'local',        baseUrl: '',                                                         keyField: '' },
] as const;

export const MODEL_REGISTRY = {
    world: [
        { provider: 'google',     model: 'gemini-2.5-flash' },
        { provider: 'qwenstudio', model: 'qwen3.7-max' },
    ],
    npcDialogue: [
        { provider: 'google',     model: 'gemini-2.5-flash' },
        { provider: 'qwenstudio', model: 'qwen3.7-max' },
    ],
    npcReaction: [
        { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    ],
    dyNarrative: [
        { provider: 'groq',       model: 'qwen/qwen3-32b' },
    ],
    image: [
        { provider: 'google',     model: 'gemini-2.5-flash-image' },
    ],
    video: [
        { provider: 'zhipu',      model: 'cogvideox-flash' },
    ],
    speech: [
        { provider: 'google',     model: 'gemini-2.5-flash-tts' },
    ],
    embedding: [
        { provider: 'google',     model: 'gemini-robotics-er-1.6-preview' },
    ],
} as const;

export const INITIAL_SETTINGS: Settings = {
    // ── API Key ── 填入你自己的 Key，不需要的留空数组
    groqKeys:          [],
    googleKeys:        [],
    zhipuKeys:         [],
    pollinationsKeys:  [],
    chat2apiKeys:     [],
    deapiKeys:        [],
    qwenstudioKeys:   [],

    // ── 代理 / 工作流 ──
    ProxyBase: '',
    useProxyGoogle:       false,
    useProxyGroq:         false,
    useProxyPollinations: false,
    useProxyZhipu:        false,
    useProxyChat2api:    false,
    useProxyDeapi:        false,
    useProxyQwenstudio:   false,

    // ── 模型选择 ──
    zoneModel:                   { provider: 'google',     model: 'gemini-2.5-flash' },
    npcDialogueModel:            { provider: 'google',     model: 'gemini-2.5-flash' },
    npcReactionModel:            { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    npcMemorySummaryModel:       { provider: 'google',     model: 'gemini-2.5-flash' },
    npcMemoryConsolidationModel: { provider: 'google',     model: 'gemini-2.5-flash' },
    dyNarrativeModel:            { provider: 'groq',       model: 'qwen/qwen3-32b' },
    imageModel:                  { provider: 'google',     model: 'gemini-2.5-flash-image' },
    videoModel:                  { provider: 'zhipu',      model: 'cogvideox-flash' },
    speechModel:                 { provider: 'google',     model: 'gemini-2.5-flash-tts' },
    embeddingModel:              { provider: 'google',     model: 'gemini-robotics-er-1.6-preview' },

    // ── 偏好设置 ──
    preferredMediaType: 'video',
    screenBrightness: 150,
    dialogueSliceLength: 25,

    // ── 游戏平衡性 ──
    gameConfig: {
        enemyEncounter: {
            baseChance: 0.3, threatDivisor: 100, searchBaseRisk: 0.05,
            searchRiskPerCount: 0.02, fatiguePenaltyFactor: 0.5,
        },
        searchCosts: {
            baseSanity: 5, baseStamina: 10, baseVigor: 5, fatigueBase: 2,
            staminaFatigueFactor: 0.3, vigorFatigueFactor: 0.2,
            knowledgeFactor: 0.1, perceptionFactor: 0.15,
            knowledgeRecoveryFactor: 0.05, scoutBonus: 0.2,
            perceptionWeight: 2, searchCountWeight: 1,
        },
        hintCosts:         { sanityCost: 3 },
        mediaLoading:      { enemySpawnDelay: 3000, searchEnemySpawnDelay: 5000, puzzleFailEnemySpawnDelay: 4000 },
        discoveryThresholds: { high: 80, medium: 50, low: 20 },
        fatigueThresholds:   { highWarning: 80, medium: 50, low: 20 },
        searchThresholds:    { repetitiveWarning: 5, maxEffective: 10 },
        movementCosts:       { baseStamina: 2, baseSanity: 1 },
        perceptionWeights:   { basePerception: 10, searchCount: 0.5, agility: 0.3 },
        social: {
            thresholds: { trustHigh: 80, trustMedium: 50, trustLow: 30, trustVeryLow: 15, trustMinimal: 5, trustDefault: 40, trustMax: 100, trustMin: 0 },
            benefits:   { hugSanityGainHigh: 15, hugSanityGainLow: 5, hugTrustPenalty: 3, comfortTrustGain: 5, healTrustGain: 8, healValueDefault: 25, intimacyTrustGain: 10, intimacySanityGain: 20, intimacyPlayerSanityGain: 15, giftTrustBase: 5, giftTrustRare: 15, giftTrustEpic: 30, giftTrustConsumableBonus: 2 },
            vitals:     { sanityCritical: 20, sanityLow: 40, sanityHigh: 80, hpHigh: 70, hpMedium: 40 },
        },
        equipmentSlots: { armor: 1, accessory: 2 },
    },
};
