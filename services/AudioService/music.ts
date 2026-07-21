/**
 * 程序化音乐生成器
 * 基于音阶和和弦进行的动态背景音乐系统
 */

import { MusicMood } from '../../meta';

/**
 * 音律与音乐常量
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
};

export const ROOT_NOTES = {
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
};


// 和弦进行预设
const CHORD_PROGRESSIONS: Record<MusicMood, number[][]> = {
    calm: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],           // I - IV - V - I
    tense: [[0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 3, 7]],             // dim - dim - dim - sus
    action: [[0, 4, 7], [0, 3, 7], [0, 5, 7], [0, 4, 7]],            // I - i - sus4 - I
    dread: [[0, 3, 6], [0, 3, 6, 9], [1, 4, 7], [0, 3, 6]],          // dim7 progressions
    mystery: [[0, 4, 7, 11], [2, 5, 9], [4, 7, 11], [0, 4, 7]],      // maj7 - ii - iii - I
    triumph: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [12, 16, 19]],     // I - IV - V - I (octave)
    sorrow: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [0, 3, 7]]           // i - iv - III - i
};

// 节奏模式
const RHYTHM_PATTERNS: Record<MusicMood, number[]> = {
    calm: [1, 0, 0.5, 0, 1, 0, 0.5, 0],
    tense: [1, 0.3, 0.5, 0.3, 1, 0.3, 0.5, 0.3],
    action: [1, 1, 0.8, 1, 1, 1, 0.8, 1],
    dread: [1, 0, 0, 0.3, 0, 0, 1, 0],
    mystery: [1, 0, 0.3, 0, 0.5, 0, 0.3, 0],
    triumph: [1, 0.5, 1, 0.5, 1, 0.5, 1, 1],
    sorrow: [1, 0, 0.3, 0, 1, 0, 0.3, 0]
};

export class MusicGenerator {
    private isPlaying: boolean = false;
    private currentMood: MusicMood = 'calm';
    private activeNodes: AudioNode[] = [];
    private schedulerInterval: number | null = null;
    private nextNoteTime: number = 0;
    private currentChordIndex: number = 0;
    private currentBeatIndex: number = 0;

    // 音乐参数
    private tempo: number = 60; // BPM
    private rootNote: number = ROOT_NOTES.A2;
    private scale: number[] = SCALES.minor;

    constructor(
        private ctx: AudioContext,
        private reverbNode: ConvolverNode
    ) { }

    public setMood(mood: MusicMood) {
        if (this.currentMood === mood) return;
        this.currentMood = mood;

        // 根据情绪调整参数
        switch (mood) {
            case 'calm':
                this.tempo = 50;
                this.rootNote = ROOT_NOTES.C3;
                this.scale = SCALES.pentatonic;
                break;
            case 'tense':
                this.tempo = 70;
                this.rootNote = ROOT_NOTES.E2;
                this.scale = SCALES.phrygian;
                break;
            case 'action':
                this.tempo = 120;
                this.rootNote = ROOT_NOTES.A2;
                this.scale = SCALES.minor;
                break;
            case 'dread':
                this.tempo = 40;
                this.rootNote = ROOT_NOTES.D2;
                this.scale = SCALES.locrian;
                break;
            case 'mystery':
                this.tempo = 55;
                this.rootNote = ROOT_NOTES.F3;
                this.scale = SCALES.wholetone;
                break;
            case 'triumph':
                this.tempo = 90;
                this.rootNote = ROOT_NOTES.C4;
                this.scale = SCALES.major;
                break;
            case 'sorrow':
                this.tempo = 45;
                this.rootNote = ROOT_NOTES.A2;
                this.scale = SCALES.minor;
                break;
        }
    }

    public start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime;
        this.scheduler();
    }

    public stop() {
        this.isPlaying = false;
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
        this.activeNodes.forEach(n => {
            try {
                if (n instanceof OscillatorNode) n.stop();
                n.disconnect();
            } catch (e) { }
        });
        this.activeNodes = [];
    }

    private scheduler() {
        const scheduleAheadTime = 0.1; // 提前调度时间
        const lookahead = 25; // 调度间隔 (ms)

        this.schedulerInterval = window.setInterval(() => {
            if (!this.isPlaying) return;

            while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
                this.scheduleNote(this.nextNoteTime);
                this.advanceNote();
            }
        }, lookahead);
    }

    private advanceNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += secondsPerBeat / 2; // 八分音符

        this.currentBeatIndex++;
        if (this.currentBeatIndex >= 8) {
            this.currentBeatIndex = 0;
            this.currentChordIndex++;
            if (this.currentChordIndex >= CHORD_PROGRESSIONS[this.currentMood].length) {
                this.currentChordIndex = 0;
            }
        }
    }

    private scheduleNote(time: number) {
        const rhythm = RHYTHM_PATTERNS[this.currentMood];
        const velocity = rhythm[this.currentBeatIndex];

        if (velocity <= 0) return;

        const chord = CHORD_PROGRESSIONS[this.currentMood][this.currentChordIndex];
        const secondsPerBeat = 60.0 / this.tempo;
        const noteDuration = secondsPerBeat * 0.8;

        // 播放和弦中的每个音符
        chord.forEach((interval, i) => {
            // 计算频率
            const scaleIndex = interval % this.scale.length;
            const octaveShift = Math.floor(interval / this.scale.length);
            const semitones = this.scale[scaleIndex] + octaveShift * 12;
            const freq = this.rootNote * Math.pow(2, semitones / 12);

            // 创建音符
            this.playNote(freq, time + i * 0.02, noteDuration, velocity * 0.08);
        });

        // 偶尔添加旋律音符
        if (Math.random() < 0.3 && this.currentBeatIndex % 2 === 0) {
            const melodyInterval = this.scale[Math.floor(Math.random() * this.scale.length)];
            const melodyOctave = 1 + Math.floor(Math.random() * 2);
            const melodyFreq = this.rootNote * Math.pow(2, (melodyInterval + melodyOctave * 12) / 12);
            this.playNote(melodyFreq, time, noteDuration * 0.5, velocity * 0.05, 'triangle');
        }
    }

    private playNote(
        freq: number,
        time: number,
        duration: number,
        volume: number,
        waveform: OscillatorType = 'sine'
    ) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = waveform;
        osc.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.value = 1500;
        filter.Q.value = 1;

        // ADSR 包络
        const attack = 0.05;
        const decay = 0.1;
        const sustain = 0.6;
        const release = duration * 0.3;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + attack);
        gain.gain.linearRampToValueAtTime(volume * sustain, time + attack + decay);
        gain.gain.setValueAtTime(volume * sustain, time + duration - release);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverbNode);

        osc.start(time);
        osc.stop(time + duration + 0.1);

        // 不追踪这些短暂的音符节点，让它们自然结束
    }

    public setTempo(bpm: number) {
        this.tempo = Math.max(30, Math.min(200, bpm));
    }

    public setRootNote(freq: number) {
        this.rootNote = freq;
    }

    public setScale(scale: number[]) {
        this.scale = scale;
    }

    public isActive(): boolean {
        return this.isPlaying;
    }
}
