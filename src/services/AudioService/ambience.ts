/**
 * ambience.ts
 *
 * 主题环境音生成器
 *
 * 功能概述：
 * - 基于 Web Audio API 的程序化环境音系统。
 * - 支持五层混音结构：
 *   - base     基础 Drone 层
 *   - texture  噪音纹理层
 *   - rhythm   节奏脉冲层
 *   - melody   稀疏旋律层
 *   - accent   环境事件点声源层
 *
 * @version 3.0.0
 * @see ./tool.ts
 * @see ../type.ts
 * @see ../interface.ts
 */

import type { ThemeType } from '../../meta'
import type { NoiseColor } from './tools'
import {
    SCALES,
    ROOT_NOTES,
    clamp,
    createNoiseBuffer,
    createImpulseResponse,
    createConvolverReverb,
    makeDistortionCurve,
    makeBitCrushCurve,
    resumeAudioContext,
} from './tools'

/**
 * 环境事件类型。
 *
 * 用于 accent 层中的程序化点声源。
 */
export type AmbientEventType =
    | 'footstep'
    | 'static'
    | 'whisper'
    | 'heartbeat'
    | 'breathing'
    | 'scream'
    | 'distortion'
    | 'malfunction'
    | 'radio'

interface AudioLayer {
    base: GainNode | null
    texture: GainNode | null
    rhythm: GainNode | null
    melody: GainNode | null
    accent: GainNode | null
}

interface AmbientEvent {
    type: AmbientEventType
    minInterval: number
    maxInterval: number
    probability: number
    volumeRange: [number, number]
}

interface ThemeConfig {
    baseFrequencies: number[]
    baseWaveform: OscillatorType
    baseVolume: number
    filterFreq: number
    filterQ: number
    lfoRate: number
    lfoDepth: number
    noiseVolume: number
    noiseType: NoiseColor
    rhythmBPM: number
    rhythmEnabled: boolean
    melodyEnabled: boolean
    melodyScale: number[]
    melodyRoot: number
    reverbTime: number
    reverbDecay: number
    ambientEvents: AmbientEvent[]
}

// =====================
// 内部工具
// =====================

const randomBetween = (min: number, max: number): number =>
    min + Math.random() * (max - min)

const safeDisconnect = (node: AudioNode): void => {
    try {
        node.disconnect()
    } catch {
        // 忽略已断开或非法节点。
    }
}

const isOscillatorNode = (node: AudioNode): node is OscillatorNode =>
    typeof OscillatorNode !== 'undefined' && node instanceof OscillatorNode

const isBufferSourceNode = (node: AudioNode): node is AudioBufferSourceNode =>
    typeof AudioBufferSourceNode !== 'undefined' &&
    node instanceof AudioBufferSourceNode

const createEmptyLayers = (): AudioLayer => ({
    base: null,
    texture: null,
    rhythm: null,
    melody: null,
    accent: null,
})

// =====================
// 主题配置
// =====================

const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
    // ------------------------------------------------------------------------
    // 基础功能主题
    // ------------------------------------------------------------------------

    /**
     * 庇护所。
     */
    sanctuary: {
        baseFrequencies: [110, 164.8, 196, 220],
        baseWaveform: 'sine',
        baseVolume: 0.08,
        filterFreq: 800,
        filterQ: 0.5,
        lfoRate: 0.08,
        lfoDepth: 0.2,
        noiseVolume: 0.015,
        noiseType: 'pink',
        rhythmBPM: 0,
        rhythmEnabled: false,
        melodyEnabled: true,
        melodyScale: [...SCALES.pentatonic],
        melodyRoot: ROOT_NOTES.A3,
        reverbTime: 4,
        reverbDecay: 2.5,
        ambientEvents: [],
    },

    /**
     * 战斗中。
     */
    combat: {
        baseFrequencies: [45, 90, 92, 135],
        baseWaveform: 'sawtooth',
        baseVolume: 0.18,
        filterFreq: 300,
        filterQ: 3,
        lfoRate: 0.3,
        lfoDepth: 0.5,
        noiseVolume: 0.06,
        noiseType: 'white',
        rhythmBPM: 140,
        rhythmEnabled: true,
        melodyEnabled: false,
        melodyScale: [...SCALES.phrygian],
        melodyRoot: ROOT_NOTES.E2,
        reverbTime: 1.5,
        reverbDecay: 1,
        ambientEvents: [],
    },

    /**
     * 恐慌，低理智时。
     */
    panic: {
        baseFrequencies: [500, 510, 520, 8000],
        baseWaveform: 'triangle',
        baseVolume: 0.05,
        filterFreq: 2000,
        filterQ: 5,
        lfoRate: 8,
        lfoDepth: 0.8,
        noiseVolume: 0.1,
        noiseType: 'white',
        rhythmBPM: 180,
        rhythmEnabled: true,
        melodyEnabled: false,
        melodyScale: [...SCALES.chromatic],
        melodyRoot: ROOT_NOTES.C4,
        reverbTime: 0.5,
        reverbDecay: 0.3,
        ambientEvents: [
            {
                type: 'whisper',
                minInterval: 3000,
                maxInterval: 8000,
                probability: 0.5,
                volumeRange: [0.1, 0.3],
            },
            {
                type: 'heartbeat',
                minInterval: 800,
                maxInterval: 1200,
                probability: 0.8,
                volumeRange: [0.3, 0.5],
            },
        ],
    },

    /**
     * 死亡界面。
     */
    death: {
        baseFrequencies: [30, 60, 90],
        baseWaveform: 'sine',
        baseVolume: 0.15,
        filterFreq: 200,
        filterQ: 1,
        lfoRate: 0.03,
        lfoDepth: 0.2,
        noiseVolume: 0.02,
        noiseType: 'brown',
        rhythmBPM: 0,
        rhythmEnabled: false,
        melodyEnabled: false,
        melodyScale: [...SCALES.minor],
        melodyRoot: ROOT_NOTES.D2,
        reverbTime: 10,
        reverbDecay: 5,
        ambientEvents: [],
    },

    /**
     * LLM 生成区域等待界面。
     */
    zone_gen: {
        baseFrequencies: [130.81, 196, 261.63],
        baseWaveform: 'sine',
        baseVolume: 0.05,
        filterFreq: 1200,
        filterQ: 0.4,
        lfoRate: 0.06,
        lfoDepth: 0.15,
        noiseVolume: 0.01,
        noiseType: 'pink',
        rhythmBPM: 0,
        rhythmEnabled: false,
        melodyEnabled: true,
        melodyScale: [...SCALES.pentatonic],
        melodyRoot: ROOT_NOTES.C4,
        reverbTime: 5,
        reverbDecay: 3,
        ambientEvents: [],
    },

    /**
     * 神经链接仪底噪。
     *
     * 仅在视觉模式为 camera 时适合启用。
     * 具体强度可由外部通过 setIntensity 传入。
     */
    neural_static: {
        baseFrequencies: [440, 445, 880],
        baseWaveform: 'sine',
        baseVolume: 0.03,
        filterFreq: 4000,
        filterQ: 0.3,
        lfoRate: 0.04,
        lfoDepth: 0.1,
        noiseVolume: 0.04,
        noiseType: 'white',
        rhythmBPM: 0,
        rhythmEnabled: false,
        melodyEnabled: false,
        melodyScale: [...SCALES.minor],
        melodyRoot: ROOT_NOTES.C4,
        reverbTime: 1.5,
        reverbDecay: 0.8,
        ambientEvents: [
            {
                type: 'static',
                minInterval: 5000,
                maxInterval: 12000,
                probability: 0.25,
                volumeRange: [0.02, 0.06],
            },
        ],
    },

    /**
     * 解谜思考氛围。
     */
    puzzle_ambient: {
        baseFrequencies: [196, 293.66, 392],
        baseWaveform: 'sine',
        baseVolume: 0.06,
        filterFreq: 1400,
        filterQ: 0.6,
        lfoRate: 0.09,
        lfoDepth: 0.2,
        noiseVolume: 0.02,
        noiseType: 'pink',
        rhythmBPM: 0,
        rhythmEnabled: false,
        melodyEnabled: true,
        melodyScale: [...SCALES.major],
        melodyRoot: ROOT_NOTES.C4,
        reverbTime: 4,
        reverbDecay: 2.5,
        ambientEvents: [],
    },

    /**
     * 极高威胁度节点。
     *
     * 建议 threatLevel > 15 时触发。
     */
    dangerous: {
        baseFrequencies: [32, 64, 96, 128],
        baseWaveform: 'sawtooth',
        baseVolume: 0.14,
        filterFreq: 240,
        filterQ: 4,
        lfoRate: 0.4,
        lfoDepth: 0.6,
        noiseVolume: 0.08,
        noiseType: 'brown',
        rhythmBPM: 90,
        rhythmEnabled: true,
        melodyEnabled: false,
        melodyScale: [...SCALES.phrygian],
        melodyRoot: ROOT_NOTES.E2,
        reverbTime: 1.8,
        reverbDecay: 1.2,
        ambientEvents: [
            {
                type: 'heartbeat',
                minInterval: 900,
                maxInterval: 1400,
                probability: 0.75,
                volumeRange: [0.3, 0.55],
            },
        ],
    },

    // ------------------------------------------------------------------------
    // 叙事美学音轨已剥离
    //
    // 元契约 v2.1 起，叙事美学（HorrorAesthetic）不再属于 ThemeType：
    // 美学是叙事域的元数据，音效主题是表现层的功能通道，二者不应耦合。
    // 探索环境音只按功能性主题选择（见 useGameState 的音频同步 effect）。
    // ------------------------------------------------------------------------
}

// =====================
// 一次性音色参数
// =====================

interface ToneOptions {
    freq: number
    endFreq?: number
    duration: number
    volume: number
    waveform?: OscillatorType
    attack?: number
    release?: number
    filterFreq?: number
    filterQ?: number
    distortion?: Float32Array
    when?: number
    output?: AudioNode
}

interface NoiseBurstOptions {
    duration: number
    volume: number
    filterType?: BiquadFilterType
    frequency?: number
    Q?: number
    attack?: number
    release?: number
    distortion?: Float32Array
    bitcrush?: number
    when?: number
    output?: AudioNode
}

// =====================
// AmbienceGenerator
// =====================

export class AmbienceGenerator {
    private activeNodes = new Set<AudioNode>()
    private layers: AudioLayer = createEmptyLayers()

    private currentTheme: ThemeType | null = null
    private currentConfig: ThemeConfig | null = null
    private currentIntensity = 0
    private _disposed = false

    private readonly uiTimers = new Set<ReturnType<typeof setTimeout>>()
    private readonly cleanupTimers = new Set<ReturnType<typeof setTimeout>>()
    private readonly noiseBufferCache = new Map<NoiseColor, AudioBuffer>()

    private onAmbientEvent: ((type: AmbientEventType) => void) | null = null

    private readonly reverbNode: ConvolverNode
    private readonly ownsReverb: boolean

    constructor(
        private readonly ctx: AudioContext,
        private readonly masterGain: GainNode,
        reverbNode?: ConvolverNode,
    ) {
        if (ctx.state === 'closed') {
            throw new Error('[ambience.ts] AmbienceGenerator 需要一个未关闭的 AudioContext。')
        }

        if (reverbNode) {
            this.reverbNode = reverbNode
            this.ownsReverb = false
        } else {
            this.reverbNode = createConvolverReverb(this.ctx, 'default')
            this.reverbNode.connect(this.masterGain)
            this.ownsReverb = true
        }
    }

    // ------------------------------------------------------------------------
    // 公共 API
    // ------------------------------------------------------------------------

    public get disposed(): boolean {
        return this._disposed
    }

    public setAmbientEventCallback(
        callback: ((type: AmbientEventType) => void) | null,
    ): void {
        this.onAmbientEvent = callback
    }

    public getTheme(): ThemeType | null {
        return this.currentTheme
    }

    public getIntensity(): number {
        return this.currentIntensity
    }

    public async resume(): Promise<void> {
        await resumeAudioContext(this.ctx)
    }

    /**
     * 设置环境主题。
     *
     * @param theme
     * ThemeType；未注册的主题回落到 sanctuary。
     *
     * @param intensity
     * 0-1，用于动态增强纹理、节奏与事件密度。
     */
    public setTheme(
        theme: ThemeType,
        intensity: number = this.currentIntensity,
    ): void {
        if (this._disposed || this.ctx.state === 'closed') return

        const resolved = this.resolveTheme(theme)
        const safeIntensity = clamp(intensity, 0, 1)

        if (this.currentTheme === resolved && this.currentConfig) {
            if (Math.abs(this.currentIntensity - safeIntensity) >= 0.02) {
                this.setIntensity(safeIntensity)
            }
            return
        }

        void resumeAudioContext(this.ctx)

        // 先淡出旧主题，再启动新主题。
        this.stop(0.45)

        const config = THEME_CONFIGS[resolved]
        if (!config) return

        this.currentTheme = resolved
        this.currentConfig = config
        this.currentIntensity = safeIntensity

        this.updateReverb(config)

        const t = this.ctx.currentTime
        const layers = createEmptyLayers()

        layers.base = this.createBus(this.reverbNode)
        layers.texture = this.createBus(this.reverbNode)
        layers.rhythm = this.createBus(this.masterGain)
        layers.melody = this.createBus(this.reverbNode)
        layers.accent = this.createBus(this.masterGain)

        this.layers = layers

        // 基础层与纹理层缓慢淡入。
        this.rampGainFromZero(layers.base, 0.58 + safeIntensity * 0.1, t + 3)
        this.rampGainFromZero(layers.texture, 0.24 + safeIntensity * 0.24, t + 2)

        // 节奏层。
        if (config.rhythmEnabled && config.rhythmBPM > 0) {
            this.rampGainFromZero(layers.rhythm, 0.2 + safeIntensity * 0.26, t + 2)
            this.createRhythm(config, layers.rhythm)
        } else {
            this.rampGainFromZero(layers.rhythm, 0.0001, t + 1)
        }

        // 旋律层。
        if (config.melodyEnabled) {
            this.rampGainFromZero(layers.melody, 0.12 + safeIntensity * 0.07, t + 4)
            this.startMelody(config)
        } else {
            this.rampGainFromZero(layers.melody, 0.0001, t + 1)
        }

        // Accent 事件层。
        this.rampGainFromZero(layers.accent, 0.45 + safeIntensity * 0.25, t + 1)

        // 启动核心音层。
        this.createDrone(config, layers.base)
        this.createNoise(config, layers.texture)
        this.startAmbientEvents(config.ambientEvents ?? [])
    }

    /**
     * 动态调整强度。
     */
    public setIntensity(intensity: number): void {
        if (this._disposed || this.ctx.state === 'closed') return
        if (!this.currentTheme || !this.currentConfig) return

        this.currentIntensity = clamp(intensity, 0, 1)

        const config = this.currentConfig

        this.setLayerTarget(
            this.layers.texture,
            0.24 + this.currentIntensity * 0.24,
            0.45,
        )

        this.setLayerTarget(
            this.layers.accent,
            0.45 + this.currentIntensity * 0.25,
            0.3,
        )

        if (config.rhythmEnabled && config.rhythmBPM > 0) {
            this.setLayerTarget(
                this.layers.rhythm,
                0.2 + this.currentIntensity * 0.26,
                0.45,
            )
        }

        if (config.melodyEnabled) {
            this.setLayerTarget(
                this.layers.melody,
                0.12 + this.currentIntensity * 0.07,
                0.8,
            )
        }
    }

    /**
     * 停止所有环境音。
     */
    public stop(fadeTime: number = 0.28): void {
        this.clearUiTimers()

        this.currentTheme = null
        this.currentConfig = null

        const oldLayers = this.layers
        this.layers = createEmptyLayers()

        const oldNodes = this.activeNodes
        this.activeNodes = new Set<AudioNode>()

        if (oldNodes.size === 0) return

        if (this.ctx.state === 'closed') {
            oldNodes.forEach(safeDisconnect)
            return
        }

        const now = this.ctx.currentTime
        const safeFade = Math.max(0.02, fadeTime)
        const end = now + safeFade

        // 淡出所有层总线。
        const layerKeys = Object.keys(oldLayers) as Array<keyof AudioLayer>
        for (const key of layerKeys) {
            const layer = oldLayers[key]
            if (!layer) continue

            try {
                layer.gain.cancelScheduledValues(now)
                layer.gain.setValueAtTime(layer.gain.value, now)
                layer.gain.linearRampToValueAtTime(0.0001, end)
            } catch {
                // 忽略无效参数状态。
            }
        }

        // 停止所有可持续音源。
        oldNodes.forEach(node => {
            if (isOscillatorNode(node) || isBufferSourceNode(node)) {
                try {
                    node.stop(end)
                } catch {
                    // 忽略已停止或尚未启动的节点。
                }
            }
        })

        // 延迟断开，避免淡出过程中出现爆音。
        const timer = setTimeout(() => {
            oldNodes.forEach(safeDisconnect)
            this.cleanupTimers.delete(timer)
        }, safeFade * 1000 + 80)

        this.cleanupTimers.add(timer)
    }

    /**
     * 销毁生成器。
     */
    public dispose(): void {
        if (this._disposed) return

        this.stop(0.06)

        this._disposed = true
        this.onAmbientEvent = null
        this.noiseBufferCache.clear()

        if (this.ownsReverb) {
            safeDisconnect(this.reverbNode)
        }
    }

    // ------------------------------------------------------------------------
    // 主题解析与混响
    // ------------------------------------------------------------------------

    private resolveTheme(theme: ThemeType) {
        if (typeof theme !== 'string') {
            return theme
        }

        return Object.prototype.hasOwnProperty.call(THEME_CONFIGS, theme)
            ? (theme as ThemeType)
            : 'sanctuary'
    }

    private updateReverb(config: ThemeConfig): void {
        if (!this.ownsReverb || this.ctx.state === 'closed') return

        try {
            this.reverbNode.buffer = createImpulseResponse(
                this.ctx,
                config.reverbTime,
                config.reverbDecay,
            )
        } catch {
            // 忽略混响缓冲区更新失败。
        }
    }

    // ------------------------------------------------------------------------
    // 音频节点辅助
    // ------------------------------------------------------------------------

    private createBus(destination: AudioNode): GainNode {
        const gain = this.ctx.createGain()
        gain.gain.value = 0.0001
        gain.connect(destination)
        this.activeNodes.add(gain)
        return gain
    }

    private addNodes(...nodes: AudioNode[]): void {
        for (const node of nodes) {
            this.activeNodes.add(node)
        }
    }

    private registerOneShot(
        primary: OscillatorNode | AudioBufferSourceNode,
        nodes: AudioNode[],
    ): void {
        this.addNodes(...nodes)

        primary.onended = () => {
            for (const node of nodes) {
                this.activeNodes.delete(node)
                safeDisconnect(node)
            }
        }
    }

    private rampGainFromZero(
        layer: GainNode | null,
        value: number,
        endTime: number,
    ): void {
        if (!layer) return
        if (this.ctx.state === 'closed') return

        const now = this.ctx.currentTime
        const target = clamp(value, 0.0001, 1)
        const safeEnd = Math.max(endTime, now + 0.01)

        try {
            layer.gain.cancelScheduledValues(now)
            layer.gain.setValueAtTime(0.0001, now)
            layer.gain.linearRampToValueAtTime(target, safeEnd)
        } catch {
            // 忽略无效参数状态。
        }
    }

    private setLayerTarget(
        layer: GainNode | null,
        value: number,
        timeConstant: number,
    ): void {
        if (!layer) return
        if (this.ctx.state === 'closed') return

        const target = clamp(value, 0.0001, 1)

        try {
            layer.gain.setTargetAtTime(target, this.ctx.currentTime, timeConstant)
        } catch {
            // 忽略无效参数状态。
        }
    }

    private clearUiTimers(): void {
        this.uiTimers.forEach(timer => clearTimeout(timer))
        this.uiTimers.clear()
    }

    private addUiTimer(id: ReturnType<typeof setTimeout>): void {
        if (this._disposed) {
            clearTimeout(id)
            return
        }

        this.uiTimers.add(id)
    }

    private getNoiseBuffer(color: NoiseColor, duration: number = 2): AudioBuffer {
        const cached = this.noiseBufferCache.get(color)
        if (cached) return cached

        const buffer = createNoiseBuffer(this.ctx, color, duration)
        this.noiseBufferCache.set(color, buffer)
        return buffer
    }

    // ------------------------------------------------------------------------
    // 持续音层生成
    // ------------------------------------------------------------------------

    private createDrone(config: ThemeConfig, output: GainNode): void {
        config.baseFrequencies.forEach((freq, index) => {
            if (this.ctx.state === 'closed') return

            const osc = this.ctx.createOscillator()
            const gain = this.ctx.createGain()
            const filter = this.ctx.createBiquadFilter()
            const lfo = this.ctx.createOscillator()
            const lfoGain = this.ctx.createGain()

            filter.type = 'lowpass'
            filter.frequency.value = Math.max(40, config.filterFreq * (1 - index * 0.08))
            filter.Q.value = config.filterQ

            osc.type = config.baseWaveform
            osc.frequency.value = freq
            osc.detune.value = randomBetween(-6, 6)

            const baseVolume = clamp(config.baseVolume * (1 - index * 0.14), 0.0001, 1)
            gain.gain.value = baseVolume

            lfo.frequency.value = Math.max(0.01, config.lfoRate * randomBetween(0.8, 1.2))
            lfoGain.gain.value = baseVolume * clamp(config.lfoDepth, 0, 0.95) * 0.5

            osc.connect(filter)
            filter.connect(gain)
            gain.connect(output)

            lfo.connect(lfoGain)
            lfoGain.connect(gain.gain)

            osc.start()
            lfo.start()

            this.addNodes(osc, gain, filter, lfo, lfoGain)
        })
    }

    private createNoise(config: ThemeConfig, output: GainNode): void {
        if (this.ctx.state === 'closed') return

        const noiseColor: NoiseColor = config.noiseType ?? 'pink'
        const buffer = this.getNoiseBuffer(noiseColor, 2)

        const source = this.ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        const filter = this.ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = Math.max(60, config.filterFreq)
        filter.Q.value = 1

        // 缓慢移动滤波频率，模拟风声、管道共鸣或环境呼吸。
        const filterLfo = this.ctx.createOscillator()
        const filterLfoGain = this.ctx.createGain()

        filterLfo.frequency.value = randomBetween(0.02, 0.06)
        filterLfoGain.gain.value = Math.max(60, config.filterFreq) * 0.35

        filterLfo.connect(filterLfoGain)
        filterLfoGain.connect(filter.frequency)

        const gain = this.ctx.createGain()
        gain.gain.value = clamp(config.noiseVolume, 0.0001, 1)

        source.connect(filter)
        filter.connect(gain)
        gain.connect(output)

        source.start()
        filterLfo.start()

        this.addNodes(source, filter, gain, filterLfo, filterLfoGain)
    }

    private createRhythm(config: ThemeConfig, output: GainNode): void {
        if (this.ctx.state === 'closed') return
        if (!config.rhythmEnabled || config.rhythmBPM <= 0) return

        const buffer = this.getNoiseBuffer('white', 2)

        const noise = this.ctx.createBufferSource()
        noise.buffer = buffer
        noise.loop = true

        const filter = this.ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 150
        filter.Q.value = 6

        const gain = this.ctx.createGain()
        gain.gain.value = 0.16 + this.currentIntensity * 0.12

        const pulseLfo = this.ctx.createOscillator()
        pulseLfo.type = 'square'
        pulseLfo.frequency.value = Math.max(0.1, config.rhythmBPM / 60)

        const pulseDepth = this.ctx.createGain()
        pulseDepth.gain.value = 0.5

        pulseLfo.connect(pulseDepth)
        pulseDepth.connect(gain.gain)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(output)

        noise.start()
        pulseLfo.start()

        this.addNodes(noise, filter, gain, pulseLfo, pulseDepth)
    }

    // ------------------------------------------------------------------------
    // 稀疏旋律层
    // ------------------------------------------------------------------------

    private startMelody(config: ThemeConfig): void {
        const scheduleNext = (): void => {
            if (this._disposed || !this.currentTheme) return

            const delay =
                randomBetween(2600, 7000) *
                (1 - this.currentIntensity * 0.18)

            const id = setTimeout(() => {
                this.uiTimers.delete(id)

                if (this._disposed || !this.currentTheme) return

                const output = this.layers.melody
                if (!output) return

                const chance = 0.48 + this.currentIntensity * 0.26
                if (Math.random() < chance) {
                    this.playMelodyNote(config, output)
                }

                scheduleNext()
            }, delay)

            this.addUiTimer(id)
        }

        scheduleNext()
    }

    private playMelodyNote(config: ThemeConfig, output: AudioNode): void {
        if (this.ctx.state === 'closed') return

        const scale = config.melodyScale
        if (!scale || scale.length === 0) return

        const degree = scale[Math.floor(Math.random() * scale.length)] ?? 0
        const octaveShift = Math.floor(Math.random() * 2) * 12
        const freq = config.melodyRoot * Math.pow(2, (degree + octaveShift) / 12)
        const duration = randomBetween(2.2, 5.2)

        this.playTone({
            freq,
            duration,
            volume: 0.09,
            waveform: 'sine',
            attack: 0.12,
            release: 0.9,
            filterFreq: 2400,
            filterQ: 0.7,
            output,
        })
    }

    // ------------------------------------------------------------------------
    // 环境事件
    // ------------------------------------------------------------------------

    private startAmbientEvents(events: AmbientEvent[]): void {
        if (!events || events.length === 0) return

        events.forEach(event => {
            const scheduleNext = (): void => {
                if (this._disposed || !this.currentTheme) return

                const interval = randomBetween(event.minInterval, event.maxInterval)

                const id = setTimeout(() => {
                    this.uiTimers.delete(id)

                    if (this._disposed || !this.currentTheme) return

                    const intensityBoost = 0.75 + this.currentIntensity * 0.5
                    const probability = clamp(event.probability * intensityBoost, 0, 1)

                    if (Math.random() <= probability) {
                        const range = event.volumeRange ?? [0.05, 0.2]
                        const minVolume = range[0] ?? 0.05
                        const maxVolume = range[1] ?? 0.2
                        const volume = randomBetween(minVolume, maxVolume)

                        this.onAmbientEvent?.(event.type)

                        // 如果回调中触发了 stop / setTheme，则不再继续发声。
                        if (!this.currentTheme) return

                        this.playAccent(event.type, volume)
                    }

                    scheduleNext()
                }, interval)

                this.addUiTimer(id)
            }

            scheduleNext()
        })
    }

    private playAccent(type: AmbientEventType, volume: number): void {
        if (this.ctx.state === 'closed') return

        const output = this.layers.accent ?? this.masterGain
        const safeVolume = clamp(volume, 0.0001, 1)
        const now = this.ctx.currentTime

        switch (type) {
            case 'footstep': {
                this.playTone({
                    freq: 80,
                    endFreq: 45,
                    duration: 0.16,
                    volume: safeVolume * 0.8,
                    waveform: 'sine',
                    attack: 0.004,
                    release: 0.12,
                    filterFreq: 220,
                    output,
                })

                this.playNoiseBurst('brown', {
                    duration: 0.1,
                    volume: safeVolume * 0.35,
                    filterType: 'lowpass',
                    frequency: 240,
                    Q: 0.8,
                    attack: 0.004,
                    release: 0.08,
                    when: now + 0.01,
                    output,
                })
                break
            }

            case 'static': {
                this.playNoiseBurst('white', {
                    duration: randomBetween(0.08, 0.35),
                    volume: safeVolume * 0.7,
                    filterType: 'bandpass',
                    frequency: randomBetween(800, 3200),
                    Q: 1.2,
                    output,
                })
                break
            }

            case 'whisper': {
                this.playNoiseBurst('pink', {
                    duration: randomBetween(0.35, 0.9),
                    volume: safeVolume * 0.55,
                    filterType: 'bandpass',
                    frequency: randomBetween(700, 2200),
                    Q: 2.5,
                    attack: 0.12,
                    release: 0.25,
                    output,
                })
                break
            }

            case 'heartbeat': {
                this.playTone({
                    freq: 55,
                    endFreq: 35,
                    duration: 0.12,
                    volume: safeVolume,
                    waveform: 'sine',
                    attack: 0.004,
                    release: 0.08,
                    filterFreq: 180,
                    when: now,
                    output,
                })

                this.playTone({
                    freq: 50,
                    endFreq: 32,
                    duration: 0.1,
                    volume: safeVolume * 0.8,
                    waveform: 'sine',
                    attack: 0.004,
                    release: 0.07,
                    filterFreq: 160,
                    when: now + 0.16,
                    output,
                })
                break
            }

            case 'breathing': {
                this.playNoiseBurst('brown', {
                    duration: randomBetween(0.8, 1.6),
                    volume: safeVolume * 0.5,
                    filterType: 'lowpass',
                    frequency: 480,
                    Q: 0.8,
                    attack: 0.35,
                    release: 0.45,
                    output,
                })
                break
            }

            case 'scream': {
                this.playTone({
                    freq: randomBetween(700, 1400),
                    endFreq: randomBetween(300, 600),
                    duration: randomBetween(0.5, 1.1),
                    volume: safeVolume * 0.4,
                    waveform: 'sawtooth',
                    attack: 0.02,
                    release: 0.3,
                    filterFreq: 2600,
                    filterQ: 1.4,
                    distortion: makeDistortionCurve(18),
                    output,
                })
                break
            }

            case 'distortion': {
                this.playNoiseBurst('white', {
                    duration: randomBetween(0.1, 0.4),
                    volume: safeVolume * 0.5,
                    filterType: 'highpass',
                    frequency: 1200,
                    Q: 1,
                    bitcrush: 4,
                    output,
                })
                break
            }

            case 'malfunction': {
                this.playTone({
                    freq: randomBetween(120, 400),
                    endFreq: randomBetween(40, 160),
                    duration: randomBetween(0.15, 0.45),
                    volume: safeVolume * 0.45,
                    waveform: 'square',
                    attack: 0.004,
                    release: 0.12,
                    filterFreq: 900,
                    filterQ: 1.2,
                    distortion: makeBitCrushCurve(4),
                    output,
                })
                break
            }

            case 'radio': {
                this.playNoiseBurst('white', {
                    duration: randomBetween(0.2, 0.7),
                    volume: safeVolume * 0.4,
                    filterType: 'bandpass',
                    frequency: randomBetween(900, 2400),
                    Q: 3,
                    output,
                })

                this.playTone({
                    freq: randomBetween(500, 900),
                    duration: 0.08,
                    volume: safeVolume * 0.2,
                    waveform: 'sine',
                    attack: 0.004,
                    release: 0.05,
                    filterFreq: 3000,
                    when: now + randomBetween(0.05, 0.2),
                    output,
                })
                break
            }

            default: {
                this.playNoiseBurst('pink', {
                    duration: 0.12,
                    volume: safeVolume * 0.25,
                    filterType: 'bandpass',
                    frequency: 1000,
                    Q: 1,
                    output,
                })
                break
            }
        }
    }

    // ------------------------------------------------------------------------
    // 一次性程序化音源
    // ------------------------------------------------------------------------

    private playTone(options: ToneOptions): void {
        if (this.ctx.state === 'closed') return

        const when = options.when ?? this.ctx.currentTime
        const attack = Math.max(0.002, options.attack ?? 0.02)
        const safeDuration = Math.max(0.03, options.duration, attack + 0.02)
        const release = Math.max(0.03, options.release ?? safeDuration * 0.35)
        const total = safeDuration + release

        const peak = clamp(options.volume, 0.0001, 0.8)
        const output = options.output ?? this.masterGain

        const osc = this.ctx.createOscillator()
        osc.type = options.waveform ?? 'sine'
        osc.frequency.setValueAtTime(Math.max(1, options.freq), when)
        osc.detune.setValueAtTime(randomBetween(-4, 4), when)

        if (options.endFreq !== undefined) {
            osc.frequency.exponentialRampToValueAtTime(
                Math.max(1, options.endFreq),
                when + safeDuration,
            )
        }

        const filter = this.ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(options.filterFreq ?? 6000, when)
        filter.Q.setValueAtTime(options.filterQ ?? 0.8, when)

        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(0.0001, when)
        gain.gain.linearRampToValueAtTime(peak, when + attack)
        gain.gain.setValueAtTime(peak, when + safeDuration)
        gain.gain.linearRampToValueAtTime(0.0001, when + total)

        osc.connect(filter)

        const nodes: AudioNode[] = [osc, filter, gain]

        if (options.distortion) {
            const shaper = this.ctx.createWaveShaper()
                ; (shaper as any).curve = options.distortion
            shaper.oversample = '2x'

            filter.connect(shaper)
            shaper.connect(gain)
            nodes.push(shaper)
        } else {
            filter.connect(gain)
        }

        gain.connect(output)

        osc.start(when)
        osc.stop(when + total + 0.05)

        this.registerOneShot(osc, nodes)
    }

    private playNoiseBurst(color: NoiseColor, options: NoiseBurstOptions): void {
        if (this.ctx.state === 'closed') return

        const when = options.when ?? this.ctx.currentTime
        const attack = Math.max(0.002, options.attack ?? 0.01)
        const safeDuration = Math.max(0.02, options.duration, attack + 0.02)
        const release = Math.max(0.03, options.release ?? safeDuration * 0.35)
        const total = safeDuration + release

        const peak = clamp(options.volume, 0.0001, 0.8)
        const output = options.output ?? this.masterGain

        const buffer = this.getNoiseBuffer(color, 2)

        const source = this.ctx.createBufferSource()
        source.buffer = buffer
        source.loop = total > buffer.duration

        const filter = this.ctx.createBiquadFilter()
        filter.type = options.filterType ?? 'bandpass'
        filter.frequency.setValueAtTime(options.frequency ?? 800, when)
        filter.Q.setValueAtTime(options.Q ?? 1, when)

        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(0.0001, when)
        gain.gain.linearRampToValueAtTime(peak, when + attack)
        gain.gain.setValueAtTime(peak, when + safeDuration)
        gain.gain.linearRampToValueAtTime(0.0001, when + total)

        source.connect(filter)

        const nodes: AudioNode[] = [source, filter, gain]

        const curve =
            options.bitcrush !== undefined
                ? makeBitCrushCurve(options.bitcrush)
                : options.distortion

        if (curve) {
            const shaper = this.ctx.createWaveShaper()
                ; (shaper as any).curve = curve
            shaper.oversample = '2x'

            filter.connect(shaper)
            shaper.connect(gain)
            nodes.push(shaper)
        } else {
            filter.connect(gain)
        }

        gain.connect(output)

        source.start(when)
        source.stop(when + total + 0.05)

        this.registerOneShot(source, nodes)
    }
}