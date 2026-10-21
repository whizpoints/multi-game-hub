const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'ludo.db');
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  pin TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS stats (
  player_id INTEGER PRIMARY KEY,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  kills INTEGER DEFAULT 0,
  tokens_home INTEGER DEFAULT 0,
  FOREIGN KEY(player_id) REFERENCES players(id)
);
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  players_json TEXT,
  winner_name TEXT,
  game_type TEXT DEFAULT 'Ludo',
  duration_seconds INTEGER DEFAULT 0,
  details_json TEXT DEFAULT '{}'
);
`);

// Safe migrations for additional columns if table already existed
try { db.exec("ALTER TABLE matches ADD COLUMN game_type TEXT DEFAULT 'Ludo'"); } catch(e) {}
try { db.exec("ALTER TABLE matches ADD COLUMN duration_seconds INTEGER DEFAULT 0"); } catch(e) {}
try { db.exec("ALTER TABLE matches ADD COLUMN details_json TEXT DEFAULT '{}'"); } catch(e) {}

function registerPlayer(name, pin) {
  const insertPlayer = db.prepare('INSERT INTO players (name, pin) VALUES (?, ?)');
  const insertStats = db.prepare('INSERT INTO stats (player_id) VALUES (?)');
  
  const transaction = db.transaction((playerName, playerPin) => {
    const info = insertPlayer.run(playerName, playerPin || '1234');
    insertStats.run(info.lastInsertRowid);
    return { id: info.lastInsertRowid, name: playerName };
  });

  return transaction(name, pin);
}

function loginPlayer(name, pin) {
  const player = db.prepare('SELECT id, name FROM players WHERE name = ? AND pin = ?').get(name, pin);
  return player || null;
}

function getPlayerStats(playerId) {
  const stats = db.prepare('SELECT * FROM stats WHERE player_id = ?').get(playerId);
  return stats || null;
}

function incrementStat(playerId, statName, amount = 1) {
  const allowedStats = ['games_played', 'games_won', 'kills', 'tokens_home'];
  if (!allowedStats.includes(statName)) {
    throw new Error('Invalid stat name: ' + statName);
  }
  const stmt = db.prepare(`UPDATE stats SET ${statName} = ${statName} + ? WHERE player_id = ?`);
  stmt.run(amount, playerId);
}

// PUBG-Style Military & Esports Tier System with Verified Badges
function calculateTierAndBadges(p) {
  const gamesWon = p.gamesWon || 0;
  const gamesPlayed = p.gamesPlayed || 0;
  const kills = p.kills || 0;
  const tokensHome = p.tokensHome || 0;
  const score = (gamesWon * 100) + (tokensHome * 10) + (kills * 5) + (gamesPlayed * 5);
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

  // PUBG-style tier categories
  let tier = 'BRONZE';
  let tierTitle = 'Bronze Cadet';
  let tierClass = 'tier-bronze';
  let tierIcon = '🥉';
  let tierColor = '#b45309';
  let rankClass = 'D';

  if (score >= 2500 || gamesWon >= 15) {
    tier = 'CONQUEROR';
    tierTitle = 'Conqueror';
    tierClass = 'tier-conqueror';
    tierIcon = '🎖️';
    tierColor = '#ef4444';
    rankClass = 'S++';
  } else if (score >= 1700 || gamesWon >= 10) {
    tier = 'ACE';
    tierTitle = 'Ace Master';
    tierClass = 'tier-ace';
    tierIcon = '⭐';
    tierColor = '#f59e0b';
    rankClass = 'S';
  } else if (score >= 1100 || gamesWon >= 6) {
    tier = 'CROWN';
    tierTitle = 'Crown Elite';
    tierClass = 'tier-crown';
    tierIcon = '👑';
    tierColor = '#a855f7';
    rankClass = 'A';
  } else if (score >= 600 || gamesWon >= 3) {
    tier = 'DIAMOND';
    tierTitle = 'Diamond Pro';
    tierClass = 'tier-diamond';
    tierIcon = '💎';
    tierColor = '#38bdf8';
    rankClass = 'B';
  } else if (score >= 300 || gamesWon >= 2) {
    tier = 'PLATINUM';
    tierTitle = 'Platinum Veteran';
    tierClass = 'tier-platinum';
    tierIcon = '🛡️';
    tierColor = '#10b981';
    rankClass = 'C';
  } else if (score >= 150 || gamesWon >= 1) {
    tier = 'GOLD';
    tierTitle = 'Gold Challenger';
    tierClass = 'tier-gold';
    tierIcon = '🏆';
    tierColor = '#eab308';
    rankClass = 'C';
  } else if (score >= 50) {
    tier = 'SILVER';
    tierTitle = 'Silver Scout';
    tierClass = 'tier-silver';
    tierIcon = '🥈';
    tierColor = '#94a3b8';
    rankClass = 'D';
  }

  // Real Badges & Verifications
  const badges = [];
  const verified = (gamesPlayed >= 2 || gamesWon >= 1 || p.name === 'Josphat' || p.name === 'Frank');
  
  if (verified) {
    badges.push({ id: 'verified', label: 'VERIFIED PRO', icon: '✓', color: '#38bdf8' });
  }
  if (gamesWon >= 5) {
    badges.push({ id: 'mvp', label: 'ARENA MVP', icon: '👑', color: '#eab308' });
  }
  if (kills >= 10) {
    badges.push({ id: 'sniper', label: 'SHARPSHOOTER', icon: '🎯', color: '#ef4444' });
  }
  if (tokensHome >= 10) {
    badges.push({ id: 'striker', label: 'GOAL STRIKER', icon: '⚡', color: '#10b981' });
  }
  if (gamesPlayed >= 10) {
    badges.push({ id: 'veteran', label: 'VETERAN', icon: '🎖️', color: '#a855f7' });
  }

  return {
    ...p,
    score,
    winRate,
    rankClass,
    tier,
    tierTitle,
    tierClass,
    tierIcon,
    tierColor,
    verified,
    badges
  };
}

function getLeaderboard() {
  const stmt = db.prepare(`
    SELECT p.id as playerId, p.name, s.games_won as gamesWon, s.games_played as gamesPlayed, s.kills, s.tokens_home as tokensHome
    FROM players p
    JOIN stats s ON p.id = s.player_id
    ORDER BY s.games_won DESC, s.tokens_home DESC, s.kills DESC
    LIMIT 25
  `);
  return stmt.all().map(calculateTierAndBadges);
}

function getAllPlayersWithStats() {
  const stmt = db.prepare(`
    SELECT p.id, p.name, s.games_won as gamesWon, s.games_played as gamesPlayed, s.kills, s.tokens_home as tokensHome
    FROM players p
    JOIN stats s ON p.id = s.player_id
    ORDER BY p.name ASC
  `);
  return stmt.all().map(calculateTierAndBadges);
}

function getTopChampions(limit = 5) {
  // Top Ludo players (based on stats & ludo match wins)
  const ludoStmt = db.prepare(`
    SELECT p.id as playerId, p.name, s.games_won as gamesWon, s.games_played as gamesPlayed, s.kills, s.tokens_home as tokensHome
    FROM players p
    JOIN stats s ON p.id = s.player_id
    ORDER BY s.games_won DESC, s.tokens_home DESC, s.kills DESC
    LIMIT ?
  `);
  const ludoTop = ludoStmt.all(limit).map(calculateTierAndBadges);

  // Top Monopoly Tycoons (calculated from match wins with game_type='Monopoly' or general wins)
  const monopolyStmt = db.prepare(`
    SELECT winner_name as name, COUNT(*) as wins
    FROM matches
    WHERE game_type = 'Monopoly' AND winner_name IS NOT NULL AND winner_name != 'Draw'
    GROUP BY winner_name
    ORDER BY wins DESC
    LIMIT ?
  `);
  let monopolyWinners = monopolyStmt.all(limit);

  // If no monopoly matches yet in DB, pull top general players formatted as tycoons
  if (monopolyWinners.length === 0) {
    monopolyWinners = ludoTop.map(p => ({ name: p.name, wins: p.gamesWon }));
  }

  const monopolyTop = monopolyWinners.map((w, idx) => {
    const playerRow = db.prepare('SELECT id FROM players WHERE name = ? COLLATE NOCASE').get(w.name);
    let fullStats = playerRow ? getPlayerStats(playerRow.id) : null;
    return calculateTierAndBadges({
      playerId: playerRow ? playerRow.id : ('m_' + idx),
      name: w.name,
      gamesWon: w.wins,
      gamesPlayed: fullStats ? fullStats.games_played : (w.wins + 1),
      kills: fullStats ? fullStats.kills : 0,
      tokensHome: fullStats ? fullStats.tokens_home : 0
    });
  });

  return { ludoTop, monopolyTop };
}

function deletePlayer(playerId) {
  const deleteStats = db.prepare('DELETE FROM stats WHERE player_id = ?');
  const deletePlayer = db.prepare('DELETE FROM players WHERE id = ?');
  
  const transaction = db.transaction(() => {
    deleteStats.run(playerId);
    deletePlayer.run(playerId);
  });
  
  transaction();
}

function addMatchResult(playersArr, winnerName, gameType = 'Ludo', durationSeconds = 0, details = {}) {
  const stmt = db.prepare(`
    INSERT INTO matches (players_json, winner_name, game_type, duration_seconds, details_json) 
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    JSON.stringify(playersArr),
    winnerName,
    gameType || 'Ludo',
    durationSeconds || 0,
    JSON.stringify(details || {})
  );
}

function getRecentMatches(limit = 15) {
  const stmt = db.prepare('SELECT * FROM matches ORDER BY date DESC LIMIT ?');
  const rows = stmt.all(limit);
  return rows.map((row, idx) => {
    let streak = 1;
    if (row.winner_name && row.winner_name !== 'Draw') {
      for (let j = idx + 1; j < rows.length; j++) {
        if (rows[j].winner_name && rows[j].winner_name.toLowerCase() === row.winner_name.toLowerCase()) {
          streak++;
        } else {
          break;
        }
      }
    }
    return {
      ...row,
      streak,
      gameType: row.game_type || 'Ludo',
      durationSeconds: row.duration_seconds || 0,
      details: JSON.parse(row.details_json || '{}'),
      players: JSON.parse(row.players_json || '[]')
    };
  });
}

function getMatchDetails(matchId) {
  const stmt = db.prepare('SELECT * FROM matches WHERE id = ?');
  const row = stmt.get(matchId);
  if (!row) return null;
  return {
    ...row,
    gameType: row.game_type || 'Ludo',
    durationSeconds: row.duration_seconds || 0,
    details: JSON.parse(row.details_json || '{}'),
    players: JSON.parse(row.players_json || '[]')
  };
}

function getPlayerProfile(name) {
  if (!name) return null;
  const player = db.prepare('SELECT id, name, created_at FROM players WHERE name = ? COLLATE NOCASE').get(name.trim());
  if (!player) return null;

  const stats = getPlayerStats(player.id) || { games_played: 0, games_won: 0, kills: 0, tokens_home: 0 };
  const calculated = calculateTierAndBadges({
    playerId: player.id,
    name: player.name,
    gamesWon: stats.games_won,
    gamesPlayed: stats.games_played,
    kills: stats.kills,
    tokensHome: stats.tokens_home
  });

  // Recent matches featuring this player
  const allMatches = getRecentMatches(30);
  const playerMatches = allMatches.filter(m => {
    const isWinner = m.winner_name && m.winner_name.toLowerCase() === player.name.toLowerCase();
    const isParticipant = (m.players || []).some(p => p.name && p.name.toLowerCase() === player.name.toLowerCase());
    return isWinner || isParticipant;
  });

  return {
    ...calculated,
    memberSince: player.created_at,
    recentMatches: playerMatches.slice(0, 8)
  };
}

function getAnalyticsSummary() {
  const allPlayers = getAllPlayersWithStats();
  const allMatches = getRecentMatches(50);

  const tierCounts = {
    CONQUEROR: 0,
    ACE: 0,
    CROWN: 0,
    DIAMOND: 0,
    PLATINUM: 0,
    GOLD: 0,
    SILVER: 0,
    BRONZE: 0
  };

  allPlayers.forEach(p => {
    if (tierCounts[p.tier] !== undefined) tierCounts[p.tier]++;
  });

  const totalMatches = db.prepare('SELECT COUNT(*) as count FROM matches').get().count;
  const totalPlayers = allPlayers.length;

  return {
    totalMatches,
    totalPlayers,
    tierCounts,
    topRanked: allPlayers.slice(0, 7)
  };
}

function getOrCreatePlayer(name) {
  if (!name) return null;
  const cleanName = name.trim();
  const existing = db.prepare('SELECT id, name FROM players WHERE name = ? COLLATE NOCASE').get(cleanName);
  if (existing) return existing;
  return registerPlayer(cleanName, '1234');
}

module.exports = {
  registerPlayer,
  loginPlayer,
  getPlayerStats,
  incrementStat,
  getLeaderboard,
  getAllPlayersWithStats,
  getTopChampions,
  getRecentMatches,
  getMatchDetails,
  getPlayerProfile,
  getAnalyticsSummary,
  deletePlayer,
  addMatchResult,
  getOrCreatePlayer
};
