// Ultra-lightweight Web Audio API synthesizer for Ludo events
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Master compressor to keep everything smooth
const masterCompressor = audioCtx.createDynamicsCompressor();
masterCompressor.connect(audioCtx.destination);
masterCompressor.threshold.value = -24;
masterCompressor.knee.value = 30;
masterCompressor.ratio.value = 12;
masterCompressor.attack.value = 0.003;
masterCompressor.release.value = 0.25;

function playSmoothTone(freq, type, duration, vol = 0.1) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  filter.type = 'lowpass';
  filter.frequency.value = 800; // Cut off sharp highs
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime); 
  gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + Math.min(0.08, duration/2)); // much slower attack
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterCompressor);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Function to play a soft percussive noise (for dice)
function playSoftNoise(duration, vol) {
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
  gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(masterCompressor);
  
  noiseSource.start();
}

let bgmStarted = false;
function startBGM() {
  if (bgmStarted) return;
  bgmStarted = true;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // Very soft, breathing ambient drone using pure sine waves
  const freqs = [130.81, 164.81, 196.00]; // C3, E3, G3
  
  const droneGain = audioCtx.createGain();
  droneGain.gain.value = 0.02; // Very quiet overall
  droneGain.connect(masterCompressor);

  // Slow LFO to make the drone "breathe"
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.1; // 10 seconds per cycle
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0.015; // Modulate amplitude
  lfo.connect(droneGain.gain);
  lfo.start();

  freqs.forEach(freq => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine'; // Sine is perfectly smooth, no harshness
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(droneGain);
    osc.start();
  });

  // Soft rhythmic kick (heartbeat style)
  setInterval(() => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    // Pitch envelope for soft kick
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(masterCompressor);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }, 2000); 
}

window.addEventListener('click', startBGM, { once: true });

window.SoundFX = {
  rollDice: () => {
    // Soft wooden rattle (noise)
    for (let i = 0; i < 3; i++) {
      setTimeout(() => playSoftNoise(0.1, 0.4), i * 120);
    }
  },
  moveToken: () => {
    playSmoothTone(350, 'sine', 0.2, 0.1);
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
    playSmoothTone(300, 'sine', 0.4, 0.08);
    setTimeout(() => playSmoothTone(400, 'sine', 0.5, 0.08), 250);
  },
  winGame: () => {
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => playSmoothTone(f, 'sine', 0.8, 0.15), i * 300);
    });
  }
};
