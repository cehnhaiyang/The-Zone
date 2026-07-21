/**
 * 音频上下文工具函数
 * 增强版 - 支持更多音频处理功能
 */

// Base64 解码工具
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// 音频数据解码 (PCM -> AudioBuffer)
export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

// 解析 Base64 为 Uint8Array
export function parseBase64Audio(base64Data: string): Uint8Array {
    return decode(base64Data);
}

// 生成混响脉冲响应 (白噪音衰减)
export function createImpulseResponse(
    ctx: AudioContext, 
    duration: number, 
    decay: number,
    reverse: boolean = false
): AudioBuffer {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = reverse ? i : (length - i);
        const val = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
        // 添加轻微的立体声差异
        left[i] = val * (0.9 + Math.random() * 0.2);
        right[i] = val * (0.9 + Math.random() * 0.2);
    }
    return impulse;
}

// 生成金属混响 (更明亮的反射)
export function createMetallicReverb(ctx: AudioContext, duration: number): AudioBuffer {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // 多次反射模拟
    const reflections = [0.1, 0.2, 0.35, 0.5, 0.7, 0.9];
    
    for (let i = 0; i < length; i++) {
        let val = 0;
        const t = i / length;
        
        // 叠加多次反射
        for (const r of reflections) {
            if (t > r) {
                const localT = (t - r) / (1 - r);
                val += (Math.random() * 2 - 1) * Math.pow(1 - localT, 3) * 0.3;
            }
        }
        
        // 指数衰减
        val *= Math.pow(1 - t, 2);
        
        left[i] = val;
        right[i] = val * (0.95 + Math.random() * 0.1);
    }
    return impulse;
}

// 生成大厅混响 (宽广空间)
export function createHallReverb(ctx: AudioContext, duration: number): AudioBuffer {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const t = i / length;
        // 更长的衰减尾巴
        const envelope = Math.pow(1 - t, 1.5);
        // 添加早期反射
        const earlyReflection = t < 0.1 ? Math.sin(t * 100) * 0.3 : 0;
        
        const noise = (Math.random() * 2 - 1) * envelope;
        left[i] = noise + earlyReflection;
        right[i] = noise * 0.9 + earlyReflection * 0.8;
    }
    return impulse;
}

// 生成洞穴混响 (深沉回响)
export function createCaveReverb(ctx: AudioContext, duration: number): AudioBuffer {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const t = i / length;
        // 非线性衰减 - 更长的尾巴
        const envelope = Math.exp(-t * 2) * (1 - t);
        // 低频增强
        const lowFreqMod = Math.sin(t * Math.PI * 2) * 0.1;
        
        const noise = (Math.random() * 2 - 1) * envelope;
        left[i] = noise + lowFreqMod;
        right[i] = noise - lowFreqMod; // 相位差创造空间感
    }
    return impulse;
}

// 创建失真曲线
export function makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

// 创建软削波曲线 (温和失真)
export function makeSoftClipCurve(amount: number = 2): Float32Array {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    
    for (let i = 0; i < n_samples; i++) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = Math.tanh(x * amount);
    }
    return curve;
}

// 创建位压缩曲线 (Lo-Fi效果)
export function makeBitCrushCurve(bits: number = 4): Float32Array {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const levels = Math.pow(2, bits);
    
    for (let i = 0; i < n_samples; i++) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = Math.round(x * levels) / levels;
    }
    return curve;
}

// 生成白噪音缓冲区
export function createWhiteNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    
    for (let i = 0; i < bufferSize; i++) {
        left[i] = Math.random() * 2 - 1;
        right[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

// 生成粉红噪音缓冲区 (更自然的噪音)
export function createPinkNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
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
    }
    return buffer;
}

// 生成棕色噪音缓冲区 (更低沉的噪音)
export function createBrownNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let lastOut = 0;
        
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = lastOut * 3.5; // 补偿增益
        }
    }
    return buffer;
}

// 频率转换工具
export function noteToFreq(note: number, octave: number = 4): number {
    // A4 = 440Hz, note 0 = C
    return 440 * Math.pow(2, (note - 9 + (octave - 4) * 12) / 12);
}

export function midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

// 时间转换工具
export function bpmToMs(bpm: number, beats: number = 1): number {
    return (60000 / bpm) * beats;
}

export function msToSamples(ms: number, sampleRate: number): number {
    return Math.floor((ms / 1000) * sampleRate);
}