// Web Audio API implementation for generative sound effects

const getAudioContext = () => {
  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) return null;
    return new AudioContextClass();
  } catch (e) {
    console.warn("AudioContext not supported", e);
    return null;
  }
};

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = getAudioContext();
    if (audioCtx) {
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
      masterGain.gain.value = 0.4; // Default volume
    }
  }
  
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(console.warn);
  }
  
  return { ctx: audioCtx, master: masterGain };
};

export const audioService = {
  setVolume: (level: number) => {
    const { master } = initAudio();
    if (master) master.gain.value = level;
  },

  playClick: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(master);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.error("Audio error", e);
    }
  },

  playCardPlace: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;

    try {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      oscGain.gain.setValueAtTime(0.2, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      
      osc.connect(oscGain);
      oscGain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);

      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.1, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start();
    } catch (e) {}
  },

  playError: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;

    try {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  },

  playBurn: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;

    try {
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.4);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      noise.start();
    } catch (e) {}
  },

  playReset: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;

    try {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  },
  
  playVictory: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        const startTime = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        
        osc.connect(gain);
        gain.connect(master);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
      });
    } catch (e) {}
  }
};