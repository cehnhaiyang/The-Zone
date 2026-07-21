/**
 * 媒体综合管线调度层 (Media Pipeline Service)
 * * 核心意图：
 * 隔离底层 LLM/扩散模型的调用细节与上层游戏状态逻辑。
 * 生成完毕后进行单向落盘，加载逻辑交由外部引擎层全权接管。
 */

import { Settings } from '../../meta';
import { PersistenceService } from '../PersistenceService';
import { BaseProvider, AIServiceError } from './providers/base';
import { callAi } from './providers';

/**
 * 视觉流派语料库
 * * 意图：
 * 为通用模型提供强制性的特征锚点，收束模型的自由散发，
 * 强制剥离明亮、卡通或积极的视觉特征，从而确立「The Zone」统一的压抑、粗糙且具有模拟恐怖感的底层美学基调。
 */
const VISUAL_CONFIG = {
    technical: ['cinematic composition', '8k resolution', 'photorealistic rendering', 'RAW photograph'],
    lighting: ['dark atmospheric lighting', 'volumetric fog', 'chiaroscuro contrast', 'god rays through dust'],
    aesthetic: ['analog horror aesthetic', 'VHS found footage', 'CRT scanline overlay', 'film grain ISO 3200'],
    horror: ['liminal space', 'uncanny valley', 'SCP foundation documentation style'],
    texture: ['wet surfaces', 'condensation', 'rust patina', 'biological decay', 'industrial grime']
};

const ARTIST_REFS = 'style inspired by Zdzisław Beksiński, H.R. Giger, Simon Stålenhag, Trevor Henderson, Junji Ito, Wayne Barlowe';

// 强制隔离破坏氛围的常见生成杂质，确保画面呈现沉浸式的实体存在感。
const NEGATIVE_PROMPT = 'blurry, low quality, cartoon, anime, manga, cel-shaded, deformed hands, poorly drawn face, overexposed, bright cheerful colors, cute, kawaii, text overlay, watermark, UI elements, logos, signature, border, frame, split image';

const SCENE_ENHANCEMENTS = {
    indoor: ['interior lighting', 'enclosed space', 'claustrophobic composition'],
    outdoor: ['exterior lighting', 'open space', 'environmental atmosphere'],
    underground: ['subterranean lighting', 'dark environment', 'underground textures'],
    futuristic: ['sci-fi elements', 'advanced technology', 'futuristic design'],
    abandoned: ['decay', 'deserted', 'forgotten spaces', 'overgrown'],
    medical: ['clinical environment', 'hospital equipment', 'sterile surfaces'],
    industrial: ['machinery', 'concrete structures', 'mechanical elements']
};

/**
 * 结构化提示词构造引擎
 * * 意图：
 * 废弃动态模板引擎，采用原生字符串组合方案，严格区分「主体内容」与「环境渲染参数」。
 */
const VisualPromptManager = {
    getScenePrompt(sceneDesc: string, sceneType?: keyof typeof SCENE_ENHANCEMENTS): string {
        const baseStyle = [
            ...VISUAL_CONFIG.technical,
            ...VISUAL_CONFIG.lighting,
            ...VISUAL_CONFIG.aesthetic,
            ...VISUAL_CONFIG.horror,
            ...VISUAL_CONFIG.texture
        ].join(', ');

        const enhancements = sceneType ? SCENE_ENHANCEMENTS[sceneType].join(', ') : '';
        const technicalElements = 'abandoned architecture, signs of recent human presence, evidence of catastrophe, biomechanical corruption spreading on walls, flickering fluorescent lights, deep shadows, claustrophobic spatial compression, nightmare fuel, single vanishing point perspective, no people visible';

        const promptParts = [
            baseStyle,
            ARTIST_REFS,
            `wide angle establishing shot of: ${sceneDesc}`
        ];

        if (enhancements) {
            promptParts.push(enhancements);
        }

        promptParts.push(technicalElements);
        promptParts.push(`--no ${NEGATIVE_PROMPT}`);

        return promptParts.join(', ');
    },

    getVideoPrompt(sceneDesc: string): string {
        const promptParts = [
            'Cinematic 4K video',
            'horror atmosphere',
            'found footage aesthetic',
            'CRT screen recording',
            'dark oppressive environment',
            sceneDesc,
            'slow deliberate camera push forward, subtle handheld shake',
            'flickering light sources causing shadow movement, dust particles floating in air, Lovecraftian dread',
            '--no text, UI, fast movement'
        ];

        return promptParts.join(', ');
    }
};

/**
 * 意图：
 * 将二进制数据流转换为 Base64 编码字符串，用于绕过跨域直接加载图片的限制，
 * 并支持将其交由 Electron 主进程序列化落盘。
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * 确立文件资产在虚拟文件树中的具名规则。
 * 格式控制为严格的 `<index>.<ext>`，因为基于 Node 机制的层级已被 ZoneId/NodeId 的目录隔离。
 */
export const constructVisualFilename = (
    _zoneId: string,
    _nodeId: string,
    _type: 'scene' | 'enemy' | 'npc' | 'player' | 'video' | 'audio',
    ext: string,
    _extraHash: string = '',
    index?: number
): string => {
    return index !== undefined ? `${index}.${ext}` : `1.${ext}`;
};

/**
 * 图像装配管线
 * * 意图：处理场景、实体或物品的静态图像生成，并单向输出 Base64。
 */
export const generateVisual = async (
    settings: Settings,
    prompt: string,
    type: 'scene' | 'enemy' | 'npc' | 'player',
    context: { zoneId: string; nodeId: string; imageUrl?: string }
): Promise<{ url: string | null; type: 'image' }> => {
    BaseProvider.validateRequiredParams(
        { settings, prompt, context },
        ['settings', 'prompt', 'context'],
        'Visual Generation'
    );

    if (!context.zoneId || !context.nodeId) {
        throw new Error('上下文核心标识缺失：需要明确的 zoneId 与 nodeId 用于定位资产存储域。');
    }

    if (!settings.imageModel || !settings.imageModel.provider || !settings.imageModel.model) {
        throw new Error('未注册 imageModel：系统设置中未指定可用的图像模型。');
    }

    const { provider: providerId, model: modelOnly } = settings.imageModel;
    const modelName = `${providerId}:${modelOnly}`;

    let nextIndex = 1;
    if (PersistenceService.isReady) {
        nextIndex = await PersistenceService.getNextImageIndex(context.zoneId, context.nodeId);
    }
    const filename = constructVisualFilename(context.zoneId, context.nodeId, type, 'png', '', nextIndex);

    const refinedPrompt = type === 'scene' ? VisualPromptManager.getScenePrompt(prompt) : prompt;

    try {
        // 通过 callAi 统一入口调用图像生成
        const imageResult = await callAi(settings, {
            providerId: providerId,
            model: modelOnly,
            capability: 'image',
            prompt: refinedPrompt,
            width: 1366,
            height: 768
        }) as string;

        let base64Image: string | null = null;

        // Pollinations / DeAPI 返回 URL，需要下载转换
        if (providerId === 'pollinations' || providerId === 'deapi') {
            const response = await fetch(imageResult);
            if (!response.ok) {
                throw new AIServiceError(`远端图像流抓取失败，状态码: ${response.status}`, 'Pollinations', modelName);
            }
            const blob = await response.blob();
            base64Image = await blobToBase64(blob);
        } else {
            // 其他提供商直接返回 base64
            base64Image = imageResult;
        }

        if (!base64Image) {
            throw new AIServiceError('图像缓冲区转换抛空，生成链路异常截断。', providerId, modelOnly);
        }

        // 异步落盘，剥离 IO 阻塞，允许 UI 线程先行持有 base64 进行渲染
        PersistenceService.saveImage(filename, base64Image, context.zoneId, context.nodeId)
            .catch(e => BaseProvider.logWarn('Media Pipeline', '文件系统写入资产失败：', { error: e }));

        return {
            url: base64Image,
            type: 'image' as const
        };
    } catch (error) {
        const result = BaseProvider.handleServiceError(
            error,
            'Image Generation',
            {
                type,
                model: modelName,
                hasContext: !!context,
                contextKeys: context ? Object.keys(context) : [],
                promptLength: prompt.length
            },
            { url: null, type: 'image' as const }
        ) as { url: string | null; type: 'image' };
        return result;
    }
}

/**
 * 神经语义转码管线 (语音合成)
 * 利用大模型的内置 TTS 流获取人类或非人物种的音频表现。
 */
export const generateSpeech = async (
    settings: Settings,
    text: string,
    context: { zoneId: string; nodeId: string; imageUrl?: string },
    voiceName: string = 'Kore'
): Promise<string | null> => {
    BaseProvider.validateRequiredParams(
        { settings, text, context, voiceName },
        ['settings', 'text', 'context', 'voiceName'],
        'Speech Generation'
    );

    if (!context.zoneId || !context.nodeId) {
        throw new Error('上下文核心标识缺失：需要明确的 zoneId 与 nodeId 用于定位资产存储域。');
    }

    const filename = constructVisualFilename(context.zoneId, context.nodeId, 'audio', 'mp3', '', 1);

    const { provider: providerId, model: modelOnly } = settings.speechModel || { provider: 'google', model: 'gemini-2.5-flash-tts' };

    try {
        // 通过 callAi 统一入口调用语音生成
        const audioData = await callAi(settings, {
            providerId: providerId,
            model: modelOnly,
            capability: 'speech',
            text: text,
            voiceName: voiceName,
        }) as string;

        PersistenceService.saveAudio(filename, audioData, context.zoneId, context.nodeId)
            .catch((e: unknown) => BaseProvider.logWarn('Media Pipeline', '文件系统写入音频失败：', { error: e }));

        return audioData;
    } catch (error: unknown) {
        BaseProvider.logError('Media Pipeline', error);
        return null;
    }
}

/**
 * 动态视频合成管线
 * * 意图：
 * 采用专用视频大模型生成压迫式的环境流视频，并单向输出视频流地址。
 */
export const generateVideo = async (
    settings: Settings,
    prompt: string,
    context: { zoneId: string; nodeId: string; imageUrl?: string }
): Promise<{ url: string | null; type: 'video' }> => {
    BaseProvider.validateRequiredParams(
        { settings, prompt, context },
        ['settings', 'prompt', 'context'],
        'Video Generation'
    );

    if (!context.zoneId || !context.nodeId) {
        throw new Error('上下文核心标识缺失：需要明确的 zoneId 与 nodeId 用于定位资产存储域。');
    }

    if (!settings.videoModel || !settings.videoModel.provider || !settings.videoModel.model) {
        throw new Error('未注册 videoModel：系统设置中未指定可用的视频模型。');
    }

    let videoUrl: string | null = null;
    const { provider: videoProvider, model: videoModelOnly } = settings.videoModel;
    const modelUsed = `${videoProvider}:${videoModelOnly}`;

    try {
        // 通过 callAi 统一入口调用视频生成
        videoUrl = await callAi(settings, {
            providerId: videoProvider,
            model: videoModelOnly,
            capability: 'video',
            prompt: VisualPromptManager.getVideoPrompt(prompt),
            imageUrl: context.imageUrl,
        }) as string;

        if (videoUrl) {
            let filename: string;
            try {
                let nextIndex = 1;
                if (PersistenceService.isReady) {
                    nextIndex = await PersistenceService.getNextVideoIndex(context.zoneId, context.nodeId);
                }
                filename = constructVisualFilename(context.zoneId, context.nodeId, 'video', 'mp4', '', nextIndex);
            } catch (e) {
                // 降级处理：文件索引计算失效时，采用安全覆盖写入方式避免生成物丢失。
                filename = constructVisualFilename(context.zoneId, context.nodeId, 'video', 'mp4');
            }

            PersistenceService.saveVideo(filename, videoUrl, context.zoneId, context.nodeId)
                .catch((e: unknown) => BaseProvider.logWarn('Media Pipeline', '文件系统写入视频失败：', { error: e }));
        }

        return {
            url: videoUrl,
            type: 'video' as const
        };
    } catch (error) {
        const result = BaseProvider.handleServiceError(
            error,
            'Video Generation',
            {
                model: modelUsed,
                hasContext: !!context,
                contextKeys: context ? Object.keys(context) : [],
                promptLength: prompt.length,
                hasImageUrl: !!context.imageUrl
            },
            { url: null, type: 'video' as const }
        ) as { url: string | null; type: 'video' };
        return result;
    }
};