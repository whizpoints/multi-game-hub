const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'ludo.db');
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
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
  winner_name TEXT
);
`);

function registerPlayer(name) {
  const insertPlayer = db.prepare('INSERT INTO players (name) VALUES (?)');
  const insertStats = db.prepare('INSERT INTO stats (player_id) VALUES (?)');
  
  const transaction = db.transaction((playerName) => {
    const info = insertPlayer.run(playerName);
    insertStats.run(info.lastInsertRowid);
    return { id: info.lastInsertRowid, name: playerName };
  });

  return transaction(name);
}

function loginPlayer(name) {
  const player = db.prepare('SELECT id, name FROM players WHERE name = ?').get(name);
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

function getLeaderboard() {
  const stmt = db.prepare(`
    SELECT p.id as playerId, p.name, s.games_won as gamesWon, s.games_played as gamesPlayed, s.kills, s.tokens_home as tokensHome
    FROM players p
    JOIN stats s ON p.id = s.player_id
    ORDER BY s.games_won DESC, s.tokens_home DESC, s.kills DESC
    LIMIT 20
  `);
  return stmt.all().map(calculateClass);
}

function getAllPlayersWithStats() {
  const stmt = db.prepare(`
    SELECT p.id, p.name, s.games_won as gamesWon, s.games_played as gamesPlayed, s.kills, s.tokens_home as tokensHome
    FROM players p
    JOIN stats s ON p.id = s.player_id
    ORDER BY p.name ASC
  `);
  return stmt.all().map(calculateClass);
}

function calculateClass(p) {
  const score = (p.gamesWon * 100) + (p.tokensHome * 10) + (p.kills * 5) + (p.gamesPlayed * 5);
  let rankClass = 'D';
  if (score >= 3500) rankClass = 'S++';
  else if (score >= 2000) rankClass = 'S';
  else if (score >= 1000) rankClass = 'A';
  else if (score >= 500) rankClass = 'B';
  else if (score >= 200) rankClass = 'C';
  
  return { ...p, score, rankClass };
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

function addMatchResult(playersArr, winnerName) {
  const stmt = db.prepare('INSERT INTO matches (players_json, winner_name) VALUES (?, ?)');
  stmt.run(JSON.stringify(playersArr), winnerName);
}

function getRecentMatches() {
  const stmt = db.prepare('SELECT * FROM matches ORDER BY date DESC LIMIT 5');
  return stmt.all().map(row => ({
    ...row,
    players: JSON.parse(row.players_json)
  }));
}

module.exports = {
  registerPlayer,
  loginPlayer,
  getPlayerStats,
  incrementStat,
  getLeaderboard,
  getAllPlayersWithStats,
  deletePlayer,
  addMatchResult,
  getRecentMatches
};
