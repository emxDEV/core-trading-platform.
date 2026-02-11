/**
 * Tactical Sound Engine v3.0 - Minimalism Edition
 * Redesigned for ultra-subtle "pop" and "tick" feedback.
 * Zero annoyance, maximum clarity.
 */

class SoundEngine {
    constructor() {
        this.context = null;
        this.enabled = true;
        this.volume = 0.5; // Default 50%
    }

    init() {
        if (!this.context) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext({ latencyHint: 'interactive' });
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    setVolume(volume) {
        this.volume = volume;
    }

    /**
     * Essential Pop: A very short sine impulse
     */
    playPop(freq = 400, volume = 0.05, decay = 0.05) {
        if (!this.enabled) return;

        // Ensure context exists
        if (!this.context) this.init();

        // Resume if suspended (browser auto-suspends contexts)
        if (this.context.state === 'suspended') {
            this.context.resume().catch(() => { });
        }

        try {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            const now = this.context.currentTime;

            const finalVolume = volume * this.volume;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            // Subtle pitch drop for the "pop" feel
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq * 0.5), now + decay);

            // Faster attack for zero-perceived-latency (2ms)
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(finalVolume, now + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

            osc.connect(gain);
            gain.connect(this.context.destination);

            osc.start(now);
            osc.stop(now + decay + 0.05);

            // Clean up nodes after playing to prevent memory leaks in long sessions
            setTimeout(() => {
                osc.disconnect();
                gain.disconnect();
            }, (decay + 0.1) * 1000);

        } catch (e) {
            // Silently fail if audio system is unhappy (rare)
        }
    }

    playSuccess() {
        // Double soft plink
        this.playPop(600, 0.04, 0.1);
        setTimeout(() => this.playPop(800, 0.03, 0.1), 50);
    }

    playError() {
        // Muffled low thud
        this.playPop(150, 0.1, 0.2);
    }

    playNotification() {
        // Soft bubble pop
        this.playPop(500, 0.05, 0.15);
    }

    playClick() {
        // Tiny structural tick
        this.playPop(1200, 0.02, 0.03);
    }

    playTransition() {
        // Very airy slide
        this.playPop(300, 0.02, 0.2);
    }
}

export const soundEngine = new SoundEngine();
