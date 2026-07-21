/**
 * 环境音生成器
 * 大幅增强版 - 支持更多主题、动态层级和程序化音乐
 */

import { ThemeType, AudioLayer, ThemeConfig, AmbientEvent } from '../../meta';
import { SCALES, ROOT_NOTES } from './music';

import { createPinkNoiseBuffer, createBrownNoiseBuffer, createWhiteNoiseBuffer } from './context';

// 主题配置预设
const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
    sanctuary: {
        baseFrequencies: [110, 164.8, 196, 220], // A大调和弦
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
        melodyScale: SCALES.pentatonic,
        melodyRoot: ROOT_NOTES.A3,
        reverbTime: 4,
        reverbDecay: 2.5,
        ambientEvents: []
    },
    exploration: {
        baseFrequencies: [55, 58, 82, 110], // 不和谐低音
        baseWaveform: 'sawtooth',
        baseVolume: 0.12,
        filterFreq: 200,
        filterQ: 2,
        lfoRate: 0.15,
        lfoDepth: 0.4,
        noiseVolume: 0.04,
        noiseType: 'pink',
        rhythmBPM: 0,
        rhythmEnabled: false,
        melodyEnabled: false,
        melodyScale: SCALES.minor,
        melodyRoot: ROOT_NOTES.A2,
        reverbTime: 3,
        reverbDecay: 2,
        ambientEvents: [
            { type: 'footstep', minInterval: 8000, maxInterval: 15000, probability: 0.3, volumeRange: [0.05, 0.15] },
            { type: 'static', minInterval: 10000, maxInterval: 25000, probability: 0.2, volumeRange: [0.02, 0.08] }
        ]
    },
    combat: {
        baseFrequencies: [45, 90, 92, 135], // 低频压迫
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
        melodyScale: SCALES.phrygian,
        melodyRoot: ROOT_NOTES.E2,
        reverbTime: 1.5,
        reverbDecay: 1,
        ambientEvents: []
    },
    panic: {
        baseFrequencies: [500, 510, 520, 8000], // 高频耳鸣
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
        melodyScale: SCALES.chromatic,
        melodyRoot: ROOT_NOTES.C4,
        reverbTime: 0.5,
        reverbDecay: 0.3,
        ambientEvents: [
            { type: 'whisper', minInterval: 3000, maxInterval: 8000, probability: 0.5, volumeRange: [0.1, 0.3] },
            { type: 'heartbeat', minInterval: 800, maxInterval: 1200, probability: 0.8, volumeRange: [0.3, 0.5] }
        ]
    },
    horror: {
        baseFrequencies: [30, 33, 66, 99], // 极低频
        baseWaveform: 'sawtooth',
        baseVolume: 0.15,
        filterFreq: 150,
        filterQ: 4,
        lfoRate: 0.05,
        lfoDepth: 0.6,
        noiseVolume: 0.08,
        noiseType: 'brown',
        rhythmBPM: 60,
        rhythmEnabled: true,
        melodyEnabled: false,
        melodyScale: SCALES.locrian,
        melodyRoot: ROOT_NOTES.B2,
        reverbTime: 5,
        reverbDecay: 3,
        ambientEvents: [
            { type: 'breathing', minInterval: 4000, maxInterval: 8000, probability: 0.6, volumeRange: [0.1, 0.25] },
            { type: 'scream', minInterval: 20000, maxInterval: 60000, probability: 0.15, volumeRange: [0.2, 0.4] }
        ]
    },
    void: {
        baseFrequencies: [20, 25, 40, 80], // 次声波
        baseWaveform: 'sine',
        baseVolume: 0.2,
        filterFreq: 100,
        filterQ: 1,
        lfoRate: 0.02,
        lfoDepth: 0.3,
        noiseVolume: 0.03,
        noiseType: 'brown',
        rhythmBPM: 0,
        rhythmEnabled: false,
        melodyEnabled: true,
        melodyScale: SCALES.wholetone,
        melodyRoot: ROOT_NOTES.C2,
        reverbTime: 8,
        reverbDecay: 4,
        ambientEvents: [
            { type: 'distortion', minInterval: 5000, maxInterval: 15000, probability: 0.4, volumeRange: [0.05, 0.15] }
        ]
    },
    industrial: {
        baseFrequencies: [60, 120, 180, 240], // 电力嗡鸣
        baseWaveform: 'square',
        baseVolume: 0.1,
        filterFreq: 400,
        filterQ: 2,
        lfoRate: 0.5,
        lfoDepth: 0.3,
        noiseVolume: 0.07,
        noiseType: 'white',
        rhythmBPM: 100,
        rhythmEnabled: true,
        melodyEnabled: false,
        melodyScale: SCALES.diminished,
        melodyRoot: ROOT_NOTES.D2,
        reverbTime: 2,
        reverbDecay: 1.5,
        ambientEvents: [
            { type: 'malfunction', minInterval: 8000, maxInterval: 20000, probability: 0.3, volumeRange: [0.1, 0.2] },
            { type: 'radio', minInterval: 15000, maxInterval: 40000, probability: 0.2, volumeRange: [0.05, 0.15] }
        ]
    },
    organic: {
        baseFrequencies: [40, 80, 120, 160], // 肉体脉动
        baseWaveform: 'sine',
        baseVolume: 0.12,
        filterFreq: 250,
        filterQ: 3,
        lfoRate: 1.2, // 心跳节奏
        lfoDepth: 0.7,
        noiseVolume: 0.05,
        noiseType: 'pink',
        rhythmBPM: 72, // 心跳BPM
        rhythmEnabled: true,
        melodyEnabled: false,
        melodyScale: SCALES.minor,
        melodyRoot: ROOT_NOTES.E2,
        reverbTime: 2.5,
        reverbDecay: 2,
        ambientEvents: [
            { type: 'breathing', minInterval: 3000, maxInterval: 6000, probability: 0.7, volumeRange: [0.15, 0.3] }
        ]
    },
    underwater: {
        baseFrequencies: [80, 160, 240], // 水下共鸣
        baseWaveform: 'sine',
        baseVolume: 0.1,
        filterFreq: 500,
        filterQ: 1,
        lfoRate: 0.3,
        lfoDepth: 0.4,
        noiseVolume: 0.08,
        noiseType: 'brown',
        rhythmBPM: 0,
        rhythmEnabled: false,
        melodyEnabled: true,
        melodyScale: SCALES.japanese,
        melodyRoot: ROOT_NOTES.F3,
        reverbTime: 6,
        reverbDecay: 3,
        ambientEvents: []
    },
    ritual: {
        baseFrequencies: [55, 110, 165, 220], // 五度和声
        baseWaveform: 'triangle',
        baseVolume: 0.1,
        filterFreq: 600,
        filterQ: 2,
        lfoRate: 0.1,
        lfoDepth: 0.3,
        noiseVolume: 0.02,
        noiseType: 'pink',
        rhythmBPM: 80,
        rhythmEnabled: true,
        melodyEnabled: true,
        melodyScale: SCALES.arabic,
        melodyRoot: ROOT_NOTES.A2,
        reverbTime: 5,
        reverbDecay: 3,
        ambientEvents: [
            { type: 'whisper', minInterval: 5000, maxInterval: 12000, probability: 0.4, volumeRange: [0.08, 0.2] }
        ]
    },
    memory: {
        baseFrequencies: [220, 277, 330, 440], // 梦幻和弦
        baseWaveform: 'sine',
        baseVolume: 0.06,
        filterFreq: 1200,
        filterQ: 0.5,
        lfoRate: 0.05,
        lfoDepth: 0.2,
        noiseVolume: 0.03,
        noiseType: 'pink',
        rhythmBPM: 0,
        rhythmEnabled: false,
        melodyEnabled: true,
        melodyScale: SCALES.major,
        melodyRoot: ROOT_NOTES.C4,
        reverbTime: 7,
        reverbDecay: 4,
        ambientEvents: [
            { type: 'static', minInterval: 8000, maxInterval: 20000, probability: 0.3, volumeRange: [0.02, 0.08] }
        ]
    },
    death: {
        baseFrequencies: [30, 60, 90], // 葬礼低音
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
        melodyScale: SCALES.minor,
        melodyRoot: ROOT_NOTES.D2,
        reverbTime: 10,
        reverbDecay: 5,
        ambientEvents: []
    }
};

export class AmbienceGenerator {
    private activeNodes: AudioNode[] = [];
    private layers: AudioLayer = { base: null, texture: null, rhythm: null, melody: null, accent: null };
    private currentTheme: ThemeType | null = null;
    private currentIntensity: number = 0;
    private ambientEventTimers: number[] = [];
    private melodyInterval: number | null = null;
    private onAmbientEvent: ((type: string) => void) | null = null;

    constructor(
        private ctx: AudioContext,
        private masterGain: GainNode,
        private reverbNode: ConvolverNode
    ) { }

    public setAmbientEventCallback(callback: (type: string) => void) {
        this.onAmbientEvent = callback;
    }

    public setTheme(theme: ThemeType, intensity: number = 0) {
        if (this.currentTheme === theme && Math.abs(this.currentIntensity - intensity) < 0.1) return;

        this.stop();
        this.currentTheme = theme;
        this.currentIntensity = intensity;

        const config = THEME_CONFIGS[theme];
        if (!config) return;

        const t = this.ctx.currentTime;

        // 创建五层混音总线
        this.layers.base = this.ctx.createGain();
        this.layers.texture = this.ctx.createGain();
        this.layers.rhythm = this.ctx.createGain();
        this.layers.melody = this.ctx.createGain();
        this.layers.accent = this.ctx.createGain();

        // 连接路由
        this.layers.base.connect(this.reverbNode);
        this.layers.texture.connect(this.reverbNode);
        this.layers.rhythm.connect(this.masterGain); // 节奏干声
        this.layers.melody.connect(this.reverbNode);
        this.layers.accent.connect(this.masterGain);

        // 初始化音量 (Fade in)
        [this.layers.base, this.layers.texture, this.layers.rhythm, this.layers.melody, this.layers.accent].forEach(layer => {
            if (layer) {
                layer.gain.setValueAtTime(0, t);
                this.activeNodes.push(layer);
            }
        });

        // 渐入
        this.layers.base.gain.linearRampToValueAtTime(0.6, t + 3);
        this.layers.texture.gain.linearRampToValueAtTime(0.3 + intensity * 0.2, t + 2);

        // 1. 基础层 - Drone
        this.createDrone(config, this.layers.base);

        // 2. 纹理层 - Noise
        this.createNoise(config, this.layers.texture);

        // 3. 节奏层
        if (config.rhythmEnabled && config.rhythmBPM > 0) {
            this.layers.rhythm.gain.linearRampToValueAtTime(0.3 + intensity * 0.2, t + 2);
            this.createRhythm(config, this.layers.rhythm);
        }

        // 4. 旋律层
        if (config.melodyEnabled) {
            this.layers.melody.gain.linearRampToValueAtTime(0.15, t + 4);
            this.startMelody(config, this.layers.melody);
        }

        // 5. 环境事件
        this.layers.accent.gain.setValueAtTime(0.5, t);
        this.startAmbientEvents(config.ambientEvents);
    }

    public setIntensity(intensity: number) {
        if (!this.currentTheme) return;
        this.currentIntensity = Math.max(0, Math.min(1, intensity));

        const t = this.ctx.currentTime;

        // 动态调整纹理和节奏层音量
        if (this.layers.texture) {
            this.layers.texture.gain.setTargetAtTime(0.3 + this.currentIntensity * 0.3, t, 0.5);
        }
        if (this.layers.rhythm) {
            this.layers.rhythm.gain.setTargetAtTime(0.3 + this.currentIntensity * 0.3, t, 0.5);
        }
    }

    public stop() {
        // 清理所有定时器
        this.ambientEventTimers.forEach(timer => clearTimeout(timer));
        this.ambientEventTimers = [];

        if (this.melodyInterval) {
            clearInterval(this.melodyInterval);
            this.melodyInterval = null;
        }

        // 停止所有音频节点
        this.activeNodes.forEach(n => {
            try {
                if (n instanceof OscillatorNode || n instanceof AudioBufferSourceNode) n.stop();
                n.disconnect();
            } catch (e) { }
        });
        this.activeNodes = [];
        this.currentTheme = null;
        this.layers = { base: null, texture: null, rhythm: null, melody: null, accent: null };
    }

    // --- 内部生成器 ---

    private createDrone(config: ThemeConfig, output: AudioNode) {
        config.baseFrequencies.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            // 滤波器设置
            filter.type = 'lowpass';
            filter.frequency.value = config.filterFreq;
            filter.Q.value = config.filterQ;

            // 振荡器设置
            osc.type = config.baseWaveform;
            osc.frequency.value = f;

            // LFO 制造呼吸感 - 每个振荡器略有不同
            lfo.frequency.value = config.lfoRate * (0.8 + Math.random() * 0.4);
            lfoGain.gain.value = config.lfoDepth;

            // 连接
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(output);
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);

            // 音量 - 越高的频率越轻
            gain.gain.value = config.baseVolume * (1 - i * 0.15);

            osc.start();
            lfo.start();

            this.activeNodes.push(osc, lfo, gain, lfoGain, filter);
        });
    }

    private createNoise(config: ThemeConfig, output: AudioNode) {
        // 根据类型创建噪音缓冲区
        let buffer: AudioBuffer;
        switch (config.noiseType) {
            case 'white':
                buffer = createWhiteNoiseBuffer(this.ctx, 2);
                break;
            case 'brown':
                buffer = createBrownNoiseBuffer(this.ctx, 2);
                break;
            default:
                buffer = createPinkNoiseBuffer(this.ctx, 2);
        }

        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = buffer;
        noiseSrc.loop = true;

        // 动态滤波器
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 1;

        // 滤波器自动化 - 模拟风声/环境变化
        const now = this.ctx.currentTime;
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.linearRampToValueAtTime(800, now + 15);
        filter.frequency.linearRampToValueAtTime(200, now + 30);
        filter.frequency.setValueAtTime(300, now + 30);

        const gain = this.ctx.createGain();
        gain.gain.value = config.noiseVolume;

        noiseSrc.connect(filter);
        filter.connect(gain);
        gain.connect(output);

        noiseSrc.start();
        this.activeNodes.push(noiseSrc, filter, gain);
    }

    private createRhythm(config: ThemeConfig, output: AudioNode) {
        const gain = this.ctx.createGain();

        // 噪音源
        const noise = this.ctx.createBufferSource();
        const buffer = createWhiteNoiseBuffer(this.ctx, 2);
        noise.buffer = buffer;
        noise.loop = true;

        // 低通滤波 - 制造沉闷的脉冲
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;
        filter.Q.value = 5;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(output);

        // 脉冲 LFO
        const pulseLfo = this.ctx.createOscillator();
        pulseLfo.type = 'square';
        pulseLfo.frequency.value = config.rhythmBPM / 60;

        const pulseGain = this.ctx.createGain();
        pulseGain.gain.value = 0.8;

        pulseLfo.connect(pulseGain);
        pulseGain.connect(gain.gain);

        noise.start();
        pulseLfo.start();

        this.activeNodes.push(noise, filter, gain, pulseLfo, pulseGain);
    }

    private startMelody(config: ThemeConfig, output: AudioNode) {
        const scale = config.melodyScale;
        const root = config.melodyRoot;

        // 每隔一段时间播放一个音符
        const playNote = () => {
            if (!this.currentTheme) return;

            // 随机选择音阶中的音符
            const noteIndex = Math.floor(Math.random() * scale.length);
            const octaveShift = Math.floor(Math.random() * 2); // 0 或 1 八度
            const freq = root * Math.pow(2, (scale[noteIndex] + octaveShift * 12) / 12);

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 2000;

            const t = this.ctx.currentTime;
            const duration = 2 + Math.random() * 3;

            // ADSR 包络
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.1, t + 0.1); // Attack
            gain.gain.linearRampToValueAtTime(0.06, t + 0.3); // Decay
            gain.gain.setValueAtTime(0.06, t + duration - 0.5); // Sustain
            gain.gain.linearRampToValueAtTime(0, t + duration); // Release

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(output);

            osc.start(t);
            osc.stop(t + duration);
        };

        // 随机间隔播放
        this.melodyInterval = window.setInterval(() => {
            if (Math.random() < 0.6) { // 60% 概率播放
                playNote();
            }
        }, 3000 + Math.random() * 4000);
    }

    private startAmbientEvents(events: AmbientEvent[]) {
        events.forEach(event => {
            const scheduleNext = () => {
                const interval = event.minInterval + Math.random() * (event.maxInterval - event.minInterval);

                const timer = window.setTimeout(() => {
                    if (!this.currentTheme) return;

                    if (Math.random() < event.probability) {
                        // 触发事件回调
                        if (this.onAmbientEvent) {
                            this.onAmbientEvent(event.type);
                        }
                    }

                    scheduleNext();
                }, interval);

                this.ambientEventTimers.push(timer);
            };

            scheduleNext();
        });
    }
}
