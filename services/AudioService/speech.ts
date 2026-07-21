/**
 * 语音播放器
 * 增强版 - 支持多种语音效果和处理
 */
import { decodeAudioData, parseBase64Audio, makeSoftClipCurve } from './context';
import { VoiceEffect } from '../../meta';

export class SpeechPlayer {
    private currentSource: AudioBufferSourceNode | null = null;
    private isPlaying: boolean = false;

    constructor(
        private ctx: AudioContext,
        private reverbNode: ConvolverNode
    ) { }

    public async play(
        base64Data: string,
        effect: VoiceEffect = 'radio',
        volume: number = 1.0
    ): Promise<void> {
        // 停止当前播放
        this.stop();

        try {
            const bytes = parseBase64Audio(base64Data);
            const audioBuffer = await decodeAudioData(bytes, this.ctx, 24000, 1);

            const source = this.ctx.createBufferSource();
            source.buffer = audioBuffer;
            this.currentSource = source;
            this.isPlaying = true;

            // 根据效果类型创建处理链
            const outputNode = this.createEffectChain(effect, volume);
            source.connect(outputNode);

            source.onended = () => {
                this.isPlaying = false;
                this.currentSource = null;
            };

            source.start();
        } catch (e) {
            console.error("[SpeechPlayer] Failed to decode PCM", e);
            this.isPlaying = false;
        }
    }

    public stop() {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) { }
            this.currentSource = null;
        }
        this.isPlaying = false;
    }

    public getIsPlaying(): boolean {
        return this.isPlaying;
    }

    private createEffectChain(effect: VoiceEffect, volume: number): AudioNode {
        const voiceGain = this.ctx.createGain();
        voiceGain.gain.value = volume;

        switch (effect) {
            case 'radio':
                return this.createRadioEffect(voiceGain);
            case 'distorted':
                return this.createDistortedEffect(voiceGain);
            case 'whisper':
                return this.createWhisperEffect(voiceGain);
            case 'robotic':
                return this.createRoboticEffect(voiceGain);
            case 'echo':
                return this.createEchoEffect(voiceGain);
            default:
                voiceGain.connect(this.reverbNode);
                return voiceGain;
        }
    }

    private createRadioEffect(outputGain: GainNode): AudioNode {
        // 老式录音带/无线电 EQ
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 0.5;

        // 轻微过载
        const shaper = this.ctx.createWaveShaper();
        (shaper as any).curve = makeSoftClipCurve(3);

        // 添加轻微噪音
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.02;

        const noiseBuffer = this.createNoiseBuffer(5);
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 3000;

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(outputGain);
        noiseSource.start();

        outputGain.gain.value = 2.0;

        filter.connect(shaper);
        shaper.connect(outputGain);
        outputGain.connect(this.reverbNode);

        return filter;
    }

    private createDistortedEffect(outputGain: GainNode): AudioNode {
        const shaper = this.ctx.createWaveShaper();
        (shaper as any).curve = makeSoftClipCurve(8);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3000;

        // 添加颤音
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 5;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.1;
        lfo.connect(lfoGain);
        lfoGain.connect(outputGain.gain);
        lfo.start();

        shaper.connect(filter);
        filter.connect(outputGain);
        outputGain.connect(this.reverbNode);

        return shaper;
    }

    private createWhisperEffect(outputGain: GainNode): AudioNode {
        // 高通滤波 + 噪音混合
        const highPass = this.ctx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 500;

        const lowPass = this.ctx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 4000;

        // 添加气息噪音
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.15;

        const noiseBuffer = this.createNoiseBuffer(5);
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 2000;
        noiseFilter.Q.value = 2;

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(outputGain);
        noiseSource.start();

        outputGain.gain.value = 1.5;

        highPass.connect(lowPass);
        lowPass.connect(outputGain);
        outputGain.connect(this.reverbNode);

        return highPass;
    }

    private createRoboticEffect(outputGain: GainNode): AudioNode {
        // 环形调制器效果
        const carrier = this.ctx.createOscillator();
        carrier.frequency.value = 50;
        carrier.type = 'sine';

        const carrierGain = this.ctx.createGain();
        carrierGain.gain.value = 0.5;

        carrier.connect(carrierGain);

        // 位压缩效果
        const shaper = this.ctx.createWaveShaper();
        const curve = new Float32Array(256);
        const levels = 8;
        for (let i = 0; i < 256; i++) {
            const x = (i / 128) - 1;
            curve[i] = Math.round(x * levels) / levels;
        }
        shaper.curve = curve;

        // 梳状滤波器模拟
        const delay = this.ctx.createDelay();
        delay.delayTime.value = 0.005;

        const feedback = this.ctx.createGain();
        feedback.gain.value = 0.5;

        delay.connect(feedback);
        feedback.connect(delay);

        const merger = this.ctx.createGain();

        shaper.connect(merger);
        delay.connect(merger);
        merger.connect(outputGain);
        outputGain.connect(this.reverbNode);

        carrier.start();

        return shaper;
    }

    private createEchoEffect(outputGain: GainNode): AudioNode {
        // 多重延迟
        const delays = [0.1, 0.2, 0.35];
        const feedbacks = [0.5, 0.3, 0.2];

        const merger = this.ctx.createGain();

        delays.forEach((time, i) => {
            const delay = this.ctx.createDelay();
            delay.delayTime.value = time;

            const gain = this.ctx.createGain();
            gain.gain.value = feedbacks[i];

            delay.connect(gain);
            gain.connect(merger);

            // 反馈
            const fbGain = this.ctx.createGain();
            fbGain.gain.value = 0.3;
            gain.connect(fbGain);
            fbGain.connect(delay);
        });

        merger.connect(outputGain);
        outputGain.connect(this.reverbNode);

        // 返回一个可以连接到的节点
        const input = this.ctx.createGain();
        input.connect(merger);

        delays.forEach((time) => {
            const delay = this.ctx.createDelay();
            delay.delayTime.value = time;
            input.connect(delay);
        });

        return input;
    }

    private createNoiseBuffer(duration: number): AudioBuffer {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // 粉红噪音
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }

        return buffer;
    }
}
