/**
 * 音效生成器
 * 大幅增强版 - 支持更多音效类型和程序化生成
 */
import { SfxType } from '../../meta';
import { makeDistortionCurve, makeSoftClipCurve } from './context';

export class SfxGenerator {
    constructor(
        private ctx: AudioContext,
        private masterGain: GainNode,
        private reverbNode: ConvolverNode
    ) { }

    public play(type: SfxType) {
        const t = this.ctx.currentTime;

        // 决定是否使用混响
        // UI 类音效通常是干声，环境/战斗音效需要混响
        const dryTypes: SfxType[] = [
            'click', 'hover', 'text', 'typing', 'notification',
            'ui_open', 'ui_close', 'heartbeat', 'item_pickup',
            'card_draw', 'card_discard', 'card_shuffle', 'card_hover'
        ];
        const dest = dryTypes.includes(type) ? this.masterGain : this.reverbNode;

        switch (type) {
            // === UI 音效 ===
            case 'hover': this.playHover(t, dest); break;
            case 'click': this.playClick(t, dest); break;
            case 'text': this.playText(t, dest); break;
            case 'typing': this.playTyping(t, dest); break; // New
            case 'ui_open': this.playUiOpen(t, dest); break; // New
            case 'ui_close': this.playUiClose(t, dest); break; // New
            case 'success': this.playSuccess(t); break;
            case 'error': this.playError(t, dest); break;
            case 'notification': this.playNotification(t, dest); break;

            // === 卡牌音效 (New) ===
            case 'card_draw': this.playCardDraw(t, dest); break;
            case 'card_discard': this.playCardDiscard(t, dest); break;
            case 'card_shuffle': this.playCardShuffle(t, dest); break;
            case 'card_hover': this.playCardHover(t, dest); break;

            // === 战斗音效 (Enhanced) ===
            case 'combat_hit': this.playCombatHit(t, dest); break;
            case 'combat_dmg': this.playCombatDmg(t, dest); break;
            case 'combat_miss': this.playCombatMiss(t, dest); break;
            case 'combat_crit': this.playCombatCrit(t, dest); break;
            case 'combat_block': this.playCombatBlock(t, dest); break;
            case 'combat_heal': this.playCombatHeal(t); break;
            case 'combat_buff': this.playCombatBuff(t); break;
            case 'combat_debuff': this.playCombatDebuff(t, dest); break;

            // === 环境音效 (Enhanced) ===
            case 'footstep': this.playFootstep(t, dest); break;
            case 'door_open': this.playDoorOpen(t, dest); break;
            case 'door_close': this.playDoorClose(t, dest); break;
            case 'door_locked': this.playDoorLocked(t, dest); break;
            case 'item_pickup': this.playItemPickup(t, dest); break;
            case 'item_drop': this.playItemDrop(t, dest); break;
            case 'item_use': this.playItemUse(t, dest); break;
            case 'search': this.playSearch(t, dest); break;

            // === 恐怖音效 ===
            case 'heartbeat': this.playHeartbeat(t, dest); break;
            case 'scare': this.playScare(t); break;
            case 'glitch': this.playGlitch(t, dest); break;
            case 'whisper': this.playWhisper(t); break;
            case 'scream': this.playScream(t); break;
            case 'breathing': this.playBreathing(t, dest); break;
            case 'static': this.playStatic(t, dest); break;
            case 'distortion': this.playDistortion(t, dest); break;

            // === 机械音效 ===
            case 'scan': this.playScan(t); break;
            case 'power_up': this.playPowerUp(t, dest); break;
            case 'power_down': this.playPowerDown(t, dest); break;
            case 'malfunction': this.playMalfunction(t, dest); break;
            case 'radio': this.playRadio(t, dest); break;

            // === 状态音效 ===
            case 'die': this.playDie(t, dest); break;
            case 'level_up': this.playLevelUp(t); break;
            case 'sanity_low': this.playSanityLow(t, dest); break;
            case 'sanity_restore': this.playSanityRestore(t); break;

            // === 特殊音效 ===
            case 'puzzle_solve': this.playPuzzleSolve(t); break;
            case 'puzzle_fail': this.playPuzzleFail(t, dest); break;
            case 'npc_join': this.playNpcJoin(t); break;
            case 'npc_leave': this.playNpcLeave(t, dest); break;
            case 'quest_complete': this.playQuestComplete(t); break;
            case 'zone_enter': this.playZoneEnter(t); break;
            case 'ambient_event': this.playAmbientEvent(t, dest); break;
        }
    }

    // === UI 音效实现 ===

    private playHover(t: number, dest: AudioNode) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        // High frequency chirps
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(1800, t + 0.04);
        gain.gain.setValueAtTime(0.02, t); // Lower volume
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.04);
    }

    private playClick(t: number, dest: AudioNode) {
        // Layer 1: Body (Low impact)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.frequency.setValueAtTime(180, t);
        osc1.frequency.exponentialRampToValueAtTime(0.01, t + 0.1);
        gain1.gain.setValueAtTime(0.15, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc1.connect(gain1);
        gain1.connect(dest);
        osc1.start(t);
        osc1.stop(t + 0.1);

        // Layer 2: Click (High frequency transient)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(2500, t);
        gain2.gain.setValueAtTime(0.03, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
        osc2.connect(gain2);
        gain2.connect(dest);
        osc2.start(t);
        osc2.stop(t + 0.02);
    }

    private playText(t: number, dest: AudioNode) {
        // Generic blip
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800 + Math.random() * 200, t); // Slight randomization
        gain.gain.setValueAtTime(0.015, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.03);
    }

    private playTyping(t: number, dest: AudioNode) {
        // Mechanical keyboard sound simulation
        // Short, high pitched click + low thud
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        clickOsc.type = 'triangle';
        const freq = 2000 + Math.random() * 1000; // Variance for different keys
        clickOsc.frequency.setValueAtTime(freq, t);
        clickGain.gain.setValueAtTime(0.03, t);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

        const thudOsc = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thudOsc.type = 'sine';
        thudOsc.frequency.setValueAtTime(300, t);
        thudOsc.frequency.exponentialRampToValueAtTime(50, t + 0.05);
        thudGain.gain.setValueAtTime(0.05, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        clickOsc.connect(clickGain);
        thudOsc.connect(thudGain);
        clickGain.connect(dest);
        thudGain.connect(dest);

        clickOsc.start(t);
        clickOsc.stop(t + 0.03);
        thudOsc.start(t);
        thudOsc.stop(t + 0.06);
    }

    private playUiOpen(t: number, dest: AudioNode) {
        // Sci-fi Swoosh Up
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.3);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 5;
        filter.frequency.setValueAtTime(200, t);
        filter.frequency.exponentialRampToValueAtTime(3000, t + 0.25);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
    }

    private playUiClose(t: number, dest: AudioNode) {
        // Sci-fi Swoosh Down
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.3);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 5;
        filter.frequency.setValueAtTime(3000, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.25);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
    }

    private playSuccess(t: number) {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            const startTime = t + (i * 0.04);
            osc.frequency.setValueAtTime(f, startTime);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0, startTime);
            g.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
            osc.connect(g);
            g.connect(this.reverbNode);
            osc.start(startTime);
            osc.stop(startTime + 0.6);
        });
    }

    private playError(t: number, dest: AudioNode) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t); // Lower pitch
        osc.frequency.linearRampToValueAtTime(80, t + 0.3);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    private playNotification(t: number, dest: AudioNode) {
        [880, 1100].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0, t + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.08, t + i * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.2);
        });
    }

    // === 卡牌音效实现 ===

    private playCardDraw(t: number, dest: AudioNode) {
        // Friction slide: White noise with sweeping bandpass
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.15);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1;
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.linearRampToValueAtTime(2000, t + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
    }

    private playCardDiscard(t: number, dest: AudioNode) {
        // Quick flip: Short high freq sweep
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.1);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
    }

    private playCardShuffle(t: number, dest: AudioNode) {
        // Rapid sequence of draws
        for (let i = 0; i < 6; i++) {
            const start = t + i * 0.04;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.08);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 800 + Math.random() * 500;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.1, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(dest);
            noise.start(start);
        }
    }

    private playCardHover(t: number, dest: AudioNode) {
        // Very subtle high tick
        const osc = this.ctx.createOscillator();
        osc.frequency.value = 3000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.01);
    }

    // === 战斗音效实现 (Enhanced) ===

    private playCombatHit(t: number, dest: AudioNode) {
        // Layer 1: Body (Low Sine Drop)
        const osc = this.ctx.createOscillator();
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        // Layer 2: Crunch (Filtered Noise)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.15);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(oscGain);
        oscGain.connect(dest);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(dest);

        osc.start(t);
        noise.start(t);
        osc.stop(t + 0.2);
    }

    private playCombatDmg(t: number, dest: AudioNode) {
        // More visceral damage sound
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.linearRampToValueAtTime(30, t + 0.4); // Slower drop

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        const shaper = this.ctx.createWaveShaper();
        (shaper as any).curve = makeDistortionCurve(600); // Heavier distortion

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        osc.connect(shaper);
        shaper.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.4);
    }

    private playCombatMiss(t: number, dest: AudioNode) {
        // Fast whoosh
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.15);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.linearRampToValueAtTime(2000, t + 0.1);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
    }

    private playCombatCrit(t: number, dest: AudioNode) {
        // Heavy Hit + Metallic Ring
        this.playCombatHit(t, dest); // Base hit

        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, t); // High pitch ring
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    private playCombatBlock(t: number, dest: AudioNode) {
        // Metal clang
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle'; // Triangle for metallic tone
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(380, t + 0.2); // Slight detune

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 10; // High resonance

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    private playCombatHeal(t: number) {
        const notes = [392, 523.25, 659.25];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = f;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.12, t + i * 0.08 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.5);
            osc.connect(gain);
            gain.connect(this.reverbNode);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.5);
        });
    }

    private playCombatBuff(t: number) {
        // Rising power sound
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.4);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.linearRampToValueAtTime(2000, t + 0.4);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverbNode);
        osc.start(t);
        osc.stop(t + 0.5);
    }

    private playCombatDebuff(t: number, dest: AudioNode) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.4);
    }

    // === 环境音效实现 (Enhanced) ===

    private playFootstep(t: number, dest: AudioNode) {
        // Randomize pitch to simulate different steps
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.08);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        // Random filter frequency for surface variation
        filter.frequency.value = 600 + Math.random() * 400;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
    }

    private playDoorOpen(t: number, dest: AudioNode) {
        // Creak
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(300, t + 0.5);
        osc.frequency.linearRampToValueAtTime(150, t + 0.8);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 500;
        filter.Q.value = 5;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.8);
    }

    private playDoorClose(t: number, dest: AudioNode) {
        // Slam
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
    }

    private playDoorLocked(t: number, dest: AudioNode) {
        // Rattle
        [0, 0.1, 0.2].forEach(delay => {
            const osc = this.ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = 150;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.15, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.05);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(t + delay);
            osc.stop(t + delay + 0.05);
        });
    }

    private playItemPickup(t: number, dest: AudioNode) {
        // High ping/shine
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    private playItemDrop(t: number, dest: AudioNode) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.15);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
    }

    private playItemUse(t: number, dest: AudioNode) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.1);
        osc.frequency.linearRampToValueAtTime(500, t + 0.2);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.25);
    }

    private playSearch(t: number, dest: AudioNode) {
        // Rhythmic Rummaging
        for (let i = 0; i < 3; i++) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.2);
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1000 + Math.random() * 500;
            filter.Q.value = 2;
            const gain = this.ctx.createGain();
            const start = t + i * 0.15;
            gain.gain.setValueAtTime(0.1, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(dest);
            noise.start(start);
        }
    }

    // === 恐怖音效实现 ===

    private playHeartbeat(t: number, dest: AudioNode) {
        // Deeper thud
        // Lub
        const osc1 = this.ctx.createOscillator();
        osc1.frequency.setValueAtTime(60, t);
        osc1.frequency.exponentialRampToValueAtTime(10, t + 0.12);
        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.8, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 100;
        osc1.connect(filter);
        filter.connect(gain1);
        gain1.connect(dest);
        osc1.start(t);
        osc1.stop(t + 0.15);

        // Dub
        const osc2 = this.ctx.createOscillator();
        osc2.frequency.setValueAtTime(50, t + 0.25);
        osc2.frequency.exponentialRampToValueAtTime(10, t + 0.35);
        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.4, t + 0.25);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc2.connect(filter);
        filter.connect(gain2);
        gain2.connect(dest);
        osc2.start(t + 0.25);
        osc2.stop(t + 0.4);
    }

    private playScare(t: number) {
        // Dissonant cluster with pan movement
        const freqs = [300, 300 * 1.45, 600, 900 * 0.9];
        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
            osc.frequency.setValueAtTime(f, t);
            osc.frequency.linearRampToValueAtTime(f * 0.6, t + 1.0); // Pitch drop
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.15, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            const pan = this.ctx.createStereoPanner();
            pan.pan.value = Math.random() * 1.6 - 0.8;
            osc.connect(g);
            g.connect(pan);
            pan.connect(this.reverbNode);
            osc.start(t);
            osc.stop(t + 1.5);
        });
    }

    private playGlitch(t: number, dest: AudioNode) {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const start = t + (Math.random() * 0.2);
            const dur = 0.02 + Math.random() * 0.06;
            const osc = this.ctx.createOscillator();
            osc.type = Math.random() > 0.5 ? 'sawtooth' : 'square';
            osc.frequency.value = 100 + Math.random() * 3000;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.2, start);
            g.gain.exponentialRampToValueAtTime(0.01, start + dur);
            osc.connect(g);
            g.connect(dest);
            osc.start(start);
            osc.stop(start + dur);
        }
    }

    private playWhisper(t: number) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(1.5);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 3;
        // Modulate filter for speech-like quality
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 3 + Math.random() * 4;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 500;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.2);
        gain.gain.setValueAtTime(0.08, t + 1.0);
        gain.gain.linearRampToValueAtTime(0, t + 1.5);
        const pan = this.ctx.createStereoPanner();
        pan.pan.value = Math.random() * 2 - 1;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(pan);
        pan.connect(this.reverbNode);
        noise.start(t);
        lfo.start(t);
        lfo.stop(t + 1.5);
    }

    private playScream(t: number) {
        [400, 800, 1200, 1600].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, t);
            osc.frequency.linearRampToValueAtTime(f * 1.5, t + 0.1);
            osc.frequency.linearRampToValueAtTime(f * 0.5, t + 1.0);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.2 - i * 0.03, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
            const shaper = this.ctx.createWaveShaper();
            (shaper as any).curve = makeSoftClipCurve(3);
            osc.connect(shaper);
            shaper.connect(gain);
            gain.connect(this.reverbNode);
            osc.start(t);
            osc.stop(t + 1.0);
        });
    }

    private playBreathing(t: number, dest: AudioNode) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(2);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 2;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.3; // ~18 bpm
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.15;
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
        lfo.start(t);
        lfo.stop(t + 2);
    }

    private playStatic(t: number, dest: AudioNode) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.5);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.1);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
    }

    private playDistortion(t: number, dest: AudioNode) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50 + Math.random() * 100, t);
        const shaper = this.ctx.createWaveShaper();
        (shaper as any).curve = makeDistortionCurve(800);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.connect(shaper);
        shaper.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.8);
    }

    // === 机械音效 ===

    private playScan(t: number) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.linearRampToValueAtTime(2000, t + 1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 1);
        osc.connect(gain);
        gain.connect(this.reverbNode);
        osc.start(t);
        osc.stop(t + 1);
    }

    private playPowerUp(t: number, dest: AudioNode) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.5);
        osc.frequency.setValueAtTime(200, t + 0.5);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, t);
        filter.frequency.exponentialRampToValueAtTime(2000, t + 0.5);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.setValueAtTime(0.2, t + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 1);
    }

    private playPowerDown(t: number, dest: AudioNode) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 1.5);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, t);
        filter.frequency.exponentialRampToValueAtTime(50, t + 1.5);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 1.5);
    }

    private playMalfunction(t: number, dest: AudioNode) {
        for (let i = 0; i < 8; i++) {
            const start = t + Math.random() * 0.5;
            const osc = this.ctx.createOscillator();
            osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
            osc.frequency.value = 50 + Math.random() * 500;
            const gain = this.ctx.createGain();
            const dur = 0.02 + Math.random() * 0.08;
            gain.gain.setValueAtTime(0.15, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(start);
            osc.stop(start + dur);
        }
    }

    private playRadio(t: number, dest: AudioNode) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(1);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        filter.Q.value = 3;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.3);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);

        if (Math.random() > 0.5) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 400 + Math.random() * 200;
            const oscGain = this.ctx.createGain();
            oscGain.gain.setValueAtTime(0.05, t + 0.2);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.connect(oscGain);
            oscGain.connect(dest);
            osc.start(t + 0.2);
            osc.stop(t + 0.5);
        }
    }

    // === 状态音效 ===

    private playDie(t: number, dest: AudioNode) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 2.0);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 30;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 2.0);
        lfo.start(t);
        lfo.stop(t + 2.0);
    }

    private playLevelUp(t: number) {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            const start = t + i * 0.06;
            osc.frequency.value = f;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
            osc.connect(gain);
            gain.connect(this.reverbNode);
            osc.start(start);
            osc.stop(start + 0.8);
        });
    }

    private playSanityLow(t: number, dest: AudioNode) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 4000 + Math.random() * 2000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 2);
    }

    private playSanityRestore(t: number) {
        const notes = [392, 440, 523.25];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = f;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.1, t + i * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.6);
            osc.connect(gain);
            gain.connect(this.reverbNode);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.6);
        });
    }

    // === 特殊音效 ===

    private playPuzzleSolve(t: number) {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = f;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.5);
            osc.connect(gain);
            gain.connect(this.reverbNode);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.5);
        });
    }

    private playPuzzleFail(t: number, dest: AudioNode) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.linearRampToValueAtTime(80, t + 0.5);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.5);
    }

    private playNpcJoin(t: number) {
        const notes = [392, 523.25, 659.25];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = f;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.1, t + i * 0.12 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
            osc.connect(gain);
            gain.connect(this.reverbNode);
            osc.start(t + i * 0.12);
            osc.stop(t + i * 0.12 + 0.4);
        });
    }

    private playNpcLeave(t: number, dest: AudioNode) {
        const notes = [659.25, 523.25, 392];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = f;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.08, t + i * 0.12 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(t + i * 0.12);
            osc.stop(t + i * 0.12 + 0.4);
        });
    }

    private playQuestComplete(t: number) {
        const notes = [392, 440, 523.25, 659.25, 783.99];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = f;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.12, t + i * 0.08 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.7);
            osc.connect(gain);
            gain.connect(this.reverbNode);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.7);
        });
    }

    private playZoneEnter(t: number) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 40;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2);
        osc.connect(gain);
        gain.connect(this.reverbNode);
        osc.start(t);
        osc.stop(t + 2);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(800, t + 0.5);
        osc2.frequency.exponentialRampToValueAtTime(400, t + 1.5);
        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0, t + 0.5);
        gain2.gain.linearRampToValueAtTime(0.08, t + 0.7);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        osc2.connect(gain2);
        gain2.connect(this.reverbNode);
        osc2.start(t + 0.5);
        osc2.stop(t + 1.5);
    }

    private playAmbientEvent(t: number, dest: AudioNode) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.5);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 500 + Math.random() * 1000;
        filter.Q.value = 2;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        noise.start(t);
    }

    // === 工具方法 ===

    private createNoiseBuffer(duration: number): AudioBuffer {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }
}
