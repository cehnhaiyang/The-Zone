/**
 * 主音频引擎
 * 支持环境音、音效、音乐、语音和动态混音
 */
import { ThemeType, DotSoundType, SoundType } from '../../meta';
import { createImpulseResponse, createHallReverb, createCaveReverb, createMetallicReverb, ReverbType, MusicMood, MusicGenerator } from './tool';
import { SoundPlayer } from './sound';
import { AmbienceGenerator, } from './ambience';
import { SpeechPlayer } from './speech';

interface SpatialParams {
    x: number;
    y: number;
    z: number;
    roomSize: number;
}

interface MixParams {
    masterVolume: number;
    ambienceVolume: number;
    sfxVolume: number;
    musicVolume: number;
    speechVolume: number;
    reverbMix: number;
    lowPassFreq: number;
    highPassFreq: number;
}

class AudioServiceTmpl {
    private ctx: AudioContext | null = null;

    // 主混音链
    private masterGain: GainNode | null = null;
    private masterCompressor: DynamicsCompressorNode | null = null;
    private masterLimiter: DynamicsCompressorNode | null = null;

    // 分轨混音
    private ambienceGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private speechGain: GainNode | null = null;

    // 效果器
    private reverbNode: ConvolverNode | null = null;
    private reverbGain: GainNode | null = null;
    private dryGain: GainNode | null = null;
    private lowPassFilter: BiquadFilterNode | null = null;
    private highPassFilter: BiquadFilterNode | null = null;

    // 子系统
    private ambience: AmbienceGenerator | null = null;
    private sfx: SoundPlayer | null = null;
    private speech: SpeechPlayer | null = null;
    private music: MusicGenerator | null = null;

    // 状态
    private isMuted: boolean = false;
    private isInitialized: boolean = false;
    private currentReverbType: ReverbType = 'default';

    // 混音参数
    private mixParams: MixParams = {
        masterVolume: 0.4,
        ambienceVolume: 0.6,
        sfxVolume: 0.8,
        musicVolume: 0.3,
        speechVolume: 1.0,
        reverbMix: 0.3,
        lowPassFreq: 20000,
        highPassFreq: 20
    };

    constructor() { }

    async init(): Promise<boolean> {
        if (this.isInitialized) return true;

        try {
            this.ctx = new AudioContext();

            // === 1. 创建主混音链 ===

            // 主限制器 (防止削波)
            this.masterLimiter = this.ctx.createDynamicsCompressor();
            this.masterLimiter.threshold.value = -1;
            this.masterLimiter.knee.value = 0;
            this.masterLimiter.ratio.value = 20;
            this.masterLimiter.attack.value = 0.001;
            this.masterLimiter.release.value = 0.1;
            this.masterLimiter.connect(this.ctx.destination);

            // 主压缩器 (动态控制)
            this.masterCompressor = this.ctx.createDynamicsCompressor();
            this.masterCompressor.threshold.value = -24;
            this.masterCompressor.knee.value = 30;
            this.masterCompressor.ratio.value = 4;
            this.masterCompressor.attack.value = 0.003;
            this.masterCompressor.release.value = 0.25;
            this.masterCompressor.connect(this.masterLimiter);

            // 主音量
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.mixParams.masterVolume;
            this.masterGain.connect(this.masterCompressor);

            // === 2. 创建滤波器链 ===

            this.lowPassFilter = this.ctx.createBiquadFilter();
            this.lowPassFilter.type = 'lowpass';
            this.lowPassFilter.frequency.value = this.mixParams.lowPassFreq;
            this.lowPassFilter.Q.value = 0.7;
            this.lowPassFilter.connect(this.masterGain);

            this.highPassFilter = this.ctx.createBiquadFilter();
            this.highPassFilter.type = 'highpass';
            this.highPassFilter.frequency.value = this.mixParams.highPassFreq;
            this.highPassFilter.Q.value = 0.7;
            this.highPassFilter.connect(this.lowPassFilter);

            // === 3. 创建混响系统 ===

            this.reverbNode = this.ctx.createConvolver();
            this.reverbNode.buffer = createImpulseResponse(this.ctx, 3.0, 2.0);

            this.reverbGain = this.ctx.createGain();
            this.reverbGain.gain.value = this.mixParams.reverbMix;
            this.reverbNode.connect(this.reverbGain);
            this.reverbGain.connect(this.highPassFilter);

            this.dryGain = this.ctx.createGain();
            this.dryGain.gain.value = 1 - this.mixParams.reverbMix;
            this.dryGain.connect(this.highPassFilter);

            // === 4. 创建分轨混音器 ===

            this.ambienceGain = this.ctx.createGain();
            this.ambienceGain.gain.value = this.mixParams.ambienceVolume;
            this.ambienceGain.connect(this.reverbNode);
            this.ambienceGain.connect(this.dryGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.mixParams.sfxVolume;
            this.sfxGain.connect(this.reverbNode);
            this.sfxGain.connect(this.dryGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.mixParams.musicVolume;
            this.musicGain.connect(this.reverbNode);
            this.musicGain.connect(this.dryGain);

            this.speechGain = this.ctx.createGain();
            this.speechGain.gain.value = this.mixParams.speechVolume;
            this.speechGain.connect(this.dryGain); // 语音通常不需要太多混响

            // === 5. 初始化子系统 ===

            this.ambience = new AmbienceGenerator(this.ctx, this.ambienceGain, this.reverbNode);
            this.sfx = new SoundPlayer(this.ctx, this.sfxGain!, this.reverbNode!);
            this.speech = new SpeechPlayer(this.ctx, { reverbNode: this.reverbNode });
            this.music = new MusicGenerator(this.ctx, this.reverbNode);

            // 设置环境事件回调
            this.ambience.setAmbientEventCallback((type) => {
                this.playSfx(type as DotSoundType);
            });

            this.isInitialized = true;
            console.log("[AudioService] Initialized with enhanced audio system.");
            return true;
        } catch (error) {
            console.error("[AudioService] 关键路径初始化失败:", error);
            return false;
        }
    }

    // === 静音控制 ===

    toggleMute(): boolean {
        if (!this.masterGain || !this.ctx) return this.isMuted;
        this.isMuted = !this.isMuted;

        const target = this.isMuted ? 0 : this.mixParams.masterVolume;
        this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.5);

        if (!this.isMuted && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.isMuted;
    }

    getMuted(): boolean {
        return this.isMuted;
    }

    // === 混音控制 ===

    setMixParams(params: Partial<MixParams>) {
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const transitionTime = 0.3;

        if (params.masterVolume !== undefined) {
            this.mixParams.masterVolume = params.masterVolume;
            if (!this.isMuted && this.masterGain) {
                this.masterGain.gain.setTargetAtTime(params.masterVolume, t, transitionTime);
            }
        }

        if (params.ambienceVolume !== undefined) {
            this.mixParams.ambienceVolume = params.ambienceVolume;
            this.ambienceGain?.gain.setTargetAtTime(params.ambienceVolume, t, transitionTime);
        }

        if (params.sfxVolume !== undefined) {
            this.mixParams.sfxVolume = params.sfxVolume;
            this.sfxGain?.gain.setTargetAtTime(params.sfxVolume, t, transitionTime);
        }

        if (params.musicVolume !== undefined) {
            this.mixParams.musicVolume = params.musicVolume;
            this.musicGain?.gain.setTargetAtTime(params.musicVolume, t, transitionTime);
        }

        if (params.speechVolume !== undefined) {
            this.mixParams.speechVolume = params.speechVolume;
            this.speechGain?.gain.setTargetAtTime(params.speechVolume, t, transitionTime);
        }

        if (params.reverbMix !== undefined) {
            this.mixParams.reverbMix = params.reverbMix;
            this.reverbGain?.gain.setTargetAtTime(params.reverbMix, t, transitionTime);
            this.dryGain?.gain.setTargetAtTime(1 - params.reverbMix, t, transitionTime);
        }

        if (params.lowPassFreq !== undefined) {
            this.mixParams.lowPassFreq = params.lowPassFreq;
            this.lowPassFilter?.frequency.setTargetAtTime(params.lowPassFreq, t, transitionTime);
        }

        if (params.highPassFreq !== undefined) {
            this.mixParams.highPassFreq = params.highPassFreq;
            this.highPassFilter?.frequency.setTargetAtTime(params.highPassFreq, t, transitionTime);
        }
    }

    getMixParams(): MixParams {
        return { ...this.mixParams };
    }

    // === 混响控制 ===

    setReverbType(type: ReverbType) {
        if (!this.ctx || !this.reverbNode || this.currentReverbType === type) return;

        this.currentReverbType = type;

        let buffer: AudioBuffer;
        switch (type) {
            case 'hall':
                buffer = createHallReverb(this.ctx, 4);
                break;
            case 'cave':
                buffer = createCaveReverb(this.ctx, 5);
                break;
            case 'metallic':
                buffer = createMetallicReverb(this.ctx, 2);
                break;
            default:
                buffer = createImpulseResponse(this.ctx, 3.0, 2.0);
        }

        this.reverbNode.buffer = buffer;
    }

    // === 环境音控制 ===

    setTheme(theme: ThemeType, intensity: number = 0) {
        if (!this.isInitialized || this.isMuted) return;

        // 根据主题自动调整混响类型
        switch (theme) {
            case 'sanctuary':
                this.setReverbType('hall');
                break;
            case 'combat':
                this.setReverbType('metallic');
                break;
            default:
                this.setReverbType('default');
        }

        this.ambience?.setTheme(theme, intensity);
    }

    setAmbienceIntensity(intensity: number) {
        this.ambience?.setIntensity(intensity);
    }

    stopAmbience() {
        this.ambience?.stop();
    }

    // === 音效控制 ===

    playSfx(type: SoundType) {
        if (!this.isInitialized || this.isMuted) return;
        this.sfx?.play(type);
    }

    // 带空间参数的音效播放
    playSfxSpatial(type: DotSoundType, _spatial: SpatialParams) {
        // SoundPlayer 内部已处理混响/路由，空间参数暂由混响类型隐式承载。
        this.playSfx(type);
    }

    // === 音乐控制 ===

    setMusicMood(mood: MusicMood) {
        if (!this.isInitialized) return;
        this.music?.setMood(mood);
    }

    startMusic() {
        if (!this.isInitialized || this.isMuted) return;
        this.music?.start();
    }

    stopMusic() {
        this.music?.stop();
    }

    isMusicPlaying(): boolean {
        return this.music?.isActive() ?? false;
    }

    // === 语音控制 ===

    async playPCM(base64Data: string) {
        if (!this.isInitialized || this.isMuted) return;
        this.speech?.play(base64Data);
    }

    // === 特效方法 ===

    // 低通滤波效果 (模拟水下/墙后)
    applyMuffleEffect(intensity: number = 0.5) {
        if (!this.ctx || !this.lowPassFilter) return;

        const targetFreq = 20000 - (intensity * 19000); // 1000 - 20000
        this.lowPassFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.3);
    }

    // 移除低通效果
    removeMuffleEffect() {
        if (!this.ctx || !this.lowPassFilter) return;
        this.lowPassFilter.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.3);
    }

    // 恐慌效果 (高通 + 失真感)
    applyPanicEffect(intensity: number = 0.5) {
        if (!this.ctx) return;

        const highPassTarget = 20 + (intensity * 500);
        this.highPassFilter?.frequency.setTargetAtTime(highPassTarget, this.ctx.currentTime, 0.1);

        // 增加混响
        this.setMixParams({ reverbMix: 0.3 + intensity * 0.4 });
    }

    // 移除恐慌效果
    removePanicEffect() {
        if (!this.ctx) return;
        this.highPassFilter?.frequency.setTargetAtTime(20, this.ctx.currentTime, 0.5);
        this.setMixParams({ reverbMix: 0.3 });
    }

    // 心跳效果 (持续播放)
    private heartbeatInterval: number | null = null;

    startHeartbeat(bpm: number = 80) {
        if (this.heartbeatInterval) return;

        const interval = 60000 / bpm;
        this.heartbeatInterval = window.setInterval(() => {
            this.playSfx('heartbeat' as DotSoundType);
        }, interval);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // === 状态查询 ===

    isReady(): boolean {
        return this.isInitialized;
    }

    getAudioContext(): AudioContext | null {
        return this.ctx;
    }

    // === 清理 ===

    dispose() {
        this.stopAmbience();
        this.stopMusic();
        this.stopHeartbeat();

        if (this.ctx && this.ctx.state !== 'closed') {
            this.ctx.close();
        }

        this.isInitialized = false;
    }
};

export const AudioService = new AudioServiceTmpl