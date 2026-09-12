/**
tool.ts
音频工具、程序化音乐生成器与音频基础设施。

本文件职责：
- 提供 Web Audio API 的基础工具与解码工具
- 提供混响脉冲、噪声缓冲、波形曲线等音频资产
- 提供程序化背景音乐生成器 MusicGenerator

设计目标：
- 服务于《The Zone — 无尽领域》的整体听感：压抑、异化、生物机械、神经链接翻译失真
- 背景音乐不抢戏，主要作为低频压力、空间残响与认知不安的底层声场
- 保持所有公开 API 可序列化、可扩展、可销毁
- 不直接播放点音 / 短音，点音与短音由 sound.ts 负责
*/

// =====================
// 0. 基础工具类型
// =====================

/**
程序化背景音乐情绪。
*/
export type MusicMood =
    | 'calm'
    | 'tense'
    | 'action'
    | 'dread'
    | 'mystery'
    | 'triumph'
    | 'sorrow'

/**
混响空间类型。
*/
export type ReverbType =
    | 'default'
    | 'hall'
    | 'cave'
    | 'metallic'

/**
噪音颜色。
*/
export type NoiseColor =
    | 'white'
    | 'pink'
    | 'brown'

// =====================
// 1. 通用数学与编码工具
// =====================

export const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value))

const normalizeBase64 = (base64: string): string =>
    base64
        .replace(/^data:[^,]*,/, '')
        .replace(/\s/g, '')

/**
将 Base64 字符串解码为 Uint8Array。
自动兼容 data URL 前缀与空白字符。
*/
export function base64ToBytes(base64: string): Uint8Array {
    const clean = normalizeBase64(base64)
    if (!clean) return new Uint8Array(0)

    const binaryString = atob(clean)
    const bytes = new Uint8Array(binaryString.length)

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes
}

/**
将 PCM16 数据解码为 AudioBuffer。
@param data PCM16 二进制数据
@param ctx AudioContext
@param sampleRate 采样率
@param numChannels 声道数
*/
export function pcm16ToAudioBuffer(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): AudioBuffer {
    if (!Number.isInteger(numChannels) || numChannels < 1) {
        throw new Error('[tool.ts] pcm16ToAudioBuffer: numChannels 必须为正整数。')
    }

    const safeSampleRate = Math.max(1, Math.floor(sampleRate) || 1)
    const totalInt16 = Math.floor(data.byteLength / 2)
    const frameCount = Math.max(1, Math.floor(totalInt16 / numChannels))
    const buffer = ctx.createBuffer(numChannels, frameCount, safeSampleRate)

    if (totalInt16 === 0) {
        return buffer
    }

    let int16: Int16Array

    if (data.byteOffset % 2 === 0) {
        int16 = new Int16Array(data.buffer, data.byteOffset, totalInt16)
    } else {
        const copy = new Uint8Array(data)
        int16 = new Int16Array(copy.buffer, copy.byteOffset, totalInt16)
    }

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel)

        for (let i = 0; i < frameCount; i++) {
            const sourceIndex = i * numChannels + channel
            channelData[i] = sourceIndex < int16.length
                ? int16[sourceIndex] / 32768.0
                : 0
        }
    }

    return buffer
}

// =====================
// 2. AudioContext 辅助
// =====================

/**
创建 AudioContext。
*/
export function createAudioContext(options?: AudioContextOptions): AudioContext {
    const host = globalThis as unknown as {
        AudioContext?: typeof AudioContext
    }

    const Ctor = host.AudioContext

    if (!Ctor) {
        throw new Error('[tool.ts] 当前环境不支持 Web Audio API。')
    }

    return new Ctor(options)
}

/**
尝试恢复 AudioContext。
浏览器自动播放策略下通常需要用户手势后调用。
*/
export async function resumeAudioContext(ctx: AudioContext): Promise<boolean> {
    const initialState = ctx.state

    if (initialState === 'suspended') {
        try {
            await ctx.resume()
        } catch {
            return false
        }
    }

    const currentState = ctx.state
    return currentState === 'running'
}

// =====================
// 3. 混响脉冲响应
// =====================

/**
生成通用混响脉冲响应。
*/
export function createImpulseResponse(
    ctx: AudioContext,
    duration: number,
    decay: number,
    reverse: boolean = false,
): AudioBuffer {
    const safeDuration = Math.max(0.01, duration)
    const safeDecay = Math.max(0.001, decay)
    const length = Math.max(1, Math.floor(ctx.sampleRate * safeDuration))
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)

    const left = impulse.getChannelData(0)
    const right = impulse.getChannelData(1)

    for (let i = 0; i < length; i++) {
        const n = reverse ? i + 1 : length - i
        const envelope = Math.pow(n / length, safeDecay)
        const noise = Math.random() * 2 - 1

        left[i] = noise * envelope
        right[i] = noise * envelope * (0.92 + Math.random() * 0.16)
    }

    return impulse
}

/**
生成金属空间混响。
更明亮、更短促、带有高频反射感。
适合铁锈前哨、机械舱、金属走廊等工业异化空间。
*/
export function createMetallicReverb(
    ctx: AudioContext,
    duration: number,
): AudioBuffer {
    const safeDuration = Math.max(0.01, duration)
    const length = Math.max(1, Math.floor(ctx.sampleRate * safeDuration))
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)

    const left = impulse.getChannelData(0)
    const right = impulse.getChannelData(1)

    const reflections = [0.06, 0.13, 0.24, 0.38, 0.54, 0.72, 0.88]

    for (let i = 0; i < length; i++) {
        let val = 0
        const t = i / length

        for (const r of reflections) {
            if (t > r) {
                const localT = (t - r) / (1 - r)
                val += (Math.random() * 2 - 1) * Math.pow(1 - localT, 3.2) * 0.2
            }
        }

        val *= Math.pow(1 - t, 2.1)

        left[i] = val
        right[i] = val * (0.94 + Math.random() * 0.12)
    }

    return impulse
}

/**
生成大厅混响。
更宽广、更长尾、带早期反射。
适合圣伊丽莎白纪念医院大厅、书斋穹顶等空旷空间。
*/
export function createHallReverb(
    ctx: AudioContext,
    duration: number,
): AudioBuffer {
    const safeDuration = Math.max(0.01, duration)
    const length = Math.max(1, Math.floor(ctx.sampleRate * safeDuration))
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)

    const left = impulse.getChannelData(0)
    const right = impulse.getChannelData(1)

    for (let i = 0; i < length; i++) {
        const t = i / length
        const envelope = Math.pow(1 - t, 1.55)

        const earlyReflection = t < 0.12
            ? Math.sin(t * 120) * 0.24 * (1 - t / 0.12)
            : 0

        const noise = (Math.random() * 2 - 1) * envelope

        left[i] = noise * 0.9 + earlyReflection
        right[i] = noise * 0.8 + earlyReflection * 0.7
    }

    return impulse
}

/**
生成洞穴混响。
更深沉、低频感更强、回响尾音更长。
适合深渊区域、地下掩体、不可名状空间。
*/
export function createCaveReverb(
    ctx: AudioContext,
    duration: number,
): AudioBuffer {
    const safeDuration = Math.max(0.01, duration)
    const length = Math.max(1, Math.floor(ctx.sampleRate * safeDuration))
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)

    const left = impulse.getChannelData(0)
    const right = impulse.getChannelData(1)

    for (let i = 0; i < length; i++) {
        const t = i / length
        const envelope = Math.exp(-t * 2.1) * (1 - t)
        const lowFreqMod = Math.sin(t * Math.PI * 3) * 0.085
        const noise = (Math.random() * 2 - 1) * envelope

        left[i] = noise + lowFreqMod
        right[i] = noise - lowFreqMod
    }

    return impulse
}

/**
根据 ReverbType 生成对应混响脉冲响应。
*/
export function createReverbImpulse(
    ctx: AudioContext,
    type: ReverbType = 'default',
): AudioBuffer {
    switch (type) {
        case 'hall':
            return createHallReverb(ctx, 3.4)
        case 'cave':
            return createCaveReverb(ctx, 4.6)
        case 'metallic':
            return createMetallicReverb(ctx, 1.7)
        case 'default':
        default:
            return createImpulseResponse(ctx, 1.5, 2.25)
    }
}

/**
创建已加载对应脉冲响应的 ConvolverNode。
*/
export function createConvolverReverb(
    ctx: AudioContext,
    type: ReverbType = 'default',
): ConvolverNode {
    const convolver = ctx.createConvolver()
    convolver.buffer = createReverbImpulse(ctx, type)
    return convolver
}

// =====================
// 4. 音频波形曲线
// =====================

/**
创建失真曲线。
*/
export function makeDistortionCurve(amount: number = 50): Float32Array {
    const k = Math.max(0, amount)
    const nSamples = 44100
    const curve = new Float32Array(nSamples)
    const deg = Math.PI / 180

    for (let i = 0; i < nSamples; i++) {
        const x = (i * 2) / nSamples - 1
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
    }

    return curve
}

/**
创建软削波曲线。
比硬失真更温和。
*/
export function makeSoftClipCurve(amount: number = 2): Float32Array {
    const a = Math.max(0.01, amount)
    const nSamples = 44100
    const curve = new Float32Array(nSamples)

    for (let i = 0; i < nSamples; i++) {
        const x = (i * 2) / nSamples - 1
        curve[i] = Math.tanh(x * a)
    }

    return curve
}

/**
创建 Bitcrush 曲线。
用于 Lo-Fi、数字化破损、低采样质感。
*/
export function makeBitCrushCurve(bits: number = 4): Float32Array {
    const b = clamp(Math.round(bits), 1, 16)
    const nSamples = 44100
    const curve = new Float32Array(nSamples)
    const levels = Math.pow(2, b)

    for (let i = 0; i < nSamples; i++) {
        const x = (i * 2) / nSamples - 1
        curve[i] = Math.round(x * levels) / levels
    }

    return curve
}

// =====================
// 5. 噪音缓冲区
// =====================

/**
生成白噪音缓冲区。
*/
export function createWhiteNoiseBuffer(
    ctx: AudioContext,
    duration: number,
): AudioBuffer {
    const safeDuration = Math.max(0.01, duration)
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * safeDuration))
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)

    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)

    for (let i = 0; i < bufferSize; i++) {
        left[i] = Math.random() * 2 - 1
        right[i] = Math.random() * 2 - 1
    }

    return buffer
}

/**
生成粉红噪音缓冲区。
相比白噪音更自然，低频能量更高。
*/
export function createPinkNoiseBuffer(
    ctx: AudioContext,
    duration: number,
): AudioBuffer {
    const safeDuration = Math.max(0.01, duration)
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * safeDuration))
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)

    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch)

        let b0 = 0
        let b1 = 0
        let b2 = 0
        let b3 = 0
        let b4 = 0
        let b5 = 0
        let b6 = 0

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1

            b0 = 0.99886 * b0 + white * 0.0555179
            b1 = 0.99332 * b1 + white * 0.0750759
            b2 = 0.96900 * b2 + white * 0.1538520
            b3 = 0.86650 * b3 + white * 0.3104856
            b4 = 0.55000 * b4 + white * 0.5329522
            b5 = -0.7616 * b5 - white * 0.0168980

            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
            b6 = white * 0.115926
        }
    }

    return buffer
}

/**
生成棕色噪音缓冲区。
更低沉，适合风声、深渊环境、底噪氛围。
*/
export function createBrownNoiseBuffer(
    ctx: AudioContext,
    duration: number,
): AudioBuffer {
    const safeDuration = Math.max(0.01, duration)
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * safeDuration))
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)

    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch)
        let lastOut = 0

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1
            lastOut = (lastOut + 0.02 * white) / 1.02
            data[i] = lastOut * 3.5
        }
    }

    return buffer
}

/**
根据噪音颜色创建噪音缓冲区。
*/
export function createNoiseBuffer(
    ctx: AudioContext,
    color: NoiseColor,
    duration: number,
): AudioBuffer {
    switch (color) {
        case 'pink':
            return createPinkNoiseBuffer(ctx, duration)
        case 'brown':
            return createBrownNoiseBuffer(ctx, duration)
        case 'white':
        default:
            return createWhiteNoiseBuffer(ctx, duration)
    }
}

// =====================
// 6. 音频数学转换工具
// =====================

/**
音名转频率。
note 以 C 为 0，A 为 9。
@example
noteToFreq(9, 4) === 440
*/
export function noteToFreq(note: number, octave: number = 4): number {
    return 440 * Math.pow(2, (note - 9 + (octave - 4) * 12) / 12)
}

/**
MIDI 音符转频率。
*/
export function midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
BPM 转毫秒。
*/
export function bpmToMs(bpm: number, beats: number = 1): number {
    return (60000 / Math.max(1, bpm)) * beats
}

/**
毫秒转采样数。
*/
export function msToSamples(ms: number, sampleRate: number): number {
    return Math.floor((Math.max(0, ms) / 1000) * Math.max(1, sampleRate))
}

// =====================
// 7. 音阶、根音与音乐情绪预设
// =====================

/**
音阶字典。
*/
export const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    pentatonic: [0, 2, 4, 7, 9],
    blues: [0, 3, 5, 6, 7, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    wholetone: [0, 2, 4, 6, 8, 10],
    diminished: [0, 2, 3, 5, 6, 8, 9, 11],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    japanese: [0, 1, 5, 7, 8],
    arabic: [0, 1, 4, 5, 7, 8, 11],
} as const

export type ScaleName = keyof typeof SCALES
export type Scale = readonly number[]

/**
根音频率字典。
*/
export const ROOT_NOTES = {
    C1: 32.70,
    D1: 36.71,
    E1: 41.20,
    F1: 43.65,
    G1: 49.00,
    A1: 55.00,
    B1: 61.74,
    C2: 65.41,
    D2: 73.42,
    E2: 82.41,
    F2: 87.31,
    G2: 98.00,
    A2: 110.00,
    B2: 123.47,
    C3: 130.81,
    D3: 146.83,
    E3: 164.81,
    F3: 174.61,
    G3: 196.00,
    A3: 220.00,
    B3: 246.94,
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    G4: 392.00,
    A4: 440.00,
    B4: 493.88,
} as const

export type RootNoteName = keyof typeof ROOT_NOTES

/**
和弦进行预设。
*/
const CHORD_PROGRESSIONS: Record<MusicMood, readonly (readonly number[])[]> = {
    calm: [
        [0, 4, 7],
        [5, 9, 12],
        [7, 11, 14],
        [0, 4, 7],
    ],
    tense: [
        [0, 3, 6],
        [1, 4, 7],
        [3, 6, 9],
        [0, 3, 7],
    ],
    action: [
        [0, 4, 7],
        [0, 3, 7],
        [0, 5, 7],
        [0, 4, 7],
    ],
    dread: [
        [0, 3, 6],
        [0, 3, 6, 9],
        [1, 4, 7],
        [0, 3, 6],
    ],
    mystery: [
        [0, 4, 7, 11],
        [2, 5, 9],
        [4, 7, 11],
        [0, 4, 7],
    ],
    triumph: [
        [0, 4, 7],
        [5, 9, 12],
        [7, 11, 14],
        [12, 16, 19],
    ],
    sorrow: [
        [0, 3, 7],
        [5, 8, 12],
        [3, 7, 10],
        [0, 3, 7],
    ],
} as const

/**
节奏模式。
*/
const RHYTHM_PATTERNS: Record<MusicMood, readonly number[]> = {
    calm: [1, 0, 0, 0, 0.55, 0, 0, 0],
    tense: [1, 0, 0.3, 0, 0.75, 0, 0.35, 0],
    action: [1, 0.2, 0.65, 0.2, 1, 0.2, 0.7, 0.3],
    dread: [1, 0, 0, 0, 0, 0, 0.35, 0],
    mystery: [1, 0, 0, 0.22, 0, 0, 0.32, 0],
    triumph: [1, 0, 0.5, 0, 0.85, 0, 0.5, 0.3],
    sorrow: [1, 0, 0, 0, 0.5, 0, 0, 0],
} as const

interface MoodPreset {
    tempo: number
    rootNote: number
    scale: Scale
    filterBase: number
    filterQ: number
    melodyChance: number
    durationFactor: number
    noiseChance: number
    /** 和弦 / 垫音波形。 */
    padWaveform: OscillatorType
    /** 旋律波形。 */
    melodyWaveform: OscillatorType
    /** 低频 drone 强度。 */
    subDroneGain: number
    /** 异常神经静态概率。 */
    anomalyChance: number
    /** 人性化随机幅度。 */
    humanize: number
}

/**
不同 MusicMood 对应的音乐参数预设。
*/
const MOOD_PRESETS: Record<MusicMood, MoodPreset> = {
    calm: {
        tempo: 46,
        rootNote: ROOT_NOTES.C3,
        scale: SCALES.pentatonic,
        filterBase: 680,
        filterQ: 0.8,
        melodyChance: 0.10,
        durationFactor: 1.35,
        noiseChance: 0.24,
        padWaveform: 'sine',
        melodyWaveform: 'triangle',
        subDroneGain: 0.012,
        anomalyChance: 0.015,
        humanize: 0.18,
    },
    tense: {
        tempo: 64,
        rootNote: ROOT_NOTES.E2,
        scale: SCALES.phrygian,
        filterBase: 920,
        filterQ: 1.2,
        melodyChance: 0.16,
        durationFactor: 1.0,
        noiseChance: 0.30,
        padWaveform: 'triangle',
        melodyWaveform: 'sine',
        subDroneGain: 0.02,
        anomalyChance: 0.05,
        humanize: 0.24,
    },
    action: {
        tempo: 104,
        rootNote: ROOT_NOTES.A2,
        scale: SCALES.minor,
        filterBase: 1700,
        filterQ: 1.1,
        melodyChance: 0.18,
        durationFactor: 0.78,
        noiseChance: 0.20,
        padWaveform: 'sawtooth',
        melodyWaveform: 'square',
        subDroneGain: 0.025,
        anomalyChance: 0.03,
        humanize: 0.16,
    },
    dread: {
        tempo: 34,
        rootNote: ROOT_NOTES.C2,
        scale: SCALES.locrian,
        filterBase: 380,
        filterQ: 2.6,
        melodyChance: 0.06,
        durationFactor: 1.7,
        noiseChance: 0.40,
        padWaveform: 'sawtooth',
        melodyWaveform: 'sine',
        subDroneGain: 0.04,
        anomalyChance: 0.07,
        humanize: 0.3,
    },
    mystery: {
        tempo: 50,
        rootNote: ROOT_NOTES.F3,
        scale: SCALES.wholetone,
        filterBase: 860,
        filterQ: 1.1,
        melodyChance: 0.22,
        durationFactor: 1.15,
        noiseChance: 0.32,
        padWaveform: 'triangle',
        melodyWaveform: 'sine',
        subDroneGain: 0.016,
        anomalyChance: 0.09,
        humanize: 0.26,
    },
    triumph: {
        tempo: 82,
        rootNote: ROOT_NOTES.C4,
        scale: SCALES.major,
        filterBase: 2200,
        filterQ: 0.8,
        melodyChance: 0.20,
        durationFactor: 0.95,
        noiseChance: 0.12,
        padWaveform: 'triangle',
        melodyWaveform: 'sine',
        subDroneGain: 0.012,
        anomalyChance: 0.008,
        humanize: 0.12,
    },
    sorrow: {
        tempo: 40,
        rootNote: ROOT_NOTES.A2,
        scale: SCALES.minor,
        filterBase: 640,
        filterQ: 0.9,
        melodyChance: 0.11,
        durationFactor: 1.45,
        noiseChance: 0.30,
        padWaveform: 'sine',
        melodyWaveform: 'triangle',
        subDroneGain: 0.026,
        anomalyChance: 0.03,
        humanize: 0.24,
    },
}

// =====================
// 8. 程序化音乐生成器
// =====================

export interface MusicGeneratorOptions {
    /**
    初始音乐情绪。
    */
    initialMood?: MusicMood
    /**
     * 主音量，范围 0-1。
     */
    volume?: number
    /**
     * 提前调度时间，单位秒。
     */
    scheduleAheadTime?: number
    /**
     * 调度器轮询间隔，单位毫秒。
     */
    lookaheadMs?: number
    /**
     * 是否启用安全限制器。
     * 默认启用。
     */
    enableLimiter?: boolean
    /**
     * 是否启用噪音纹理。
     * 默认启用。
     * 启用后会显著降低纯电子 pad 感，使背景音乐更接近 The Zone 的有机恐怖氛围。
     */
    noiseTexture?: boolean
    /**
     * 是否启用异常神经静态与低频 drone。
     * 默认启用。
     */
    anomalyTexture?: boolean
}

/**
程序化音乐生成器。

基于：
- 音阶
- 和弦进行
- 节奏模式
- 随机旋律音符
- 低频 drone
- 异常神经静态
- 棕色噪音纹理
- Web Audio lookahead 调度器

适合生成低成本、可循环、可根据 MusicMood 切换氛围的背景音乐。
*/
export class MusicGenerator {
    private isPlaying: boolean = false
    private disposed: boolean = false
    private currentMood: MusicMood = 'calm'
    private schedulerTimer: ReturnType<typeof setInterval> | null = null
    private nextNoteTime: number = 0
    private currentChordIndex: number = 0
    private currentBeatIndex: number = 0
    private tempo: number = MOOD_PRESETS.calm.tempo
    private rootNote: number = MOOD_PRESETS.calm.rootNote
    private scale: Scale = MOOD_PRESETS.calm.scale

    private readonly activeSources = new Set<AudioScheduledSourceNode>()
    private readonly masterGain: GainNode
    private readonly limiter: DynamicsCompressorNode | null
    private readonly scheduleAheadTime: number
    private readonly lookaheadMs: number
    private readonly noiseTexture: boolean
    private readonly anomalyTexture: boolean
    private readonly noiseBuffer: AudioBuffer | null
    private readonly staticBuffer: AudioBuffer | null
    private volume: number

    constructor(
        private readonly ctx: AudioContext,
        reverbNode?: AudioNode,
        options: MusicGeneratorOptions = {},
    ) {
        this.masterGain = this.ctx.createGain()
        this.volume = clamp(options.volume ?? 0.72, 0, 1)
        this.masterGain.gain.value = this.volume

        const output = reverbNode ?? this.ctx.destination

        if (options.enableLimiter ?? true) {
            this.limiter = this.ctx.createDynamicsCompressor()
            this.limiter.threshold.setValueAtTime(-16, this.ctx.currentTime)
            this.limiter.knee.setValueAtTime(20, this.ctx.currentTime)
            this.limiter.ratio.setValueAtTime(8, this.ctx.currentTime)
            this.limiter.attack.setValueAtTime(0.002, this.ctx.currentTime)
            this.limiter.release.setValueAtTime(0.14, this.ctx.currentTime)

            this.masterGain.connect(this.limiter)
            this.limiter.connect(output)
        } else {
            this.limiter = null
            this.masterGain.connect(output)
        }

        this.scheduleAheadTime = Math.max(0.02, options.scheduleAheadTime ?? 0.12)
        this.lookaheadMs = clamp(options.lookaheadMs ?? 25, 10, 250)
        this.noiseTexture = options.noiseTexture ?? true
        this.anomalyTexture = options.anomalyTexture ?? true

        this.noiseBuffer = this.noiseTexture
            ? createBrownNoiseBuffer(this.ctx, 2.5)
            : null

        this.staticBuffer = this.anomalyTexture
            ? createWhiteNoiseBuffer(this.ctx, 1.2)
            : null

        if (options.initialMood) {
            this.setMood(options.initialMood)
        }
    }

    /**
    设置音乐情绪。
    */
    public setMood(mood: MusicMood): void {
        if (this.disposed) return

        const preset = MOOD_PRESETS[mood]
        if (!preset) return

        this.currentMood = mood
        this.tempo = preset.tempo
        this.rootNote = preset.rootNote
        this.scale = preset.scale
    }

    /**
    获取当前情绪。
    */
    public getMood(): MusicMood {
        return this.currentMood
    }

    /**
    设置 BPM。
    */
    public setTempo(bpm: number): void {
        if (this.disposed) return
        this.tempo = clamp(bpm, 30, 200)
    }

    /**
    设置根音频率。
    */
    public setRootNote(freq: number): void {
        if (this.disposed) return

        if (Number.isFinite(freq) && freq > 0) {
            this.rootNote = freq
        }
    }

    /**
    设置音阶。
    */
    public setScale(scale: Scale): void {
        if (this.disposed) return

        if (Array.isArray(scale) && scale.length > 0) {
            this.scale = scale
        }
    }

    /**
    设置主音量。
    */
    public setVolume(value: number, fadeTime: number = 0.05): void {
        if (this.disposed) return

        this.volume = clamp(value, 0, 1)

        if (this.ctx.state === 'closed') return

        const now = this.ctx.currentTime
        const safeFade = Math.max(0.001, fadeTime)

        this.masterGain.gain.cancelScheduledValues(now)
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
        this.masterGain.gain.linearRampToValueAtTime(this.volume, now + safeFade)
    }

    /**
    开始播放。
    */
    public start(): void {
        if (this.disposed || this.isPlaying || this.ctx.state === 'closed') return

        if (this.ctx.state === 'suspended') {
            void this.ctx.resume().catch(() => undefined)
        }

        this.isPlaying = true

        const now = this.ctx.currentTime

        this.masterGain.gain.cancelScheduledValues(now)
        this.masterGain.gain.setValueAtTime(this.volume, now)

        this.nextNoteTime = now + 0.06
        this.currentBeatIndex = 0
        this.currentChordIndex = 0

        this.schedulerTimer = setInterval(() => {
            this.scheduler()
        }, this.lookaheadMs)
    }

    /**
    停止播放。
    */
    public stop(fadeTime: number = 0.12): void {
        if (this.schedulerTimer !== null) {
            clearInterval(this.schedulerTimer)
            this.schedulerTimer = null
        }

        if (!this.isPlaying && this.activeSources.size === 0) return

        this.isPlaying = false

        if (this.ctx.state === 'closed') {
            this.activeSources.clear()
            return
        }

        const now = this.ctx.currentTime
        const safeFade = Math.max(0.02, fadeTime)
        const fadeEnd = now + safeFade

        this.masterGain.gain.cancelScheduledValues(now)
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
        this.masterGain.gain.linearRampToValueAtTime(0.0001, fadeEnd)

        for (const source of this.activeSources) {
            try {
                source.stop(fadeEnd)
            } catch {
                // 忽略已停止或非法状态的节点。
            }
        }
    }

    /**
    销毁生成器。
    */
    public dispose(): void {
        if (this.disposed) return

        this.disposed = true
        this.stop(0.03)

        try {
            this.masterGain.disconnect()
        } catch {
            // 忽略已断开的节点。
        }

        if (this.limiter) {
            try {
                this.limiter.disconnect()
            } catch {
                // 忽略已断开的节点。
            }
        }

        this.activeSources.clear()
    }

    /**
    是否正在播放。
    */
    public isActive(): boolean {
        return this.isPlaying
    }

    /**
    Web Audio lookahead 调度器。
    */
    private scheduler(): void {
        if (!this.isPlaying || this.ctx.state === 'closed') return

        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.nextNoteTime)
            this.advanceNote()
        }
    }

    /**
    推进到下一个八分音符。
    */
    private advanceNote(): void {
        const secondsPerBeat = 60.0 / Math.max(1, this.tempo)

        this.nextNoteTime += secondsPerBeat / 2
        this.currentBeatIndex++

        const beatsPerBar = RHYTHM_PATTERNS[this.currentMood].length

        if (this.currentBeatIndex >= beatsPerBar) {
            this.currentBeatIndex = 0
            this.currentChordIndex++

            const progression = CHORD_PROGRESSIONS[this.currentMood]

            if (this.currentChordIndex >= progression.length) {
                this.currentChordIndex = 0
            }
        }
    }

    /**
    调度单个时间点上的音符。
    */
    private scheduleNote(time: number): void {
        const rhythm = RHYTHM_PATTERNS[this.currentMood]
        const rawVelocity = rhythm[this.currentBeatIndex % rhythm.length] ?? 0

        if (rawVelocity <= 0) return

        const progression = CHORD_PROGRESSIONS[this.currentMood]
        const chord = progression[this.currentChordIndex % progression.length] ?? []
        const secondsPerBeat = 60.0 / Math.max(1, this.tempo)
        const preset = MOOD_PRESETS[this.currentMood]

        const velocity = rawVelocity * (
            1 - preset.humanize * 0.25 + this.rand(0, preset.humanize * 0.25)
        )

        const noteDuration = secondsPerBeat * preset.durationFactor

        chord.forEach((interval, index) => {
            const freq = this.getFrequencyFromScaleDegree(interval)
            const offset = index * 0.02 + this.rand(-0.008, 0.008) * preset.humanize

            this.playNote(
                freq,
                time + offset,
                noteDuration,
                velocity * 0.046,
                preset.padWaveform,
            )
        })

        if (
            Math.random() < preset.melodyChance &&
            this.currentBeatIndex % 2 === 0
        ) {
            const melodyDegree = Math.floor(Math.random() * this.scale.length)
            const melodyOctave = 1 + Math.floor(Math.random() * 2)
            const melodyFreq = this.getFrequencyFromScaleDegree(
                melodyDegree + melodyOctave * this.scale.length,
            )

            this.playNote(
                melodyFreq,
                time + this.rand(-0.01, 0.01) * preset.humanize,
                noteDuration * 0.55,
                velocity * 0.03,
                preset.melodyWaveform,
            )
        }

        if (
            this.noiseBuffer &&
            Math.random() < preset.noiseChance * (this.currentBeatIndex === 0 ? 1 : 0.32)
        ) {
            this.playNoiseTexture(
                time,
                noteDuration * (this.currentMood === 'dread' ? 2.6 : 1.7),
                velocity * 0.016,
                preset.filterBase * 0.72,
            )
        }

        if (
            this.anomalyTexture &&
            preset.subDroneGain > 0 &&
            this.currentBeatIndex === 0
        ) {
            this.playSubDrone(
                time,
                secondsPerBeat * 4,
                velocity,
                preset.subDroneGain,
            )
        }

        if (
            this.anomalyTexture &&
            this.staticBuffer &&
            Math.random() < preset.anomalyChance * (this.currentBeatIndex % 4 === 2 ? 1 : 0.3)
        ) {
            this.playAnomalyTexture(
                time,
                noteDuration * this.rand(0.8, 1.8),
                velocity,
            )
        }
    }

    /**
    根据音阶度数计算频率。
    */
    private getFrequencyFromScaleDegree(degree: number): number {
        const scaleLength = this.scale.length
        const scaleIndex = ((degree % scaleLength) + scaleLength) % scaleLength
        const octaveShift = Math.floor(degree / scaleLength)
        const semitones = (this.scale[scaleIndex] ?? 0) + octaveShift * 12

        return this.rootNote * Math.pow(2, semitones / 12)
    }

    private rand(min: number, max: number): number {
        return min + Math.random() * (max - min)
    }

    private registerSource(
        source: AudioScheduledSourceNode,
        cleanup?: () => void,
    ): void {
        this.activeSources.add(source)

        source.onended = () => {
            this.activeSources.delete(source)

            if (cleanup) {
                cleanup()
            }
        }
    }

    private connectToMaster(
        node: AudioNode,
        time?: number,
        pan?: number,
    ): void {
        if (
            pan === undefined ||
            typeof this.ctx.createStereoPanner !== 'function'
        ) {
            node.connect(this.masterGain)
            return
        }

        const panner = this.ctx.createStereoPanner()
        panner.pan.setValueAtTime(clamp(pan, -1, 1), time ?? this.ctx.currentTime)

        node.connect(panner)
        panner.connect(this.masterGain)
    }

    /**
    播放单个音符。
    */
    private playNote(
        freq: number,
        time: number,
        duration: number,
        volume: number,
        waveform: OscillatorType = 'sine',
    ): void {
        if (!Number.isFinite(freq) || freq <= 20) return
        if (this.ctx.state === 'closed') return

        const preset = MOOD_PRESETS[this.currentMood]

        const attack = clamp(0.035 + preset.durationFactor * 0.028, 0.03, 0.16)
        const decay = 0.11
        const minDuration = attack + decay + 0.1
        const safeDuration = Math.max(minDuration, duration)
        const release = Math.max(0.12, safeDuration * 0.42)
        const peak = clamp(volume, 0.0001, 0.42)
        const sustain = peak * 0.58

        const releaseStart = Math.max(
            time + attack + decay,
            time + safeDuration - release,
        )

        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        const filter = this.ctx.createBiquadFilter()

        osc.type = waveform
        osc.frequency.setValueAtTime(freq, time)
        osc.detune.setValueAtTime(
            this.rand(-7, 7) + this.rand(-8, 8) * preset.humanize,
            time,
        )

        filter.type = 'lowpass'

        const filterFreq = clamp(
            preset.filterBase * (freq > 400 ? 1.35 : 0.88),
            110,
            7600,
        )

        filter.frequency.setValueAtTime(Math.max(80, filterFreq * 0.72), time)
        filter.frequency.linearRampToValueAtTime(filterFreq, time + attack)
        filter.frequency.exponentialRampToValueAtTime(
            Math.max(80, filterFreq * 0.58),
            time + safeDuration,
        )
        filter.Q.setValueAtTime(preset.filterQ, time)

        gain.gain.setValueAtTime(0.0001, time)
        gain.gain.linearRampToValueAtTime(peak, time + attack)
        gain.gain.linearRampToValueAtTime(sustain, time + attack + decay)
        gain.gain.setValueAtTime(sustain, releaseStart)
        gain.gain.linearRampToValueAtTime(0.0001, time + safeDuration)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(this.masterGain)

        const stopTime = time + safeDuration + 0.12

        osc.start(time)
        osc.stop(stopTime)

        this.registerSource(osc, () => {
            try {
                gain.disconnect()
                filter.disconnect()
            } catch {
                // 忽略已断开节点。
            }
        })
    }

    /**
    播放棕色噪音纹理。
    用于削弱传统 Web Audio pad 的电子感。
    */
    private playNoiseTexture(
        time: number,
        duration: number,
        volume: number,
        filterFrequency: number,
    ): void {
        if (!this.noiseBuffer || this.ctx.state === 'closed') return

        const safeDuration = Math.max(0.25, duration)

        const source = this.ctx.createBufferSource()
        source.buffer = this.noiseBuffer
        source.loop = true

        const gain = this.ctx.createGain()
        const filter = this.ctx.createBiquadFilter()

        filter.type = 'lowpass'
        filter.Q.setValueAtTime(0.75, time)
        filter.frequency.setValueAtTime(
            clamp(filterFrequency, 80, 5200),
            time,
        )

        const attack = Math.min(0.45, safeDuration * 0.38)
        const peak = clamp(volume, 0.0001, 0.16)

        gain.gain.setValueAtTime(0.0001, time)
        gain.gain.linearRampToValueAtTime(peak, time + attack)
        gain.gain.linearRampToValueAtTime(0.0001, time + safeDuration)

        source.connect(filter)
        filter.connect(gain)
        gain.connect(this.masterGain)

        source.start(time, Math.random() * 0.75)
        source.stop(time + safeDuration + 0.15)

        this.registerSource(source, () => {
            try {
                gain.disconnect()
                filter.disconnect()
            } catch {
                // 忽略已断开节点。
            }
        })
    }

    /**
    播放低频 drone。
    用于制造 The Zone 中持续存在的深渊压力。
    */
    private playSubDrone(
        time: number,
        duration: number,
        velocity: number,
        gainScale: number,
    ): void {
        if (this.ctx.state === 'closed') return

        const safeDuration = Math.max(0.6, duration)
        const baseFreq = clamp(this.rootNote / 2, 30, 120)

        const gain = this.ctx.createGain()
        const filter = this.ctx.createBiquadFilter()

        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(140, time)
        filter.Q.setValueAtTime(0.8, time)

        const attack = Math.min(0.55, safeDuration * 0.35)
        const release = Math.min(0.9, safeDuration * 0.4)
        const peak = clamp(velocity * gainScale, 0.0001, 0.12)

        gain.gain.setValueAtTime(0.0001, time)
        gain.gain.linearRampToValueAtTime(peak, time + attack)
        gain.gain.setValueAtTime(peak, time + safeDuration - release)
        gain.gain.linearRampToValueAtTime(0.0001, time + safeDuration)

        const osc1 = this.ctx.createOscillator()
        const osc2 = this.ctx.createOscillator()

        osc1.type = 'sine'
        osc2.type = 'sine'

        osc1.frequency.setValueAtTime(baseFreq, time)
        osc2.frequency.setValueAtTime(baseFreq * 1.006, time)

        osc1.detune.setValueAtTime(this.rand(-6, 6), time)
        osc2.detune.setValueAtTime(this.rand(-10, 10), time)

        osc1.connect(gain)
        osc2.connect(gain)

        gain.connect(filter)
        filter.connect(this.masterGain)

        const stopTime = time + safeDuration + 0.12

        osc1.start(time)
        osc2.start(time)
        osc1.stop(stopTime)
        osc2.stop(stopTime)

        let ended = 0

        const cleanup = () => {
            ended += 1

            if (ended >= 2) {
                try {
                    gain.disconnect()
                    filter.disconnect()
                } catch {
                    // 忽略已断开节点。
                }
            }
        }

        this.registerSource(osc1, cleanup)
        this.registerSource(osc2, cleanup)
    }

    /**
    播放异常神经静态。
    模拟神经链接仪翻译过程中泄漏的高频认知噪声。
    */
    private playAnomalyTexture(
        time: number,
        duration: number,
        velocity: number,
    ): void {
        if (!this.staticBuffer || this.ctx.state === 'closed') return

        const safeDuration = clamp(duration, 0.18, 1.4)

        const source = this.ctx.createBufferSource()
        source.buffer = this.staticBuffer
        source.loop = true
        source.playbackRate.setValueAtTime(this.rand(0.85, 1.25), time)

        const gain = this.ctx.createGain()
        const filter = this.ctx.createBiquadFilter()

        filter.type = 'highpass'
        filter.frequency.setValueAtTime(this.rand(2400, 6200), time)
        filter.Q.setValueAtTime(this.rand(1.2, 4.5), time)

        const attack = Math.min(0.18, safeDuration * 0.3)
        const peak = clamp(velocity * this.rand(0.004, 0.011), 0.0001, 0.02)

        gain.gain.setValueAtTime(0.0001, time)
        gain.gain.linearRampToValueAtTime(peak, time + attack)
        gain.gain.linearRampToValueAtTime(0.0001, time + safeDuration)

        source.connect(filter)
        filter.connect(gain)

        this.connectToMaster(gain, time, this.rand(-0.65, 0.65))

        source.start(time, Math.random() * 0.4)
        source.stop(time + safeDuration + 0.08)

        this.registerSource(source, () => {
            try {
                gain.disconnect()
                filter.disconnect()
            } catch {
                // 忽略已断开节点。
            }
        })
    }
}