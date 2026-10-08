// Ultra-lightweight Web Audio API synthesizer for Ludo events
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol = 0.1) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

window.SoundFX = {
  rollDice: () => {
    // Quick rattling sound
    for (let i = 0; i < 3; i++) {
      setTimeout(() => playTone(600 + Math.random()*400, 'square', 0.1, 0.05), i * 80);
    }
  },
  moveToken: () => {
    // Short pop
    playTone(400, 'sine', 0.1, 0.1);
  },
  captureToken: () => {
    // Aggressive zap
    playTone(150, 'sawtooth', 0.3, 0.2);
    setTimeout(() => playTone(100, 'sawtooth', 0.3, 0.2), 100);
  },
  homeToken: () => {
    // Happy chime
    playTone(523.25, 'sine', 0.2, 0.1); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.2, 0.1), 100); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.4, 0.1), 200); // G5
  },
  turnChange: () => {
    // Soft notification
    playTone(300, 'triangle', 0.2, 0.05);
    setTimeout(() => playTone(450, 'triangle', 0.2, 0.05), 150);
  },
  winGame: () => {
    // Victory fanfare
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => playTone(f, 'square', 0.3, 0.1), i * 150);
    });
  }
};
