document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  loadMatches();
  loadNetworkInfo();
});

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
        setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
      });
    };
  }
}

async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 30px;">No ranked players yet. Join a game!</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach((p, i) => {
      const rank = i + 1;
      let rankDisplay = rank;
      if (rank === 1) rankDisplay = '🏆';
      else if (rank === 2) rankDisplay = '🥈';
      else if (rank === 3) rankDisplay = '🥉';

      const winRate = p.gamesPlayed ? Math.round((p.gamesWon / p.gamesPlayed) * 100) : 0;
      const classId = p.rankClass.replace(/\+/g, 'p').toLowerCase();
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="rank-${rank <= 3 ? rank : 'other'}">${rankDisplay}</td>
        <td style="font-weight: 600; color: #3b82f6;">${p.name}</td>
        <td><span class="class-badge class-${classId}">${p.rankClass}</span></td>
        <td style="font-weight: 700;">${p.score.toLocaleString()}</td>
        <td class="muted">${winRate}% (${p.gamesWon}W / ${p.gamesPlayed}G)</td>
        <td class="muted">⚔️ ${p.kills}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load leaderboard', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 30px;">Failed to load leaderboard.</td></tr>';
  }
}

async function loadMatches() {
  const tbody = document.getElementById('matches-body');
  try {
    const res = await fetch('/api/matches');
    const data = await res.json();
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 30px;">No matches yet. Be the first to play!</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach((match) => {
      const d = new Date(match.date);
      const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const streakBadge = (match.streak && match.streak > 1) 
        ? ` <span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 800; border: 1px solid rgba(245, 158, 11, 0.4); margin-left: 6px;">🔥 ${match.streak} Streak</span>` 
        : '';
      
      const playersChips = (match.players && match.players.length > 0)
        ? match.players.map(p => {
            const isWinner = (p.name && match.winner_name && p.name.toLowerCase() === match.winner_name.toLowerCase());
            return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: ${isWinner ? 'rgba(234, 179, 8, 0.18)' : 'rgba(255,255,255,0.06)'}; color: ${isWinner ? '#eab308' : '#cbd5e1'}; border: 1px solid ${isWinner ? 'rgba(234, 179, 8, 0.4)' : 'rgba(255,255,255,0.1)'}; margin: 2px 3px;">${isWinner ? '👑 ' : ''}${p.name || 'Player'}</span>`;
          }).join('')
        : '<span class="muted">-</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td style="font-weight: 700; color: #eab308;">🏆 ${match.winner_name || 'Draw'}${streakBadge}</td>
        <td><div style="display: flex; flex-wrap: wrap; gap: 2px; align-items: center;">${playersChips}</div></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load matches', err);
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #ef4444; padding: 30px;">Failed to load recent matches.</td></tr>';
  }
}
