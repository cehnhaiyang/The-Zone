/**
sound.ts
类型化音效引擎

与 type.ts 中的 DotSoundType / ShortSoundType / SoundType 完全对齐。
仅负责程序化生成并播放点音与短音，不负责背景音乐。

设计目标：
- 所有音效类型必须可穷举、可判别、与 type.ts 一致
- 听感风格服务《The Zone》整体氛围：压抑、异化、生物机械、神经链接翻译失真
- UI / 近身操作偏干声
- 战斗、环境、异常事件与短音使用混响空间
- 避免爆音：使用较低峰值、包络与软削波
*/

import type { SoundType } from '../../meta'
import {
    clamp,
    createNoiseBuffer,
    makeBitCrushCurve,
    makeDistortionCurve,
    makeSoftClipCurve,
} from './tools'
import type { NoiseColor } from './tools'

interface ToneOptions {
    time?: number
    type?: OscillatorType
    freq: number
    freqEnd?: number
    freqRampTime?: number
    detune?: number
    gain?: number
    attack?: number
    hold?: number
    release?: number
    filterType?: BiquadFilterType
    filterFreq?: number
    filterFreqEnd?: number
    filterFreqRampTime?: number
    filterQ?: number
    curve?: Float32Array
    pan?: number
}

interface NoiseOptions {
    time?: number
    color?: NoiseColor
    duration?: number
    gain?: number
    attack?: number
    release?: number
    loop?: boolean
    playbackRate?: number
    filterType?: BiquadFilterType
    filterFreq?: number
    filterFreqEnd?: number
    filterFreqRampTime?: number
    filterQ?: number
    curve?: Float32Array
    pan?: number
}

export class SoundPlayer {
    /**
    * 偏干声的音效。
    * UI、近身物品、输入与战术确认通常不需要进入环境混响。
    */
    private readonly dryTypes: readonly SoundType[] = [
        'typing_1',
        'typing_2',
        'typing_3',
        'success',
        'fail',
        'error',
        'item_pickup',
        'item_use',
        'item_equip',
        'item_unequip',
        'item_break',
        'ui_click',
        'ui_hover',
        'ui_transition',
        'ui_notification',
        'tactic_execute',
    ]

    private readonly curveCache = new Map<string, Float32Array>()
    private readonly noiseCache = new Map<string, AudioBuffer>()

    constructor(
        private readonly ctx: AudioContext,
        private readonly masterGain: GainNode,
        private readonly reverbNode: ConvolverNode,
    ) { }

    /**
     * 播放指定音效。
     */
    public play(type: SoundType): void {
        if (this.ctx.state === 'closed') return

        if (this.ctx.state === 'suspended') {
            void this.ctx.resume().catch(() => undefined)
        }

        const t = this.ctx.currentTime + 0.004
        const dest = this.getDestination(type)

        switch (type) {
            // === 点音：输入 / 系统反馈 ===
            case 'typing_1': this.playTyping1(t, dest); break
            case 'typing_2': this.playTyping2(t, dest); break
            case 'typing_3': this.playTyping3(t, dest); break
            case 'success': this.playSuccess(t, dest); break
            case 'fail': this.playFail(t, dest); break
            case 'error': this.playError(t, dest); break

            // === 点音：环境交互 ===
            case 'search': this.playSearch(t, dest); break
            case 'unlock': this.playUnlock(t, dest); break
            case 'lock': this.playLock(t, dest); break

            // === 点音：物品 ===
            case 'item_pickup': this.playItemPickup(t, dest); break
            case 'item_use': this.playItemUse(t, dest); break
            case 'item_equip': this.playItemEquip(t, dest); break
            case 'item_unequip': this.playItemUnequip(t, dest); break
            case 'item_break': this.playItemBreak(t, dest); break

            // === 点音：UI ===
            case 'ui_click': this.playUiClick(t, dest); break
            case 'ui_hover': this.playUiHover(t, dest); break
            case 'ui_transition': this.playUiTransition(t, dest); break
            case 'ui_notification': this.playUiNotification(t, dest); break

            // === 点音：战术与战斗 ===
            case 'tactic_execute': this.playTacticExecute(t, dest); break
            case 'combat_miss': this.playCombatMiss(t, dest); break
            case 'combat_graze': this.playCombatGraze(t, dest); break
            case 'combat_hit': this.playCombatHit(t, dest); break
            case 'combat_crit': this.playCombatCrit(t, dest); break
            case 'combat_block': this.playCombatBlock(t, dest); break
            case 'combat_buff': this.playCombatBuff(t, dest); break
            case 'combat_debuff': this.playCombatDebuff(t, dest); break

            // === 点音：叙事事件 ===
            case 'event_npc_join': this.playEventNpcJoin(t, dest); break
            case 'event_npc_leave': this.playEventNpcLeave(t, dest); break

            // === 短音 ===
            case 'terrifying': this.playTerrifying(t, dest); break
            case 'node_transition': this.playNodeTransition(t, dest); break
            case 'zone_enter': this.playZoneEnter(t, dest); break

            default: {
                const exhaustiveCheck: never = type
                void exhaustiveCheck
                break
            }
        }
    }

    // ========================================================================
    // 基础路由与工具
    // ========================================================================

    private getDestination(type: SoundType): AudioNode {
        return this.dryTypes.includes(type)
            ? this.masterGain
            : this.reverbNode
    }

    private rand(min: number, max: number): number {
        return min + Math.random() * (max - min)
    }

    private distortion(amount: number): Float32Array {
        const key = `distortion:${amount}`
        let curve = this.curveCache.get(key)

        if (!curve) {
            curve = makeDistortionCurve(amount)
            this.curveCache.set(key, curve)
        }

        return curve
    }

    private softClip(amount: number): Float32Array {
        const key = `softClip:${amount}`
        let curve = this.curveCache.get(key)

        if (!curve) {
            curve = makeSoftClipCurve(amount)
            this.curveCache.set(key, curve)
        }

        return curve
    }

    private bitCrush(bits: number): Float32Array {
        const key = `bitCrush:${bits}`
        let curve = this.curveCache.get(key)

        if (!curve) {
            curve = makeBitCrushCurve(bits)
            this.curveCache.set(key, curve)
        }

        return curve
    }

    private getNoiseBuffer(color: NoiseColor, duration: number): AudioBuffer {
        const safeDuration = Math.max(0.02, Math.ceil(duration * 20) / 20)
        const key = `${color}:${safeDuration.toFixed(2)}`

        let buffer = this.noiseCache.get(key)

        if (!buffer) {
            buffer = createNoiseBuffer(this.ctx, color, safeDuration)
            this.noiseCache.set(key, buffer)
        }

        return buffer
    }

    private connectOutput(
        node: AudioNode,
        dest: AudioNode,
        pan?: number,
        time?: number,
    ): void {
        if (pan === undefined || typeof this.ctx.createStereoPanner !== 'function') {
            node.connect(dest)
            return
        }

        const panner = this.ctx.createStereoPanner()
        panner.pan.setValueAtTime(clamp(pan, -1, 1), time ?? this.ctx.currentTime)

        node.connect(panner)
        panner.connect(dest)
    }

    /**
     * 通用振荡器音色。
     */
    private tone(dest: AudioNode, opts: ToneOptions): void {
        if (this.ctx.state === 'closed') return

        const start = opts.time ?? this.ctx.currentTime + 0.001
        const attack = Math.max(0.001, opts.attack ?? 0.005)
        const hold = Math.max(0, opts.hold ?? 0.02)
        const release = Math.max(0.015, opts.release ?? 0.08)
        const total = attack + hold + release
        const end = start + total
        const peak = clamp(opts.gain ?? 0.1, 0.0001, 1)

        const osc = this.ctx.createOscillator()
        osc.type = opts.type ?? 'sine'
        osc.frequency.setValueAtTime(Math.max(1, opts.freq), start)

        if (opts.freqEnd !== undefined) {
            osc.frequency.exponentialRampToValueAtTime(
                Math.max(1, opts.freqEnd),
                start + Math.max(0.01, opts.freqRampTime ?? total),
            )
        }

        if (opts.detune !== undefined) {
            osc.detune.setValueAtTime(opts.detune, start)
        }

        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.linearRampToValueAtTime(peak, start + attack)

        if (hold > 0) {
            gain.gain.setValueAtTime(peak, start + attack + hold)
        }

        gain.gain.exponentialRampToValueAtTime(0.0001, end)

        let node: AudioNode = osc

        if (opts.curve) {
            const shaper = this.ctx.createWaveShaper()
            shaper.curve = opts.curve as any
            shaper.oversample = '2x'

            node.connect(shaper)
            node = shaper
        }

        if (
            opts.filterType !== undefined ||
            opts.filterFreq !== undefined ||
            opts.filterFreqEnd !== undefined
        ) {
            const filter = this.ctx.createBiquadFilter()
            filter.type = opts.filterType ?? 'lowpass'

            const baseFilterFreq = opts.filterFreq ?? 1000
            filter.frequency.setValueAtTime(Math.max(1, baseFilterFreq), start)

            if (opts.filterFreqEnd !== undefined) {
                filter.frequency.exponentialRampToValueAtTime(
                    Math.max(1, opts.filterFreqEnd),
                    start + Math.max(0.01, opts.filterFreqRampTime ?? total),
                )
            }

            if (opts.filterQ !== undefined) {
                filter.Q.setValueAtTime(opts.filterQ, start)
            }

            node.connect(filter)
            node = filter
        }

        node.connect(gain)
        this.connectOutput(gain, dest, opts.pan, start)

        osc.start(start)
        osc.stop(end + 0.03)
    }

    /**
     * 通用噪音音色。
     */
    private noise(dest: AudioNode, opts: NoiseOptions): void {
        if (this.ctx.state === 'closed') return

        const start = opts.time ?? this.ctx.currentTime + 0.001
        const total = Math.max(0.03, opts.duration ?? 0.2)
        const attack = clamp(opts.attack ?? 0.005, 0.001, total * 0.9)
        const release = clamp(opts.release ?? total * 0.35, 0.01, total * 0.95)
        const releaseStart = Math.max(start + attack, start + total - release)
        const end = start + total
        const peak = clamp(opts.gain ?? 0.1, 0.0001, 1)
        const color = opts.color ?? 'white'
        const buffer = this.getNoiseBuffer(color, total + 0.05)

        const source = this.ctx.createBufferSource()
        source.buffer = buffer
        source.loop = opts.loop ?? false

        if (opts.playbackRate !== undefined) {
            source.playbackRate.setValueAtTime(opts.playbackRate, start)
        }

        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.linearRampToValueAtTime(peak, start + attack)

        if (releaseStart > start + attack) {
            gain.gain.setValueAtTime(peak, releaseStart)
        }

        gain.gain.exponentialRampToValueAtTime(0.0001, end)

        let node: AudioNode = source

        if (opts.curve) {
            const shaper = this.ctx.createWaveShaper()
            shaper.curve = opts.curve as any
            shaper.oversample = '2x'

            node.connect(shaper)
            node = shaper
        }

        if (
            opts.filterType !== undefined ||
            opts.filterFreq !== undefined ||
            opts.filterFreqEnd !== undefined
        ) {
            const filter = this.ctx.createBiquadFilter()
            filter.type = opts.filterType ?? 'lowpass'

            const baseFilterFreq = opts.filterFreq ?? 1000
            filter.frequency.setValueAtTime(Math.max(1, baseFilterFreq), start)

            if (opts.filterFreqEnd !== undefined) {
                filter.frequency.exponentialRampToValueAtTime(
                    Math.max(1, opts.filterFreqEnd),
                    start + Math.max(0.01, opts.filterFreqRampTime ?? total),
                )
            }

            if (opts.filterQ !== undefined) {
                filter.Q.setValueAtTime(opts.filterQ, start)
            }

            node.connect(filter)
            node = filter
        }

        node.connect(gain)
        this.connectOutput(gain, dest, opts.pan, start)

        const maxOffset = Math.max(0, buffer.duration - total - 0.02)
        const offset = maxOffset > 0 ? Math.random() * maxOffset : 0

        source.start(start, offset)
        source.stop(end + 0.03)
    }

    // ========================================================================
    // 点音：输入 / 系统反馈
    // ========================================================================

    /**
     * 输入音 1：偏机械键盘。
     * 高频点击 + 低频触底。
     */
    private playTyping1(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'triangle',
            freq: this.rand(1850, 2550),
            gain: 0.022,
            attack: 0.001,
            hold: 0.006,
            release: 0.026,
            filterType: 'highpass',
            filterFreq: 720,
        })

        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: 250,
            freqEnd: 58,
            gain: 0.04,
            attack: 0.001,
            hold: 0.01,
            release: 0.046,
            filterType: 'lowpass',
            filterFreq: 420,
        })

        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.018,
            gain: 0.008,
            attack: 0.001,
            release: 0.016,
            filterType: 'highpass',
            filterFreq: 3200,
        })
    }

    /**
     * 输入音 2：偏神经链接轻触。
     * 更干净、更短、更电子化。
     */
    private playTyping2(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: this.rand(1050, 1480),
            freqEnd: this.rand(1500, 1920),
            gain: 0.017,
            attack: 0.001,
            hold: 0.004,
            release: 0.03,
        })

        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: 190,
            freqEnd: 80,
            gain: 0.012,
            attack: 0.001,
            hold: 0.006,
            release: 0.034,
            filterType: 'lowpass',
            filterFreq: 360,
        })

        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.02,
            gain: 0.01,
            attack: 0.001,
            release: 0.018,
            filterType: 'highpass',
            filterFreq: 2500,
        })
    }

    /**
     * 输入音 3：偏异化黏滞按键。
     * 带轻微软削波与带通共振。
     */
    private playTyping3(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'square',
            freq: this.rand(600, 860),
            freqEnd: 410,
            gain: 0.019,
            attack: 0.001,
            hold: 0.012,
            release: 0.05,
            filterType: 'bandpass',
            filterFreq: 900,
            filterQ: 2,
            curve: this.softClip(1.6),
        })

        this.tone(dest, {
            time: t + 0.006,
            type: 'sine',
            freq: 176,
            freqEnd: 66,
            gain: 0.028,
            attack: 0.001,
            hold: 0.01,
            release: 0.05,
            filterType: 'lowpass',
            filterFreq: 360,
        })

        this.noise(dest, {
            time: t,
            color: 'pink',
            duration: 0.03,
            gain: 0.011,
            attack: 0.001,
            release: 0.026,
            filterType: 'bandpass',
            filterFreq: this.rand(540, 920),
            filterQ: 3,
        })
    }

    /**
     * 成功：克制但略微明亮的上行琶音。
     * 在恐怖基调下避免过度“游戏化胜利感”。
     */
    private playSuccess(t: number, dest: AudioNode): void {
        const notes = [523.25, 659.25, 783.99, 1046.5]

        notes.forEach((freq, index) => {
            this.tone(dest, {
                time: t + index * 0.056,
                type: 'sine',
                freq,
                gain: index === 3 ? 0.036 : 0.056,
                attack: 0.01,
                hold: 0.02,
                release: 0.42,
                pan: this.rand(-0.14, 0.14),
                detune: this.rand(-5, 5),
            })
        })

        this.noise(dest, {
            time: t + 0.02,
            color: 'pink',
            duration: 0.3,
            gain: 0.009,
            attack: 0.02,
            release: 0.24,
            filterType: 'highpass',
            filterFreq: 3000,
        })
    }

    /**
     * 失败：短促下行的不稳定音。
     */
    private playFail(t: number, dest: AudioNode): void {
        const notes = [220, 174.61, 138.59]

        notes.forEach((freq, index) => {
            this.tone(dest, {
                time: t + index * 0.088,
                type: 'sawtooth',
                freq,
                freqEnd: freq * 0.9,
                gain: 0.078,
                attack: 0.004,
                hold: 0.046,
                release: 0.26,
                filterType: 'lowpass',
                filterFreq: 700,
                curve: this.softClip(2),
                pan: index === 0 ? -0.12 : index === 1 ? 0 : 0.12,
            })
        })

        this.tone(dest, {
            time: t + 0.02,
            type: 'sine',
            freq: 110,
            freqEnd: 46,
            gain: 0.05,
            attack: 0.002,
            hold: 0.03,
            release: 0.18,
            filterType: 'lowpass',
            filterFreq: 260,
        })
    }

    /**
     * 错误：带数字破损感的低频警告。
     */
    private playError(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sawtooth',
            freq: 150,
            freqEnd: 70,
            gain: 0.11,
            attack: 0.003,
            hold: 0.1,
            release: 0.28,
            filterType: 'lowpass',
            filterFreq: 860,
            curve: this.bitCrush(4),
        })

        this.tone(dest, {
            time: t + 0.02,
            type: 'square',
            freq: 90,
            freqEnd: 52,
            gain: 0.058,
            attack: 0.002,
            hold: 0.06,
            release: 0.2,
            filterType: 'lowpass',
            filterFreq: 320,
        })

        this.noise(dest, {
            time: t + 0.01,
            color: 'white',
            duration: 0.08,
            gain: 0.018,
            attack: 0.002,
            release: 0.07,
            filterType: 'bandpass',
            filterFreq: 2600,
            filterQ: 4,
        })

        this.tone(dest, {
            time: t + this.rand(0.05, 0.11),
            type: 'square',
            freq: this.rand(1800, 2600),
            freqEnd: this.rand(700, 1200),
            gain: 0.012,
            attack: 0.001,
            hold: 0.008,
            release: 0.05,
            filterType: 'highpass',
            filterFreq: 1400,
            pan: this.rand(-0.4, 0.4),
        })
    }

    // ========================================================================
    // 点音：环境交互
    // ========================================================================

    /**
     * 搜查：翻找、摩擦、近距环境细节。
     */
    private playSearch(t: number, dest: AudioNode): void {
        for (let i = 0; i < 3; i++) {
            const start = t + i * 0.135

            this.noise(dest, {
                time: start,
                color: 'pink',
                duration: 0.16,
                gain: 0.076,
                attack: 0.004,
                release: 0.12,
                filterType: 'bandpass',
                filterFreq: this.rand(680, 1650),
                filterQ: 1.8,
                pan: this.rand(-0.42, 0.42),
            })

            this.tone(dest, {
                time: start + 0.02,
                type: 'triangle',
                freq: this.rand(170, 320),
                gain: 0.024,
                attack: 0.002,
                hold: 0.01,
                release: 0.08,
                filterType: 'lowpass',
                filterFreq: 520,
            })

            if (i === 1) {
                this.tone(dest, {
                    time: start + 0.05,
                    type: 'sine',
                    freq: 340,
                    freqEnd: 120,
                    gain: 0.016,
                    attack: 0.002,
                    hold: 0.012,
                    release: 0.07,
                    filterType: 'lowpass',
                    filterFreq: 480,
                    pan: this.rand(-0.3, 0.3),
                })
            }
        }

        this.noise(dest, {
            time: t + 0.42,
            color: 'white',
            duration: 0.05,
            gain: 0.012,
            attack: 0.003,
            release: 0.045,
            filterType: 'highpass',
            filterFreq: 2200,
            pan: this.rand(-0.35, 0.35),
        })
    }

    /**
     * 解锁：机械闩松开 + 微弱神经链接确认音。
     */
    private playUnlock(t: number, dest: AudioNode): void {
        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.05,
            gain: 0.1,
            attack: 0.001,
            release: 0.045,
            filterType: 'highpass',
            filterFreq: 1800,
        })

        this.tone(dest, {
            time: t + 0.01,
            type: 'square',
            freq: 176,
            freqEnd: 118,
            gain: 0.105,
            attack: 0.001,
            hold: 0.02,
            release: 0.08,
            filterType: 'lowpass',
            filterFreq: 430,
        })

        this.tone(dest, {
            time: t + 0.045,
            type: 'triangle',
            freq: 360,
            freqEnd: 540,
            gain: 0.042,
            attack: 0.003,
            hold: 0.02,
            release: 0.12,
            filterType: 'lowpass',
            filterFreq: 1200,
        })

        this.tone(dest, {
            time: t + 0.06,
            type: 'sine',
            freq: 740,
            freqEnd: 1320,
            gain: 0.058,
            attack: 0.005,
            hold: 0.03,
            release: 0.22,
            pan: 0.12,
        })
    }

    /**
     * 上锁：沉闷闭合 + 金属卡死。
     */
    private playLock(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: 138,
            freqEnd: 50,
            gain: 0.145,
            attack: 0.001,
            hold: 0.02,
            release: 0.14,
            filterType: 'lowpass',
            filterFreq: 320,
        })

        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.08,
            gain: 0.088,
            attack: 0.001,
            release: 0.07,
            filterType: 'lowpass',
            filterFreq: 430,
        })

        this.tone(dest, {
            time: t + 0.07,
            type: 'square',
            freq: 120,
            gain: 0.06,
            attack: 0.001,
            hold: 0.015,
            release: 0.06,
            filterType: 'bandpass',
            filterFreq: 360,
            filterQ: 4,
        })

        this.tone(dest, {
            time: t + 0.095,
            type: 'triangle',
            freq: 520,
            freqEnd: 310,
            gain: 0.028,
            attack: 0.001,
            hold: 0.012,
            release: 0.09,
            filterType: 'bandpass',
            filterFreq: 540,
            filterQ: 5,
        })
    }

    // ========================================================================
    // 点音：物品
    // ========================================================================

    /**
     * 拾取物品：近距离高亮提示。
     */
    private playItemPickup(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: 780,
            freqEnd: 1240,
            gain: 0.076,
            attack: 0.002,
            hold: 0.02,
            release: 0.14,
        })

        this.tone(dest, {
            time: t + 0.03,
            type: 'triangle',
            freq: 1580,
            gain: 0.03,
            attack: 0.002,
            hold: 0.01,
            release: 0.12,
            pan: 0.1,
        })

        this.noise(dest, {
            time: t + 0.015,
            color: 'white',
            duration: 0.03,
            gain: 0.008,
            attack: 0.001,
            release: 0.026,
            filterType: 'highpass',
            filterFreq: 3000,
        })
    }

    /**
     * 使用物品：注射、激活或神经链接同步。
     */
    private playItemUse(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: 390,
            freqEnd: 660,
            freqRampTime: 0.09,
            gain: 0.082,
            attack: 0.003,
            hold: 0.04,
            release: 0.18,
        })

        this.tone(dest, {
            time: t + 0.1,
            type: 'sine',
            freq: 640,
            freqEnd: 500,
            gain: 0.052,
            attack: 0.003,
            hold: 0.03,
            release: 0.16,
        })

        this.tone(dest, {
            time: t + 0.02,
            type: 'sine',
            freq: 220,
            freqEnd: 110,
            gain: 0.034,
            attack: 0.002,
            hold: 0.03,
            release: 0.12,
            filterType: 'lowpass',
            filterFreq: 420,
        })

        this.noise(dest, {
            time: t + 0.02,
            color: 'white',
            duration: 0.06,
            gain: 0.016,
            attack: 0.002,
            release: 0.05,
            filterType: 'highpass',
            filterFreq: 2400,
        })
    }

    /**
     * 装备：伺服、卡扣与生物机械贴合。
     */
    private playItemEquip(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sawtooth',
            freq: 210,
            freqEnd: 500,
            gain: 0.062,
            attack: 0.004,
            hold: 0.05,
            release: 0.14,
            filterType: 'lowpass',
            filterFreq: 520,
            filterFreqEnd: 1800,
            curve: this.softClip(2),
        })

        this.tone(dest, {
            time: t + 0.015,
            type: 'sine',
            freq: 140,
            freqEnd: 58,
            gain: 0.05,
            attack: 0.002,
            hold: 0.025,
            release: 0.1,
            filterType: 'lowpass',
            filterFreq: 320,
        })

        this.noise(dest, {
            time: t + 0.02,
            color: 'white',
            duration: 0.05,
            gain: 0.068,
            attack: 0.001,
            release: 0.045,
            filterType: 'bandpass',
            filterFreq: 1400,
            filterQ: 2,
        })

        this.tone(dest, {
            time: t + 0.07,
            type: 'triangle',
            freq: 900,
            gain: 0.034,
            attack: 0.001,
            hold: 0.015,
            release: 0.1,
        })
    }

    /**
     * 卸下装备：释放、下降、松弛。
     */
    private playItemUnequip(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sawtooth',
            freq: 470,
            freqEnd: 180,
            gain: 0.058,
            attack: 0.003,
            hold: 0.05,
            release: 0.16,
            filterType: 'lowpass',
            filterFreq: 1500,
            filterFreqEnd: 500,
            curve: this.softClip(2),
        })

        this.tone(dest, {
            time: t + 0.02,
            type: 'sine',
            freq: 220,
            freqEnd: 88,
            gain: 0.036,
            attack: 0.002,
            hold: 0.03,
            release: 0.12,
            filterType: 'lowpass',
            filterFreq: 420,
        })

        this.noise(dest, {
            time: t + 0.03,
            color: 'white',
            duration: 0.06,
            gain: 0.05,
            attack: 0.001,
            release: 0.055,
            filterType: 'bandpass',
            filterFreq: 900,
            filterQ: 1.5,
        })
    }

    /**
     * 物品损坏：碎裂、崩解、近距爆裂。
     */
    private playItemBreak(t: number, dest: AudioNode): void {
        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.18,
            gain: 0.135,
            attack: 0.001,
            release: 0.14,
            filterType: 'highpass',
            filterFreq: 1200,
        })

        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: 172,
            freqEnd: 46,
            gain: 0.125,
            attack: 0.001,
            hold: 0.02,
            release: 0.16,
            filterType: 'lowpass',
            filterFreq: 360,
        })

        this.tone(dest, {
            time: t + 0.01,
            type: 'triangle',
            freq: 330,
            freqEnd: 90,
            gain: 0.05,
            attack: 0.001,
            hold: 0.016,
            release: 0.1,
            filterType: 'lowpass',
            filterFreq: 700,
        })

        for (let i = 0; i < 4; i++) {
            this.tone(dest, {
                time: t + this.rand(0, 0.12),
                type: 'square',
                freq: this.rand(900, 2600),
                gain: 0.016,
                attack: 0.001,
                hold: 0.005,
                release: 0.05,
                filterType: 'highpass',
                filterFreq: 1000,
                pan: this.rand(-0.5, 0.5),
            })
        }
    }

    // ========================================================================
    // 点音：UI
    // ========================================================================

    /**
     * UI 点击：低频主体 + 高频瞬态。
     */
    private playUiClick(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: 186,
            freqEnd: 52,
            gain: 0.108,
            attack: 0.001,
            hold: 0.012,
            release: 0.08,
            filterType: 'lowpass',
            filterFreq: 420,
        })

        this.tone(dest, {
            time: t,
            type: 'square',
            freq: 2350,
            gain: 0.021,
            attack: 0.001,
            hold: 0.004,
            release: 0.02,
            filterType: 'highpass',
            filterFreq: 1500,
        })
    }

    /**
     * UI 悬停：极轻的高频提示。
     */
    private playUiHover(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: this.rand(1180, 1680),
            freqEnd: this.rand(1700, 2120),
            gain: 0.014,
            attack: 0.001,
            hold: 0.006,
            release: 0.035,
        })
    }

    /**
     * UI 过渡：短促扫描式 swoosh。
     */
    private playUiTransition(t: number, dest: AudioNode): void {
        this.noise(dest, {
            time: t,
            color: 'pink',
            duration: 0.28,
            gain: 0.078,
            attack: 0.03,
            release: 0.18,
            filterType: 'bandpass',
            filterFreq: 240,
            filterFreqEnd: 2800,
            filterQ: 4,
        })

        this.tone(dest, {
            time: t + 0.02,
            type: 'sine',
            freq: 310,
            freqEnd: 740,
            gain: 0.034,
            attack: 0.02,
            hold: 0.05,
            release: 0.18,
        })

        this.noise(dest, {
            time: t + 0.06,
            color: 'white',
            duration: 0.08,
            gain: 0.01,
            attack: 0.01,
            release: 0.07,
            filterType: 'highpass',
            filterFreq: 2600,
            pan: this.rand(-0.3, 0.3),
        })
    }

    /**
     * UI 通知：双音提示。
     */
    private playUiNotification(t: number, dest: AudioNode): void {
        const notes = [880, 1100]

        notes.forEach((freq, index) => {
            this.tone(dest, {
                time: t + index * 0.09,
                type: 'sine',
                freq,
                gain: 0.062,
                attack: 0.004,
                hold: 0.03,
                release: 0.18,
                pan: index === 0 ? -0.12 : 0.12,
            })
        })

        this.tone(dest, {
            time: t + 0.18,
            type: 'sine',
            freq: 1320,
            gain: 0.022,
            attack: 0.006,
            hold: 0.02,
            release: 0.16,
            pan: 0.18,
        })
    }

    // ========================================================================
    // 点音：战术与战斗
    // ========================================================================

    /**
     * 战术执行：确认、蓄力、执行。
     */
    private playTacticExecute(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'triangle',
            freq: 330,
            freqEnd: 700,
            gain: 0.082,
            attack: 0.003,
            hold: 0.04,
            release: 0.16,
            filterType: 'lowpass',
            filterFreq: 1600,
        })

        this.tone(dest, {
            time: t + 0.03,
            type: 'square',
            freq: 1500,
            gain: 0.025,
            attack: 0.001,
            hold: 0.01,
            release: 0.06,
            filterType: 'highpass',
            filterFreq: 1200,
        })

        this.tone(dest, {
            time: t + 0.01,
            type: 'sine',
            freq: 120,
            freqEnd: 58,
            gain: 0.044,
            attack: 0.002,
            hold: 0.02,
            release: 0.1,
            filterType: 'lowpass',
            filterFreq: 300,
        })

        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.08,
            gain: 0.042,
            attack: 0.001,
            release: 0.07,
            filterType: 'bandpass',
            filterFreq: 900,
            filterQ: 2,
        })
    }

    /**
     * 未命中：快速擦空。
     */
    private playCombatMiss(t: number, dest: AudioNode): void {
        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.16,
            gain: 0.135,
            attack: 0.01,
            release: 0.12,
            filterType: 'bandpass',
            filterFreq: 680,
            filterFreqEnd: 2150,
            filterQ: 2,
            pan: this.rand(-0.3, 0.3),
        })

        this.tone(dest, {
            time: t + 0.01,
            type: 'sine',
            freq: 720,
            freqEnd: 260,
            gain: 0.026,
            attack: 0.004,
            hold: 0.02,
            release: 0.1,
            filterType: 'highpass',
            filterFreq: 500,
            pan: this.rand(-0.25, 0.25),
        })
    }

    /**
     * 擦伤：轻刮擦，比 miss 更有接触感。
     */
    private playCombatGraze(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sawtooth',
            freq: this.rand(820, 1220),
            freqEnd: 270,
            gain: 0.088,
            attack: 0.001,
            hold: 0.02,
            release: 0.1,
            filterType: 'bandpass',
            filterFreq: 1300,
            filterQ: 4,
            curve: this.softClip(2),
            pan: this.rand(-0.35, 0.35),
        })

        this.tone(dest, {
            time: t + 0.008,
            type: 'triangle',
            freq: 230,
            freqEnd: 90,
            gain: 0.038,
            attack: 0.001,
            hold: 0.016,
            release: 0.08,
            filterType: 'lowpass',
            filterFreq: 460,
        })

        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.08,
            gain: 0.068,
            attack: 0.001,
            release: 0.07,
            filterType: 'highpass',
            filterFreq: 1800,
        })
    }

    /**
     * 命中：低频冲击 + 碎裂噪音。
     */
    private playCombatHit(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: 146,
            freqEnd: 38,
            gain: 0.235,
            attack: 0.001,
            hold: 0.03,
            release: 0.18,
            filterType: 'lowpass',
            filterFreq: 520,
        })

        this.tone(dest, {
            time: t + 0.006,
            type: 'triangle',
            freq: 320,
            freqEnd: 80,
            gain: 0.068,
            attack: 0.001,
            hold: 0.02,
            release: 0.12,
            filterType: 'lowpass',
            filterFreq: 760,
        })

        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.14,
            gain: 0.16,
            attack: 0.001,
            release: 0.12,
            filterType: 'lowpass',
            filterFreq: 2800,
            filterFreqEnd: 140,
        })
    }

    /**
     * 暴击：重击 + 金属鸣响。
     */
    private playCombatCrit(t: number, dest: AudioNode): void {
        this.playCombatHit(t, dest)

        this.tone(dest, {
            time: t + 0.005,
            type: 'square',
            freq: 1260,
            freqEnd: 760,
            gain: 0.132,
            attack: 0.001,
            hold: 0.03,
            release: 0.28,
            filterType: 'bandpass',
            filterFreq: 1200,
            filterQ: 6,
        })

        this.tone(dest, {
            time: t + 0.01,
            type: 'sine',
            freq: 62,
            freqEnd: 30,
            gain: 0.09,
            attack: 0.001,
            hold: 0.04,
            release: 0.22,
            filterType: 'lowpass',
            filterFreq: 180,
        })

        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.1,
            gain: 0.092,
            attack: 0.001,
            release: 0.09,
            filterType: 'highpass',
            filterFreq: 2500,
        })
    }

    /**
     * 格挡：金属偏转与共振。
     */
    private playCombatBlock(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'triangle',
            freq: 430,
            freqEnd: 358,
            gain: 0.165,
            attack: 0.001,
            hold: 0.03,
            release: 0.26,
            filterType: 'bandpass',
            filterFreq: 460,
            filterQ: 9,
        })

        this.tone(dest, {
            time: t + 0.004,
            type: 'sine',
            freq: 1720,
            freqEnd: 1260,
            gain: 0.044,
            attack: 0.001,
            hold: 0.015,
            release: 0.18,
        })

        this.tone(dest, {
            time: t + 0.006,
            type: 'sine',
            freq: 220,
            freqEnd: 104,
            gain: 0.056,
            attack: 0.001,
            hold: 0.02,
            release: 0.14,
            filterType: 'lowpass',
            filterFreq: 420,
        })

        this.noise(dest, {
            time: t,
            color: 'white',
            duration: 0.05,
            gain: 0.07,
            attack: 0.001,
            release: 0.045,
            filterType: 'highpass',
            filterFreq: 2000,
        })
    }

    /**
     * 增益：上升的能量注入。
     */
    private playCombatBuff(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sawtooth',
            freq: 184,
            freqEnd: 660,
            gain: 0.082,
            attack: 0.01,
            hold: 0.12,
            release: 0.32,
            filterType: 'lowpass',
            filterFreq: 420,
            filterFreqEnd: 2300,
            curve: this.softClip(2),
        })

        this.tone(dest, {
            time: t + 0.06,
            type: 'sine',
            freq: 520,
            freqEnd: 1040,
            gain: 0.038,
            attack: 0.012,
            hold: 0.08,
            release: 0.28,
        })

        this.noise(dest, {
            time: t + 0.05,
            color: 'pink',
            duration: 0.35,
            gain: 0.025,
            attack: 0.03,
            release: 0.28,
            filterType: 'highpass',
            filterFreq: 1800,
        })
    }

    /**
     * 减益：下沉、污染、失真。
     */
    private playCombatDebuff(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sawtooth',
            freq: 420,
            freqEnd: 76,
            gain: 0.105,
            attack: 0.006,
            hold: 0.1,
            release: 0.34,
            filterType: 'lowpass',
            filterFreq: 950,
            filterFreqEnd: 280,
            curve: this.distortion(180),
        })

        this.tone(dest, {
            time: t + 0.03,
            type: 'sine',
            freq: 220,
            freqEnd: 96,
            gain: 0.046,
            attack: 0.005,
            hold: 0.08,
            release: 0.3,
        })

        this.noise(dest, {
            time: t + 0.02,
            color: 'brown',
            duration: 0.42,
            gain: 0.03,
            attack: 0.03,
            release: 0.34,
            filterType: 'lowpass',
            filterFreq: 360,
        })

        this.noise(dest, {
            time: t + 0.08,
            color: 'white',
            duration: 0.12,
            gain: 0.012,
            attack: 0.01,
            release: 0.1,
            filterType: 'bandpass',
            filterFreq: 2800,
            filterQ: 4,
            pan: this.rand(-0.4, 0.4),
        })
    }

    // ========================================================================
    // 点音：叙事事件
    // ========================================================================

    /**
     * NPC 加入：短暂、克制、带一点希望。
     */
    private playEventNpcJoin(t: number, dest: AudioNode): void {
        const notes = [392, 523.25, 659.25]

        notes.forEach((freq, index) => {
            this.tone(dest, {
                time: t + index * 0.11,
                type: 'sine',
                freq,
                gain: 0.072,
                attack: 0.012,
                hold: 0.04,
                release: 0.42,
                pan: this.rand(-0.18, 0.18),
                detune: this.rand(-5, 5),
            })
        })

        this.noise(dest, {
            time: t + 0.08,
            color: 'pink',
            duration: 0.4,
            gain: 0.013,
            attack: 0.04,
            release: 0.32,
            filterType: 'highpass',
            filterFreq: 2600,
        })
    }

    /**
     * NPC 离开：下行、失落、未完全解决。
     */
    private playEventNpcLeave(t: number, dest: AudioNode): void {
        const notes = [659.25, 523.25, 392]

        notes.forEach((freq, index) => {
            this.tone(dest, {
                time: t + index * 0.12,
                type: 'sine',
                freq,
                gain: 0.058,
                attack: 0.012,
                hold: 0.04,
                release: 0.4,
                pan: this.rand(-0.18, 0.18),
                detune: this.rand(-6, 6),
            })
        })

        this.tone(dest, {
            time: t + 0.36,
            type: 'sine',
            freq: 196,
            freqEnd: 96,
            gain: 0.03,
            attack: 0.02,
            hold: 0.08,
            release: 0.4,
            filterType: 'lowpass',
            filterFreq: 360,
        })
    }

    // ========================================================================
    // 短音
    // ========================================================================

    /**
     * 恐怖短音：
     * 不协和簇、低频压迫、神经链接翻译失败感。
     */
    private playTerrifying(t: number, dest: AudioNode): void {
        const base = this.rand(130, 220)

        const freqs = [
            base,
            base * 1.06,
            base * 1.42,
            base * 2.03,
            base * 2.66,
        ]

        freqs.forEach((freq, index) => {
            this.tone(dest, {
                time: t + this.rand(0, 0.05),
                type: index % 2 === 0 ? 'sawtooth' : 'square',
                freq,
                freqEnd: freq * 0.6,
                gain: 0.048,
                attack: 0.02,
                hold: 0.25,
                release: 1.0,
                filterType: 'lowpass',
                filterFreq: this.rand(560, 1800),
                filterQ: 1.2,
                curve: index === 0 ? this.distortion(220) : this.softClip(2.5),
                pan: this.rand(-0.7, 0.7),
            })
        })

        this.noise(dest, {
            time: t,
            color: 'brown',
            duration: 1.45,
            gain: 0.095,
            attack: 0.1,
            release: 1.0,
            filterType: 'lowpass',
            filterFreq: 500,
            filterFreqEnd: 170,
            loop: true,
        })

        this.noise(dest, {
            time: t + 0.05,
            color: 'white',
            duration: 0.8,
            gain: 0.036,
            attack: 0.05,
            release: 0.6,
            filterType: 'bandpass',
            filterFreq: this.rand(1800, 3300),
            filterQ: 4,
            pan: this.rand(-0.6, 0.6),
        })

        this.tone(dest, {
            time: t + 0.1,
            type: 'sine',
            freq: this.rand(3800, 5400),
            freqEnd: this.rand(1700, 2600),
            gain: 0.02,
            attack: 0.03,
            hold: 0.15,
            release: 0.7,
            filterType: 'highpass',
            filterFreq: 1500,
            pan: this.rand(-0.5, 0.5),
        })

        for (let i = 0; i < 2; i++) {
            this.tone(dest, {
                time: t + this.rand(0.12, 0.65),
                type: 'square',
                freq: this.rand(1600, 3200),
                freqEnd: this.rand(300, 900),
                gain: 0.012,
                attack: 0.004,
                hold: 0.02,
                release: 0.16,
                filterType: 'highpass',
                filterFreq: 1200,
                curve: this.bitCrush(4),
                pan: this.rand(-0.65, 0.65),
            })
        }
    }

    /**
     * 节点过渡：
     * 短促空间位移感，低频冲击 + 反向感扫描。
     */
    private playNodeTransition(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: 62,
            freqEnd: 30,
            gain: 0.19,
            attack: 0.005,
            hold: 0.08,
            release: 0.55,
            filterType: 'lowpass',
            filterFreq: 220,
        })

        this.noise(dest, {
            time: t,
            color: 'brown',
            duration: 0.8,
            gain: 0.088,
            attack: 0.03,
            release: 0.5,
            filterType: 'bandpass',
            filterFreq: 320,
            filterFreqEnd: 1750,
            filterFreqRampTime: 0.35,
            filterQ: 2,
            loop: true,
        })

        this.noise(dest, {
            time: t + 0.28,
            color: 'pink',
            duration: 0.45,
            gain: 0.05,
            attack: 0.02,
            release: 0.35,
            filterType: 'bandpass',
            filterFreq: 1950,
            filterFreqEnd: 410,
            filterQ: 3,
        })

        this.tone(dest, {
            time: t + 0.18,
            type: 'triangle',
            freq: 830,
            freqEnd: 410,
            gain: 0.044,
            attack: 0.02,
            hold: 0.08,
            release: 0.4,
            filterType: 'lowpass',
            filterFreq: 1600,
        })

        this.noise(dest, {
            time: t + 0.08,
            color: 'white',
            duration: 0.18,
            gain: 0.016,
            attack: 0.01,
            release: 0.16,
            filterType: 'highpass',
            filterFreq: 2600,
            pan: this.rand(-0.45, 0.45),
        })
    }

    /**
     * 进入新区域：
     * 深渊低频 drone、空间扩张、神经链接重新校准。
     */
    private playZoneEnter(t: number, dest: AudioNode): void {
        this.tone(dest, {
            time: t,
            type: 'sine',
            freq: 42,
            freqEnd: 37,
            gain: 0.19,
            attack: 0.12,
            hold: 0.7,
            release: 1.2,
            filterType: 'lowpass',
            filterFreq: 160,
        })

        this.tone(dest, {
            time: t + 0.03,
            type: 'sine',
            freq: 42.7,
            gain: 0.13,
            attack: 0.15,
            hold: 0.7,
            release: 1.2,
            filterType: 'lowpass',
            filterFreq: 160,
            detune: 8,
        })

        this.noise(dest, {
            time: t,
            color: 'brown',
            duration: 2.2,
            gain: 0.095,
            attack: 0.25,
            release: 1.5,
            filterType: 'lowpass',
            filterFreq: 320,
            filterFreqEnd: 135,
            loop: true,
        })

        this.noise(dest, {
            time: t + 0.35,
            color: 'pink',
            duration: 1.4,
            gain: 0.038,
            attack: 0.18,
            release: 1.0,
            filterType: 'bandpass',
            filterFreq: 1200,
            filterFreqEnd: 410,
            filterQ: 2.5,
            pan: this.rand(-0.4, 0.4),
        })

        this.tone(dest, {
            time: t + 0.45,
            type: 'sine',
            freq: 920,
            freqEnd: 420,
            gain: 0.042,
            attack: 0.12,
            hold: 0.35,
            release: 0.9,
            filterType: 'lowpass',
            filterFreq: 2200,
            pan: this.rand(-0.3, 0.3),
        })

        this.tone(dest, {
            time: t + 0.18,
            type: 'triangle',
            freq: 180,
            freqEnd: 86,
            gain: 0.04,
            attack: 0.08,
            hold: 0.24,
            release: 0.7,
            filterType: 'lowpass',
            filterFreq: 420,
        })

        this.noise(dest, {
            time: t + 0.65,
            color: 'white',
            duration: 0.35,
            gain: 0.014,
            attack: 0.06,
            release: 0.28,
            filterType: 'highpass',
            filterFreq: 3200,
            pan: this.rand(-0.5, 0.5),
        })
    }
}