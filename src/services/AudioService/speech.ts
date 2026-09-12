/**
 * 语音播放器
 *
 * @version 3.0.0
 * @see ./type.ts
 * @see ./tool.ts
 * @see ./interface.copy.ts
 */

import {
    EmotionalTone,
    Mood,
    NarrativeTheme,
} from '../../meta'

import type { NoiseColor } from './tool'

import {
    base64ToBytes,
    clamp,
    createNoiseBuffer,
    makeBitCrushCurve,
    makeSoftClipCurve,
    pcm16ToAudioBuffer,
    resumeAudioContext,
} from './tool'

// =====================
// 1. 语音效果类型
// =====================

/**
 * 语音后处理滤镜。
 *
 * 用于改变发声体的频域特征、空间感与失真程度，
 * 可反映发声源的物理状态衰退、神经链接干扰、深渊异化或叙事主题。
 */
export type VoiceEffect =
    | 'normal'     // 原声
    | 'radio'      // 无线电 / 旧式通讯
    | 'distorted'  // 失真 / 撕裂
    | 'whisper'    // 耳语 / 气息化
    | 'robotic'    // 机械 / 数字化
    | 'echo'       // 回声 / 空间残响

/**
 * 所有合法语音效果。
 */
export const VOICE_EFFECTS: readonly VoiceEffect[] = [
    'normal',
    'radio',
    'distorted',
    'whisper',
    'robotic',
    'echo',
]

/**
 * 判断是否为合法 VoiceEffect。
 */
export function isVoiceEffect(value: unknown): value is VoiceEffect {
    return typeof value === 'string'
        && (VOICE_EFFECTS as readonly string[]).includes(value)
}

// =====================
// 2. 播放源、选项与句柄
// =====================

/**
 * 可播放语音源。
 *
 * - string：Base64 PCM16，可带 data URL 前缀。
 * - Uint8Array：PCM16 二进制。
 * - ArrayBuffer：PCM16 二进制。
 * - AudioBuffer：已解码音频缓冲区。
 */
export type SpeechSource =
    | string
    | Uint8Array
    | ArrayBuffer
    | AudioBuffer

/**
 * SpeechPlayer 初始化选项。
 */
export interface SpeechPlayerOptions {
    /**
     * 外部混响节点。
     *
     * 若提供，所有语音总线都会连接到该 ConvolverNode。
     * 若不提供，则直接连接到 output。
     */
    reverbNode?: ConvolverNode

    /**
     * 最终输出目标。
     *
     * 默认为 AudioContext.destination。
     * 当 reverbNode 存在时，该字段不会作为语音总线的直接目标。
     */
    output?: AudioNode

    /**
     * 默认 PCM16 采样率。
     *
     * @default 24000
     */
    defaultSampleRate?: number

    /**
     * 默认 PCM16 声道数。
     *
     * @default 1
     */
    defaultChannels?: number

    /**
     * 默认语音效果。
     *
     * @default 'radio'
     */
    defaultEffect?: VoiceEffect

    /**
     * 默认音量，范围 0-1。
     *
     * @default 1
     */
    defaultVolume?: number

    /**
     * 默认停止淡出时间，单位秒。
     *
     * @default 0.04
     */
    stopFadeTime?: number
}

/**
 * 单次语音播放选项。
 */
export interface SpeechPlayOptions {
    /**
     * 语音效果。
     */
    effect?: VoiceEffect

    /**
     * 本次播放音量，范围 0-1。
     */
    volume?: number

    /**
     * PCM16 采样率。
     * 仅对 string / Uint8Array / ArrayBuffer 源生效。
     */
    sampleRate?: number

    /**
     * PCM16 声道数。
     * 仅对 string / Uint8Array / ArrayBuffer 源生效。
     */
    channels?: number

    /**
     * 播放速率。
     *
     * 范围 0.25 - 4。
     */
    playbackRate?: number

    /**
     * 音高偏移，单位音分。
     *
     * 范围 -4800 - 4800。
     */
    detune?: number

    /**
     * 是否循环播放。
     *
     * 语音通常不应循环；仅用于特殊氛围语音或调试。
     */
    loop?: boolean

    /**
     * 是否中断当前正在播放的语音。
     *
     * @default true
     */
    interrupt?: boolean

    /**
     * 播放自然结束或被停止后的回调。
     */
    onEnded?: () => void
}

/**
 * 语音播放句柄。
 */
export interface SpeechPlaybackHandle {
    /**
     * 句柄唯一 ID。
     */
    readonly id: string

    /**
     * 当前播放使用的语音效果。
     */
    readonly effect: VoiceEffect

    /**
     * 是否已停止或已销毁。
     */
    readonly stopped: boolean

    /**
     * 音频缓冲区时长，单位秒。
     */
    readonly duration: number

    /**
     * 播放结束 Promise。
     *
     * 自然结束、手动 stop、dispose 后都会 resolve。
     */
    readonly ended: Promise<void>

    /**
     * 停止播放并释放资源。
     */
    stop(fadeTime?: number): void

    /**
     * 淡出并停止。
     */
    fadeOut(time?: number): void
}

// =====================
// 3. 内部工具
// =====================

let speechHandleCounter = 0

function createSpeechId(): string {
    speechHandleCounter += 1
    return `speech_${Date.now().toString(36)}_${speechHandleCounter.toString(36)}`
}

function safeDisconnect(
    ...nodes: Array<AudioNode | null | undefined>
): void {
    for (const node of nodes) {
        if (!node) continue
        try {
            node.disconnect()
        } catch {
            // 忽略已断开或非法节点。
        }
    }
}

function safeStopSource(
    source: AudioScheduledSourceNode,
    stopAt?: number,
): void {
    try {
        if (stopAt === undefined) {
            source.stop()
        } else {
            source.stop(stopAt)
        }
    } catch {
        // 忽略已停止或非法节点状态。
    }
}

// =====================
// 4. 激活语音句柄
// =====================

/**
 * 激活语音播放句柄。
 *
 * 负责统一追踪：
 * - 主语音源
 * - 效果链辅助音源
 * - 定时器
 * - 节点清理逻辑
 * - 淡出与销毁
 */
class ActiveSpeechHandle implements SpeechPlaybackHandle {
    readonly id: string = createSpeechId()
    readonly effect: VoiceEffect
    readonly duration: number
    readonly ended: Promise<void>

    private _stopped = false
    private _disposed = false
    private _finished = false

    private readonly sources = new Set<AudioScheduledSourceNode>()
    private readonly timers = new Set<ReturnType<typeof setTimeout>>()
    private readonly cleanups = new Set<() => void>()

    private resolveEnded!: () => void
    private disposeTimer: ReturnType<typeof setTimeout> | null = null

    constructor(
        private readonly ctx: AudioContext,
        effect: VoiceEffect,
        duration: number,
        private readonly bus: GainNode,
        private readonly onDispose?: (handle: ActiveSpeechHandle) => void,
    ) {
        this.effect = effect
        this.duration = duration
        this.ended = new Promise<void>((resolve) => {
            this.resolveEnded = resolve
        })
    }

    get stopped(): boolean {
        return this._stopped || this._disposed
    }

    /**
     * 注册音频源。
     *
     * @param source 音频源
     * @param main 是否为主语音源。主语音源结束会触发整体停止。
     */
    addSource(source: AudioScheduledSourceNode, main: boolean = false): void {
        if (this._stopped || this._disposed || this.ctx.state === 'closed') {
            safeStopSource(source)
            return
        }

        this.sources.add(source)

        source.onended = () => {
            this.sources.delete(source)
            if (main) {
                this.handleMainEnded()
            }
        }
    }

    /**
     * 注册定时器。
     */
    addTimer(timer: ReturnType<typeof setTimeout>): void {
        if (this._stopped || this._disposed) {
            clearTimeout(timer)
            return
        }
        this.timers.add(timer)
    }

    /**
     * 注册节点清理函数。
     */
    addCleanup(cleanup: () => void): void {
        if (this._disposed) {
            try {
                cleanup()
            } catch {
                // 忽略清理异常。
            }
            return
        }
        this.cleanups.add(cleanup)
    }

    fadeOut(time: number = 0.1): void {
        if (this._stopped || this._disposed) return
        this.stop(time)
    }

    stop(fadeTime: number = 0.03): void {
        if (this._stopped || this._disposed) return

        this._stopped = true
        this.rampDown(fadeTime)

        if (this.ctx.state !== 'closed') {
            const now = this.ctx.currentTime
            const stopAt = now + Math.max(0.001, fadeTime) + 0.02
            for (const source of this.sources) {
                safeStopSource(source, stopAt)
            }
        } else {
            for (const source of this.sources) {
                safeStopSource(source)
            }
        }

        for (const timer of this.timers) {
            clearTimeout(timer)
        }
        this.timers.clear()

        this.finish()
        this.scheduleDispose(fadeTime)
    }

    dispose(): void {
        if (this._disposed) return

        this._disposed = true
        this._stopped = true

        if (this.disposeTimer !== null) {
            clearTimeout(this.disposeTimer)
            this.disposeTimer = null
        }

        for (const timer of this.timers) {
            clearTimeout(timer)
        }
        this.timers.clear()

        if (this.ctx.state !== 'closed') {
            const now = this.ctx.currentTime
            for (const source of this.sources) {
                safeStopSource(source, now + 0.02)
            }
        } else {
            for (const source of this.sources) {
                safeStopSource(source)
            }
        }
        this.sources.clear()

        for (const cleanup of this.cleanups) {
            try {
                cleanup()
            } catch {
                // 忽略清理异常。
            }
        }
        this.cleanups.clear()

        safeDisconnect(this.bus)
        this.finish()
        this.onDispose?.(this)
    }

    /**
     * 主语音源自然结束后，停止所有辅助音源并释放效果链。
     */
    private handleMainEnded(): void {
        if (this._stopped || this._disposed) return
        this.stop(0.07)
    }

    private finish(): void {
        if (this._finished) return
        this._finished = true
        this.resolveEnded()
    }

    private scheduleDispose(fadeTime: number): void {
        if (this._disposed || this.disposeTimer !== null) return

        const delay = (Math.max(0.001, fadeTime) + 0.25) * 1000
        this.disposeTimer = setTimeout(() => {
            this.dispose()
        }, delay)
    }

    private rampDown(time: number): void {
        if (this.ctx.state === 'closed') return

        const now = this.ctx.currentTime
        const safe = Math.max(0.001, time)
        const current = Math.max(0.0001, this.bus.gain.value)

        this.bus.gain.cancelScheduledValues(now)
        this.bus.gain.setValueAtTime(current, now)
        this.bus.gain.linearRampToValueAtTime(0.0001, now + safe)
    }
}

/**
 * 空操作语音句柄。
 *
 * 当 AudioContext 已关闭、播放器已销毁或解码失败时返回。
 */
class NoopSpeechHandle implements SpeechPlaybackHandle {
    readonly id: string = 'speech_noop'
    readonly effect: VoiceEffect
    readonly stopped: boolean = true
    readonly duration: number = 0
    readonly ended: Promise<void> = Promise.resolve()

    constructor(effect: VoiceEffect) {
        this.effect = effect
    }

    stop(): void {
        // noop
    }

    fadeOut(): void {
        // noop
    }
}

// =====================
// 5. SpeechPlayer
// =====================

/**
 * 语音播放器。
 *
 * 负责：
 * - PCM16 Base64 / 二进制解码
 * - AudioBuffer 播放
 * - 语音后处理效果链
 * - 播放句柄生命周期管理
 * - 音频节点统一销毁
 */
export class SpeechPlayer {
    readonly ctx: AudioContext

    private readonly output: AudioNode
    private readonly reverbNode?: ConvolverNode

    private readonly defaultSampleRate: number
    private readonly defaultChannels: number
    private readonly defaultEffect: VoiceEffect
    private readonly defaultVolume: number
    private readonly stopFadeTime: number

    private readonly noiseBuffers = new Map<NoiseColor, AudioBuffer>()
    private readonly handles = new Set<ActiveSpeechHandle>()

    private current: SpeechPlaybackHandle | null = null
    private _disposed = false

    constructor(
        ctx: AudioContext,
        options: SpeechPlayerOptions = {},
    ) {
        if (ctx.state === 'closed') {
            throw new Error('[speech.ts] SpeechPlayer 需要一个未关闭的 AudioContext。')
        }

        this.ctx = ctx
        this.output = options.output ?? ctx.destination
        this.reverbNode = options.reverbNode

        this.defaultSampleRate = Math.max(
            1,
            Math.floor(options.defaultSampleRate ?? 24000) || 24000,
        )
        this.defaultChannels = Math.max(
            1,
            Math.floor(options.defaultChannels ?? 1) || 1,
        )
        this.defaultEffect = options.defaultEffect ?? 'radio'
        this.defaultVolume = clamp(options.defaultVolume ?? 1, 0, 1)
        this.stopFadeTime = Math.max(0.001, options.stopFadeTime ?? 0.04)
    }

    get disposed(): boolean {
        return this._disposed
    }

    /**
     * 当前是否有语音正在播放。
     */
    getIsPlaying(): boolean {
        return this.current !== null && !this.current.stopped
    }

    /**
     * 尝试恢复 AudioContext。
     *
     * 浏览器自动播放策略下，通常需要在用户手势中调用。
     */
    async unlock(): Promise<boolean> {
        return resumeAudioContext(this.ctx)
    }

    /**
     * 播放语音。
     */
    play(
        source: SpeechSource,
        options: SpeechPlayOptions = {},
    ): SpeechPlaybackHandle {
        const effect = options.effect ?? this.defaultEffect

        if (this._disposed || this.ctx.state === 'closed') {
            return new NoopSpeechHandle(effect)
        }

        if (this.ctx.state === 'suspended') {
            void resumeAudioContext(this.ctx).catch(() => undefined)
        }

        if (options.interrupt ?? true) {
            this.stop(this.stopFadeTime)
        }

        let audioBuffer: AudioBuffer
        try {
            audioBuffer = this.toAudioBuffer(source, options)
        } catch (error) {
            console.error('[speech.ts] 语音解码失败。', error)
            return new NoopSpeechHandle(effect)
        }

        const now = this.ctx.currentTime
        const startTime = now + 0.02
        const targetVolume = clamp(options.volume ?? this.defaultVolume, 0, 1)

        const bus = this.ctx.createGain()
        bus.gain.setValueAtTime(0.0001, now)
        bus.gain.linearRampToValueAtTime(targetVolume, now + 0.025)
        bus.connect(this.reverbNode ?? this.output)

        const handle = new ActiveSpeechHandle(
            this.ctx,
            effect,
            audioBuffer.duration,
            bus,
            (h) => {
                this.handles.delete(h)
            },
        )

        this.handles.add(handle)
        this.current = handle

        const input = this.createEffectChain(handle, effect, bus, startTime)

        const src = this.ctx.createBufferSource()
        src.buffer = audioBuffer
        src.loop = options.loop ?? false

        if (options.playbackRate !== undefined) {
            src.playbackRate.setValueAtTime(
                clamp(options.playbackRate, 0.25, 4),
                startTime,
            )
        }

        if (options.detune !== undefined) {
            src.detune.setValueAtTime(
                clamp(options.detune, -4800, 4800),
                startTime,
            )
        }

        src.connect(input)
        handle.addSource(src, true)
        src.start(startTime)

        if (options.onEnded) {
            void handle.ended
                .then(() => options.onEnded?.())
                .catch(() => undefined)
        }

        return handle
    }

    /**
     * 停止当前语音。
     */
    stop(fadeTime?: number): void {
        this.current?.stop(fadeTime ?? this.stopFadeTime)
    }

    /**
     * 停止所有语音。
     */
    stopAll(fadeTime?: number): void {
        const safeFade = fadeTime ?? this.stopFadeTime
        for (const handle of Array.from(this.handles)) {
            handle.stop(safeFade)
        }
    }

    /**
     * 销毁播放器。
     */
    dispose(): void {
        if (this._disposed) return

        this._disposed = true
        this.stopAll(0.03)

        for (const handle of Array.from(this.handles)) {
            handle.dispose()
        }

        this.handles.clear()
        this.noiseBuffers.clear()
        this.current = null
    }

    // ========================================================================
    // 6. 解码与缓冲区
    // ========================================================================

    /**
     * 将输入源转换为 AudioBuffer。
     */
    private toAudioBuffer(
        source: SpeechSource,
        options: SpeechPlayOptions,
    ): AudioBuffer {
        if (source instanceof AudioBuffer) {
            return source
        }

        const sampleRate = Math.max(
            1,
            Math.floor(options.sampleRate ?? this.defaultSampleRate)
            || this.defaultSampleRate,
        )
        const channels = Math.max(
            1,
            Math.floor(options.channels ?? this.defaultChannels)
            || this.defaultChannels,
        )

        let bytes: Uint8Array

        if (typeof source === 'string') {
            bytes = base64ToBytes(source)
        } else if (source instanceof Uint8Array) {
            bytes = source
        } else if (source instanceof ArrayBuffer) {
            bytes = new Uint8Array(source)
        } else {
            throw new Error('[speech.ts] 不支持的 SpeechSource 类型。')
        }

        return pcm16ToAudioBuffer(bytes, this.ctx, sampleRate, channels)
    }

    /**
     * 获取缓存噪音缓冲区。
     */
    private getNoiseBuffer(
        color: NoiseColor,
        duration: number = 2,
    ): AudioBuffer {
        const cached = this.noiseBuffers.get(color)
        if (cached) return cached

        const buffer = createNoiseBuffer(this.ctx, color, duration)
        this.noiseBuffers.set(color, buffer)
        return buffer
    }

    // ========================================================================
    // 7. 效果链
    // ========================================================================

    /**
     * 创建语音效果链。
     *
     * @returns 语音源应连接到的输入节点。
     */
    private createEffectChain(
        handle: ActiveSpeechHandle,
        effect: VoiceEffect,
        bus: GainNode,
        startTime: number,
    ): AudioNode {
        switch (effect) {
            case 'radio':
                return this.createRadioEffect(handle, bus, startTime)
            case 'distorted':
                return this.createDistortedEffect(handle, bus, startTime)
            case 'whisper':
                return this.createWhisperEffect(handle, bus, startTime)
            case 'robotic':
                return this.createRoboticEffect(handle, bus, startTime)
            case 'echo':
                return this.createEchoEffect(handle, bus)
            case 'normal':
            default:
                return this.createNormalEffect(handle, bus)
        }
    }

    /**
     * 原声。
     */
    private createNormalEffect(
        handle: ActiveSpeechHandle,
        bus: GainNode,
    ): AudioNode {
        const input = this.ctx.createGain()
        input.gain.value = 1

        input.connect(bus)

        handle.addCleanup(() => {
            safeDisconnect(input)
        })

        return input
    }

    /**
     * 无线电 / 旧式通讯。
     *
     * 带通、软削波、高频 presence 提升，以及轻微底噪。
     */
    private createRadioEffect(
        handle: ActiveSpeechHandle,
        bus: GainNode,
        startTime: number,
    ): AudioNode {
        const ctx = this.ctx

        const input = ctx.createGain()
        input.gain.value = 1.35

        const highpass = ctx.createBiquadFilter()
        highpass.type = 'highpass'
        highpass.frequency.value = 320
        highpass.Q.value = 0.7

        const bandpass = ctx.createBiquadFilter()
        bandpass.type = 'bandpass'
        bandpass.frequency.value = 1150
        bandpass.Q.value = 0.65

        const shaper = ctx.createWaveShaper()
            ; (shaper as any).curve = makeSoftClipCurve(3)
        shaper.oversample = '2x'

        const presence = ctx.createBiquadFilter()
        presence.type = 'highshelf'
        presence.frequency.value = 2600
        presence.gain.value = 2.5

        input.connect(highpass)
        highpass.connect(bandpass)
        bandpass.connect(shaper)
        shaper.connect(presence)
        presence.connect(bus)

        const noiseSource = ctx.createBufferSource()
        noiseSource.buffer = this.getNoiseBuffer('pink', 2)
        noiseSource.loop = true

        const noiseFilter = ctx.createBiquadFilter()
        noiseFilter.type = 'highpass'
        noiseFilter.frequency.value = 2800

        const noiseGain = ctx.createGain()
        noiseGain.gain.value = 0.016

        noiseSource.connect(noiseFilter)
        noiseFilter.connect(noiseGain)
        noiseGain.connect(bus)

        noiseSource.start(startTime)
        handle.addSource(noiseSource)

        handle.addCleanup(() => {
            safeDisconnect(
                input,
                highpass,
                bandpass,
                shaper,
                presence,
                noiseFilter,
                noiseGain,
            )
        })

        return input
    }

    /**
     * 失真 / 撕裂。
     *
     * 软削波、低通保护、轻微颤音。
     */
    private createDistortedEffect(
        handle: ActiveSpeechHandle,
        bus: GainNode,
        startTime: number,
    ): AudioNode {
        const ctx = this.ctx

        const input = ctx.createGain()
        input.gain.value = 1.15

        const shaper2 = ctx.createWaveShaper()
            ; (shaper2 as any).curve = makeSoftClipCurve(8)
        shaper2.oversample = '2x'

        const lowpass = ctx.createBiquadFilter()
        lowpass.type = 'lowpass'
        lowpass.frequency.value = 3200
        lowpass.Q.value = 0.7

        const tremolo = ctx.createGain()
        tremolo.gain.value = 0.88

        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.value = 5.2

        const lfoDepth = ctx.createGain()
        lfoDepth.gain.value = 0.16

        input.connect(shaper2)
        shaper2.connect(lowpass)
        lowpass.connect(tremolo)
        tremolo.connect(bus)

        lfo.connect(lfoDepth)
        lfoDepth.connect(tremolo.gain)

        lfo.start(startTime)
        handle.addSource(lfo)

        handle.addCleanup(() => {
            safeDisconnect(
                input,
                shaper2,
                lowpass,
                tremolo,
                lfoDepth,
            )
        })

        return input
    }

    /**
     * 耳语 / 气息化。
     *
     * 高通、低通、气息噪声混合。
     */
    private createWhisperEffect(
        handle: ActiveSpeechHandle,
        bus: GainNode,
        startTime: number,
    ): AudioNode {
        const ctx = this.ctx

        const input = ctx.createGain()
        input.gain.value = 1.25

        const highpass = ctx.createBiquadFilter()
        highpass.type = 'highpass'
        highpass.frequency.value = 460
        highpass.Q.value = 0.7

        const lowpass = ctx.createBiquadFilter()
        lowpass.type = 'lowpass'
        lowpass.frequency.value = 4300
        lowpass.Q.value = 0.7

        const presence = ctx.createBiquadFilter()
        presence.type = 'peaking'
        presence.frequency.value = 2100
        presence.Q.value = 1.1
        presence.gain.value = 3

        input.connect(highpass)
        highpass.connect(lowpass)
        lowpass.connect(presence)
        presence.connect(bus)

        const noiseSource = ctx.createBufferSource()
        noiseSource.buffer = this.getNoiseBuffer('pink', 2)
        noiseSource.loop = true

        const noiseFilter = ctx.createBiquadFilter()
        noiseFilter.type = 'bandpass'
        noiseFilter.frequency.value = 1900
        noiseFilter.Q.value = 1.6

        const noiseGain = ctx.createGain()
        noiseGain.gain.value = 0.12

        noiseSource.connect(noiseFilter)
        noiseFilter.connect(noiseGain)
        noiseGain.connect(bus)

        noiseSource.start(startTime)
        handle.addSource(noiseSource)

        handle.addCleanup(() => {
            safeDisconnect(
                input,
                highpass,
                lowpass,
                presence,
                noiseFilter,
                noiseGain,
            )
        })

        return input
    }

    /**
     * 机械 / 数字化。
     *
     * 环形调制、Bitcrush、短梳状延迟。
     */
    private createRoboticEffect(
        handle: ActiveSpeechHandle,
        bus: GainNode,
        startTime: number,
    ): AudioNode {
        const ctx = this.ctx

        const input = ctx.createGain()
        input.gain.value = 1.05

        const ring = ctx.createGain()
        ring.gain.value = 0.6

        const carrier = ctx.createOscillator()
        carrier.type = 'sine'
        carrier.frequency.value = 46

        const modDepth = ctx.createGain()
        modDepth.gain.value = 0.4

        carrier.connect(modDepth)
        modDepth.connect(ring.gain)

        const crush = ctx.createWaveShaper()
            ; (crush as any).curve = makeBitCrushCurve(5)
        crush.oversample = '2x'

        const delay = ctx.createDelay(0.05)
        delay.delayTime.value = 0.0062

        const feedback = ctx.createGain()
        feedback.gain.value = 0.38

        const merge = ctx.createGain()
        merge.gain.value = 0.9

        input.connect(ring)
        ring.connect(crush)

        crush.connect(merge)
        crush.connect(delay)

        delay.connect(feedback)
        feedback.connect(delay)
        delay.connect(merge)

        merge.connect(bus)

        carrier.start(startTime)
        handle.addSource(carrier)

        handle.addCleanup(() => {
            safeDisconnect(
                input,
                ring,
                modDepth,
                crush,
                delay,
                feedback,
                merge,
            )
        })

        return input
    }

    /**
     * 回声 / 空间残响。
     *
     * 多重延迟与低通反馈网络。
     */
    private createEchoEffect(
        handle: ActiveSpeechHandle,
        bus: GainNode,
    ): AudioNode {
        const ctx = this.ctx

        const input = ctx.createGain()
        input.gain.value = 1

        const dry = ctx.createGain()
        dry.gain.value = 0.92

        const merge = ctx.createGain()
        merge.gain.value = 0.7

        input.connect(dry)
        dry.connect(bus)
        merge.connect(bus)

        const echoes: Array<{
            time: number
            feedback: number
            tone: number
            wet: number
        }> = [
                { time: 0.11, feedback: 0.42, tone: 3400, wet: 0.5 },
                { time: 0.23, feedback: 0.28, tone: 2600, wet: 0.36 },
                { time: 0.37, feedback: 0.18, tone: 1800, wet: 0.24 },
            ]

        for (const echo of echoes) {
            const delay = ctx.createDelay(1.5)
            delay.delayTime.value = echo.time

            const tone = ctx.createBiquadFilter()
            tone.type = 'lowpass'
            tone.frequency.value = echo.tone
            tone.Q.value = 0.6

            const feedback = ctx.createGain()
            feedback.gain.value = echo.feedback

            const wet = ctx.createGain()
            wet.gain.value = echo.wet

            input.connect(delay)
            delay.connect(tone)

            tone.connect(feedback)
            feedback.connect(delay)

            tone.connect(wet)
            wet.connect(merge)

            handle.addCleanup(() => {
                safeDisconnect(delay, tone, feedback, wet)
            })
        }

        handle.addCleanup(() => {
            safeDisconnect(input, dry, merge)
        })

        return input
    }
}

// =====================
// 8. 从 type.ts 语义状态映射到 VoiceEffect
// =====================

const EKMAN_MOOD_TO_VOICE_EFFECT: Record<Mood, VoiceEffect> = {
    happy: 'normal',
    sad: 'whisper',
    angry: 'distorted',
    fearful: 'whisper',
    surprised: 'echo',
    neutral: 'normal',
}

const EMOTIONAL_TONE_TO_VOICE_EFFECT: Record<EmotionalTone, VoiceEffect> = {
    hopeful: 'normal',
    desperate: 'whisper',
    anxious: 'radio',
    numb: 'robotic',
    determined: 'normal',
}

const NARRATIVE_THEME_TO_VOICE_EFFECT: Record<NarrativeTheme, VoiceEffect> = {
    biomechanica: 'robotic',
    cyber_occult: 'radio',
    cosmic_horror: 'echo',
    temporal: 'echo',
    folk_horror: 'whisper',
    hostile_biosphere: 'whisper',
    cognitive_hazard: 'distorted',
    dream_logic: 'echo',
    parasitic_symbiosis: 'distorted',
    industrial_entropy: 'radio',
}

/**
 * 从 Ekman 六模情绪映射语音效果。
 */
export function voiceEffectFromMood(mood: Mood): VoiceEffect {
    return EKMAN_MOOD_TO_VOICE_EFFECT[mood]
}

/**
 * 从动态叙事情感基调映射语音效果。
 */
export function voiceEffectFromEmotionalTone(
    tone: EmotionalTone,
): VoiceEffect {
    return EMOTIONAL_TONE_TO_VOICE_EFFECT[tone]
}

/**
 * 从叙事主题映射语音效果。
 */
export function voiceEffectFromNarrativeTheme(
    theme: NarrativeTheme,
): VoiceEffect {
    return NARRATIVE_THEME_TO_VOICE_EFFECT[theme]
}