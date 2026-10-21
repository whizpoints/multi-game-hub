/* ═══════════════════════════════════════════════════════════════════════════
   LUDO · client.js  —  Full-featured vanilla JS game client
   ═══════════════════════════════════════════════════════════════════════════ */

let persistentId = localStorage.getItem('ludoPlayerId');
if (!persistentId) {
  persistentId = 'p_' + crypto.randomUUID();
  localStorage.setItem('ludoPlayerId', persistentId);
}
let myColors = []; 
let myName  = null;
let myDbId  = null;

let boardConfig      = null;   
let currentGameState  = null;   

let cachedShareUrl = window.location.href;

async function initServerNetworkInfo() {
  try {
    const res = await fetch('/api/server-info');
    if (res.ok) {
      const info = await res.json();
      if (info.primaryIp && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        cachedShareUrl = `http://${info.primaryIp}:${info.port || 3000}/play`;
      }
    }
  } catch (e) {
    console.warn('Could not fetch server-info', e);
  }
  const shareInput = $('share-url');
  if (shareInput) shareInput.value = cachedShareUrl;
}

function getShareUrl() {
  return cachedShareUrl || window.location.href;
}

initServerNetworkInfo();

document.addEventListener('DOMContentLoaded', () => {
  initServerNetworkInfo();
  const copyBtn = $('copy-link-btn');
  const shareInput = $('share-url');
  if (copyBtn && shareInput) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(shareInput.value).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
      }).catch(() => {
        shareInput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
      });
    });
  }
});

const socket = io();

socket.on('playSound', name => {
  if (window.SoundFX && window.SoundFX[name]) {
    window.SoundFX[name]();
  }
});

socket.on('connect', () => {
  if (myName) {
    socket.emit('identify', { persistentId, name: myName, dbId: myDbId });
  }
});

socket.on('identityUpdated', (newId) => {
  persistentId = newId;
});

// 8 Completely distinct, high-contrast vibrant color palettes
const COLORS = {
  Red:    { fill: '#ef4444', dark: '#b91c1c', glow: 'rgba(239,68,68,0.6)', label: 'Crimson' },
  Green:  { fill: '#10b981', dark: '#047857', glow: 'rgba(16,185,129,0.6)', label: 'Emerald' },
  Blue:   { fill: '#2563eb', dark: '#1d4ed8', glow: 'rgba(37,99,235,0.6)', label: 'Sapphire' },
  Yellow: { fill: '#eab308', dark: '#a16207', glow: 'rgba(234,179,8,0.6)', label: 'Gold' },
  Purple: { fill: '#8b5cf6', dark: '#6d28d9', glow: 'rgba(139,92,246,0.6)', label: 'Amethyst' },
  Orange: { fill: '#f97316', dark: '#c2410c', glow: 'rgba(249,115,22,0.6)', label: 'Blaze' },
  Cyan:   { fill: '#06b6d4', dark: '#0e7490', glow: 'rgba(6,182,212,0.6)', label: 'Turquoise' },
  Pink:   { fill: '#ec4899', dark: '#be185d', glow: 'rgba(236,72,153,0.6)', label: 'Magenta' }
};

const $ = id => document.getElementById(id);
const screens = { auth: $('auth-screen'), lobby: $('lobby-screen'), game: $('game-screen') };

function showScreen(name) {
  Object.values(screens).forEach(s => { if (s) s.classList.add('hidden'); });
  if (screens[name]) screens[name].classList.remove('hidden');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function toast(text, icon = 'info') {
  Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true })
    .fire({ icon, title: text });
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════════════════════
async function loadPlayersList() {
  try {
    const res = await fetch('/api/players');
    const players = await res.json();
    const select = $('player-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Select an account --</option><option value="NEW_PLAYER">➕ + Add New Player</option>';
    players.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      select.appendChild(opt);
    });
  } catch {}
}

$('player-select').addEventListener('change', (e) => {
  const val = e.target.value;
  const nameField = $('player-name-field');
  const pinField = $('player-pin-field');
  const nameInput = $('player-name-input');
  const pinInput = $('player-pin-input');
  const regBtn = $('register-btn');
  const loginBtn = $('login-btn');

  if (val === 'NEW_PLAYER') {
    if (nameField) nameField.classList.remove('hidden');
    if (pinField) pinField.classList.remove('hidden');
    nameInput.classList.remove('hidden');
    pinInput.classList.remove('hidden');
    regBtn.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    nameInput.value = '';
    pinInput.value = '';
    nameInput.focus();
  } else if (val) {
    if (nameField) nameField.classList.add('hidden');
    if (pinField) pinField.classList.remove('hidden');
    nameInput.classList.add('hidden');
    pinInput.classList.remove('hidden');
    loginBtn.classList.remove('hidden');
    regBtn.classList.add('hidden');
    pinInput.value = '';
    pinInput.focus();
  } else {
    if (nameField) nameField.classList.add('hidden');
    if (pinField) pinField.classList.add('hidden');
    nameInput.classList.add('hidden');
    pinInput.classList.add('hidden');
    loginBtn.classList.add('hidden');
    regBtn.classList.add('hidden');
  }
});

// Smooth keyboard flow
$('player-name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('player-pin-input').focus();
  }
});

$('player-pin-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (!$('login-btn').classList.contains('hidden')) {
      $('login-btn').click();
    } else if (!$('register-btn').classList.contains('hidden')) {
      $('register-btn').click();
    }
  }
});

$('register-btn').addEventListener('click', async () => {
  const name = $('player-name-input').value.trim();
  const pin = $('player-pin-input').value.trim();
  if (!name || !pin) return toast('Please enter a name and PIN', 'warning');
  try {
    const res = await fetch('/api/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, pin })
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error || 'Registration failed', 'error');
    myName = data.name;
    myDbId = data.id;
    persistentId = 'db_' + data.id;
    localStorage.setItem('ludoPlayerId', persistentId);
    localStorage.setItem('ludoName', myName);
    localStorage.setItem('ludoDbId', myDbId);
    socket.emit('identify', { persistentId, name: myName, dbId: myDbId });
    showScreen('lobby');
    $('share-url').value = getShareUrl();
  } catch { toast('Server error', 'error'); }
});

$('login-btn').addEventListener('click', async () => {
  const name = $('player-select').value === 'NEW_PLAYER' ? $('player-name-input').value.trim() : $('player-select').value;
  const pin = $('player-pin-input').value.trim();
  if (!name || !pin) return toast('Please enter a name and PIN', 'warning');
  try {
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, pin })
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error || 'Login failed', 'error');
    myName = data.name;
    myDbId = data.id;
    persistentId = 'db_' + data.id;
    localStorage.setItem('ludoPlayerId', persistentId);
    localStorage.setItem('ludoName', myName);
    localStorage.setItem('ludoDbId', myDbId);
    $('auth-stats').classList.remove('hidden');
    $('stat-wins').textContent  = data.wins ?? 0;
    $('stat-games').textContent = data.gamesPlayed ?? 0;
    socket.emit('identify', { persistentId, name: myName, dbId: myDbId });
    showScreen('lobby');
    $('share-url').value = getShareUrl();
  } catch { toast('Server error', 'error'); }
});

$('toggle-leaderboard-btn').addEventListener('click', async () => {
  const section = $('leaderboard-section');
  if (section.classList.contains('hidden')) {
    section.classList.remove('hidden');
    try {
      const res = await fetch('/api/players');
      const players = await res.json();
      const tbody = document.querySelector('#leaderboard-table tbody');
      tbody.innerHTML = '';
      players.sort((a,b) => b.score - a.score).slice(0, 10).forEach((p, i) => {
        let c = '#0284c7';
        if (p.rankClass === 'S++') c = '#dc2626';
        else if (p.rankClass === 'S') c = '#d97706';
        else if (p.rankClass === 'A') c = '#059669';
        else if (p.rankClass === 'B') c = '#2563eb';
        else if (p.rankClass === 'C') c = '#64748b';
        tbody.innerHTML += `<tr><td>${i+1}</td><td>${p.name} <span style="color:${c};font-size:0.8em;font-weight:bold">(${p.rankClass})</span></td><td>${p.gamesWon}</td></tr>`;
      });
    } catch {}
  } else {
    section.classList.add('hidden');
  }
});

window.addEventListener('load', () => {
  loadPlayersList();
  const storedName = localStorage.getItem('ludoName');
  const storedDbId = localStorage.getItem('ludoDbId');
  if (storedName) {
    myName = storedName;
    myDbId = Number(storedDbId) || null;
    if (myDbId) {
      persistentId = 'db_' + myDbId;
      localStorage.setItem('ludoPlayerId', persistentId);
    }
    socket.emit('identify', { persistentId, name: myName, dbId: myDbId });
  }

  const switchBtn = $('switch-account-btn');
  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      localStorage.removeItem('ludoName');
      localStorage.removeItem('ludoDbId');
      myName = null;
      myDbId = null;
      showScreen('auth');
      loadPlayersList();
      $('player-select').value = '';
      $('player-name-field')?.classList.add('hidden');
      $('player-pin-field')?.classList.add('hidden');
      $('login-btn').classList.add('hidden');
      $('register-btn').classList.add('hidden');
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  LOBBY
// ══════════════════════════════════════════════════════════════════════════════
$('add-local-btn').addEventListener('click', async () => {
  const loadPlayers = async () => {
    const res = await fetch('/api/players');
    return await res.json();
  };

  const showPlayersModal = async () => {
    try {
      const players = await loadPlayers();
      
      let html = `<div class="local-players-scroll">`;
      if (players && players.length > 0) {
        players.forEach(p => {
          let classColor = '#0284c7';
          let classBg = '#e0f2fe';
          let classBorder = '#bae6fd';
          if (p.rankClass === 'S++') { classColor = '#dc2626'; classBg = '#fef2f2'; classBorder = '#fecaca'; }
          else if (p.rankClass === 'S') { classColor = '#d97706'; classBg = '#fffbeb'; classBorder = '#fde68a'; }
          else if (p.rankClass === 'A') { classColor = '#059669'; classBg = '#ecfdf5'; classBorder = '#a7f3d0'; }
          else if (p.rankClass === 'B') { classColor = '#2563eb'; classBg = '#eff6ff'; classBorder = '#bfdbfe'; }
          else if (p.rankClass === 'C') { classColor = '#475569'; classBg = '#f8fafc'; classBorder = '#e2e8f0'; }

          const initial = (p.name || 'P').charAt(0).toUpperCase();

          html += `
            <div class="local-player-item">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #0284c7, #2563eb); color: white; display: flex; align-items: center; justify-content: center; font-family: 'Rajdhani', sans-serif; font-weight: 800; font-size: 1.1rem; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);">
                  ${initial}
                </div>
                <div class="local-player-info">
                  <span class="local-player-name">${p.name}</span>
                  <div class="local-player-meta">
                    <span class="local-badge-wins">🏆 ${p.gamesWon ?? 0} Wins</span>
                    <span class="local-badge-tier" style="color: ${classColor}; background: ${classBg}; border: 1px solid ${classBorder};">Tier ${p.rankClass || 'C'}</span>
                  </div>
                </div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="btn-local-add" onclick="window.selectLocalPlayer(${p.id}, '${p.name.replace(/'/g, "\\'")}')">+ Add</button>
                <button type="button" class="btn-local-del" onclick="window.deletePlayer(${p.id}, event)" title="Delete Player">🗑</button>
              </div>
            </div>
          `;
        });
      } else {
        html += `
          <div style="padding: 24px 16px; text-align: center; color: #64748b; font-size: 0.95rem; font-weight: 600;">
            No saved players found yet. Create a player below!
          </div>
        `;
      }
      html += `</div>`;
      html += `
        <div class="create-local-section">
          <div class="create-local-label">
            <span>➕ OR CREATE NEW PLAYER PROFILE</span>
          </div>
          <input type="text" id="new-local-name" class="create-local-input" placeholder="Type new player name..." autocomplete="off">
        </div>
      `;
      
      window.selectLocalPlayer = (dbId, name) => {
        Swal.close();
        socket.emit('addLocalPlayer', { name, hostId: persistentId, dbId });
      };

      window.deletePlayer = async (dbId, e) => {
        e.stopPropagation();
        const conf = await Swal.fire({
          title: 'Delete Player?',
          text: "Are you sure you want to delete this player permanently?",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, delete!',
          cancelButtonText: 'Cancel',
          background: '#ffffff',
          color: '#0f172a',
          backdrop: 'rgba(15, 23, 42, 0.45)',
          customClass: {
            popup: 'ludo-modern-modal',
            confirmButton: 'ludo-modal-btn-danger',
            cancelButton: 'ludo-modal-btn-ghost'
          },
          buttonsStyling: false
        });
        if (conf.isConfirmed) {
          try {
            await fetch(`/api/players/${dbId}`, { method: 'DELETE' });
            toast('Player deleted', 'success');
            setTimeout(() => showPlayersModal(), 300);
          } catch { toast('Failed to delete', 'error'); }
        }
      };

      Swal.fire({
        title: '👥 Select Local Player',
        html: html,
        showCancelButton: true,
        confirmButtonText: '✨ Create & Deploy',
        cancelButtonText: 'Close',
        background: '#ffffff',
        color: '#0f172a',
        backdrop: 'rgba(15, 23, 42, 0.45)',
        customClass: {
          popup: 'ludo-modern-modal',
          confirmButton: 'ludo-modal-btn-primary',
          cancelButton: 'ludo-modal-btn-ghost'
        },
        buttonsStyling: false,
        width: 520,
        didOpen: () => {
          const input = document.getElementById('new-local-name');
          if (input) {
            input.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                Swal.clickConfirm();
              }
            });
          }
        },
        preConfirm: () => {
          const name = document.getElementById('new-local-name').value.trim();
          if (!name) {
            Swal.showValidationMessage('Please enter a new name or select one above');
            return false;
          }
          return name;
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          const name = result.value;
          try {
            const res = await fetch('/api/register', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (!res.ok) return toast(data.error || 'Registration failed', 'error');
            socket.emit('addLocalPlayer', { name: data.name, hostId: persistentId, dbId: data.id });
          } catch { toast('Server error', 'error'); }
        }
      });
    } catch (e) {
      toast('Could not load players', 'error');
    }
  };
  
  showPlayersModal();
});

$('token-count-slider').addEventListener('input', (e) => {
  $('token-count-display').textContent = e.target.value;
});

$('token-count-slider').addEventListener('change', (e) => {
  socket.emit('updateSettings', { tokensPerPlayer: parseInt(e.target.value) });
});

if ($('add-bot-btn')) {
  $('add-bot-btn').addEventListener('click', () => {
    socket.emit('addBot');
  });
}

if ($('block-rule-toggle')) {
  $('block-rule-toggle').addEventListener('change', (e) => {
    socket.emit('updateSettings', { enableBlockRule: e.target.checked });
  });
}

socket.on('settingsUpdated', (settings) => {
  if ($('token-count-slider') && settings.tokensPerPlayer !== undefined) {
    $('token-count-slider').value = settings.tokensPerPlayer;
    $('token-count-display').textContent = settings.tokensPerPlayer;
  }
  if ($('block-rule-toggle') && settings.enableBlockRule !== undefined) {
    $('block-rule-toggle').checked = settings.enableBlockRule;
  }
});

$('start-btn').addEventListener('click', () => socket.emit('startGame'));

socket.on('lobbyUpdate', (data) => {
  if (currentGameState && (currentGameState.status === 'PLAYING' || currentGameState?.status === 'PAUSED')) return;
  showScreen('lobby');
  $('share-url').value = getShareUrl();
  const container = $('lobby-players');
  container.innerHTML = '';
  
  const playersList = Array.isArray(data) ? data : data.players;
  const hostId = Array.isArray(data) ? (playersList[0]?.id) : data.hostId;

  myColors = playersList.filter(p => p.id === persistentId || p.hostId === persistentId).map(p => p.color);

  const isHost = hostId === persistentId;

  playersList.forEach(p => {
    const c = COLORS[p.color] || { fill: '#888' };
    let owns = '';
    if (p.id === persistentId) owns = ' (You)';
    else if (p.isBot || p.id.startsWith('bot_')) owns = ' (Bot)';
    else if (p.hostId === persistentId) owns = ' (Local)';

    const dc  = !p.connected ? ' · offline' : '';
    
    // In this friendly environment, anyone can edit or kick to avoid stuck lobbies!
    const canEdit = true; 
    
    let colorSelect = `<span style="color:${c.fill};font-weight:700">${p.color || ''}</span>`;
    let removeBtn = '';

    if (canEdit) {
      const allColors = Object.keys(COLORS);
      const takenColors = playersList.filter(x => x.id !== p.id).map(x => x.color);
      let options = '';
      allColors.forEach(colorName => {
        const disabled = takenColors.includes(colorName) ? 'disabled' : '';
        const selected = p.color === colorName ? 'selected' : '';
        const clrInfo = COLORS[colorName];
        const clrLabel = clrInfo && clrInfo.label ? `${colorName} (${clrInfo.label})` : colorName;
        options += `<option value="${colorName}" ${disabled} ${selected}>${clrLabel}</option>`;
      });
      colorSelect = `<select class="glass-input small-select" onchange="window.changePlayerColor('${p.id}', this.value)" style="color:${c.fill};font-weight:800; background: #ffffff; border: 1.5px solid #cbd5e1; padding: 3px 6px; border-radius: 6px; outline: none; margin-left: 8px;">${options}</select>`;
      
      removeBtn = `<button class="btn ghost small" style="padding: 2px 6px; color: #ff4757; margin-left: 10px;" onclick="window.removePlayer('${p.id}')" title="Remove Player">✕</button>`;
    }

    const tierName = p.tier || 'PLATINUM';
    const tierIcon = p.tierIcon || '🛡️';
    const tierColor = p.tierColor || '#10b981';
    const tierClass = p.tierClass || 'tier-platinum';
    const scoreVal = p.score ? Number(p.score).toLocaleString() : '1,200';
    const winRateVal = p.winRate ?? 50;
    const levelNum = Math.min(99, Math.max(14, Math.round((p.score || 500) / 45)));
    const isThisPlayerHost = (p.id === hostId);

    container.innerHTML += `
      <div class="pubg-operative-card ${tierClass}" style="--player-accent: ${c.fill};">
        <div class="pubg-card-top-strip">
          <span class="pubg-tier-badge" style="color: ${tierColor}; border-color: ${tierColor}88; background: ${tierColor}18;">
            ${tierIcon} ${tierName}
          </span>
          ${isThisPlayerHost ? `<span class="pubg-host-badge">★ SQUAD LEADER</span>` : ''}
        </div>

        <div class="pubg-avatar-wrapper">
          <div class="pubg-avatar-ring" style="border-color: ${c.fill}; box-shadow: 0 0 16px ${c.fill}55;">
            <span style="font-size: 1.8rem; filter: drop-shadow(0 0 6px ${c.fill});">🎲</span>
          </div>
          <span class="pubg-level-tag">LV. ${levelNum}</span>
        </div>

        <div class="pubg-operative-info" style="flex: 1;">
          <div class="pubg-op-name" title="${p.name}">
            ${p.name} <span class="pubg-you-tag">${owns}</span>
          </div>

          <div class="pubg-badges-row">
            ${p.verified ? `<span class="pubg-verified-badge">✓ VERIFIED PRO</span>` : ''}
            ${p.isBot ? `<span class="pubg-bot-badge">🤖 AI • ${p.botTrait || 'TYCOON'}</span>` : ''}
          </div>

          <div class="pubg-telemetry-row">
            <span>⭐ ${scoreVal} RP</span>
            <span>🎯 ${winRateVal}% WR</span>
          </div>

          <div class="pubg-color-selector">
            <label>TACTICAL SUIT:</label>
            ${colorSelect}
          </div>
        </div>

        <div class="pubg-card-footer">
          <div class="pubg-ready-status">
            <span class="pubg-pulse-dot" style="${!p.connected ? 'background: #ef4444; box-shadow: 0 0 8px #ef4444; animation: none;' : ''}"></span>
            <span class="pubg-ready-text" style="${!p.connected ? 'color: #ef4444;' : ''}">${p.connected ? 'READY' : 'OFFLINE'}</span>
          </div>
          ${removeBtn}
        </div>
      </div>`;
  });

  // Render empty holographic slots up to 4
  const emptyCount = 4 - playersList.length;
  for (let i = 0; i < emptyCount; i++) {
    const slotIdx = playersList.length + i + 1;
    container.innerHTML += `
      <div class="pubg-empty-slot">
        <div class="pubg-slot-num">OPERATIVE 0${slotIdx}</div>
        <div class="pubg-slot-hologram">
          <span class="pubg-holo-icon">＋</span>
        </div>
        <div class="pubg-slot-actions">
          <button class="pubg-slot-btn btn-add-local" onclick="window.triggerAddLocal()">+ Local Operative</button>
          <button class="pubg-slot-btn btn-add-bot" onclick="window.triggerAddBot()">+ AI Bot 🤖</button>
        </div>
      </div>
    `;
  }
  
  window.triggerAddLocal = () => { $('add-local-btn')?.click(); };
  window.triggerAddBot = () => { $('add-bot-btn')?.click(); };
  
  window.changePlayerColor = (playerId, newColor) => {
    socket.emit('changeColor', { playerId, newColor });
  };
  window.removePlayer = (playerId) => {
    socket.emit('removePlayer', { playerId });
  };
  if (isHost) {
    $('host-settings')?.classList.remove('hidden');
    if ($('token-count-slider')) $('token-count-slider').disabled = false;
    if ($('block-rule-toggle')) $('block-rule-toggle').disabled = false;
    if ($('force-end-btn')) $('force-end-btn').classList.remove('hidden');
  } else {
    $('host-settings')?.classList.remove('hidden');
    if ($('token-count-slider')) $('token-count-slider').disabled = true;
    if ($('block-rule-toggle')) $('block-rule-toggle').disabled = true;
    if ($('force-end-btn')) $('force-end-btn').classList.add('hidden');
  }

  const amIInLobby = playersList.some(p => p.id === persistentId);
  if (amIInLobby && playersList.length < 4) {
    $('add-local-btn').classList.remove('hidden');
    if ($('add-bot-btn')) $('add-bot-btn').classList.remove('hidden');
  } else {
    $('add-local-btn').classList.add('hidden');
    if ($('add-bot-btn')) $('add-bot-btn').classList.add('hidden');
  }

  if (playersList.length >= 2) {
    $('start-btn').classList.remove('hidden');
    $('waiting-text').textContent = `${playersList.length} players ready`;
  } else {
    $('start-btn').classList.add('hidden');
    $('waiting-text').textContent = 'Waiting for more players…';
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  GAME START
// ══════════════════════════════════════════════════════════════════════════════
async function enterGame(data) {
  currentGameState = data;
  myColors = data.players.filter(p => p.id === persistentId || p.hostId === persistentId).map(p => p.color);

  try {
    const res = await fetch('/api/board-config');
    boardConfig = await res.json();
  } catch (err) {
    console.warn('Could not fetch /api/board-config, using fallback:', err);
  }
  if (!boardConfig) boardConfig = {};
  if (data.basePos) boardConfig.basePos = data.basePos;
  if (data.triangleDefs) boardConfig.triangleDefs = data.triangleDefs;
  boardConfig.tokensPerPlayer = data.tokensPerPlayer || 4;

  renderBoard(data.players);
  initStatusCards(data.players);
  updateStatusCards(data.players, data.tokens, data.rankings || []);
  updateTokenPositions(data.tokens);
  
  const isHost = data.players.length > 0 && data.players[0].id === persistentId;
  if (isHost && $('force-restart-btn')) {
    $('force-restart-btn').classList.remove('hidden');
  } else if ($('force-restart-btn')) {
    $('force-restart-btn').classList.add('hidden');
  }

  showScreen('game');
  updateTurnUI(data.turn);
}

socket.on('gameStarted', data => enterGame(data));
socket.on('gameStateRecovery', data => {
  if (data.status === 'LOBBY') return;
  enterGame(data).then(() => {
    if (data.status === 'PAUSED') $('pause-overlay').classList.remove('hidden');
    else $('pause-overlay').classList.add('hidden');

    // Check if it's our turn, we've rolled, and we have valid moves
    if (data.hasRolled && data.turn && data.turn.color && myColors.includes(data.turn.color)) {
      if (data.validMoves && data.validMoves.length > 0) {
        highlightTokens(data.validMoves, data.turn.color);
      } else {
        // Fallback if no valid moves sent but it's awaiting token selection
        $('token-choices').classList.remove('hidden'); 
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  SVG BOARD RENDERING
// ══════════════════════════════════════════════════════════════════════════════
const SVG_NS = 'http://www.w3.org/2000/svg';
const CELL = 60;
function px(row, col) { return { x: col * CELL, y: row * CELL }; }
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function renderBoard(players) {
  const svg = $('ludo-board');
  svg.innerHTML = '';
  const activeColors = players.map(p => p.color);

  // Background
  svg.appendChild(svgEl('rect', { width: 900, height: 900, fill: 'rgba(255, 255, 255, 0.5)', rx: 16 }));

  // ── Bases ──
  const basePos = (boardConfig && boardConfig.basePos) || { Red: {x:0,y:0}, Green: {x:540,y:0}, Blue: {x:540,y:540}, Yellow: {x:0,y:540} };
  const cornerDefaults = [{x:0,y:0}, {x:540,y:0}, {x:540,y:540}, {x:0,y:540}];
  activeColors.forEach((color, idx) => {
    const bp = basePos[color] || cornerDefaults[idx % 4];
    if (!bp) return;
    const c = COLORS[color] || { fill: '#888' };
    // Outer base
    svg.appendChild(svgEl('rect', {
      x: bp.x+10, y: bp.y+10, width: 340, height: 340,
      fill: c.fill, 'fill-opacity': 0.15, stroke: c.fill, 'stroke-opacity': 0.6,
      rx: 20, 'stroke-width': 2
    }));
    // Inner box
    svg.appendChild(svgEl('rect', {
      x: bp.x+60, y: bp.y+60, width: 240, height: 240,
      fill: 'rgba(255, 255, 255, 0.7)', rx: 16, stroke: c.fill, 'stroke-opacity': 0.5, 'stroke-width': 1
    }));
    
    // Cages using perfectly centered pixel coords
    const cageList = (boardConfig && boardConfig.CAGE_PIXELS && boardConfig.CAGE_PIXELS[color]) || [];
    cageList.slice(0, boardConfig.tokensPerPlayer || 4).forEach(pos => {
      svg.appendChild(svgEl('circle', {
        cx: pos.x, cy: pos.y, r: 26,
        fill: 'rgba(0,0,0,0.03)', stroke: c.fill, 'stroke-opacity': 0.6, 'stroke-width': 2
      }));
    });
  });

  // ── Path squares ──
  boardConfig.COMMON_PATH.forEach((pos, i) => {
    const p = px(pos.row, pos.col);
    let fillColor = 'rgba(255,255,255,0.6)';
    let strokeColor = 'rgba(0,0,0,0.1)';
    for (const [clr, idx] of Object.entries(boardConfig.COLOR_START)) {
      if (idx === i && activeColors.includes(clr)) {
        fillColor = (COLORS[clr] ? COLORS[clr].fill : '#888') + '40';
        strokeColor = COLORS[clr] ? COLORS[clr].fill : '#888';
      }
    }
    svg.appendChild(svgEl('rect', {
      x: p.x + 2, y: p.y + 2, width: 56, height: 56,
      fill: fillColor, stroke: strokeColor, 'stroke-width': 1, rx: 6
    }));
    if (boardConfig.SAFE_SQUARES.includes(i)) {
      svg.appendChild(svgEl('text', {
        x: p.x + 30, y: p.y + 32, fill: 'rgba(0,0,0,0.3)',
        'font-size': 20, 'text-anchor': 'middle', 'dominant-baseline': 'middle'
      })).textContent = '★';
    }
  });

  // ── Home columns ──
  activeColors.forEach(color => {
    const c = COLORS[color] || { fill: '#888' };
    if (!boardConfig.HOME_COLUMNS || !boardConfig.HOME_COLUMNS[color]) return;
    boardConfig.HOME_COLUMNS[color].forEach(pos => {
      const p = px(pos.row, pos.col);
      svg.appendChild(svgEl('rect', {
        x: p.x + 2, y: p.y + 2, width: 56, height: 56,
        fill: c.fill, 'fill-opacity': 0.4, stroke: c.fill, 'stroke-opacity': 0.8,
        rx: 6, 'stroke-width': 1
      }));
    });
  });

  // ── Center home triangle ──
  const cx = 7 * CELL + 30, cy = 7 * CELL + 30;
  const triangleDefs = (boardConfig && boardConfig.triangleDefs) || {
    Red:    `${6*CELL},${6*CELL} ${6*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`,
    Green:  `${6*CELL},${6*CELL} ${9*CELL},${6*CELL} ${7.5*CELL},${7.5*CELL}`,
    Blue:   `${9*CELL},${9*CELL} ${9*CELL},${6*CELL} ${7.5*CELL},${7.5*CELL}`,
    Yellow: `${9*CELL},${9*CELL} ${6*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`
  };
  const fallbackTris = [
    `${6*CELL},${6*CELL} ${6*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`,
    `${6*CELL},${6*CELL} ${9*CELL},${6*CELL} ${7.5*CELL},${7.5*CELL}`,
    `${9*CELL},${9*CELL} ${9*CELL},${6*CELL} ${7.5*CELL},${7.5*CELL}`,
    `${9*CELL},${9*CELL} ${6*CELL},${9*CELL} ${7.5*CELL},${7.5*CELL}`
  ];
  activeColors.forEach((color, idx) => {
    const pts = triangleDefs[color] || fallbackTris[idx % 4];
    const c = COLORS[color] || { fill: '#888' };
    svg.appendChild(svgEl('polygon', {
      points: pts,
      fill: c.fill, 'fill-opacity': 0.6,
      stroke: c.fill, 'stroke-width': 1, 'stroke-opacity': 0.8
    }));
  });
  svg.appendChild(svgEl('circle', {
    cx, cy, r: 25, fill: 'rgba(255,255,255,0.8)', stroke: 'rgba(0,0,0,0.1)', 'stroke-width': 2
  }));
  svg.appendChild(svgEl('text', {
    x: cx, y: cy + 2, fill: 'rgba(0,0,0,0.7)',
    'font-size': 14, 'font-weight': 700, 'text-anchor': 'middle', 'dominant-baseline': 'middle'
  })).textContent = 'HOME';

  // ── Trophy layer ──
  const trophyLayer = svgEl('g', { id: 'trophies-layer' });
  svg.appendChild(trophyLayer);

  // ── Token layer ──
  const tokenLayer = svgEl('g', { id: 'tokens-layer' });
  svg.appendChild(tokenLayer);

  activeColors.forEach(color => {
    const c = COLORS[color];
    for (let i = 0; i < boardConfig.tokensPerPlayer; i++) {
      // Create Pawn token instead of circle
      const group = svgEl('g', {
        id: `token-${color}-${i}`,
        class: 'token', cursor: 'pointer',
        filter: 'url(#tokenShadow)'
      });
      
      const pawnPath = svgEl('path', {
        d: "M-10,18 C-10,18 -12,24 -18,24 L18,24 C12,24 10,18 10,18 C10,18 8,4 8,-2 C8,-8 13,-14 13,-18 C13,-24 8,-28 0,-28 C-8,-28 -13,-24 -13,-18 C-13,-14 -8,-8 -8,-2 C-8,4 -10,18 -10,18 Z",
        fill: c.fill, stroke: '#fff', 'stroke-width': 1.5
      });
      // Gloss highlight for 3D effect
      const highlight = svgEl('ellipse', {
        cx: -4, cy: -20, rx: 3, ry: 5, fill: 'rgba(255,255,255,0.4)', transform: 'rotate(30 -4 -20)'
      });
      
      group.appendChild(pawnPath);
      group.appendChild(highlight);
      
      group.addEventListener('click', () => {
        if (group.classList.contains('selectable')) {
          socket.emit('selectToken', { tokenIndex: i });
          clearHighlights();
        }
      });
      tokenLayer.appendChild(group);
    }
  });

  const defs = svgEl('defs');
  defs.innerHTML = `
    <filter id="tokenShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/>
    </filter>`;
  svg.insertBefore(defs, svg.firstChild);
}

// ── Token position helpers ───────────────────────────────────────────────────
function stepToCoord(color, step) {
  if (step === 0) return null; 
  if (step >= 1 && step <= 51) {
    const idx = (boardConfig.COLOR_START[color] + step - 1) % 52;
    return boardConfig.COMMON_PATH[idx];
  }
  if (step >= 52 && step <= 56) return boardConfig.HOME_COLUMNS[color][step - 52];
  return {row: 7, col: 7}; 
}

function stepToPixel(color, step, tokenIndex) {
  if (step === 0) {
    return boardConfig.CAGE_PIXELS[color][tokenIndex];
  }
  if (step === 57) {
    return boardConfig.HOME_PIXELS[color][tokenIndex];
  }
  const coord = stepToCoord(color, step);
  return { x: coord.col * CELL + 30, y: coord.row * CELL + 30 }; // center of cell
}

function getTokenEl(color, idx) { return $(`token-${color}-${idx}`); }

function updateTokenPositions(tokensObj) {
  if (!tokensObj || !boardConfig) return;

  const posMap = {};
  const activeColors = currentGameState.players.map(p => p.color);

  activeColors.forEach(color => {
    if (!tokensObj[color]) return;
    tokensObj[color].forEach((step, i) => {
      const p = stepToPixel(color, step, i);
      const key = `${p.x},${p.y}`;
      if (!posMap[key]) posMap[key] = [];
      posMap[key].push({ color, i, step, px: p });
    });
  });

  Object.values(posMap).forEach(group => {
    group.forEach((t, idx) => {
      const el = getTokenEl(t.color, t.i);
      if (!el) return;
      let ox = 0, oy = 0;
      if (group.length > 1 && t.step > 0 && t.step < 57) {
        const offsets = [[-12,-12],[12,-12],[-12,12],[12,12],[0,-15],[0,15]];
        ox += offsets[idx]?.[0] ?? 0;
        oy += offsets[idx]?.[1] ?? 0;
      }
      el.setAttribute('transform', `translate(${t.px.x + ox}, ${t.px.y + oy})`);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  STATUS CARDS & PER-PLAYER DICE
// ══════════════════════════════════════════════════════════════════════════════
function createDiceHTML(id) {
  return `
    <div class="dice-scene" id="scene-${id}" style="cursor: pointer;" onclick="const b = document.getElementById('roll-btn-${id}'); if(b && !b.disabled) b.click();" title="Click to Roll!">
      <div id="dice-cube-${id}" class="dice-cube">
        <div class="dice-face face-1"><span class="pip p-c"></span></div>
        <div class="dice-face face-2"><span class="pip p-tl"></span><span class="pip p-br"></span></div>
        <div class="dice-face face-3"><span class="pip p-tl"></span><span class="pip p-c"></span><span class="pip p-br"></span></div>
        <div class="dice-face face-4"><span class="pip p-tl"></span><span class="pip p-tr"></span><span class="pip p-bl"></span><span class="pip p-br"></span></div>
        <div class="dice-face face-5"><span class="pip p-tl"></span><span class="pip p-tr"></span><span class="pip p-c"></span><span class="pip p-bl"></span><span class="pip p-br"></span></div>
        <div class="dice-face face-6"><span class="pip p-tl"></span><span class="pip p-tr"></span><span class="pip p-ml"></span><span class="pip p-mr"></span><span class="pip p-bl"></span><span class="pip p-br"></span></div>
      </div>
    </div>`;
}

function initStatusCards(players) {
  const container = $('player-status-cards');
  container.innerHTML = '';
  
  players.forEach(p => {
    const c = COLORS[p.color] || { fill: '#888' };
    const owns = (p.id === persistentId) ? ' (You)' : '';
    const tierIcon = p.tierIcon || '🛡️';
    const tierName = p.tier || 'PLATINUM';
    const verifiedIcon = p.verified ? '<span style="color:#00f0ff; font-weight:900; font-size:0.75rem; margin-left:3px;" title="Verified Pro">✓</span>' : '';
    const botTag = p.isBot ? `<span style="font-size:0.65rem; color:#c084fc; font-weight:800; margin-left:3px;">🤖 ${p.botTrait || 'AI'}</span>` : '';
    
    // Create card
    const card = document.createElement('div');
    card.className = 'status-card';
    card.id = `status-card-${p.id}`;
    card.style.borderLeftColor = c.fill;
    
    card.innerHTML = `
      <div class="player-info">
        <div class="player-name" style="color:${c.fill}; display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
          <span style="font-weight:800;">${p.name}${owns}</span>
          ${verifiedIcon}
          ${botTag}
          <span style="font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; background: ${p.tierColor || '#10b981'}22; color: ${p.tierColor || '#10b981'}; border: 1px solid ${p.tierColor || '#10b981'}55; font-weight: 800; font-family:'Rajdhani',sans-serif;">${tierIcon} ${tierName}</span>
        </div>
        <span class="status-nums">
          <span title="Active" id="active-stat-${p.id}">0 ⚔</span>
          <span title="Home" id="home-stat-${p.id}">0/${boardConfig.tokensPerPlayer} 🏠</span>
        </span>
      </div>
      <div class="dice-wrapper">
        ${createDiceHTML(p.id)}
      </div>
      <div class="roll-action">
        <button id="roll-btn-${p.id}" class="btn primary small disabled" disabled>Roll</button>
      </div>
    `;
    container.appendChild(card);

    // Bind roll button
    $(`roll-btn-${p.id}`).addEventListener('click', () => {
      socket.emit('rollDice');
      $(`roll-btn-${p.id}`).disabled = true;
      $(`roll-btn-${p.id}`).classList.add('disabled');
    });
  });
}

function updateStatusCards(players, tokens, rankings = []) {
  const total = boardConfig?.tokensPerPlayer || 4;
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
  players.forEach(p => {
    const t = tokens[p.color] || Array(total).fill(0);
    const home = t.filter(s => s === 57).length;
    const active = t.filter(s => s > 0 && s < 57).length;
    
    if ($(`active-stat-${p.id}`)) {
      $(`active-stat-${p.id}`).textContent = `${active} ⚔`;
      $(`home-stat-${p.id}`).textContent = `${home}/${total} 🏠`;
    }

    const rankObj = rankings.find(r => r.playerId === p.id);
    if (rankObj && $(`rank-badge-${p.id}`)) {
      $(`rank-badge-${p.id}`).textContent = medals[rankObj.rank - 1] || '';
    } else if ($(`rank-badge-${p.id}`)) {
      $(`rank-badge-${p.id}`).textContent = '';
    }
  });

  updateTrophies(rankings);
}

function updateTrophies(rankings) {
  const layer = $('trophies-layer');
  if (!layer) return;
  layer.innerHTML = '';
  
  const CELL = 60;
  const TROPHY_CENTERS = {
    Red: { x: 6.6 * CELL, y: 7.5 * CELL },
    Green: { x: 7.5 * CELL, y: 6.6 * CELL },
    Blue: { x: 8.4 * CELL, y: 7.5 * CELL },
    Yellow: { x: 7.5 * CELL, y: 8.4 * CELL }
  };
  const medals = ['🏆', '🥈', '🥉', '🏅'];
  
  rankings.forEach(r => {
    const pos = TROPHY_CENTERS[r.color];
    if (pos) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x);
      text.setAttribute('y', pos.y + 10);
      text.setAttribute('font-size', '38');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.style.filter = 'drop-shadow(0px 4px 6px rgba(0,0,0,0.6))';
      text.textContent = medals[r.rank - 1] || '🏅';
      layer.appendChild(text);
    }
  });
}

async function animatePlayerDice(playerId, roll) {
  const cube = $(`dice-cube-${playerId}`);
  if (!cube) return;
  cube.style.transition = 'none';
  cube.style.transform = `rotateX(${Math.random()*720}deg) rotateY(${Math.random()*720}deg) rotateZ(${Math.random()*360}deg)`;
  void cube.offsetWidth; 

  cube.style.transition = 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

  const faceRotations = {
    1: { rx: 0,   ry: 0   },
    2: { rx: 0,   ry: 180 },
    3: { rx: 0,   ry: -90 },
    4: { rx: 0,   ry: 90  },
    5: { rx: -90, ry: 0   },
    6: { rx: 90,  ry: 0   }
  };
  const { rx, ry } = faceRotations[roll];
  cube.style.transform = `rotateX(${rx + 720}deg) rotateY(${ry + 720}deg)`;
  await sleep(900);
}

// ══════════════════════════════════════════════════════════════════════════════
//  TOKEN MOVE ANIMATION
// ══════════════════════════════════════════════════════════════════════════════
async function animateTokenMove(color, tokenIndex, fromStep, toStep) {
  const el = getTokenEl(color, tokenIndex);
  if (!el) return;

  for (let s = fromStep + 1; s <= toStep; s++) {
    const p = stepToPixel(color, s, tokenIndex);

    // Upward hop arc with stretch
    el.style.transition = 'transform 0.09s ease-out';
    el.setAttribute('transform', `translate(${p.x}, ${p.y - 18}) scale(0.92, 1.15)`);
    await sleep(90);

    // Touchdown squash impact
    el.style.transition = 'transform 0.08s ease-in';
    el.setAttribute('transform', `translate(${p.x}, ${p.y}) scale(1.15, 0.88)`);
    if (window.SoundFX && window.SoundFX.hop) {
      window.SoundFX.hop();
    } else if (window.SoundFX && window.SoundFX.moveToken) {
      window.SoundFX.moveToken();
    }
    await sleep(85);

    // Return to resting neutral scale
    el.style.transition = 'transform 0.04s ease-out';
    el.setAttribute('transform', `translate(${p.x}, ${p.y}) scale(1, 1)`);
    await sleep(25);
  }

  el.style.transition = '';
}

// ══════════════════════════════════════════════════════════════════════════════
//  TURN UI
// ══════════════════════════════════════════════════════════════════════════════
function updateTurnUI(turnInfo) {
  if (!turnInfo || !turnInfo.color) return;
  const turnColor = turnInfo.color;
  const turnName = turnInfo.name;

  const badge = document.querySelector('#turn-info .color-badge');
  const text  = document.querySelector('#turn-info .turn-text');
  const c     = COLORS[turnColor] || { fill: '#888', glow: 'rgba(255,255,255,0.3)' };

  badge.style.background = c.fill;
  $('turn-info').style.boxShadow = `0 0 20px ${c.glow}`;

  // Disable all roll buttons first
  document.querySelectorAll('.roll-action button').forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
  });

  if (myColors.includes(turnColor)) {
    text.textContent = `🎲 ${turnName}'s Turn`;
    // Enable this specific player's roll button
    const player = currentGameState.players.find(p => p.color === turnColor);
    if (player) {
      const btn = $(`roll-btn-${player.id}`);
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('disabled');
      }
    }
  } else {
    text.textContent = `${turnName}'s Turn`;
  }
  clearHighlights();
}

function highlightTokens(validMoves, activeColor) {
  clearHighlights();
  if (!validMoves.length) return;
  $('token-choices').classList.remove('hidden');

  const container = $('dynamic-token-buttons');
  container.innerHTML = '';
  const badges = ['①','②','③','④','⑤','⑥'];

  validMoves.forEach(m => {
    const el = getTokenEl(activeColor, m.tokenIndex);
    if (el) el.classList.add('selectable');
    
    const btn = document.createElement('button');
    btn.className = 'btn token-btn';
    btn.textContent = badges[m.tokenIndex] || (m.tokenIndex + 1);
    btn.onclick = () => {
      socket.emit('selectToken', { tokenIndex: m.tokenIndex });
      clearHighlights();
    };
    container.appendChild(btn);
  });
}

function clearHighlights() {
  document.querySelectorAll('.token.selectable').forEach(el => el.classList.remove('selectable'));
  $('token-choices').classList.add('hidden');
}

// ══════════════════════════════════════════════════════════════════════════════
//  SOCKET EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

socket.on('diceResult', async ({ roll, playerColor, playerId, validMoves, autoEndTurn }) => {
  await animatePlayerDice(playerId, roll);

  if (myColors.includes(playerColor)) {
    if (!autoEndTurn && validMoves.length > 0) {
      highlightTokens(validMoves, playerColor);
    }
  }
});

socket.on('tokenMoved', async ({ color, tokenIndex, fromStep, toStep, isCapture, capturedInfo, reachedHome, allTokens }) => {
  await animateTokenMove(color, tokenIndex, fromStep, toStep);

  if (isCapture && capturedInfo) {
    const cel = getTokenEl(capturedInfo.color, capturedInfo.tokenIndex);
    if (cel) {
      cel.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
      const cp = stepToPixel(capturedInfo.color, 0, capturedInfo.tokenIndex);
      cel.setAttribute('transform', `translate(${cp.x}, ${cp.y})`);
      setTimeout(() => { if (cel) cel.style.transition = ''; }, 500);
    }
    toast(`${color} captured ${capturedInfo.color}'s token!`, 'success');
  }

  if (reachedHome) {
    if (window.triggerConfetti) window.triggerConfetti(2200);
    toast(`${color} got a token HOME! 🏠`, 'success');
  }

  if (allTokens) {
    currentGameState.tokens = allTokens;
    updateTokenPositions(allTokens);
    updateStatusCards(currentGameState.players, allTokens, currentGameState.rankings || []);
  }
});

socket.on('bonusRoll', ({ color }) => {
  if (myColors.includes(color)) {
    const player = currentGameState.players.find(p => p.color === color);
    if (player) {
      const btn = $(`roll-btn-${player.id}`);
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('disabled');
      }
    }
  }
});

socket.on('turnChanged', (turnInfo) => {
  if (currentGameState) currentGameState.turn = turnInfo;
  updateTurnUI(turnInfo);
});

socket.on('penaltyTripleSix', ({ color, penaltyToken, allTokens }) => {
  Swal.fire({
    title: 'Triple 6 Penalty! 🚫',
    text: `${color} rolled three 6s in a row! Token sent back to cage.`,
    icon: 'warning',
    background: '#ffffff',
    color: '#0f172a',
    backdrop: 'rgba(15, 23, 42, 0.45)',
    customClass: {
      popup: 'ludo-modern-modal',
      confirmButton: 'ludo-modal-btn-primary'
    },
    buttonsStyling: false
  });
  if (allTokens) {
    currentGameState.tokens = allTokens;
    updateTokenPositions(allTokens);
  }
});

socket.on('playerFinished', ({ color, name, rank, playerId }) => {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
  if (!currentGameState.rankings) currentGameState.rankings = [];
  // Prevent duplicate additions if re-emitted
  if (!currentGameState.rankings.find(r => r.playerId === playerId)) {
    currentGameState.rankings.push({ playerId, color, name, rank });
  }
  updateStatusCards(currentGameState.players, currentGameState.tokens, currentGameState.rankings);

  Swal.fire({
    title: `${medals[rank-1] || '🎉'} ${name} finished!`,
    text: `${color} takes ${rank}${rank===1?'st':rank===2?'nd':rank===3?'rd':'th'} place!`,
    icon: 'success',
    toast: true,
    position: 'top',
    timer: 5000,
    timerProgressBar: true,
    showConfirmButton: false,
    background: '#ffffff',
    color: '#0f172a'
  });
});

socket.on('gameOver', ({ rankings }) => {
  if (window.triggerConfetti) window.triggerConfetti(4500);
  Swal.close();
  if (currentGameState) currentGameState.rankings = rankings;
  updateStatusCards(currentGameState.players, currentGameState.tokens, rankings);

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  const winner = (rankings && rankings.length > 0) ? rankings[0] : null;
  const winnerColorInfo = winner ? (COLORS[winner.color] || { fill: '#0284c7', label: winner.color }) : null;

  let html = '';
  
  if (winner) {
    html += `
      <div class="winner-hero-card">
        <div class="winner-crown">👑</div>
        <div class="winner-tag">VICTORY ROYALE · CHAMPION</div>
        <div class="winner-champion-name">${winner.name}</div>
        <div style="display: flex; justify-content: center; gap: 8px; align-items: center; margin-top: 4px;">
          <div class="winner-suit-pill">
            <span class="winner-color-dot" style="background: ${winnerColorInfo.fill}; box-shadow: 0 0 8px ${winnerColorInfo.fill};"></span>
            <span style="color: #0f172a; font-weight: 800;">${winnerColorInfo.label || winner.color} Squad</span>
          </div>
          <span style="font-size: 0.8rem; font-weight: 700; color: #b45309; background: #fef3c7; padding: 4px 10px; border-radius: 999px; border: 1px solid #fde68a;">🥇 1st Place</span>
        </div>
      </div>
    `;
  }

  html += `<div class="podium-rankings-list">`;
  rankings.forEach((r, i) => {
    const medal = medals[i] || `${i + 1}th`;
    const colorInfo = COLORS[r.color] || { fill: '#64748b', label: r.color };
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
    const rankTitle = i === 0 ? 'Grand Champion' : i === 1 ? 'Runner Up' : i === 2 ? '3rd Place' : `${i + 1}th Place`;

    html += `
      <div class="podium-rank-card ${rankClass}">
        <div class="podium-left">
          <div class="podium-medal">${medal}</div>
          <div style="display: flex; flex-direction: column; text-align: left;">
            <span class="podium-player-name">${r.name}</span>
            <span class="podium-rank-badge">${rankTitle}</span>
          </div>
        </div>
        <div class="winner-suit-pill">
          <span class="winner-color-dot" style="background: ${colorInfo.fill};"></span>
          <span style="color: #334155; font-size: 0.8rem; font-weight: 700;">${colorInfo.label || r.color}</span>
        </div>
      </div>
    `;
  });
  html += `</div>`;

  Swal.fire({
    title: '🏆 Match Concluded!',
    html: html,
    confirmButtonText: '⚔️ Start New Game',
    showCancelButton: true,
    cancelButtonText: '👀 View Board',
    background: '#ffffff',
    color: '#0f172a',
    backdrop: 'rgba(15, 23, 42, 0.55)',
    customClass: {
      popup: 'ludo-modern-modal ludo-winner-modal',
      confirmButton: 'ludo-modal-btn-primary',
      cancelButton: 'ludo-modal-btn-ghost'
    },
    buttonsStyling: false,
    width: 520
  }).then((result) => {
    if (result.isConfirmed) {
      socket.emit('proposeRestart');
      if ($('restart-btn')) $('restart-btn').disabled = true;
      toast('Restart proposed! Waiting for other players...', 'info');
    }
  });
});

socket.on('gamePaused', ({ color, name }) => {
  $('pause-overlay').classList.remove('hidden');
  $('pause-reason').textContent = `${name} (${color}) disconnected. Waiting for them to reconnect…`;
});

socket.on('gameResumed', () => {
  $('pause-overlay').classList.add('hidden');
  toast('Player reconnected! Game resumed.', 'success');
});

$('restart-btn').addEventListener('click', () => {
  socket.emit('proposeRestart');
  $('restart-btn').disabled = true;
  toast('Restart proposed! Waiting for others...', 'info');
});

if ($('force-restart-btn')) {
  $('force-restart-btn').addEventListener('click', () => {
    Swal.fire({
      title: 'Force Restart?',
      text: "This will instantly restart the match for everyone without waiting for votes.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, restart!',
      cancelButtonText: 'Cancel',
      background: '#ffffff',
      color: '#0f172a',
      backdrop: 'rgba(15, 23, 42, 0.45)',
      customClass: {
        popup: 'ludo-modern-modal',
        confirmButton: 'ludo-modal-btn-danger',
        cancelButton: 'ludo-modal-btn-ghost'
      },
      buttonsStyling: false
    }).then((res) => {
      if (res.isConfirmed) {
        socket.emit('forceRestart');
      }
    });
  });
}

if ($('force-end-btn')) {
  $('force-end-btn').addEventListener('click', () => {
    Swal.fire({
      title: 'Fast End Game?',
      text: "This will instantly end the game and rank the remaining players based on how close they are to home.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, end it!',
      cancelButtonText: 'Cancel',
      background: '#ffffff',
      color: '#0f172a',
      backdrop: 'rgba(15, 23, 42, 0.45)',
      customClass: {
        popup: 'ludo-modern-modal',
        confirmButton: 'ludo-modal-btn-danger',
        cancelButton: 'ludo-modal-btn-ghost'
      },
      buttonsStyling: false
    }).then((result) => {
      if (result.isConfirmed) {
        socket.emit('forceEndGame');
        $('force-end-btn').disabled = true;
      }
    });
  });
}

$('fullscreen-btn').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      toast('Error attempting to enable fullscreen', 'error');
    });
    $('fullscreen-btn').textContent = '✖ Exit Fullscreen';
  } else {
    document.exitFullscreen();
    $('fullscreen-btn').textContent = '⛶ Fullscreen';
  }
});

socket.on('showRestartPrompt', ({ proposerName }) => {
  Swal.fire({
    title: 'Restart Game?',
    text: `${proposerName} has proposed restarting the game.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Accept',
    cancelButtonText: 'Decline',
    background: '#ffffff',
    color: '#0f172a',
    backdrop: 'rgba(15, 23, 42, 0.45)',
    customClass: {
      popup: 'ludo-modern-modal',
      confirmButton: 'ludo-modal-btn-primary',
      cancelButton: 'ludo-modal-btn-ghost'
    },
    buttonsStyling: false,
    allowOutsideClick: false
  }).then((result) => {
    if (result.isConfirmed) {
      socket.emit('acceptRestart');
      $('restart-btn').disabled = true;
      toast('Restart accepted. Waiting for others...', 'info');
    } else {
      socket.emit('declineRestart');
    }
  });
});

socket.on('restartDeclined', () => {
  $('restart-btn').disabled = false;
  $('restart-status').textContent = '';
  toast('Restart proposal was declined.', 'warning');
  Swal.close();
});

socket.on('restartVoteUpdate', ({ votes, total }) => {
  $('restart-status').textContent = `Restart votes: ${votes} / ${total}`;
});

socket.on('gameRestarted', () => {
  currentGameState = null;
  $('restart-btn').disabled = false;
  $('restart-status').textContent = '';
  $('pause-overlay').classList.add('hidden'); // Hide overlay in case it was paused
  toast('Game restarted by unanimous vote or host force', 'success');
  showScreen('lobby');
});

socket.on('errorMsg', msg => toast(msg, 'error'));
