// Ultra-lightweight Web Audio API synthesizer for Ludo and Monopoly events
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

window.AudioSettings = {
  master: 0.8,
  dice: 0.9,
  fanfare: 0.75,
  muted: false,
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('game_audio_settings') || '{}');
      if (saved.master !== undefined) this.master = Math.max(0, Math.min(1, saved.master / 100));
      if (saved.dice !== undefined) this.dice = Math.max(0, Math.min(1, saved.dice / 100));
      if (saved.fanfare !== undefined) this.fanfare = Math.max(0, Math.min(1, saved.fanfare / 100));
      if (saved.muted !== undefined) this.muted = !!saved.muted;
    } catch(e) {}
  }
};
window.AudioSettings.load();

// Master compressor to keep everything smooth
const masterCompressor = audioCtx.createDynamicsCompressor();
masterCompressor.connect(audioCtx.destination);
masterCompressor.threshold.value = -24;
masterCompressor.knee.value = 30;
masterCompressor.ratio.value = 12;
masterCompressor.attack.value = 0.003;
masterCompressor.release.value = 0.25;

function playSmoothTone(freq, type, duration, vol = 0.1, category = 'fanfare') {
  if (window.AudioSettings.muted) return;
  const factor = window.AudioSettings.master * (category === 'dice' ? window.AudioSettings.dice : window.AudioSettings.fanfare);
  const effectiveVol = vol * factor;
  if (effectiveVol <= 0.0001) return;

  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  filter.type = 'lowpass';
  filter.frequency.value = 800; // Cut off sharp highs
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime); 
  gain.gain.linearRampToValueAtTime(effectiveVol, audioCtx.currentTime + Math.min(0.08, duration/2));
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterCompressor);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Function to play a soft percussive noise (for dice)
function playSoftNoise(duration, vol, category = 'dice') {
  if (window.AudioSettings.muted) return;
  const factor = window.AudioSettings.master * (category === 'dice' ? window.AudioSettings.dice : window.AudioSettings.fanfare);
  const effectiveVol = vol * factor;
  if (effectiveVol <= 0.0001) return;

  if (audioCtx.state === 'suspended') audioCtx.resume();
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400; // Low, hollow wooden sound
  filter.Q.value = 1.5;
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(effectiveVol, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(masterCompressor);
  
  noiseSource.start();
}

// Function to play a crisp percussive clack for tumbling dice
function playDiceClack(pitch = 380, vol = 0.4) {
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    // 1. Resonant wooden body tone
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.05);

    oscGain.gain.setValueAtTime(vol * 0.75, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(oscGain);
    oscGain.connect(masterCompressor);
    osc.start(now);
    osc.stop(now + 0.055);

    // 2. High crisp transient clack
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.04);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pitch * 2.8, now);
    filter.Q.value = 1.8;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterCompressor);

    noise.start(now);
    noise.stop(now + 0.05);
  } catch (e) {}
}

const unlockAudio = () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
};
window.addEventListener('click', unlockAudio, { passive: true });
window.addEventListener('touchstart', unlockAudio, { passive: true });
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio, { passive: true });

window.SoundFX = {
  rollDice: () => {
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      const delays = [0, 50, 110, 180, 260, 350, 450];
      delays.forEach((delay, idx) => {
        setTimeout(() => {
          const vol = 0.52 - (idx * 0.035);
          const pitch = 320 + Math.random() * 260;
          playDiceClack(pitch, Math.max(0.22, vol));
        }, delay);
      });
    } catch (e) {}
  },
  hop: () => {
    // Soft, subtle wooden token landing clack (volume reduced)
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.045, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(masterCompressor);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) {}
  },
  cash: () => {
    // Crisp coins / transaction chime
    try {
      playSmoothTone(987.77, 'sine', 0.12, 0.2); // B5
      setTimeout(() => playSmoothTone(1318.51, 'sine', 0.22, 0.22), 80); // E6
    } catch (e) {}
  },
  jail: () => {
    // Heavy jail cell bar clang
    try {
      playSmoothTone(120, 'sawtooth', 0.45, 0.3);
      setTimeout(() => playSmoothTone(85, 'sawtooth', 0.55, 0.35), 140);
    } catch (e) {}
  },
  card: () => {
    // Card draw flutter
    try {
      playSmoothTone(587.33, 'triangle', 0.1, 0.15);
      setTimeout(() => playSmoothTone(880, 'triangle', 0.16, 0.18), 70);
    } catch (e) {}
  },
  moveToken: () => {
    // Gentle soft moving tap (volume reduced)
    playSmoothTone(350, 'sine', 0.14, 0.025);
  },
  captureToken: () => {
    playSmoothTone(200, 'sine', 0.3, 0.15);
    setTimeout(() => playSmoothTone(150, 'sine', 0.4, 0.15), 150);
  },
  homeToken: () => {
    playSmoothTone(523.25, 'sine', 0.5, 0.1);
    setTimeout(() => playSmoothTone(659.25, 'sine', 0.5, 0.1), 200);
    setTimeout(() => playSmoothTone(783.99, 'sine', 0.8, 0.15), 400);
  },
  turnChange: () => {
    // Silenced: turn change beep removed as requested
  },
  winGame: () => {
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => playSmoothTone(f, 'sine', 0.8, 0.15), i * 300);
    });
  }
};
