let globalChampions = { ludoTop: [], monopolyTop: [] };
let activeWallTab = 'ludo';
let winratesChart = null;
let tiersChart = null;

document.addEventListener('DOMContentLoaded', () => {
  loadNetworkInfo();
  loadTopChampions();
  loadAnalytics();
  loadRecentMatches();
  initAudioModal();
});

// ── LAN / WI-FI IP CARD ──────────────────────────────────────────
async function loadNetworkInfo() {
  const display = document.getElementById('hub-ip-display');
  const copyBtn = document.getElementById('copy-hub-ip-btn');
  if (!display) return;

  let hubUrl = window.location.origin;
  try {
    const res = await fetch('/api/server-info');
    if (res.ok) {
      const data = await res.json();
      if (data.primaryIp) {
        hubUrl = `http://${data.primaryIp}:${data.port || 3000}`;
      }
    }
  } catch (e) {
    console.warn('Could not fetch server-info', e);
  }

  display.textContent = hubUrl;

  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(hubUrl).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = orig; }, 2000);
      }).catch(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
      });
    };
  }
}

// ── WALL OF FAME (TOP 5 CHAMPIONS) ───────────────────────────────
async function loadTopChampions() {
  try {
    const res = await fetch('/api/top-champions');
    if (res.ok) {
      globalChampions = await res.json();
      renderWallOfFame();
    }
  } catch (err) {
    console.error('Failed to load champions:', err);
  }
}

function switchWallOfFameTab(tab) {
  activeWallTab = tab;
  document.getElementById('tab-ludo')?.classList.toggle('active', tab === 'ludo');
  document.getElementById('tab-monopoly')?.classList.toggle('active', tab === 'monopoly');
  renderWallOfFame();
}

function renderWallOfFame() {
  const podiumEl = document.getElementById('podium-container');
  const runnersEl = document.getElementById('runners-container');
  if (!podiumEl || !runnersEl) return;

  const list = (activeWallTab === 'ludo' ? globalChampions.ludoTop : globalChampions.monopolyTop) || [];
  
  if (list.length === 0) {
    podiumEl.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 40px;">No ranked combatants yet. Enter the arena to claim rank #1!</div>';
    runnersEl.innerHTML = '';
    return;
  }

  const first = list[0];
  const second = list[1] || null;
  const third = list[2] || null;
  const fourth = list[3] || null;
  const fifth = list[4] || null;

  // Podium order: 2nd place (left), 1st place (center elevated), 3rd place (right)
  let podiumHtml = '';

  // 2nd Place
  if (second) {
    podiumHtml += createPodiumCardHtml(second, 2, 'rank-silver', 'podium-2');
  } else {
    podiumHtml += '<div class="podium-card" style="opacity: 0.35;"><div class="podium-rank-badge rank-silver">2</div><div class="podium-name">Empty Slot</div></div>';
  }

  // 1st Place (Center Grand Champion)
  if (first) {
    podiumHtml += createPodiumCardHtml(first, 1, 'rank-gold', 'podium-1');
  }

  // 3rd Place
  if (third) {
    podiumHtml += createPodiumCardHtml(third, 3, 'rank-bronze', 'podium-3');
  } else {
    podiumHtml += '<div class="podium-card" style="opacity: 0.35;"><div class="podium-rank-badge rank-bronze">3</div><div class="podium-name">Empty Slot</div></div>';
  }

  podiumEl.innerHTML = podiumHtml;

  // Runners up (4th & 5th)
  let runnersHtml = '';
  if (fourth) runnersHtml += createRunnerCardHtml(fourth, 4);
  if (fifth) runnersHtml += createRunnerCardHtml(fifth, 5);
  runnersEl.innerHTML = runnersHtml;
}

function createPodiumCardHtml(p, rank, rankClass, podiumClass) {
  const verifiedTag = p.verified ? `<span class="verified-pro-tag"><span class="verified-icon">✓</span> VERIFIED PRO</span>` : '';
  const tierBadge = `<span class="tier-badge ${p.tierClass}">${p.tierIcon} ${p.tier}</span>`;
  
  return `
    <div class="podium-card ${podiumClass}">
      <div class="podium-rank-badge ${rankClass}">${rank === 1 ? '👑' : rank}</div>
      <div class="podium-name">
        <span onclick="openPlayerProfile('${p.name}')" style="cursor: pointer; color: #fff; text-decoration: underline dotted var(--cyan);">${p.name}</span>
      </div>
      <div style="display: flex; gap: 6px; justify-content: center; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
        ${tierBadge}
        ${verifiedTag}
      </div>
      <div class="podium-score">${Number(p.score).toLocaleString()} <span style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">RP</span></div>
      <div class="podium-stats">
        <span>🏆 <strong>${p.gamesWon}</strong> Wins</span>
        <span>•</span>
        <span>🎯 <strong>${p.winRate}%</strong> WR</span>
        <span>•</span>
        <span>⚔️ <strong>${p.kills || 0}</strong> Kills</span>
      </div>
      <button class="inspect-profile-btn" onclick="openPlayerProfile('${p.name}')">🔍 Inspect Dossier</button>
    </div>
  `;
}

function createRunnerCardHtml(p, rank) {
  const verifiedTag = p.verified ? `<span class="verified-pro-tag"><span class="verified-icon">✓</span> VERIFIED PRO</span>` : '';
  const tierBadge = `<span class="tier-badge ${p.tierClass}">${p.tierIcon} ${p.tier}</span>`;

  return `
    <div class="runner-card">
      <div class="runner-info">
        <span class="runner-rank">#${rank}</span>
        <div>
          <div style="font-weight: 800; color: #fff; display: flex; align-items: center; gap: 6px;">
            <span onclick="openPlayerProfile('${p.name}')" style="cursor: pointer;">${p.name}</span>
            ${verifiedTag}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;">
            ${p.gamesWon} Wins • ${p.winRate}% Win Rate • ${p.score} RP
          </div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        ${tierBadge}
        <button class="copy-mini-btn" onclick="openPlayerProfile('${p.name}')">Intel</button>
      </div>
    </div>
  `;
}

// ── BATTLE ANALYTICS (CHART.JS) ──────────────────────────────────
async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    if (!res.ok) return;
    const data = await res.json();

    renderWinratesChart(data.topRanked || []);
    renderTiersChart(data.tierCounts || {});
  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
}

function renderWinratesChart(players) {
  const ctx = document.getElementById('chart-winrates');
  if (!ctx) return;

  if (winratesChart) winratesChart.destroy();

  const labels = players.map(p => p.name);
  const winrates = players.map(p => p.winRate);
  const scores = players.map(p => p.score);

  winratesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Win Rate (%)',
          data: winrates,
          backgroundColor: 'rgba(0, 240, 255, 0.7)',
          borderColor: '#00f0ff',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Battle Score (RP / 20)',
          data: scores.map(s => Math.round(s / 20)),
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#cbd5e1', font: { family: 'Rajdhani', weight: 700, size: 12 } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { family: 'Rajdhani', weight: 700, size: 12 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

function renderTiersChart(tierCounts) {
  const ctx = document.getElementById('chart-tiers');
  if (!ctx) return;

  if (tiersChart) tiersChart.destroy();

  const labels = ['Conqueror', 'Ace', 'Crown', 'Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze'];
  const values = [
    tierCounts.CONQUEROR || 0,
    tierCounts.ACE || 0,
    tierCounts.CROWN || 0,
    tierCounts.DIAMOND || 0,
    tierCounts.PLATINUM || 0,
    tierCounts.GOLD || 0,
    tierCounts.SILVER || 0,
    tierCounts.BRONZE || 0
  ];

  tiersChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#ef4444',
          '#f59e0b',
          '#a855f7',
          '#38bdf8',
          '#10b981',
          '#eab308',
          '#94a3b8',
          '#b45309'
        ],
        borderWidth: 2,
        borderColor: '#07090e'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#cbd5e1', font: { family: 'Rajdhani', weight: 700, size: 11 } }
        }
      }
    }
  });
}

// ── RECENT MATCHES ───────────────────────────────────────────────
async function loadRecentMatches() {
  const container = document.getElementById('matches-list');
  if (!container) return;

  try {
    const res = await fetch('/api/matches');
    if (!res.ok) return;
    const matches = await res.json();

    if (matches.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 40px;">No recorded battles yet. Start a match above!</div>';
      return;
    }

    container.innerHTML = '';
    matches.forEach(m => {
      const d = new Date(m.date);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isMonopoly = (m.gameType && m.gameType.toLowerCase() === 'monopoly');
      const gameIcon = isMonopoly ? '🎩' : '🎲';
      const gameLabel = isMonopoly ? 'Megacity Monopoly' : 'Ludo Royale';

      const streakBadge = (m.streak && m.streak > 1) 
        ? `<span class="streak-tag">🔥 ${m.streak} Streak</span>` 
        : '';

      const playerChips = (m.players || []).map(p => {
        const isWin = (p.name && m.winner_name && p.name.toLowerCase() === m.winner_name.toLowerCase());
        return `<span class="player-chip ${isWin ? 'is-winner' : ''}">${isWin ? '👑 ' : ''}${p.name || 'Player'}</span>`;
      }).join('');

      const item = document.createElement('div');
      item.className = 'match-item-card';
      item.innerHTML = `
        <div class="match-primary">
          <div class="match-type-icon" title="${gameLabel}">${gameIcon}</div>
          <div>
            <div class="match-winner-name">
              <span>Winner:</span>
              <span style="color: var(--cyan); cursor: pointer;" onclick="openPlayerProfile('${m.winner_name}')">${m.winner_name || 'Draw'}</span>
              ${streakBadge}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 3px;">
              ${gameLabel} • ${dateStr}
            </div>
          </div>
        </div>
        <div class="match-roster">${playerChips}</div>
        <div>
          <button class="match-intel-btn" onclick="openMatchDetails(${m.id})">🔍 View Intel</button>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to load matches:', err);
    container.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 30px;">Error loading match history.</div>';
  }
}

// ── MATCH INTEL DOSSIER MODAL ────────────────────────────────────
async function openMatchDetails(matchId) {
  const modal = document.getElementById('match-modal');
  const content = document.getElementById('match-modal-content');
  if (!modal || !content) return;

  content.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-dim);">Loading match telemetry...</div>';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/matches/${matchId}`);
    if (!res.ok) throw new Error('Match not found');
    const m = await res.json();

    const d = new Date(m.date);
    const dateFormatted = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isMonopoly = (m.gameType && m.gameType.toLowerCase() === 'monopoly');

    const participantsList = (m.players || []).map((p, idx) => {
      const isWinner = (p.name && m.winner_name && p.name.toLowerCase() === m.winner_name.toLowerCase());
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,${isWinner ? '0.08' : '0.03'}); border: 1px solid ${isWinner ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.08)'}; border-radius: 10px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 900; color: ${isWinner ? '#fbbf24' : '#64748b'};">#${idx + 1}</span>
            <span style="font-weight: 800; color: #fff; cursor: pointer;" onclick="openPlayerProfile('${p.name}')">${p.name}</span>
            ${p.isBot ? '<span style="font-size: 0.65rem; background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 4px;">BOT</span>' : ''}
          </div>
          <span style="font-size: 0.8rem; font-weight: 800; color: ${isWinner ? '#fbbf24' : 'var(--text-dim)'};">${isWinner ? '👑 CROWNED WINNER' : 'DEFEATED'}</span>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <div style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase; color: var(--cyan); font-weight: 800;">OFFICIAL BATTLE REPORT • #${m.id}</span>
        <h2 style="font-family: var(--font-heading); font-size: 1.8rem; color: #fff; margin-top: 4px;">${isMonopoly ? '🎩 MEGACITY MONOPOLY MATCH' : '🎲 LUDO ROYALE ENGAGEMENT'}</h2>
        <div style="font-size: 0.82rem; color: var(--text-dim); margin-top: 4px;">${dateFormatted}</div>
      </div>

      <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 14px; padding: 18px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px;">
        <div style="font-size: 2.2rem;">🏆</div>
        <div>
          <div style="font-size: 0.75rem; letter-spacing: 1.5px; text-transform: uppercase; color: #fbbf24; font-weight: 800;">VICTORY DECREE</div>
          <div style="font-family: var(--font-heading); font-size: 1.6rem; font-weight: 900; color: #fff;">${m.winner_name || 'Draw'}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Emerged victorious over ${(m.players || []).length} participating combatants.</div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-family: var(--font-heading); font-size: 1.1rem; color: #fff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Participant Roster Breakdown</h3>
        ${participantsList}
      </div>

      <div style="text-align: right; margin-top: 24px;">
        <button class="inspect-profile-btn" style="width: auto; padding: 10px 24px;" onclick="closeMatchModal()">Close Dossier</button>
      </div>
    `;
  } catch (err) {
    content.innerHTML = '<div style="color: #ef4444; padding: 30px; text-align: center;">Could not load match dossier.</div>';
  }
}

function closeMatchModal() {
  document.getElementById('match-modal')?.classList.remove('active');
}

// ── PLAYER PROFILE DOSSIER MODAL ─────────────────────────────────
async function openPlayerProfile(playerName) {
  if (!playerName || playerName === 'Draw') return;
  const modal = document.getElementById('player-modal');
  const content = document.getElementById('player-modal-content');
  if (!modal || !content) return;

  content.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-dim);">Loading player dossier...</div>';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/player/${encodeURIComponent(playerName)}`);
    if (!res.ok) throw new Error('Player not found');
    const p = await res.json();

    const verifiedTag = p.verified ? `<span class="verified-pro-tag"><span class="verified-icon">✓</span> VERIFIED PRO</span>` : '';
    const tierBadge = `<span class="tier-badge ${p.tierClass}">${p.tierIcon} ${p.tierTitle}</span>`;

    const badgesList = (p.badges || []).map(b => `
      <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 800; background: ${b.color}22; color: ${b.color}; border: 1px solid ${b.color}55;">
        <span>${b.icon}</span> <span>${b.label}</span>
      </span>
    `).join('');

    const recentMatchesRows = (p.recentMatches || []).map(m => {
      const isWinner = m.winner_name && m.winner_name.toLowerCase() === p.name.toLowerCase();
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 6px; font-size: 0.8rem;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>${m.gameType === 'Monopoly' ? '🎩' : '🎲'}</span>
            <span style="font-weight: 700; color: #fff;">${m.gameType || 'Ludo'}</span>
            <span style="color: var(--text-dim);">#${m.id}</span>
          </div>
          <span style="font-weight: 800; color: ${isWinner ? '#fbbf24' : 'var(--text-dim)'};">${isWinner ? '👑 VICTORY' : 'PARTICIPANT'}</span>
        </div>
      `;
    }).join('') || '<div style="color: var(--text-dim); font-size: 0.8rem;">No recent matches logged yet.</div>';

    content.innerHTML = `
      <div class="dossier-header">
        <div class="dossier-avatar-ring" style="border-color: ${p.tierColor};">
          ${p.tierIcon}
        </div>
        <div>
          <div class="dossier-name">
            <span>${p.name}</span>
            ${verifiedTag}
          </div>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px; flex-wrap: wrap;">
            ${tierBadge}
            <span style="font-size: 0.75rem; color: var(--text-dim);">Combatant ID #${p.playerId || p.id}</span>
          </div>
        </div>
      </div>

      <div class="dossier-stats-grid">
        <div class="dossier-stat-box">
          <div class="stat-label">Battle Rating</div>
          <div class="stat-num" style="color: var(--cyan);">${Number(p.score).toLocaleString()}</div>
        </div>
        <div class="dossier-stat-box">
          <div class="stat-label">Win Rate</div>
          <div class="stat-num" style="color: #10b981;">${p.winRate}%</div>
        </div>
        <div class="dossier-stat-box">
          <div class="stat-label">Victories</div>
          <div class="stat-num" style="color: #f59e0b;">${p.gamesWon}</div>
        </div>
        <div class="dossier-stat-box">
          <div class="stat-label">Matches</div>
          <div class="stat-num">${p.gamesPlayed}</div>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <div class="stat-label" style="margin-bottom: 8px;">Earned Combat Badges</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${badgesList}
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <div class="stat-label" style="margin-bottom: 8px;">Recent Engagements</div>
        ${recentMatchesRows}
      </div>

      <div style="text-align: right; margin-top: 24px;">
        <button class="inspect-profile-btn" style="width: auto; padding: 10px 24px;" onclick="closePlayerModal()">Close Profile</button>
      </div>
    `;
  } catch (err) {
    content.innerHTML = '<div style="color: #ef4444; padding: 30px; text-align: center;">Could not load player dossier.</div>';
  }
}

function closePlayerProfile() { closePlayerModal(); }
function closePlayerModal() {
  document.getElementById('player-modal')?.classList.remove('active');
}

// ── AUDIO SETTINGS MODAL ─────────────────────────────────────────
function initAudioModal() {
  const openBtn = document.getElementById('open-audio-settings-btn');
  if (openBtn) {
    openBtn.onclick = () => {
      document.getElementById('audio-modal')?.classList.add('active');
      loadAudioSettingsUI();
    };
  }
}

function closeAudioModal() {
  document.getElementById('audio-modal')?.classList.remove('active');
}

function loadAudioSettingsUI() {
  const saved = JSON.parse(localStorage.getItem('game_audio_settings') || '{"master":80,"dice":90,"fanfare":75,"muted":false}');
  
  const sm = document.getElementById('slider-master');
  const sd = document.getElementById('slider-dice');
  const sf = document.getElementById('slider-fanfare');
  const cm = document.getElementById('check-mute');

  if (sm) sm.value = saved.master ?? 80;
  if (sd) sd.value = saved.dice ?? 90;
  if (sf) sf.value = saved.fanfare ?? 75;
  if (cm) cm.checked = !!saved.muted;

  document.getElementById('val-master').textContent = (saved.master ?? 80) + '%';
  document.getElementById('val-dice').textContent = (saved.dice ?? 90) + '%';
  document.getElementById('val-fanfare').textContent = (saved.fanfare ?? 75) + '%';
}

function updateAudioSetting(key, val) {
  const saved = JSON.parse(localStorage.getItem('game_audio_settings') || '{"master":80,"dice":90,"fanfare":75,"muted":false}');
  if (key === 'muted') {
    saved.muted = !!val;
  } else {
    saved[key] = Number(val);
    document.getElementById('val-' + key).textContent = val + '%';
  }
  localStorage.setItem('game_audio_settings', JSON.stringify(saved));
  
  if (window.AudioSettings && window.AudioSettings.load) {
    window.AudioSettings.load();
  }
}

// Close modals on clicking background backdrop
window.addEventListener('click', (e) => {
  ['match-modal', 'player-modal', 'audio-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el && e.target === el) {
      el.classList.remove('active');
    }
  });
});
