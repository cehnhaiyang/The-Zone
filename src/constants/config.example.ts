import { Settings } from '../meta';

export const MODEL_PROVIDER = [
    {
        id: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        keyField: 'groqKeys',
        proxyField: 'useProxyGroq',
    },
    {
        id: 'pollinations',
        baseUrl: 'https://gen.pollinations.ai',
        keyField: 'pollinationsKeys',
        proxyField: 'useProxyPollinations',
    },
    {
        id: 'zhipu',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        keyField: 'zhipuKeys',
        proxyField: 'useProxyZhipu',
    },
    {
        id: 'deapi',
        baseUrl: 'https://api.deapi.ai',
        keyField: 'deapiKeys',
        proxyField: 'useProxyDeapi',
    },
    {
        id: 'qwenstudio',
        baseUrl: 'http://localhost:20260/v1',
        keyField: 'qwenstudioKeys',
        proxyField: 'useProxyQwenstudio',
    },
    {
        id: 'volcengine',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        keyField: 'volcengineKeys',
        proxyField: 'useProxyVolcengine',
    },
    {
        id: 'nvidia',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        keyField: 'nvidiaKeys',
        proxyField: 'useProxyNvidia',
    },
];

export const MODEL_REGISTRY = {
    world: [
        { provider: MODEL_PROVIDER[4].id, model: 'qwen3.8-max-preview' },
        { provider: MODEL_PROVIDER[5].id, model: 'glm-5-2-260617' },
        { provider: MODEL_PROVIDER[5].id, model: 'deepseek-v4-flash-ga-260731' },
        { provider: MODEL_PROVIDER[5].id, model: 'deepseek-v4-pro-ga-260813' },
        { provider: MODEL_PROVIDER[6].id, model: 'nvidia/nemotron-3-ultra-550b-a55b' },
        { provider: MODEL_PROVIDER[6].id, model: 'z-ai/glm-5.2' },
    ],
    npcDialogue: [
        { provider: MODEL_PROVIDER[4].id, model: 'qwen3.8-max-preview' },
        { provider: MODEL_PROVIDER[5].id, model: 'glm-5-2-260617' },
        { provider: MODEL_PROVIDER[5].id, model: 'deepseek-v4-flash-ga-260731' },
        { provider: MODEL_PROVIDER[5].id, model: 'deepseek-v4-pro-ga-260813' },
        { provider: MODEL_PROVIDER[6].id, model: 'doubao-seed-evolving' },
        { provider: MODEL_PROVIDER[6].id, model: 'nvidia/nemotron-3-ultra-550b-a55b' },
        { provider: MODEL_PROVIDER[6].id, model: 'thinkingmachines/inkling' },
    ],
    npcReaction: [
        { provider: MODEL_PROVIDER[0].id, model: 'llama-3.3-70b-versatile' },
    ],
    dyNarrative: [
        { provider: MODEL_PROVIDER[0].id, model: 'qwen/qwen3-32b' },
        { provider: MODEL_PROVIDER[5].id, model: 'glm-5-2-260617' },
        { provider: MODEL_PROVIDER[6].id, model: 'z-ai/glm-5.2' },
    ],
    sanctuaryEvent: [
        { provider: MODEL_PROVIDER[4].id, model: 'qwen3.8-max-preview' },
        { provider: MODEL_PROVIDER[5].id, model: 'glm-5-2-260617' },
        { provider: MODEL_PROVIDER[5].id, model: 'deepseek-v4-flash-ga-260731' },
        { provider: MODEL_PROVIDER[5].id, model: 'deepseek-v4-pro-ga-260813' },
        { provider: MODEL_PROVIDER[6].id, model: 'nvidia/nemotron-3-ultra-550b-a55b' },
        { provider: MODEL_PROVIDER[6].id, model: 'z-ai/glm-5.2' },
    ],
    facilityUpgrade: [
        { provider: MODEL_PROVIDER[0].id, model: 'llama-3.3-70b-versatile' },
        { provider: MODEL_PROVIDER[5].id, model: 'deepseek-v4-flash-ga-260731' },
    ],
    image: [
        { provider: MODEL_PROVIDER[3].id, model: 'Flux1schnell' },
        { provider: MODEL_PROVIDER[3].id, model: 'ZImageTurbo_INT8' },
        { provider: MODEL_PROVIDER[3].id, model: 'Flux_2_Klein_4B_BF16' },
        { provider: MODEL_PROVIDER[3].id, model: 'ZAnimeDistill_8Step_INT8' },
        { provider: MODEL_PROVIDER[4].id, model: 'qwen-image' },
    ],
    video: [
        { provider: MODEL_PROVIDER[2].id, model: 'cogvideox-flash' },
        { provider: MODEL_PROVIDER[3].id, model: 'Ltx2_3_22B_Dist_INT8' },
        { provider: MODEL_PROVIDER[4].id, model: 'qwen-video' },
    ],
    speech: [
    ],
};

export const INITIAL_SETTINGS: Settings = {
    groqKeys: [],
    zhipuKeys: [],
    pollinationsKeys: [],
    deapiKeys: [],
    qwenstudioKeys: [],
    volcengineKeys: [],
    nvidiaKeys: [],
    ProxyBase: 'https://lively-queen-155b.3527008960.workers.dev',
    useProxyGroq: true,
    useProxyPollinations: true,
    useProxyZhipu: false,
    useProxyDeapi: true,
    useProxyQwenstudio: false,
    useProxyVolcengine: false,
    useProxyNvidia: false,
    zoneModel: MODEL_REGISTRY.world[0],
    npcDialogueModel: MODEL_REGISTRY.npcDialogue[0],
    npcReactionModel: MODEL_REGISTRY.npcReaction[0],
    npcMemorySummaryModel: MODEL_REGISTRY.npcDialogue[0],
    npcMemoryConsolidationModel: MODEL_REGISTRY.npcDialogue[0],
    dyNarrativeModel: MODEL_REGISTRY.dyNarrative[0],
    sanctuaryEventModel: MODEL_REGISTRY.sanctuaryEvent[0],
    facilityUpgradeModel: MODEL_REGISTRY.facilityUpgrade[0],
    imageModel: MODEL_REGISTRY.image[0],
    videoModel: MODEL_REGISTRY.video[0],
    speechModel: MODEL_REGISTRY.speech[0],
    preferredMediaType: 'video',
    screenBrightness: 150,
    dialogueSliceLength: 25,
    accumulateCounterEnabled: false,
    differentialCounterEnabled: false,
    gameConfig: {
        enemyEncounter: {
            baseChance: 0.05,
            threatDivisor: 100,
            searchBaseRisk: 0.05,
            searchRiskPerCount: 0.01,
            fatiguePenaltyFactor: 0.1
        },
        searchCosts: {
            baseSanity: 0.5,
            baseStamina: 1.0,
            baseVigor: 2.0,
            fatigueBase: 1.0,
            staminaFatigueFactor: 0.3,
            vigorFatigueFactor: 0.3,
            wisdomFactor: 0.05,
            perceptionFactor: 0.05,
            wisdomRecoveryFactor: 0.02,
            scoutBonus: 5
        },
        hintCosts: {
            sanityCost: 2
        },
        mediaLoading: {
            enemySpawnDelay: 1500,
            searchEnemySpawnDelay: 500,
            puzzleFailEnemySpawnDelay: 500
        },
        discoveryThresholds: {
            high: 10,
            medium: 5,
            low: 0
        },
        fatigueThresholds: {
            highWarning: 1.3,
            medium: 1.0,
            low: 0.8
        },
        searchThresholds: {
            repetitiveWarning: 2,
            maxEffective: 5
        },
        movementCosts: {
            baseStamina: 2,
            baseSanity: 1
        },
        perceptionWeights: {
            basePerception: 2,
            searchCount: 2,
            agility: 1
        },
        social: {
            thresholds: {
                trustHigh: 60,
                trustMedium: 40,
                trustLow: 30,
                trustVeryLow: 20,
                trustMinimal: 10,
                trustDefault: 50,
                trustMax: 100,
                trustMin: 0
            },
            benefits: {
                hugSanityGainHigh: 10,
                hugSanityGainLow: 5,
                hugTrustPenalty: 2,
                comfortTrustGain: 2,
                healTrustGain: 8,
                healValueDefault: 20,
                intimacyTrustGain: 5,
                intimacySanityGain: 30,
                intimacyPlayerSanityGain: 20,
                giftTrustBase: 10,
                giftTrustRare: 20,
                giftTrustEpic: 40,
                giftTrustConsumableBonus: 5
            },
            vitals: {
                sanityCritical: 30,
                sanityLow: 70,
                sanityHigh: 80,
                hpHigh: 0.8,
                hpMedium: 0.4
            }
        },
        equipmentSlots: {
            armor: 3,
            accessory: 5
        }
    }
};

export const DEFAULT_TEXT_CONFIG = {
    fontSize: 14,
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    color: '#d1d5db',
    glowIntensity: 0.5,
    opacity: 1,
    letterSpacing: 1,
    x: 50,
    y: 50
};

export const DEFAULT_LAYOUT_CONFIG = {
    zoneName: {
        ...DEFAULT_TEXT_CONFIG,
        fontSize: 10, letterSpacing: 3, color: '#34d399', x: 0, y: 4,
        fontFamily: '"JetBrains Mono", sans-serif'
    },
    nodeName: {
        ...DEFAULT_TEXT_CONFIG,
        fontSize: 24, letterSpacing: 6, color: '#f3f4f6', glowIntensity: 0.8, x: 0, y: 2,
        fontFamily: '"Noto Serif SC", serif'
    },
    threatLevel: {
        ...DEFAULT_TEXT_CONFIG,
        fontSize: 10, letterSpacing: 2, color: '#ef4444', x: 0, y: 4,
        fontFamily: '"JetBrains Mono", sans-serif'
    },
    desc: {
        ...DEFAULT_TEXT_CONFIG,
        fontSize: 15, letterSpacing: 0, color: '#e5e7eb', glowIntensity: 0, x: 0, y: 30,
        fontFamily: 'sans-serif'
    }
};
