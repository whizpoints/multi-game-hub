document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  loadMatches();
});

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
      const playersNames = match.players.map(p => p.name).join(', ');
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td style="font-weight: 600; color: #eab308;">🏆 ${match.winner_name || 'Draw'}</td>
        <td class="muted">${playersNames}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load matches', err);
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #ef4444; padding: 30px;">Failed to load recent matches.</td></tr>';
  }
}
