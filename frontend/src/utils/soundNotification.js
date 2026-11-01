/**
 * Web Audio API-based synthesized notification chimes.
 * Works seamlessly across all modern browsers without external audio asset downloads.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a high-priority, attention-grabbing chime for a new Emergency Incident request.
 * Tone: Modern two-tone alert chime (E5 -> G#5 -> B5, chime with soft exponential decay).
 */
export function playNewIncidentSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Primary resonant tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(830.61, now + 0.12); // G#5
    osc1.frequency.setValueAtTime(987.77, now + 0.22); // B5

    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.65);

    // Warm undertone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(329.63, now); // E4
    osc2.frequency.setValueAtTime(493.88, now + 0.22); // B4

    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn('Audio notification error:', err);
  }
}

/**
 * Play an urgent, clinical chime for an ESI Review / Physician Override request.
 * Tone: Crisp ascending triplet alert (A5 -> C#6 -> E6).
 */
export function playOverrideRequestSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const notes = [
      { freq: 880.0, time: 0.0, dur: 0.14 },    // A5
      { freq: 1108.73, time: 0.12, dur: 0.14 },  // C#6
      { freq: 1318.51, time: 0.24, dur: 0.35 },  // E6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.28, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch (err) {
    console.warn('Audio override notification error:', err);
  }
}

