const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const db = require('./database');
const { getRandomBotName } = require('./botNames');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }
});

app.use(express.json());

// Stroke-Play Clean URLs (Redirect legacy .html to clean endpoints)
app.get('/play.html', (req, res) => {
  res.redirect(301, '/play');
});
app.get('/monopoly/index.html', (req, res) => {
  res.redirect(301, '/monopoly');
});
app.get('/monopoly/play', (req, res) => {
  res.redirect(301, '/monopoly');
});

app.get('/play', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'play.html'));
});

app.get('/monopoly', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monopoly', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));
app.get('/log-error', (req, res) => { console.error('CLIENT ERROR:', req.query.msg); res.send('logged'); });

// ── IP & NETWORK DISCOVERY ───────────────────────────────────────────────────
function getNetworkIps() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, address: net.address });
      }
    }
  }
  return results;
}

app.get('/api/server-info', (req, res) => {
  const ips = getNetworkIps();
  const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';
  const port = process.env.PORT || 3000;
  res.json({
    port,
    primaryIp,
    ips: ips.map(i => i.address),
    interfaces: ips,
    hubUrl: `http://${primaryIp}:${port}/`,
    ludoUrl: `http://${primaryIp}:${port}/play`,
    monopolyUrl: `http://${primaryIp}:${port}/monopoly/index.html`
  });
});


// ── BOARD CONSTANTS ──────────────────────────────────────────────────────────
const COLORS = ['Red', 'Green', 'Blue', 'Yellow'];

// 15×15 grid. Common path: 52 squares {row,col} going clockwise.
const COMMON_PATH = [
  {row:6,col:1},{row:6,col:2},{row:6,col:3},{row:6,col:4},{row:6,col:5},             
  {row:5,col:6},{row:4,col:6},{row:3,col:6},{row:2,col:6},{row:1,col:6},{row:0,col:6},
  {row:0,col:7},{row:0,col:8},                                                        
  {row:1,col:8},{row:2,col:8},{row:3,col:8},{row:4,col:8},{row:5,col:8},              
  {row:6,col:9},{row:6,col:10},{row:6,col:11},{row:6,col:12},{row:6,col:13},{row:6,col:14}, 
  {row:7,col:14},{row:8,col:14},                                                      
  {row:8,col:13},{row:8,col:12},{row:8,col:11},{row:8,col:10},{row:8,col:9},          
  {row:9,col:8},{row:10,col:8},{row:11,col:8},{row:12,col:8},{row:13,col:8},{row:14,col:8}, 
  {row:14,col:7},{row:14,col:6},                                                      
  {row:13,col:6},{row:12,col:6},{row:11,col:6},{row:10,col:6},{row:9,col:6},          
  {row:8,col:5},{row:8,col:4},{row:8,col:3},{row:8,col:2},{row:8,col:1},{row:8,col:0},
  {row:7,col:0},{row:6,col:0}                                                         
];

const COLOR_START = { Red: 0, Green: 13, Blue: 26, Yellow: 39 };
const HOME_ENTRY_INDEX = { Red: 50, Green: 11, Blue: 24, Yellow: 37 };

const HOME_COLUMNS = {
  Red:    [{row:7,col:1},{row:7,col:2},{row:7,col:3},{row:7,col:4},{row:7,col:5}],
  Green:  [{row:1,col:7},{row:2,col:7},{row:3,col:7},{row:4,col:7},{row:5,col:7}],
  Blue:   [{row:7,col:13},{row:7,col:12},{row:7,col:11},{row:7,col:10},{row:7,col:9}],
  Yellow: [{row:13,col:7},{row:12,col:7},{row:11,col:7},{row:10,col:7},{row:9,col:7}]
};

const HOME_CENTER = {row:7, col:7};
const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

// Perfectly centered pixel coordinates for cages
const CAGE_PIXELS = {
  Red:    [{x:130,y:130},{x:230,y:130},{x:130,y:230},{x:230,y:230},{x:130,y:180},{x:230,y:180}],
  Green:  [{x:670,y:130},{x:770,y:130},{x:670,y:230},{x:770,y:230},{x:670,y:180},{x:770,y:180}],
  Yellow: [{x:130,y:670},{x:230,y:670},{x:130,y:770},{x:230,y:770},{x:130,y:720},{x:230,y:720}],
  Blue:   [{x:670,y:670},{x:770,y:670},{x:670,y:770},{x:770,y:770},{x:670,y:720},{x:770,y:720}]
};

// Coordinates for pawns that have reached HOME (inside the center triangles)
const HOME_PIXELS = {
  Red:    [{x:385,y:450},{x:385,y:420},{x:385,y:480},{x:415,y:435},{x:415,y:465},{x:435,y:450}],
  Green:  [{x:450,y:385},{x:420,y:385},{x:480,y:385},{x:435,y:415},{x:465,y:415},{x:450,y:435}],
  Blue:   [{x:515,y:450},{x:515,y:480},{x:515,y:420},{x:485,y:465},{x:485,y:435},{x:465,y:450}],
  Yellow: [{x:450,y:515},{x:480,y:515},{x:420,y:515},{x:465,y:485},{x:435,y:485},{x:450,y:465}]
};

// ── GAME STATE ───────────────────────────────────────────────────────────────
function freshGameState() {
  return {
    status: 'LOBBY',
    players: {},       
    turnOrder: [],     
    currentTurnIndex: 0,
    tokens: {},        
    tokensPerPlayer: 4, 
    enableBlockRule: true,
    consecutiveSixes: 0,
    lastMovedToken: null,
    diceRoll: null,
    hasRolled: false,
    awaitingTokenSelection: false,
    rankings: [],
    pausedFor: null,
    restartVotes: {},
    hostPersistentId: null,
    hostSocketId: null
  };
}

let gs = freshGameState();

// ── HELPERS ──────────────────────────────────────────────────────────────────
function rollDice() { return crypto.randomInt(1, 7); }

function getPlayerPubgProfile(name, isBot, botTrait) {
  if (isBot) {
    const traits = ['TYCOON', 'DEALMAKER', 'CAUTIOUS', 'STRATEGIST'];
    const trait = botTrait || traits[Math.abs((name || 'bot').split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % traits.length];
    const botTiers = {
      'TYCOON': { tier: 'CONQUEROR', title: 'Conqueror AI', icon: '👑', color: '#ef4444', score: 3200, winRate: 68 },
      'DEALMAKER': { tier: 'ACE', title: 'Ace Master AI', icon: '⭐', color: '#f59e0b', score: 2450, winRate: 61 },
      'STRATEGIST': { tier: 'CROWN', title: 'Crown Elite AI', icon: '◆', color: '#a855f7', score: 1850, winRate: 54 },
      'CAUTIOUS': { tier: 'DIAMOND', title: 'Diamond Pro AI', icon: '❖', color: '#00f0ff', score: 1400, winRate: 49 }
    };
    const t = botTiers[trait] || botTiers['TYCOON'];
    return {
      name,
      isBot: true,
      botTrait: trait,
      verified: false,
      tier: t.tier,
      tierTitle: t.title,
      tierClass: 'tier-' + t.tier.toLowerCase(),
      tierIcon: t.icon,
      tierColor: t.color,
      score: t.score,
      winRate: t.winRate,
      badges: [
        { id: 'ai', label: `🤖 AI • ${trait}`, icon: '🤖', color: '#00f0ff' },
        { id: 'ai_tier', label: `ESPORTS AI`, icon: '⚡', color: t.color }
      ]
    };
  }

  const profile = (db && db.getPlayerProfile) ? db.getPlayerProfile(name) : null;
  if (profile) {
    return {
      name,
      isBot: false,
      verified: profile.verified,
      tier: profile.tier,
      tierTitle: profile.tierTitle,
      tierClass: profile.tierClass,
      tierIcon: profile.tierIcon,
      tierColor: profile.tierColor,
      score: profile.score,
      winRate: profile.winRate,
      badges: profile.badges || []
    };
  }

  const isJosphat = (name && name.toLowerCase() === 'josphat');
  return {
    name,
    isBot: false,
    verified: isJosphat,
    tier: isJosphat ? 'CONQUEROR' : 'PLATINUM',
    tierTitle: isJosphat ? 'Conqueror' : 'Platinum Contender',
    tierClass: isJosphat ? 'tier-conqueror' : 'tier-platinum',
    tierIcon: isJosphat ? '👑' : '🛡️',
    tierColor: isJosphat ? '#ef4444' : '#10b981',
    score: isJosphat ? 4420 : 750,
    winRate: isJosphat ? 78 : 50,
    badges: isJosphat ? [
      { id: 'verified', label: 'VERIFIED PRO', icon: '✓', color: '#00f0ff' },
      { id: 'mvp', label: 'ARENA MVP', icon: '👑', color: '#f59e0b' }
    ] : [
      { id: 'contender', label: 'CONTENDER', icon: '⚡', color: '#10b981' }
    ]
  };
}

function stepToCommonIndex(color, step) {
  if (step < 1 || step > 51) return null;
  return (COLOR_START[color] + step - 1) % 52;
}

function playersArray() {
  return gs.turnOrder.map(pid => {
    const p = gs.players[pid];
    if (!p) return null;
    const isBot = !!(p.isBot || pid.startsWith('bot_'));
    const pubg = getPlayerPubgProfile(p.name, isBot, p.botTrait);
    return {
      id: pid,
      name: p.name,
      color: p.color,
      connected: p.connected,
      hostId: p.hostId,
      isBot: isBot,
      isHost: (pid === gs.hostPersistentId),
      ...pubg
    };
  }).filter(Boolean);
}

function emitLobbyUpdate() {
  io.emit('lobbyUpdate', { players: playersArray(), hostId: gs.hostPersistentId });
}

function currentColor() {
  const pid = gs.turnOrder[gs.currentTurnIndex];
  return pid ? gs.players[pid]?.color : null;
}

function isPathBlocked(color, fromStep, toStep) {
  if (!gs.enableBlockRule) return false;
  
  for (let s = fromStep + 1; s <= Math.min(toStep, 51); s++) {
    const ci = stepToCommonIndex(color, s);
    
    // Safe squares (Stars/Starts) have no restrictions or blocks!
    if (SAFE_SQUARES.includes(ci)) continue;

    for (const c of Object.keys(gs.tokens)) {
      if (c === color) continue;
      let count = 0;
      for (const t of gs.tokens[c]) {
        if (t >= 1 && t <= 51 && stepToCommonIndex(c, t) === ci) count++;
      }
      if (count >= 2) return true;
    }
  }
  return false;
}

function getValidMoves(color, roll) {
  const tokens = gs.tokens[color];
  const moves = [];
  for (let i = 0; i < gs.tokensPerPlayer; i++) {
    const step = tokens[i];
    let canMove = false;
    let newStep = null;

    if (step === 0) {
      if (roll === 6) {
        if (!isPathBlocked(color, 0, 1)) {
          canMove = true; newStep = 1;
        }
      }
    } else if (step >= 1 && step <= 51) {
      const ns = step + roll;
      if (ns <= 57) {
        if (ns <= 51) {
          if (!isPathBlocked(color, step, ns)) {
            canMove = true; newStep = ns;
          }
        } else {
          if (!isPathBlocked(color, step, 51)) {
            canMove = true; newStep = ns;
          }
        }
      }
    } else if (step >= 52 && step <= 56) {
      const ns = step + roll;
      if (ns <= 57) { canMove = true; newStep = ns; }
    }

    moves.push({ tokenIndex: i, canMove, newStep });
  }
  return moves;
}

function performRoll(pid) {
  if (gs.status !== 'PLAYING') return;
  const currentPlayer = gs.players[pid];
  if (!currentPlayer || gs.hasRolled) return;

  const roll = rollDice(); // Secure cryptographic random
  gs.diceRoll = roll;
  gs.hasRolled = true;

  if (roll === 6) gs.consecutiveSixes++;
  else gs.consecutiveSixes = 0;

  if (gs.consecutiveSixes === 3) {
    let penaltyToken = null;
    if (gs.lastMovedToken) {
      const { color: lc, index: li } = gs.lastMovedToken;
      if (gs.tokens[lc] && gs.tokens[lc][li] >= 1 && gs.tokens[lc][li] <= 56) {
        gs.tokens[lc][li] = 0;
        penaltyToken = { color: lc, tokenIndex: li };
      }
    }
    gs.consecutiveSixes = 0;
    io.emit('diceResult', { roll, playerColor: currentPlayer.color, playerId: pid, validMoves: [], autoEndTurn: true });
    io.emit('playSound', 'rollDice');
    io.emit('penaltyTripleSix', { color: currentPlayer.color, penaltyToken, allTokens: gs.tokens });
    setTimeout(() => nextTurn(), 1800);
    return;
  }

  const color = currentPlayer.color;
  const moves = getValidMoves(color, roll);
  const anyValid = moves.some(m => m.canMove);
  const validOnly = moves.filter(m => m.canMove);
  gs.awaitingTokenSelection = anyValid;

  io.emit('diceResult', {
    roll,
    playerColor: color,
    playerId: pid,
    validMoves: validOnly,
    autoEndTurn: !anyValid
  });
  io.emit('playSound', 'rollDice');

  if (!anyValid) {
    setTimeout(() => nextTurn(), 1500);
  } else if (validOnly.length === 1) {
    setTimeout(() => { executeMove(pid, validOnly[0].tokenIndex); }, 600);
  } else if (currentPlayer.isBot) {
    setTimeout(() => {
      const sortedMoves = validOnly.sort((a, b) => {
        if (a.newStep === 57 && b.newStep !== 57) return -1;
        if (b.newStep === 57 && a.newStep !== 57) return 1;
        
        const aCapture = isCaptureMoveForAI(color, a.newStep);
        const bCapture = isCaptureMoveForAI(color, b.newStep);
        if (aCapture && !bCapture) return -1;
        if (bCapture && !aCapture) return 1;
        
        if (gs.tokens[color][a.tokenIndex] === 0 && gs.tokens[color][b.tokenIndex] !== 0) return -1;
        if (gs.tokens[color][b.tokenIndex] === 0 && gs.tokens[color][a.tokenIndex] !== 0) return 1;
        
        return b.newStep - a.newStep;
      });
      executeMove(pid, sortedMoves[0].tokenIndex);
    }, 1000);
  }
}

function isCaptureMoveForAI(color, newStep) {
  if (newStep < 1 || newStep > 51) return false;
  const destCI = stepToCommonIndex(color, newStep);
  if (SAFE_SQUARES.includes(destCI)) return false;
  for (const oc of Object.keys(gs.tokens)) {
    if (oc === color) continue;
    const occ = gs.tokens[oc].filter(s => s >= 1 && s <= 51 && stepToCommonIndex(oc, s) === destCI);
    if (occ.length === 1) return true;
  }
  return false;
}

function startDisconnectTimer(pid) {
  const p = gs.players[pid];
  if (!p) return;
  if (p.disconnectTimer) {
    clearTimeout(p.disconnectTimer);
    p.disconnectTimer = null;
  }
  // Bot takeover removed: match remains paused waiting for the human player to reconnect
}

function nextTurn() {
  if (gs.status !== 'PLAYING') return;
  if (gs.diceRoll !== 6) gs.consecutiveSixes = 0;

  let loops = 0;
  do {
    gs.currentTurnIndex = (gs.currentTurnIndex + 1) % gs.turnOrder.length;
    loops++;
  } while (
    gs.rankings.find(r => r.playerId === gs.turnOrder[gs.currentTurnIndex]) &&
    loops < gs.turnOrder.length
  );

  gs.hasRolled = false;
  gs.awaitingTokenSelection = false;
  gs.diceRoll = null;

  const nextPid = gs.turnOrder[gs.currentTurnIndex];
  if (gs.players[nextPid] && !gs.players[nextPid].connected) {
    gs.status = 'PAUSED';
    gs.pausedFor = nextPid;
    io.emit('gamePaused', { color: gs.players[nextPid].color, name: gs.players[nextPid].name });
    startDisconnectTimer(nextPid);
    return;
  }

  io.emit('turnChanged', { color: currentColor(), name: gs.players[nextPid].name });
  
  if (gs.players[nextPid].isBot) {
    setTimeout(() => performRoll(nextPid), 1500);
  }
}

function checkAllFinished(forceEnd = false) {
  let active = gs.turnOrder.filter(pid => !gs.rankings.find(r => r.playerId === pid));
  if (active.length <= 1 || forceEnd) {
    gs.status = 'FINISHED';
    
    // Sort remaining active players by tokens home (score)
    if (active.length > 0) {
      active.sort((a, b) => {
        const tA = gs.tokens[gs.players[a].color] || [];
        const tB = gs.tokens[gs.players[b].color] || [];
        const homeA = tA.filter(s => s === 57).length;
        const homeB = tB.filter(s => s === 57).length;
        if (homeA !== homeB) return homeB - homeA;
        
        // Tie breaker: sum of all token steps
        const sumA = tA.reduce((acc, val) => acc + val, 0);
        const sumB = tB.reduce((acc, val) => acc + val, 0);
        return sumB - sumA;
      });

      active.forEach(lp => {
        gs.rankings.push({ playerId: lp, color: gs.players[lp].color, name: gs.players[lp].name, rank: gs.rankings.length + 1 });
      });
    }

    // DB updates
    if (gs.rankings.length > 0) {
      try { db.addMatchResult(gs.rankings, gs.rankings[0].name, 'Ludo', 0, { mode: 'Classic Ludo', totalParticipants: gs.rankings.length }); } catch(e){}
      if (gs.players[gs.rankings[0].playerId]?.dbId) {
        try { db.incrementStat(gs.players[gs.rankings[0].playerId].dbId, 'games_won'); } catch(e){}
      }
    }
    for (const pid of gs.turnOrder) {
      if (gs.players[pid]?.dbId) {
        try { db.incrementStat(gs.players[pid].dbId, 'games_played'); } catch(e){}
      }
    }
    setTimeout(() => {
      io.emit('playSound', 'winGame');
      io.emit('gameOver', { rankings: gs.rankings });
    }, 5500); // Wait 5.5s to let the playerFinished toast show
  }
}

// ── REST API ─────────────────────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const name = (req.body.name || '').trim();
  const pin = (req.body.pin || '1234').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const player = db.registerPlayer(name, pin);
    res.json(player);  
  } catch (err) {
    res.status(409).json({ error: 'Name already taken' });
  }
});

app.post('/api/login', (req, res) => {
  const name = (req.body.name || '').trim();
  const pin = (req.body.pin || '').trim();
  if (!name || !pin) return res.status(400).json({ error: 'Name and PIN are required' });
  const player = db.loginPlayer(name, pin);
  if (!player) return res.status(404).json({ error: 'Invalid name or PIN' });
  const stats = db.getPlayerStats(player.id);
  res.json({ id: player.id, name: player.name, gamesPlayed: stats?.games_played ?? 0, wins: stats?.games_won ?? 0 });
});

app.get('/api/players', (_req, res) => {
  res.json(db.getAllPlayersWithStats());
});

app.get('/api/leaderboard', (_req, res) => {
  res.json(db.getLeaderboard());
});

app.get('/api/matches', (_req, res) => {
  res.json(db.getRecentMatches(20));
});

app.get('/api/matches/:id', (req, res) => {
  const m = db.getMatchDetails(req.params.id);
  if (m) res.json(m);
  else res.status(404).json({ error: 'Match not found' });
});

app.get('/api/top-champions', (_req, res) => {
  res.json(db.getTopChampions(5));
});

app.get('/api/player/:name', (req, res) => {
  const p = db.getPlayerProfile(req.params.name);
  if (p) res.json(p);
  else res.status(404).json({ error: 'Player profile not found' });
});

app.get('/api/analytics', (_req, res) => {
  res.json(db.getAnalyticsSummary());
});

app.get('/api/board-config', (_req, res) => {
  res.json({ COMMON_PATH, COLOR_START, HOME_ENTRY_INDEX, HOME_COLUMNS, HOME_CENTER, SAFE_SQUARES, CAGE_PIXELS, HOME_PIXELS });
});

app.delete('/api/players/:id', (req, res) => {
  try {
    db.deletePlayer(req.params.id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SOCKET.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`+ socket ${socket.id}`);

  // ─── IDENTIFY (join / reconnect) ───
  socket.on('identify', ({ persistentId, name, dbId }) => {
    if (!persistentId || !name) return;

    // Check if we should merge with an existing dbId
    let targetPid = persistentId;
    if (dbId) {
      const existingPid = Object.keys(gs.players).find(id => gs.players[id].dbId === dbId);
      if (existingPid) targetPid = existingPid;
    }

    if (gs.players[targetPid]) {
      const p = gs.players[targetPid];
      if (!p.socketIds) p.socketIds = [p.socketId].filter(Boolean);
      if (!p.socketIds.includes(socket.id)) p.socketIds.push(socket.id);
      p.socketId = socket.id; // backward compatibility
      p.connected = true;
      
      // If a real player connects and takes over this slot, the host no longer controls them
      if (persistentId === targetPid || dbId === p.dbId) {
        if (p.hostId && p.hostId !== targetPid) {
          p.hostId = null;
        }
      }

      // Tell the client what their actual in-game ID is (in case they merged into a local_UUID)
      socket.emit('identityUpdated', targetPid);

      if (gs.hostPersistentId === targetPid) {
        gs.hostSocketId = socket.id;
      }

      if (p.disconnectTimer) { clearTimeout(p.disconnectTimer); p.disconnectTimer = null; }
      if (p.wasConvertedToBot) {
        p.isBot = false;
        p.wasConvertedToBot = false;
        io.emit('errorMsg', `${p.name} reconnected and reclaimed their spot!`);
      }

      Object.keys(gs.players).forEach(id => {
        if (gs.players[id].hostId === targetPid) {
          if (!gs.players[id].socketIds) gs.players[id].socketIds = [gs.players[id].socketId].filter(Boolean);
          if (!gs.players[id].socketIds.includes(socket.id)) gs.players[id].socketIds.push(socket.id);
          gs.players[id].socketId = socket.id;
          gs.players[id].connected = true;
          
          if (gs.players[id].disconnectTimer) { clearTimeout(gs.players[id].disconnectTimer); gs.players[id].disconnectTimer = null; }
          if (gs.players[id].wasConvertedToBot) {
            gs.players[id].isBot = false;
            gs.players[id].wasConvertedToBot = false;
          }
        }
      });

      if (gs.status === 'PAUSED' && gs.players[gs.pausedFor]) {
        const pausedPlayer = gs.players[gs.pausedFor];
        if (gs.pausedFor === targetPid || pausedPlayer.hostId === targetPid) {
          gs.status = 'PLAYING';
          gs.pausedFor = null;
          io.emit('gameResumed');
          
          if (pausedPlayer.isBot) {
            setTimeout(() => performRoll(gs.pausedFor), 1500);
          }
        }
      }

      emitLobbyUpdate();

      const currentPid = gs.turnOrder[gs.currentTurnIndex];
      const turnObj = currentPid && gs.players[currentPid] ? { color: gs.players[currentPid].color, name: gs.players[currentPid].name } : null;

      socket.emit('gameStateRecovery', {
        status: gs.status,
        players: playersArray(),
        tokens: gs.tokens,
        turn: turnObj,
        rankings: gs.rankings,
        currentTurnIndex: gs.currentTurnIndex,
        turnOrder: gs.turnOrder,
        hasRolled: gs.hasRolled,
        diceRoll: gs.diceRoll,
        tokensPerPlayer: gs.tokensPerPlayer,
        validMoves: (gs.hasRolled && currentColor()) ? getValidMoves(currentColor(), gs.diceRoll).filter(m => m.canMove) : []
      });
      return;
    }

    if (gs.status !== 'LOBBY') return socket.emit('errorMsg', 'Game in progress.');
    if (gs.turnOrder.length >= 4) return socket.emit('errorMsg', 'Lobby is full.');

    const takenColors = gs.turnOrder.map(id => gs.players[id].color);
    const assignedColor = COLORS.find(c => !takenColors.includes(c)) || COLORS[0];

    gs.players[persistentId] = {
      socketId: socket.id,
      socketIds: [socket.id],
      color: assignedColor,
      name,
      connected: true,
      dbId: dbId || null,
      hasVotedRestart: false,
      hostId: null 
    };
    gs.turnOrder.push(persistentId);

    if (!gs.hostPersistentId) {
      gs.hostPersistentId = persistentId;
      gs.hostSocketId = socket.id;
    }

    emitLobbyUpdate();
    socket.emit('settingsUpdated', { tokensPerPlayer: gs.tokensPerPlayer });
  });

  socket.on('addLocalPlayer', ({ name, hostId, dbId }) => {
    if (gs.status !== 'LOBBY') return;
    if (gs.turnOrder.length >= 4) return socket.emit('errorMsg', 'Lobby is full.');

    if (dbId) {
       const alreadyInLobby = Object.values(gs.players).some(p => p.dbId === dbId);
       if (alreadyInLobby) return socket.emit('errorMsg', 'Player already in lobby.');
    }

    const localId = 'local_' + crypto.randomUUID();
    const takenColors = gs.turnOrder.map(id => gs.players[id].color);
    const assignedColor = COLORS.find(c => !takenColors.includes(c)) || COLORS[0];

    let displayName = name.substring(0, 15);
    if (!dbId) displayName += ' (Guest)';

    gs.players[localId] = {
      socketId: socket.id,
      color: assignedColor,
      name: displayName,
      connected: true,
      dbId: dbId || null,
      hasVotedRestart: false,
      hostId: hostId
    };
    gs.turnOrder.push(localId);

    emitLobbyUpdate();
  });

  socket.on('removePlayer', ({ playerId }) => {
    if (gs.status !== 'LOBBY') return;
    if (gs.players[playerId]) {
      delete gs.players[playerId];
      gs.turnOrder = gs.turnOrder.filter(id => id !== playerId);
      emitLobbyUpdate();
    }
  });

  socket.on('changeColor', ({ playerId, newColor }) => {
    if (gs.status !== 'LOBBY') return;
    if (gs.players[playerId]) {
      const takenColors = gs.turnOrder.map(id => gs.players[id].color);
      if (!takenColors.includes(newColor) && COLORS.includes(newColor)) {
        gs.players[playerId].color = newColor;
        emitLobbyUpdate();
      }
    }
  });

  // ─── UPDATE SETTINGS ───
  socket.on('updateSettings', (settings) => {
    if (gs.status !== 'LOBBY') return;
    if (socket.id !== gs.hostSocketId) return; 
    
    if (settings.tokensPerPlayer !== undefined) {
      gs.tokensPerPlayer = Math.max(1, Math.min(6, settings.tokensPerPlayer));
    }
    if (settings.enableBlockRule !== undefined) {
      gs.enableBlockRule = !!settings.enableBlockRule;
    }
    io.emit('settingsUpdated', { 
      tokensPerPlayer: gs.tokensPerPlayer,
      enableBlockRule: gs.enableBlockRule
    });
  });

    socket.on('addBot', () => {
    if (gs.status !== 'LOBBY') return;
    if (gs.turnOrder.length >= 4) return socket.emit('errorMsg', 'Lobby is full.');

    const botId = 'bot_' + crypto.randomUUID();
    const takenColors = gs.turnOrder.map(id => gs.players[id].color);
    const assignedColor = COLORS.find(c => !takenColors.includes(c)) || COLORS[0];
    
    // Only host can add bots, get host ID
    const requesterPids = Object.keys(gs.players).filter(id => gs.players[id].socketId === socket.id);
    const hostId = gs.turnOrder.length > 0 ? gs.turnOrder[0] : (requesterPids[0] || null);

    const botName = getRandomBotName(Object.values(gs.players).map(p => p.name));
    gs.players[botId] = {
      socketId: 'bot',
      color: assignedColor,
      name: botName,
      connected: true,
      dbId: null,
      hasVotedRestart: false,
      hostId: hostId,
      isBot: true
    };
    gs.turnOrder.push(botId);
    emitLobbyUpdate();
  });

  // ─── START GAME ───
  socket.on('startGame', () => {
    if (gs.status !== 'LOBBY' || gs.turnOrder.length < 2) return;
    gs.status = 'PLAYING';
    gs.currentTurnIndex = 0;
    for (const pid of gs.turnOrder) {
      gs.tokens[gs.players[pid].color] = Array(gs.tokensPerPlayer).fill(0);
    }
    const currentPid = gs.turnOrder[0];
    io.emit('gameStarted', {
      players: playersArray(),
      tokens: gs.tokens,
      turn: { color: gs.players[currentPid].color, name: gs.players[currentPid].name },
      tokensPerPlayer: gs.tokensPerPlayer
    });
    io.emit('turnChanged', { color: currentColor(), name: gs.players[currentPid].name });
    if (gs.players[currentPid].isBot) {
      setTimeout(() => performRoll(currentPid), 1500);
    }
  });

  socket.on('rollDice', () => {
    if (gs.status !== 'PLAYING') return;
    const currentPid = gs.turnOrder[gs.currentTurnIndex];
    const currentPlayer = gs.players[currentPid];
    if (!currentPlayer) return;
    const isOwner = currentPlayer.socketId === socket.id ||
                    (currentPlayer.socketIds && currentPlayer.socketIds.includes(socket.id)) ||
                    (currentPlayer.hostId && (gs.players[currentPlayer.hostId]?.socketId === socket.id || gs.players[currentPlayer.hostId]?.socketIds?.includes(socket.id)));
    if (!isOwner) return;
    performRoll(currentPid);
  });

  // ─── SELECT TOKEN ───
  socket.on('selectToken', ({ tokenIndex }) => {
    if (gs.status !== 'PLAYING') return;
    const currentPid = gs.turnOrder[gs.currentTurnIndex];
    const currentPlayer = gs.players[currentPid];
    if (!currentPlayer) return;
    const isOwner = currentPlayer.socketId === socket.id ||
                    (currentPlayer.socketIds && currentPlayer.socketIds.includes(socket.id)) ||
                    (currentPlayer.hostId && (gs.players[currentPlayer.hostId]?.socketId === socket.id || gs.players[currentPlayer.hostId]?.socketIds?.includes(socket.id)));
    if (!isOwner) return;
    if (!gs.hasRolled || !gs.awaitingTokenSelection) return;
    
    executeMove(currentPid, tokenIndex);
  });

  // ─── PROPOSE RESTART ───
  socket.on('proposeRestart', () => {
    const pidsForSocket = Object.keys(gs.players).filter(id => gs.players[id].socketId === socket.id);
    if (pidsForSocket.length === 0) return;
    
    if (!gs.restartProposal) {
      gs.restartProposal = { votes: {} };
      const proposerName = gs.players[pidsForSocket[0]]?.name || 'A player';
      socket.broadcast.emit('showRestartPrompt', { proposerName });
    }
    
    pidsForSocket.forEach(pid => gs.restartProposal.votes[pid] = true);
    checkRestart();
  });

  socket.on('acceptRestart', () => {
    if (!gs.restartProposal) return;
    const pidsForSocket = Object.keys(gs.players).filter(id => gs.players[id].socketId === socket.id);
    pidsForSocket.forEach(pid => gs.restartProposal.votes[pid] = true);
    checkRestart();
  });

  socket.on('declineRestart', () => {
    gs.restartProposal = null;
    io.emit('restartDeclined');
  });

  function checkRestart() {
    if (!gs.restartProposal) return;
    const connectedSockets = new Set(Object.values(gs.players).filter(p => p.connected).map(p => p.socketId));
    const votedSockets = new Set(Object.keys(gs.restartProposal.votes).map(pid => gs.players[pid]?.socketId));
    
    io.emit('restartVoteUpdate', { votes: votedSockets.size, total: connectedSockets.size });

    if (votedSockets.size === connectedSockets.size && connectedSockets.size > 0) {
      const oldPlayers = { ...gs.players };
      const oldOrder = [...gs.turnOrder];
      const oldTokens = gs.tokensPerPlayer;
      const oldHostPid = gs.hostPersistentId;
      const oldHostSocket = gs.hostSocketId;
      
      // We must reset the object properties completely or re-assign
      Object.assign(gs, freshGameState());
      gs.tokensPerPlayer = oldTokens;
      gs.hostPersistentId = oldHostPid;
      gs.hostSocketId = oldHostSocket;
      // Shuffle colors among players
      const availableColors = [...COLORS];
      for (let i = availableColors.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [availableColors[i], availableColors[j]] = [availableColors[j], availableColors[i]];
      }
      let colorIdx = 0;
      oldOrder.forEach(pid => {
        if (oldPlayers[pid].connected) {
          gs.players[pid] = { ...oldPlayers[pid], hasVotedRestart: false, color: availableColors[colorIdx++] };
          gs.turnOrder.push(pid);
        }
      });
      io.emit('gameRestarted');
      emitLobbyUpdate();
    }
  }

  socket.on('forceEndGame', () => {
    if (gs.status !== 'PLAYING') return;
    const pidsForSocket = Object.keys(gs.players).filter(id => gs.players[id].socketIds?.includes(socket.id) || gs.players[id].socketId === socket.id);
    if (pidsForSocket.length === 0) return;
    const isHost = socket.id === gs.hostSocketId;
    if (isHost) {
      checkAllFinished(true);
    }
  });

  socket.on('forceRestart', () => {
    if (gs.status !== 'PLAYING' && gs.status !== 'FINISHED') return;
    const pidsForSocket = Object.keys(gs.players).filter(id => gs.players[id].socketIds?.includes(socket.id) || gs.players[id].socketId === socket.id);
    if (pidsForSocket.length === 0) return;
    const isHost = socket.id === gs.hostSocketId;
    if (isHost) {
      const oldPlayers = { ...gs.players };
      const oldOrder = [...gs.turnOrder];
      const oldTokens = gs.tokensPerPlayer;
      const oldHostPid = gs.hostPersistentId;
      const oldHostSocket = gs.hostSocketId;
      
      Object.assign(gs, freshGameState());
      gs.tokensPerPlayer = oldTokens;
      gs.hostPersistentId = oldHostPid;
      gs.hostSocketId = oldHostSocket;
      // Shuffle colors among players
      const availableColors = [...COLORS];
      for (let i = availableColors.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [availableColors[i], availableColors[j]] = [availableColors[j], availableColors[i]];
      }
      let colorIdx = 0;
      oldOrder.forEach(pid => {
        if (oldPlayers[pid].connected || oldPlayers[pid].isBot) {
          gs.players[pid] = { ...oldPlayers[pid], hasVotedRestart: false, color: availableColors[colorIdx++] };
          gs.turnOrder.push(pid);
        }
      });
      io.emit('gameRestarted');
      emitLobbyUpdate();
    }
  });

  // ─── DISCONNECT ───
  socket.on('playerEmote', (data) => {
    io.emit('playerEmote', data);
  });

  socket.on('disconnect', () => {
    const pids = Object.keys(gs.players).filter(id => gs.players[id].socketIds?.includes(socket.id) || gs.players[id].socketId === socket.id);
    pids.forEach(pid => {
      console.log(`- socket ${socket.id}  (${gs.players[pid].name})`);
      const p = gs.players[pid];
      if (p.socketIds) p.socketIds = p.socketIds.filter(id => id !== socket.id);
      
      if (!p.socketIds || p.socketIds.length === 0) {
        p.connected = false;

        if (gs.status === 'PLAYING' && gs.turnOrder[gs.currentTurnIndex] === pid) {
          gs.status = 'PAUSED';
          gs.pausedFor = pid;
          io.emit('gamePaused', { color: gs.players[pid].color, name: gs.players[pid].name });
          startDisconnectTimer(pid);
        }
      }
    });
    if (pids.length > 0) emitLobbyUpdate();
  });
});

// ── Move execution ────────
function executeMove(pid, tokenIndex) {
  const color = gs.players[pid].color;
  const roll = gs.diceRoll;
  const moves = getValidMoves(color, roll);
  const move = moves.find(m => m.tokenIndex === tokenIndex && m.canMove);
  if (!move) return;

  const fromStep = gs.tokens[color][tokenIndex];
  gs.tokens[color][tokenIndex] = move.newStep;
  gs.lastMovedToken = { color, index: tokenIndex };
  io.emit('playSound', 'moveToken');
  gs.awaitingTokenSelection = false;

  let captured = null;
  let bonusRoll = false;

  if (move.newStep >= 1 && move.newStep <= 51) {
    const destCI = stepToCommonIndex(color, move.newStep);
    if (!SAFE_SQUARES.includes(destCI)) {
      for (const oc of Object.keys(gs.tokens)) {
        if (oc === color) continue;
        const occ = [];
        gs.tokens[oc].forEach((s, i) => {
          if (s >= 1 && s <= 51 && stepToCommonIndex(oc, s) === destCI) occ.push(i);
        });
        if (occ.length === 1) {
          gs.tokens[oc][occ[0]] = 0;
          captured = { color: oc, tokenIndex: occ[0] };
          io.emit('playSound', 'captureToken');
          bonusRoll = true;
          if (gs.players[pid]?.dbId) try { db.incrementStat(gs.players[pid].dbId, 'kills'); } catch(e){}
        }
      }
    }
  }

  let reachedHome = false;
  if (move.newStep === 57) {
    reachedHome = true;
    io.emit('playSound', 'homeToken');
    bonusRoll = true;
    if (gs.players[pid]?.dbId) try { db.incrementStat(gs.players[pid].dbId, 'tokens_home'); } catch(e){}
    if (gs.tokens[color].every(s => s === 57)) {
      gs.rankings.push({ playerId: pid, color, name: gs.players[pid].name, rank: gs.rankings.length + 1 });
      io.emit('playerFinished', { color, name: gs.players[pid].name, rank: gs.rankings.length, playerId: pid });
      checkAllFinished();
    }
  }

  if (roll === 6) bonusRoll = true;

  io.emit('tokenMoved', {
    color,
    tokenIndex,
    fromStep,
    toStep: move.newStep,
    capturedInfo: captured,
    isCapture: !!captured,
    reachedHome,
    allTokens: gs.tokens
  });

  if (gs.status === 'FINISHED') return;

  if (bonusRoll) {
    gs.hasRolled = false;
    gs.awaitingTokenSelection = false;
    gs.diceRoll = null;
    setTimeout(() => {
      io.emit('bonusRoll', { color });
      if (gs.players[pid].isBot) {
        setTimeout(() => performRoll(pid), 1000);
      }
    }, 800);
  } else {
    setTimeout(() => nextTurn(), 600);
  }
}

// ── BOOT ─────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════
// MONOPOLY NAMESPACE
const monopolyIo = io.of('/monopoly');
const boardData = require('./public/monopoly/boardData.js');

let globalEndTurn = null;
const monopolyState = {
  status: 'LOBBY',
  host: null,
  players: {}, 
  turnOrder: [],
  currentTurnIndex: 0,
  properties: {}, // Track ownership: { tileIndex: { owner, houses: 0, mortgaged: false } }
  isRolling: false,
  lastDrawnCard: null,
  allPropertiesSold: false,
  activeTrades: {}
};

function enrichMonopolyPlayer(p) {
  if (!p) return;
  const isBot = !!p.isBot;
  const pubg = getPlayerPubgProfile(p.username, isBot, p.botTrait);
  Object.assign(p, pubg);
}

function areAllPropertiesSold() {
    return boardData.every((tile, idx) => {
        if (tile.type === 'property' || tile.type === 'station' || tile.type === 'utility') {
            return !!(monopolyState.properties[idx] && monopolyState.properties[idx].owner);
        }
        return true;
    });
}

const tokenColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#f97316', '#06b6d4', '#8b5cf6'];
const tokenSymbols = [
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M4 17h16v2H4zm2-2h12v-6c0-2-1.5-4-4-4h-4c-2.5 0-4 2-4 4v6z"/></svg>', // Hat
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M21.9 14.2l-2.3-5.3c-.3-.8-1.2-1.4-2.1-1.4H6.5c-.9 0-1.7.6-2.1 1.4l-2.3 5.3C1.4 14.9 1 15.6 1 16.5V20c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h16v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-3.5c0-.9-.4-1.6-1.1-2.3zM7.5 9h9c.3 0 .6.2.7.4l1.6 3.6H5.2L6.8 9.4c.1-.2.4-.4.7-.4zm-3 8c-.8 0-1.5-.7-1.5-1.5S3.7 14 4.5 14 6 14.7 6 15.5 5.3 17 4.5 17zm15 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"/></svg>', // Car
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M19 14h-5v-1c0-2-1.5-3.5-3.5-3.5H9V5c0-1.1-.9-2-2-2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2z"/></svg>', // Boot
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M19 8h-2V6c0-1.1-.9-2-2-2H9C7.9 4 7 4.9 7 6v1H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h1v3c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-3h2v3c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-5h1c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg>', // Dog
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M22 17c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2 0-.7.4-1.4 1-1.7V5c0-1.1.9-2 2-2h4c.7 0 1.4.4 1.7 1h4.6c.3-.6 1-1 1.7-1h4c1.1 0 2 .9 2 2v10.3c.6.3 1 1 1 1.7z"/></svg>', // Ship
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M14 2c-1.1 0-2 .9-2 2 0 .4.1.7.3 1H9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v9H8v2h8v-2h-2v-9h1c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-.3c.2-.3.3-.6.3-1 0-1.1-.9-2-2-2z"/></svg>', // Horse
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M21 16h-2v-2h-5l-2-6H4c-1.1 0-2 .9-2 2v2h2v4c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-2h5l2 6h4c1.1 0 2-.9 2-2v-2z"/></svg>', // Cart
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M16 4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-3 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V6h2v2z"/></svg>'  // Thimble
];

let auctionInterval = null;
let botAuctionTimeout = null;

function checkBotAuctionBid() {
    if (monopolyState.status !== 'AUCTION' || !monopolyState.auction) return;
    if (botAuctionTimeout) clearTimeout(botAuctionTimeout);

    const auc = monopolyState.auction;
    const tileData = boardData[auc.tileIndex];
    const tilePrice = tileData ? (tileData.price || 1000) : 1000;

    // Find bot bidders who are still active and not the current highest bidder
    const candidateBots = auc.activeBidders
        .map(uuid => monopolyState.players[uuid])
        .filter(p => p && p.isBot && p.uuid !== auc.highestBidder);

    if (candidateBots.length === 0) return;

    // Pick one bot to consider bidding
    const bot = candidateBots[Math.floor(Math.random() * candidateBots.length)];
    const maxValuation = Math.min(bot.cash - 200, Math.floor(tilePrice * 0.9));

    // Delay bot reaction between 1.2s and 2.5s so human players can see and bid
    const delay = 1200 + Math.floor(Math.random() * 1200);

    botAuctionTimeout = setTimeout(() => {
        if (monopolyState.status !== 'AUCTION' || !monopolyState.auction) return;
        const currentAuc = monopolyState.auction;
        if (!currentAuc.activeBidders.includes(bot.uuid) || bot.uuid === currentAuc.highestBidder) {
            checkBotAuctionBid();
            return;
        }

        const bidIncrements = [10, 20, 50];
        let chosenIncrement = 10;
        if (currentAuc.currentBid + 50 <= maxValuation) {
            chosenIncrement = bidIncrements[Math.floor(Math.random() * bidIncrements.length)];
        } else if (currentAuc.currentBid + 20 <= maxValuation) {
            chosenIncrement = Math.random() < 0.5 ? 20 : 10;
        }

        const newBid = currentAuc.currentBid + chosenIncrement;

        if (newBid <= maxValuation && bot.cash >= newBid) {
            currentAuc.currentBid = newBid;
            currentAuc.highestBidder = bot.uuid;
            currentAuc.timer = Math.max(currentAuc.timer, 10); // reset countdown timer
            monopolyIo.emit('systemMessage', `🤖 ${bot.username} placed a bid of $${newBid}!`);
            monopolyIo.emit('gameState', monopolyState);

            // Allow other bots or human to react
            checkBotAuctionBid();
        } else {
            // Bot folds
            currentAuc.activeBidders = currentAuc.activeBidders.filter(id => id !== bot.uuid);
            monopolyIo.emit('systemMessage', `🤖 ${bot.username} folded from the auction.`);
            monopolyIo.emit('gameState', monopolyState);

            if ((currentAuc.activeBidders.length < 2 && currentAuc.highestBidder) || currentAuc.activeBidders.length === 0) {
                endAuction();
            } else {
                checkBotAuctionBid();
            }
        }
    }, delay);
}

function startAuction(tileIndex, basePrice) {
    monopolyState.status = 'AUCTION';
    if (botAuctionTimeout) clearTimeout(botAuctionTimeout);
    if (auctionInterval) clearInterval(auctionInterval);

    // All solvent players (human, local, and bots) join the auction
    const activeUuids = monopolyState.turnOrder.filter(uuid => {
        const p = monopolyState.players[uuid];
        return p && !p.debtState && (p.online || p.isBot || p.isLocal);
    });

    const tile = boardData[tileIndex];
    const startingBid = Math.max(10, Math.floor((tile?.price || 100) * 0.1));

    monopolyState.auction = {
        tileIndex,
        currentBid: startingBid,
        highestBidder: null,
        activeBidders: activeUuids,
        timer: 15
    };

    monopolyIo.emit('gameState', monopolyState);
    monopolyIo.emit('systemMessage', `📢 Live Auction started for ${tile ? tile.name : 'Property'}! Starting bid: $${startingBid}`);

    auctionInterval = setInterval(() => {
        if (monopolyState.status !== 'AUCTION' || !monopolyState.auction) {
            clearInterval(auctionInterval);
            return;
        }
        monopolyState.auction.timer--;
        if (monopolyState.auction.timer <= 0) {
            endAuction();
        } else if (monopolyState.auction.activeBidders.length < 2 && monopolyState.auction.highestBidder) {
            endAuction();
        } else if (monopolyState.auction.activeBidders.length === 0) {
            endAuction();
        } else {
            monopolyIo.emit('gameState', monopolyState); // Sync countdown timer
        }
    }, 1000);

    // Kick off bot auction bids
    checkBotAuctionBid();
}

function endAuction() {
    if (auctionInterval) clearInterval(auctionInterval);
    if (botAuctionTimeout) clearTimeout(botAuctionTimeout);

    const auc = monopolyState.auction;
    if (!auc) return;

    monopolyState.status = 'PLAYING';
    monopolyState.auction = null;

    if (auc.highestBidder) {
        const winner = monopolyState.players[auc.highestBidder];
        if (winner) {
            winner.cash -= auc.currentBid;
            winner.cash = Math.round(winner.cash);
            monopolyState.properties[auc.tileIndex] = { owner: auc.highestBidder, houses: 0, mortgaged: false };
            const wasAllSold = monopolyState.allPropertiesSold;
            monopolyState.allPropertiesSold = areAllPropertiesSold();
            if (!wasAllSold && monopolyState.allPropertiesSold) {
                monopolyIo.emit('systemMessage', "🎉 All properties have been purchased! Property trading and negotiations are now OPEN!");
            }
            monopolyIo.emit('systemMessage', `🎉 ${winner.username} won the auction for ${boardData[auc.tileIndex].name} at $${auc.currentBid}!`);
        }
    } else {
        monopolyIo.emit('systemMessage', `🏛️ All players passed. ${boardData[auc.tileIndex].name} was returned to the Bank.`);
    }

    monopolyIo.emit('gameState', monopolyState);
    setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 2000);
}

// Auction Socket Events

function applyCard(uuid, card) {
    const player = monopolyState.players[uuid];
    if (!player) return false;

    const deckType = card.deck || (card.action === 'advance_utility' || card.action === 'advance_rail' ? 'chance' : 'chest');
    monopolyState.lastDrawnCard = {
        deck: deckType,
        title: card.title || (deckType === 'chance' ? 'CHANCE' : 'COMMUNITY CHEST'),
        text: card.text,
        subtext: card.subtext || '',
        playerName: player.username,
        playerColor: player.color || '#3b82f6',
        symbol: deckType === 'chest' ? '🎁' : '❓',
        timestamp: Date.now()
    };

    monopolyIo.emit('systemMessage', `${player.username} drew: "${card.text}"`);
    monopolyIo.emit('cardDrawn', monopolyState.lastDrawnCard);
    let moved = false;
    const oldPos = player.position;

    if (card.action === 'advance_to') {
        player.position = card.target;
        if (card.target === 0 || player.position < oldPos) {
            player.cash += 2000;
            player.cash = Math.round(player.cash);
            monopolyIo.emit('systemMessage', `💰 ${player.username} collected $2000 for passing/reaching GO.`);
        }
        moved = true;
    } else if (card.action === 'advance_rail') {
        const p = player.position;
        let target = 5;
        if (p >= 5 && p < 15) target = 15;
        else if (p >= 15 && p < 25) target = 25;
        else if (p >= 25 && p < 35) target = 35;

        if (target === 5 && p >= 35) {
            player.cash += 2000;
            player.cash = Math.round(player.cash);
            monopolyIo.emit('systemMessage', `💰 ${player.username} passed GO and collected $2000.`);
        }
        player.position = target;
        moved = true;
    } else if (card.action === 'advance_utility') {
        const p = player.position;
        let target = 12;
        if (p >= 12 && p < 28) target = 28;

        if (target === 12 && p >= 28) {
            player.cash += 2000;
            player.cash = Math.round(player.cash);
            monopolyIo.emit('systemMessage', `💰 ${player.username} passed GO and collected $2000.`);
        }
        player.position = target;
        player.isUtilityCardMove = true;
        moved = true;
    } else if (card.action === 'go_back_3') {
        player.position = (player.position - 3 + 40) % 40;
        moved = true;
    } else if (card.action === 'get_out_jail') {
        player.getOutJailFree = (player.getOutJailFree || 0) + 1;
        player.getOutCards = (player.getOutCards || 0) + 1;
    } else if (card.action === 'go_jail') {
        player.position = 10;
        player.inJail = true;
        player.jailTurns = 0;
        player.doublesCount = 0;
        player.justRolledDouble = false;
        moved = true;
    } else if (card.action.startsWith('pay_all')) {
        const amt = card.amount || 50;
        let totalPaid = 0;
        monopolyState.turnOrder.forEach(uid => {
            if (uid !== uuid && monopolyState.players[uid]) {
                totalPaid += amt;
            }
        });

        if (player.cash >= totalPaid) {
            player.cash -= totalPaid;
            monopolyState.turnOrder.forEach(uid => {
                if (uid !== uuid && monopolyState.players[uid]) {
                    monopolyState.players[uid].cash += amt;
                }
            });
        } else {
            monopolyIo.emit('systemMessage', `${player.username} does not have enough cash to pay all players!`);
            player.debtState = { type: 'pay_all', amount: totalPaid, creditor: null, payAllAmount: amt };
        }
    } else if (card.action.startsWith('collect_from_all')) {
        const amt = card.amount || 10;
        let totalCollected = 0;
        monopolyState.turnOrder.forEach(uid => {
            if (uid !== uuid && monopolyState.players[uid]) {
                monopolyState.players[uid].cash -= amt;
                totalCollected += amt;
            }
        });
        player.cash += totalCollected;
    } else if (card.action === 'street_repairs') {
        let houses = 0;
        let hotels = 0;
        const boardData = require('./public/monopoly/boardData.js');
        boardData.forEach((t, i) => {
            if (t.type === 'property' && monopolyState.properties[i] && monopolyState.properties[i].owner === uuid) {
                const h = monopolyState.properties[i].houses || 0;
                if (h === 5) {
                    hotels += 1;
                } else {
                    houses += h;
                }
            }
        });
        const total = (houses * 200) + (hotels * 800);
        if (player.cash >= total) {
            player.cash -= total;
        } else {
            monopolyIo.emit('systemMessage', `${player.username} does not have enough cash for street repairs!`);
            player.debtState = { type: 'street_repairs', amount: total, creditor: null };
        }
    } else if (card.action.startsWith('pay_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        if (player.cash >= amt) {
            player.cash -= amt;
        } else {
            monopolyIo.emit('systemMessage', `${player.username} does not have enough cash to pay!`);
            player.debtState = { type: 'card_pay', amount: amt, creditor: null };
        }
    } else if (card.action.startsWith('collect_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash += amt;
    }
    return moved;
}

monopolyIo.on('connection', (socket) => {

    socket.on('addLocalPlayer', (data) => {
        if (monopolyState.status === 'LOBBY' && monopolyState.turnOrder.length < 8) {
            const playerName = (typeof data === 'object' && data.name) ? data.name.trim() : (typeof data === 'string' ? data.trim() : '');
            const dbId = (typeof data === 'object' && data.dbId) ? data.dbId : null;
            if (!playerName) return;

            // Check if player with this dbId or username is already in the lobby
            const alreadyInLobby = Object.values(monopolyState.players).some(p => 
                (dbId && p.dbId === dbId) || (p.username.toLowerCase() === playerName.toLowerCase())
            );
            if (alreadyInLobby) {
                socket.emit('errorMsg', `${playerName} is already in the game!`);
                return;
            }

            const localId = 'local_' + (dbId ? dbId + '_' : '') + Math.floor(Math.random() * 100000);
            const neonColors = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
            const color = neonColors[monopolyState.turnOrder.length % neonColors.length];
            monopolyState.players[localId] = {
                uuid: localId,
                username: playerName,
                dbId: dbId,
                cash: 15000,
                position: 0,
                color: color,
                symbol: tokenSymbols[monopolyState.turnOrder.length % tokenSymbols.length],
                online: true, isBot: false, isLocal: true, hostId: socket.uuid,
                doublesCount: 0, inJail: false, jailTurns: 0, getOutCards: 0
            };
            enrichMonopolyPlayer(monopolyState.players[localId]);
            monopolyState.turnOrder.push(localId);
            monopolyIo.emit('systemMessage', `${playerName} joined the lobby.`);
            monopolyIo.emit('gameState', monopolyState);
        }
    });

    socket.on('removePlayer', (targetUuid) => {
        if (monopolyState.status === 'LOBBY') {
            if (targetUuid === socket.uuid) return;
            const p = monopolyState.players[targetUuid];
            if (p) {
                delete monopolyState.players[targetUuid];
                monopolyState.turnOrder = monopolyState.turnOrder.filter(id => id !== targetUuid);
                monopolyIo.emit('systemMessage', `${p.username} was removed from the lobby.`);
                monopolyIo.emit('gameState', monopolyState);
            }
        }
    });

    socket.on('editName', (data) => {
        if (monopolyState.status === 'LOBBY' && socket.uuid) {
            const p = monopolyState.players[socket.uuid];
            const newName = (typeof data === 'object' && data.name) ? data.name.trim() : (typeof data === 'string' ? data.trim() : '');
            const dbId = (typeof data === 'object' && data.dbId) ? data.dbId : null;
            if (p && newName && newName.length > 0) {
                const oldName = p.username;
                p.username = newName.substring(0, 15);
                if (dbId) p.dbId = dbId;
                enrichMonopolyPlayer(p);
                monopolyIo.emit('systemMessage', `${oldName} switched profile to ${p.username}.`);
                monopolyIo.emit('gameState', monopolyState);
            }
        }
    });

    socket.on('joinGame', (data) => {
        socket.uuid = data.uuid;
        const requestedName = (data.username && !data.username.startsWith('Guest ') && data.username !== 'Guest') ? data.username.trim() : (monopolyState.players[data.uuid]?.username || data.username || 'Player 1');

        if (monopolyState.players[data.uuid]) {
            monopolyState.players[data.uuid].online = true;
            if (requestedName) monopolyState.players[data.uuid].username = requestedName;
            if (data.dbId) monopolyState.players[data.uuid].dbId = data.dbId;
            enrichMonopolyPlayer(monopolyState.players[data.uuid]);
        } else {
            const neonColors = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
            const color = neonColors[monopolyState.turnOrder.length % neonColors.length];
            monopolyState.players[data.uuid] = {
                uuid: data.uuid,
                username: requestedName,
                dbId: data.dbId || null,
                cash: 15000,
                position: 0,
                color: color,
                symbol: tokenSymbols[monopolyState.turnOrder.length % tokenSymbols.length],
                online: true, isBot: false,
                doublesCount: 0,
                inJail: false,
                debtState: false,
                pendingAction: null,
                getOutJailFree: 0
            };
            enrichMonopolyPlayer(monopolyState.players[data.uuid]);
            if (!monopolyState.turnOrder.includes(data.uuid)) {
                monopolyState.turnOrder.push(data.uuid);
            }
            if (!monopolyState.host) {
                monopolyState.host = data.uuid;
            }
        }
        monopolyIo.emit('systemMessage', `${monopolyState.players[data.uuid].username} connected to the lobby.`);
        monopolyIo.emit('gameState', monopolyState);
    });

    socket.on('addBot', () => {
        if (true && monopolyState.status === 'LOBBY' && monopolyState.turnOrder.length < 8) {
            const botId = 'bot_' + Math.floor(Math.random() * 10000);
            const neonColors = ['#ef4444', '#10b981', '#3b82f6', '#d97706', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
            const color = neonColors[monopolyState.turnOrder.length % neonColors.length];
            const botName = getRandomBotName(Object.values(monopolyState.players).map(p => p.username));
            monopolyState.players[botId] = {
                uuid: botId,
                username: botName,
                cash: 15000,
                position: 0,
                color: color,
                symbol: tokenSymbols[monopolyState.turnOrder.length % tokenSymbols.length],
                online: true, isBot: true,
                doublesCount: 0,
                inJail: false,
                debtState: false,
                pendingAction: null,
                getOutJailFree: 0
            };
            enrichMonopolyPlayer(monopolyState.players[botId]);
            monopolyState.turnOrder.push(botId);
            monopolyIo.emit('systemMessage', `${monopolyState.players[botId].username} joined the lobby.`);
            monopolyIo.emit('gameState', monopolyState);
        }
    });

    socket.on('addTwoBots', () => {
        if (monopolyState.status !== 'LOBBY') return;
        const added = [];
        for (let i = 0; i < 2; i++) {
            if (monopolyState.turnOrder.length < 8) {
                const botId = 'bot_' + Math.floor(Math.random() * 10000);
                const neonColors = ['#ef4444', '#10b981', '#3b82f6', '#d97706', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                const color = neonColors[monopolyState.turnOrder.length % neonColors.length];
                const existingNames = Object.values(monopolyState.players).map(p => p.username).concat(added);
                const botName = getRandomBotName(existingNames);
                added.push(botName);
                monopolyState.players[botId] = {
                    uuid: botId,
                    username: botName,
                    cash: 15000,
                    position: 0,
                    color: color,
                    symbol: tokenSymbols[monopolyState.turnOrder.length % tokenSymbols.length],
                    online: true, isBot: true,
                    doublesCount: 0,
                    inJail: false,
                    debtState: false,
                    pendingAction: null,
                    getOutJailFree: 0
                };
                enrichMonopolyPlayer(monopolyState.players[botId]);
                monopolyState.turnOrder.push(botId);
                added.push(monopolyState.players[botId].username);
            }
        }
        if (added.length > 0) {
            monopolyIo.emit('systemMessage', `${added.join(' and ')} joined the lobby.`);
            monopolyIo.emit('gameState', monopolyState);
        }
    });

    socket.on('startGame', () => {
        if (true && monopolyState.status === 'LOBBY' && monopolyState.turnOrder.length >= 2) {
            monopolyState.status = 'PLAYING';
            monopolyState.currentTurnIndex = 0;
            monopolyState.lastDrawnCard = null;
            monopolyState.allPropertiesSold = areAllPropertiesSold();
            monopolyState.activeTrades = {};
            monopolyState.matchParticipants = monopolyState.turnOrder.map(uuid => {
                const p = monopolyState.players[uuid];
                return {
                    uuid: p.uuid,
                    username: p.username,
                    dbId: p.dbId,
                    isBot: p.isBot,
                    color: p.color
                };
            });

            const initialChanceDeck = [
                { deck: 'chance', title: 'Advance to GO', text: 'Advance to GO.', subtext: 'Collect $2000 as you cross GO.', action: 'advance_to', target: 0 },
                { deck: 'chance', title: 'Advance to Mumbai', text: 'Take a trip to Mumbai.', subtext: 'If you pass GO, collect $2000.', action: 'advance_to', target: 24 },
                { deck: 'chance', title: 'Advance to Kobe', text: 'Advance to Kobe.', subtext: 'If you pass GO, collect $2000.', action: 'advance_to', target: 11 },
                { deck: 'chance', title: 'Advance to Nearest Utility', text: 'Advance token to the nearest Utility.', subtext: 'If unowned, you may buy it from the Bank. If owned, throw dice and pay owner 10 times the amount rolled (100x roll in Megacity economy)!', action: 'advance_utility' },
                { deck: 'chance', title: 'Advance to Nearest Railroad', text: 'Advance token to the nearest Railroad.', subtext: 'If unowned, you may buy it from the Bank. If owned, pay owner regular railroad rent.', action: 'advance_rail' },
                { deck: 'chance', title: 'Bank Dividend', text: 'Bank pays you dividend of $500.', subtext: 'Collect $500 from the Bank.', action: 'collect_500' },
                { deck: 'chance', title: 'Get Out of Jail Free', text: 'Get Out of Jail Free.', subtext: 'This card may be kept until needed or used automatically when in Jail.', action: 'get_out_jail' },
                { deck: 'chance', title: 'Go Back 3 Spaces', text: 'Go Back 3 Spaces.', subtext: 'Move backwards 3 spaces and follow instructions on that tile.', action: 'go_back_3' },
                { deck: 'chance', title: 'Go Directly to Jail', text: 'Go directly to Jail.', subtext: 'Do not pass GO, do not collect $2000.', action: 'go_jail' },
                { deck: 'chance', title: 'Poor Tax', text: 'Pay Poor Tax of $200.', subtext: 'Pay $200 to the Bank.', action: 'pay_200' },
                { deck: 'chance', title: 'Trip to Rail 3', text: 'Take a trip to Rail 3.', subtext: 'If you pass GO, collect $2000.', action: 'advance_to', target: 5 },
                { deck: 'chance', title: 'Advance to Baku', text: 'Advance to Baku (Boardwalk).', subtext: 'If you pass GO, collect $2000.', action: 'advance_to', target: 39 },
                { deck: 'chance', title: 'Chairman of the Board', text: 'Elected Chairman of the Board.', subtext: 'Pay each player $500.', action: 'pay_all', amount: 500 },
                { deck: 'chance', title: 'Building Loan Matures', text: 'Your building loan matures.', subtext: 'Collect $1500 from the Bank.', action: 'collect_1500' },
                { deck: 'chance', title: 'Speeding Fine', text: 'Speeding fine $200.', subtext: 'Pay $200 fine to the Bank.', action: 'pay_200' },
                { deck: 'chance', title: 'Crossword Competition', text: 'Won a crossword competition.', subtext: 'Collect $1000 prize from the Bank.', action: 'collect_1000' }
            ];

            const initialChestDeck = [
                { deck: 'chest', title: 'Advance to GO', text: 'Advance to GO.', subtext: 'Collect $2000 reward.', action: 'advance_to', target: 0 },
                { deck: 'chest', title: 'Bank Error in Your Favor', text: 'Bank error in your favor.', subtext: 'Collect $2000 from the Bank.', action: 'collect_2000' },
                { deck: 'chest', title: 'Doctor\'s Fees', text: 'Doctor\'s fees.', subtext: 'Pay $500 to the Bank.', action: 'pay_500' },
                { deck: 'chest', title: 'Stock Sale', text: 'From sale of stock you get $500.', subtext: 'Collect $500 from the Bank.', action: 'collect_500' },
                { deck: 'chest', title: 'Get Out of Jail Free', text: 'Get Out of Jail Free.', subtext: 'This card may be kept until needed.', action: 'get_out_jail' },
                { deck: 'chest', title: 'Go Directly to Jail', text: 'Go directly to Jail.', subtext: 'Do not pass GO, do not collect $2000.', action: 'go_jail' },
                { deck: 'chest', title: 'Holiday Fund Matures', text: 'Holiday Fund matures.', subtext: 'Receive $1000 from the Bank.', action: 'collect_1000' },
                { deck: 'chest', title: 'Income Tax Refund', text: 'Income tax refund.', subtext: 'Collect $2000 from the Bank.', action: 'collect_2000' },
                { deck: 'chest', title: 'It is Your Birthday', text: 'It is your birthday!', subtext: 'Collect $100 gift from every player.', action: 'collect_from_all', amount: 100 },
                { deck: 'chest', title: 'Life Insurance Matures', text: 'Life insurance matures.', subtext: 'Collect $1000 from the Bank.', action: 'collect_1000' },
                { deck: 'chest', title: 'Hospital Fees', text: 'Pay hospital fees of $500.', subtext: 'Pay $500 to the Bank.', action: 'pay_500' },
                { deck: 'chest', title: 'School Fees', text: 'Pay school fees of $500.', subtext: 'Pay $500 to the Bank.', action: 'pay_500' },
                { deck: 'chest', title: 'Consultancy Fee', text: 'Receive $250 consultancy fee.', subtext: 'Collect $250 from the Bank.', action: 'collect_250' },
                { deck: 'chest', title: 'Street Repairs', text: 'Assessed for street repairs.', subtext: 'Pay $200 per house and $800 per hotel.', action: 'street_repairs' },
                { deck: 'chest', title: 'Beauty Contest', text: 'Won 2nd prize in a beauty contest.', subtext: 'Collect $1000 prize.', action: 'collect_1000' },
                { deck: 'chest', title: 'Inheritance', text: 'You inherit $1000.', subtext: 'Collect $1000 inheritance.', action: 'collect_1000' }
            ];

            function shuffleDeck(deck) {
                for (let i = deck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
                return deck;
            }

            monopolyState.chanceDeck = shuffleDeck([...initialChanceDeck]);
            monopolyState.chestDeck = shuffleDeck([...initialChestDeck]);
            monopolyState.isRolling = false;
            if (botTurnTimeout) { clearTimeout(botTurnTimeout); botTurnTimeout = null; }
            if (auctionInterval) { clearInterval(auctionInterval); auctionInterval = null; }
            if (botAuctionTimeout) { clearTimeout(botAuctionTimeout); botAuctionTimeout = null; }
            monopolyIo.emit('systemMessage', `The game has started!`);
            monopolyIo.emit('gameState', monopolyState);
            checkBotTurn();
        }
    });

    socket.on('quitToLobby', () => {
        monopolyState.status = 'LOBBY';
        monopolyState.properties = {};
        monopolyState.currentTurnIndex = 0;
        monopolyState.auction = null;
        monopolyState.isRolling = false;
        monopolyState.lastDrawnCard = null;
        monopolyState.allPropertiesSold = false;
        monopolyState.activeTrades = {};
        if (botTurnTimeout) { clearTimeout(botTurnTimeout); botTurnTimeout = null; }
        if (auctionInterval) { clearInterval(auctionInterval); auctionInterval = null; }
        if (botAuctionTimeout) { clearTimeout(botAuctionTimeout); botAuctionTimeout = null; }
        
        Object.values(monopolyState.players).forEach(p => {
            p.cash = 15000;
            p.position = 0;
            p.inJail = false;
            p.jailTurns = 0;
            p.doublesCount = 0;
            p.pendingAction = null;
            p.debtState = false;
            p.getOutJailFree = 0;
            p.getOutCards = 0;
            p.justRolledDouble = false;
        });
        
        monopolyIo.emit('systemMessage', "The game was reset to the Lobby.");
        monopolyIo.emit('gameState', monopolyState);
    });

    socket.on('restartGame', () => {
        monopolyState.properties = {};
        monopolyState.currentTurnIndex = 0;
        monopolyState.auction = null;
        monopolyState.isRolling = false;
        monopolyState.lastDrawnCard = null;
        monopolyState.allPropertiesSold = false;
        monopolyState.activeTrades = {};
        if (botTurnTimeout) { clearTimeout(botTurnTimeout); botTurnTimeout = null; }
        if (auctionInterval) { clearInterval(auctionInterval); auctionInterval = null; }
        if (botAuctionTimeout) { clearTimeout(botAuctionTimeout); botAuctionTimeout = null; }
        
        Object.values(monopolyState.players).forEach(p => {
            p.cash = 15000;
            p.position = 0;
            p.inJail = false;
            p.jailTurns = 0;
            p.doublesCount = 0;
            p.pendingAction = null;
            p.debtState = false;
            p.getOutJailFree = 0;
            p.getOutCards = 0;
            p.justRolledDouble = false;
        });

        if (monopolyState.turnOrder.length >= 2) {
            monopolyState.status = 'PLAYING';
            monopolyState.matchParticipants = monopolyState.turnOrder.map(uuid => {
                const p = monopolyState.players[uuid];
                return {
                    uuid: p.uuid,
                    username: p.username,
                    dbId: p.dbId,
                    isBot: p.isBot,
                    color: p.color
                };
            });
            monopolyIo.emit('systemMessage', "🎮 New match started! Let the battle begin!");
        } else {
            monopolyState.status = 'LOBBY';
            monopolyIo.emit('systemMessage', "Game reset to Lobby.");
        }
        monopolyIo.emit('gameState', monopolyState);
    });

    socket.on('rollDice', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        const player = monopolyState.players[currentPid];
        const canControl = player && (socket.uuid === currentPid || (player.isLocal && (player.hostId === socket.uuid || !player.hostId || monopolyState.host === socket.uuid)));
        if (canControl) {
            handleRollDice(currentPid);
        }
    });

    socket.on('payJailFine', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        const player = monopolyState.players[currentPid];
        const canControl = player && (socket.uuid === currentPid || (player.isLocal && (player.hostId === socket.uuid || !player.hostId || monopolyState.host === socket.uuid)));
        if (canControl) {
            if (player.inJail) {
                if (player.cash >= 50) {
                    player.cash -= 50;
                    player.inJail = false;
                    player.jailTurns = 0;
                    monopolyIo.emit('systemMessage', `${player.username} paid $50 to leave jail.`);
                    monopolyIo.emit('gameState', monopolyState);
                } else {
                    socket.emit('errorMsg', "Insufficient funds. Roll for doubles!");
                }
            }
        }
    });

    

    
    socket.on('buyProperty', (willBuy) => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        const pAuth = monopolyState.players[currentPid];
        const canControl = pAuth && (socket.uuid === currentPid || (pAuth.isLocal && (pAuth.hostId === socket.uuid || !pAuth.hostId || monopolyState.host === socket.uuid)));
        if (!canControl) return;
        const uuid = currentPid;
        const player = monopolyState.players[uuid];
        if (player && player.pendingAction && player.pendingAction.type === 'buy') {
            const tileIndex = player.pendingAction.tileIndex;
            const price = Math.round(player.pendingAction.price);
            
            if (willBuy) {
                if (player.cash >= price) {
                    player.cash -= price;
                    player.cash = Math.round(player.cash);
                    monopolyState.properties[tileIndex] = { owner: uuid, houses: 0, mortgaged: false };
                    
                    const name = boardData[tileIndex] ? boardData[tileIndex].name : ('Property ' + tileIndex);
                    const wasAllSold = monopolyState.allPropertiesSold;
                    monopolyState.allPropertiesSold = areAllPropertiesSold();
                    if (!wasAllSold && monopolyState.allPropertiesSold) {
                        monopolyIo.emit('systemMessage', "🎉 All properties have been purchased! Property trading and negotiations are now OPEN!");
                    }
                    monopolyIo.emit('systemMessage', `${player.username} bought ${name}.`);
                } else {
                    socket.emit('errorMsg', "Insufficient funds to buy this property. Mortgage properties first or pass to auction.");
                    return;
                }
                player.pendingAction = null;
                monopolyIo.emit('gameState', monopolyState);
                setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 500);
            } else {
                player.pendingAction = null;
                startAuction(tileIndex, Math.max(10, Math.floor(price / 4)));
            }
        }
    });

    socket.on('auctionProperty', (tileIndex) => {
        const uuid = socket.uuid;
        const player = monopolyState.players[uuid];
        if (player && player.pendingAction && player.pendingAction.type === 'buy') {
            const price = player.pendingAction.price;
            player.pendingAction = null;
            startAuction(tileIndex, Math.max(10, Math.floor(price / 4)));
        }
    });

    socket.on('placeBid', (data) => {
        if (monopolyState.status === 'AUCTION') {
            const auc = monopolyState.auction;
            if (!auc) return;

            const bidderUuid = (data && typeof data === 'object' && data.bidderUuid) ? data.bidderUuid : socket.uuid;
            const amount = (data && typeof data === 'object' && data.amount) ? Number(data.amount) : Number(data);

            const bidder = monopolyState.players[bidderUuid];
            if (!bidder) return;

            const canControl = (socket.uuid === bidderUuid) || (bidder.isLocal && (bidder.hostId === socket.uuid || !bidder.hostId || monopolyState.host === socket.uuid));
            if (!canControl) return socket.emit('errorMsg', "You cannot bid for this player.");

            if (!auc.activeBidders.includes(bidderUuid)) return;

            const nextBid = auc.currentBid + amount;
            if (bidder.cash < nextBid) {
                return socket.emit('errorMsg', `${bidder.username} does not have enough cash ($${nextBid}) for this bid!`);
            }

            auc.currentBid = nextBid;
            auc.highestBidder = bidderUuid;
            auc.timer = Math.max(auc.timer, 10);
            monopolyIo.emit('systemMessage', `🙋 ${bidder.username} bid $${auc.currentBid}!`);
            monopolyIo.emit('gameState', monopolyState);
            checkBotAuctionBid();
        }
    });

    socket.on('foldAuction', (data) => {
        if (monopolyState.status === 'AUCTION') {
            const auc = monopolyState.auction;
            if (auc) {
                const bidderUuid = (data && typeof data === 'object' && data.bidderUuid) ? data.bidderUuid : socket.uuid;
                const bidder = monopolyState.players[bidderUuid];
                if (!bidder) return;

                const canControl = (socket.uuid === bidderUuid) || (bidder.isLocal && (bidder.hostId === socket.uuid || !bidder.hostId || monopolyState.host === socket.uuid));
                if (!canControl) return;

                auc.activeBidders = auc.activeBidders.filter(u => u !== bidderUuid);
                monopolyIo.emit('systemMessage', `👋 ${bidder.username} folded from the auction.`);

                if (auc.activeBidders.length < 2 && auc.highestBidder) {
                    endAuction();
                } else if (auc.activeBidders.length === 0) {
                    endAuction();
                } else {
                    monopolyIo.emit('gameState', monopolyState);
                    checkBotAuctionBid();
                }
            }
        }
    });

    socket.on('buyHouse', (tileIndex) => {
        const uuid = socket.uuid;
        const prop = monopolyState.properties[tileIndex];
        const tileData = boardData[tileIndex];
        if (!prop || prop.mortgaged || prop.houses >= 5) return;
        
        const owner = monopolyState.players[prop.owner];
        if (!owner) return;
        const canControl = (prop.owner === uuid) || (owner.isLocal && (owner.hostId === uuid || !owner.hostId || monopolyState.host === uuid));
        if (!canControl) return;

        const color = tileData.color;
        if (color) {
            const sameColorTiles = boardData.filter(t => t.color === color);
            const ownsAll = sameColorTiles.every(t => {
                const idx = boardData.indexOf(t);
                return monopolyState.properties[idx] && monopolyState.properties[idx].owner === prop.owner && !monopolyState.properties[idx].mortgaged;
            });
            if (!ownsAll) {
                socket.emit('errorMsg', "You must own all unmortgaged properties of this color to build!");
                return;
            }

            // Even Building Rule: cannot build if this property already has more houses than any other in the group
            const houseCounts = sameColorTiles.map(t => monopolyState.properties[boardData.indexOf(t)]?.houses || 0);
            const minHouses = Math.min(...houseCounts);
            if ((prop.houses || 0) > minHouses) {
                socket.emit('errorMsg', `Even Building Rule: You must upgrade other properties of this color to ${minHouses + 1} house(s) first!`);
                return;
            }
        }
        const cost = Math.round(tileData.houseCost || 50);
        if (owner.cash >= cost) {
            owner.cash -= cost;
            owner.cash = Math.round(owner.cash);
            prop.houses = (prop.houses || 0) + 1;
            const bName = prop.houses === 5 ? 'a Hotel' : `House #${prop.houses}`;
            monopolyIo.emit('systemMessage', `${owner.username} upgraded ${tileData.name} with ${bName}.`);
            monopolyIo.emit('gameState', monopolyState);
        } else {
            socket.emit('errorMsg', `${owner.username} does not have enough cash ($${cost}) to upgrade!`);
        }
    });

    socket.on('useJailCard', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        const player = monopolyState.players[currentPid];
        if (!player) return;
        const canControl = (socket.uuid === currentPid) || (player.isLocal && (player.hostId === socket.uuid || !player.hostId || monopolyState.host === socket.uuid));
        if (!canControl) return;

        if (player.inJail && ((player.getOutJailFree && player.getOutJailFree > 0) || (player.getOutCards && player.getOutCards > 0))) {
            if (player.getOutJailFree > 0) player.getOutJailFree--;
            if (player.getOutCards > 0) player.getOutCards--;
            player.inJail = false;
            player.jailTurns = 0;
            monopolyState.chanceDeck.push({
                deck: 'chance',
                title: 'Get Out of Jail Free',
                text: 'Get Out of Jail Free.',
                subtext: 'This card may be kept until needed or used automatically when in Jail.',
                action: 'get_out_jail'
            });
            monopolyIo.emit('systemMessage', `${player.username} used a Get Out of Jail Free card!`);
            monopolyIo.emit('gameState', monopolyState);
        }
    });

    socket.on('resolveCard', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        const player = monopolyState.players[currentPid];
        if (!player || !player.pendingAction || player.pendingAction.type !== 'draw_card') return;
        const canControl = (socket.uuid === currentPid) || (player.isLocal && (player.hostId === socket.uuid || !player.hostId || monopolyState.host === socket.uuid));
        if (!canControl) return;
        
        const deckName = player.pendingAction.deck + 'Deck';
        if (!monopolyState[deckName] || monopolyState[deckName].length === 0) return;
        
        const drawnCard = monopolyState[deckName].shift();
        drawnCard.deck = player.pendingAction.deck;
        if (drawnCard.action !== 'get_out_jail') {
            monopolyState[deckName].push(drawnCard); // put at bottom
        }
        
        const oldPos = player.position;
        const moved = applyCard(currentPid, drawnCard);
        player.pendingAction = null;
        
        if (moved) {
            monopolyIo.emit('gameState', monopolyState);
            if (player.inJail) {
                setTimeout(() => { endTurnOrRollAgain(); }, 1500);
            } else {
                const steps = (player.position - oldPos + 40) % 40;
                const delay = steps > 12 ? 800 : Math.max(800, steps * 200 + 400);
                setTimeout(() => { handleLanding(currentPid); }, delay);
            }
        } else {
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { endTurnOrRollAgain(); }, 2000);
        }
    });

    socket.on('getGameState', () => {
        socket.emit('gameState', monopolyState);
    });

    socket.on('mortgageProperty', (tileIndex) => {
        const uuid = socket.uuid;
        const prop = monopolyState.properties[tileIndex];
        const tileData = boardData[tileIndex];
        if (!prop || prop.mortgaged || (prop.houses && prop.houses > 0)) return;

        const owner = monopolyState.players[prop.owner];
        if (!owner) return;
        const canControl = (prop.owner === uuid) || (owner.isLocal && (owner.hostId === uuid || !owner.hostId || monopolyState.host === uuid));
        if (!canControl) return;
        
        const val = Math.round(tileData.mortgageValue || (tileData.price ? tileData.price / 2 : 50));
        owner.cash += val;
        owner.cash = Math.round(owner.cash);
        prop.mortgaged = true;
        monopolyIo.emit('systemMessage', `${owner.username} mortgaged ${tileData.name} for $${val}.`);
        monopolyIo.emit('gameState', monopolyState);
    });

    function executeBankruptcy(targetUuid) {
        const player = monopolyState.players[targetUuid];
        if (!player) return;

        monopolyIo.emit('systemMessage', `💥 ${player.username} has declared BANKRUPTCY!`);

        const creditor = player.debtState ? player.debtState.creditor : null;
        const debtAmount = (player.debtState && player.debtState.amount) ? Math.round(player.debtState.amount) : 0;

        // 1. The Bank deposits the amount owed to the player they landed on (creditor)
        if (creditor && monopolyState.players[creditor] && debtAmount > 0) {
            monopolyState.players[creditor].cash += debtAmount;
            monopolyState.players[creditor].cash = Math.round(monopolyState.players[creditor].cash);
            monopolyIo.emit('systemMessage', `🏛️ The Bank deposited $${debtAmount.toLocaleString()} to ${monopolyState.players[creditor].username} for unpaid debt owed by ${player.username}.`);
        } else if (player.debtState && player.debtState.type === 'pay_all' && player.debtState.payAllAmount) {
            const amt = Math.round(player.debtState.payAllAmount);
            monopolyState.turnOrder.forEach(uid => {
                if (uid !== targetUuid && monopolyState.players[uid]) {
                    monopolyState.players[uid].cash += amt;
                    monopolyState.players[uid].cash = Math.round(monopolyState.players[uid].cash);
                }
            });
            monopolyIo.emit('systemMessage', `🏛️ The Bank deposited $${amt.toLocaleString()} to each player for the amount owed by ${player.username}.`);
        }

        // 2. All assets of the bankrupt user (mortgaged or unmortgaged) return to the Bank for users to purchase (never given to creditor)
        Object.keys(monopolyState.properties).forEach(tileIndex => {
            const prop = monopolyState.properties[tileIndex];
            if (prop && prop.owner === targetUuid) {
                delete monopolyState.properties[tileIndex];
                const propName = boardData[tileIndex] ? boardData[tileIndex].name : `Property ${tileIndex}`;
                monopolyIo.emit('systemMessage', `🏛️ ${propName} has returned to the Bank and is available for purchase.`);
            }
        });

        player.cash = 0;
        player.debtState = false;
        monopolyState.turnOrder = monopolyState.turnOrder.filter(id => id !== targetUuid);
        delete monopolyState.players[targetUuid];

        monopolyState.allPropertiesSold = areAllPropertiesSold();

        if (checkGameOver()) {
            return;
        } else {
            if (monopolyState.currentTurnIndex >= monopolyState.turnOrder.length) {
                monopolyState.currentTurnIndex = 0;
            }
            nextTurn();
        }
        monopolyIo.emit('gameState', monopolyState);
    }

    function checkGameOver() {
        if ((monopolyState.status === 'PLAYING' || monopolyState.status === 'RUNNING' || monopolyState.status === 'AUCTION') && monopolyState.turnOrder && monopolyState.turnOrder.length <= 1) {
            monopolyState.status = 'FINISHED';
            if (typeof botTurnTimeout !== 'undefined' && botTurnTimeout) {
                clearTimeout(botTurnTimeout);
                botTurnTimeout = null;
            }
            const winnerUuid = monopolyState.turnOrder && monopolyState.turnOrder.length > 0 ? monopolyState.turnOrder[0] : null;
            const winner = winnerUuid ? monopolyState.players[winnerUuid] : null;
            const winnerName = winner ? winner.username : 'Unknown';
            const winnerCash = winner ? winner.cash : 0;
            const winnerColor = winner ? winner.color : '#22c55e';
            const propertiesCount = winner ? Object.values(monopolyState.properties).filter(p => p.owner === winnerUuid).length : 0;

            monopolyIo.emit('systemMessage', `🏆 GAME OVER! ${winnerName} is the last remaining tycoon and WINS Megacity Monopoly!`);

            // Record match to DB for Wall of Fame & Stats
            try {
                let winnerDbId = winner ? winner.dbId : null;
                if (!winnerDbId && winner && !winner.isBot && winner.username) {
                    const pRow = db.getOrCreatePlayer(winner.username);
                    if (pRow) winnerDbId = pRow.id;
                }
                if (winnerDbId) {
                    try { db.incrementStat(winnerDbId, 'games_won'); } catch(e){}
                    try { db.incrementStat(winnerDbId, 'games_played'); } catch(e){}
                }

                // Prepare match results array for Wall of Fame with all match participants
                const participants = (monopolyState.matchParticipants && monopolyState.matchParticipants.length > 0)
                    ? monopolyState.matchParticipants
                    : Object.values(monopolyState.players);
                const matchPlayers = participants.map(p => ({
                    id: p.dbId || (p.isBot ? p.uuid : null),
                    name: p.username || p.name,
                    color: p.color,
                    isBot: p.isBot
                }));
                db.addMatchResult(matchPlayers, winnerName, 'Monopoly', 0, { mode: 'Megacity Monopoly', totalParticipants: matchPlayers.length, cash: winner ? winner.cash : 0, properties: propertiesCount });

                // Increment games_played for any other participating human players
                participants.forEach(p => {
                    if (p.uuid !== winnerUuid && !p.isBot) {
                        let pDbId = p.dbId;
                        if (!pDbId && p.username) {
                            const found = db.getOrCreatePlayer(p.username);
                            if (found) pDbId = found.id;
                        }
                        if (pDbId) {
                            try { db.incrementStat(pDbId, 'games_played'); } catch(e){}
                        }
                    }
                });
            } catch(e) {
                console.error('Failed to record Monopoly stats to DB:', e);
            }

            monopolyIo.emit('gameOver', {
                winnerUuid,
                winnerName,
                winnerColor,
                winnerCash,
                propertiesCount
            });
            monopolyIo.emit('gameState', monopolyState);
            return true;
        }
        return false;
    }

    socket.on('declareBankruptcy', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        let targetUuid = socket.uuid;
        const currentP = monopolyState.players[currentPid];
        if (currentP && currentP.debtState && (socket.uuid === currentPid || (currentP.isLocal && (currentP.hostId === socket.uuid || !currentP.hostId || monopolyState.host === socket.uuid)))) {
            targetUuid = currentPid;
        }
        const player = monopolyState.players[targetUuid];
        if (!player || !player.debtState) return;
        executeBankruptcy(targetUuid);
    });

    socket.on('payDebt', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        let targetUuid = socket.uuid;
        const currentP = monopolyState.players[currentPid];
        if (currentP && currentP.debtState && (socket.uuid === currentPid || (currentP.isLocal && (currentP.hostId === socket.uuid || !currentP.hostId || monopolyState.host === socket.uuid)))) {
            targetUuid = currentPid;
        }
        const player = monopolyState.players[targetUuid];
        if (!player || !player.debtState) return;

        if (player.cash >= player.debtState.amount) {
            player.cash -= player.debtState.amount;
            player.cash = Math.round(player.cash);
            if (player.debtState.creditor && monopolyState.players[player.debtState.creditor]) {
                monopolyState.players[player.debtState.creditor].cash += player.debtState.amount;
                monopolyState.players[player.debtState.creditor].cash = Math.round(monopolyState.players[player.debtState.creditor].cash);
            } else if (player.debtState.type === 'pay_all') {
                const amt = player.debtState.payAllAmount;
                monopolyState.turnOrder.forEach(uid => {
                    if (uid !== targetUuid && monopolyState.players[uid]) {
                        monopolyState.players[uid].cash += amt;
                        monopolyState.players[uid].cash = Math.round(monopolyState.players[uid].cash);
                    }
                });
            }

            monopolyIo.emit('systemMessage', `${player.username} successfully paid off their debt of $${player.debtState.amount}.`);
            player.debtState = false;
            monopolyIo.emit('gameState', monopolyState);

            setTimeout(endTurnOrRollAgain, 500);
        }
    });

    socket.on('sellHouse', (tileIndex) => {
        const uuid = socket.uuid;
        const prop = monopolyState.properties[tileIndex];
        const tileData = boardData[tileIndex];
        if (!prop || !prop.houses || prop.houses <= 0) return;

        const owner = monopolyState.players[prop.owner];
        if (!owner) return;
        const canControl = (prop.owner === uuid) || (owner.isLocal && (owner.hostId === uuid || !owner.hostId || monopolyState.host === uuid));
        if (!canControl) return;

        const color = tileData.color;
        if (color) {
            const sameColorTiles = boardData.filter(t => t.color === color);
            const houseCounts = sameColorTiles.map(t => monopolyState.properties[boardData.indexOf(t)]?.houses || 0);
            const maxHouses = Math.max(...houseCounts);
            if ((prop.houses || 0) < maxHouses) {
                socket.emit('errorMsg', `Even Selling Rule: You must sell houses from other properties in this color group first!`);
                return;
            }
        }
        const cost = Math.round(tileData.houseCost || 50);
        const refund = Math.floor(cost / 2);
        owner.cash += refund;
        owner.cash = Math.round(owner.cash);
        prop.houses -= 1;
        monopolyIo.emit('systemMessage', `${owner.username} sold a house on ${tileData.name} for $${refund}.`);
        monopolyIo.emit('gameState', monopolyState);
    });

    socket.on('unmortgageProperty', (tileIndex) => {
        const uuid = socket.uuid;
        const prop = monopolyState.properties[tileIndex];
        const tileData = boardData[tileIndex];
        if (!prop || !prop.mortgaged) return;

        const owner = monopolyState.players[prop.owner];
        if (!owner) return;
        const canControl = (prop.owner === uuid) || (owner.isLocal && (owner.hostId === uuid || !owner.hostId || monopolyState.host === uuid));
        if (!canControl) return;
        
        const cost = Math.round(tileData.unmortgageCost || Math.ceil((tileData.mortgageValue || 0) * 1.1));
        if (owner.cash >= cost) {
            owner.cash -= cost;
            owner.cash = Math.round(owner.cash);
            prop.mortgaged = false;
            monopolyIo.emit('systemMessage', `${owner.username} unmortgaged ${tileData.name} for $${cost}.`);
            monopolyIo.emit('gameState', monopolyState);
        } else {
            socket.emit('errorMsg', `${owner.username} does not have enough cash ($${cost}) to unmortgage!`);
        }
    });

  function handleLanding(targetUuid) {
    const player = monopolyState.players[targetUuid];
    if (!player) return;

    const tileIndex = player.position;
    const tileData = boardData[tileIndex];

    if (tileData && (tileData.type === 'property' || tileData.type === 'station' || tileData.type === 'utility')) {
        const prop = monopolyState.properties[tileIndex];
        if (!prop) {
            // Unowned - prompt buy
            player.isUtilityCardMove = false;
            player.pendingAction = { type: 'buy', tileIndex, price: tileData.price };
            monopolyIo.emit('gameState', monopolyState);

            if (player.isBot) {
                setTimeout(() => {
                    if (monopolyState.players[targetUuid]) monopolyState.players[targetUuid].pendingAction = null;
                    const willBuy = player.cash > (tileData.price + 500);
                    if (willBuy) {
                        player.cash -= tileData.price;
                        player.cash = Math.round(player.cash);
                        monopolyState.properties[tileIndex] = { owner: targetUuid, houses: 0, mortgaged: false };
                        const wasAllSold = monopolyState.allPropertiesSold;
                        monopolyState.allPropertiesSold = areAllPropertiesSold();
                        if (!wasAllSold && monopolyState.allPropertiesSold) {
                            monopolyIo.emit('systemMessage', "🎉 All properties have been purchased! Property trading and negotiations are now OPEN!");
                        }
                        monopolyIo.emit('systemMessage', `🤖 ${player.username} bought ${tileData.name} for $${tileData.price}.`);
                        monopolyIo.emit('gameState', monopolyState);
                        setTimeout(() => { endTurnOrRollAgain(); }, 1200);
                    } else {
                        monopolyIo.emit('systemMessage', `🤖 ${player.username} passed on ${tileData.name}. Starting auction!`);
                        startAuction(tileIndex, Math.max(10, Math.floor(tileData.price / 4)));
                    }
                }, 1500);
            }
            return;
        } else if (prop.owner !== targetUuid && !prop.mortgaged) {
            const owner = prop.owner;
            let rent = 0;

            if (tileData.type === 'property') {
                const houses = prop.houses || 0;
                if (houses === 1) rent = tileData.rent.house1;
                else if (houses === 2) rent = tileData.rent.house2;
                else if (houses === 3) rent = tileData.rent.house3;
                else if (houses === 4) rent = tileData.rent.house4;
                else if (houses === 5) rent = tileData.rent.hotel;
                else {
                    rent = tileData.rent ? tileData.rent.base : 100;
                    const sameColor = boardData.filter(t => t.color === tileData.color);
                    const ownsAll = sameColor.every((t) => {
                        const idx = boardData.indexOf(t);
                        return monopolyState.properties[idx] && monopolyState.properties[idx].owner === owner && !monopolyState.properties[idx].mortgaged;
                    });
                    if (ownsAll) rent *= 2;
                }
            } else if (tileData.type === 'station') {
                const ownedStations = boardData.filter((t, i) => t.type === 'station' && monopolyState.properties[i] && monopolyState.properties[i].owner === owner && !monopolyState.properties[i].mortgaged).length;
                if (ownedStations === 1) rent = 250;
                else if (ownedStations === 2) rent = 500;
                else if (ownedStations === 3) rent = 1000;
                else if (ownedStations >= 4) rent = 2000;
                else rent = 250;
            } else if (tileData.type === 'utility') {
                const ownedUtilities = boardData.filter((t, i) => t.type === 'utility' && monopolyState.properties[i] && monopolyState.properties[i].owner === owner && !monopolyState.properties[i].mortgaged).length;
                const rollVal = player.lastRoll || (Math.floor(Math.random() * 10) + 2);
                if (player.isUtilityCardMove) {
                    rent = 100 * rollVal; // Special utility card rule: 10 times dice roll (100x roll in 10x economy)
                    monopolyIo.emit('systemMessage', `⚡ Special Utility Card Rule: 10x dice roll applied (${rollVal} x 100 = $${rent})!`);
                } else {
                    rent = (ownedUtilities >= 2 ? 100 : 40) * rollVal;
                }
                player.isUtilityCardMove = false;
            }

            if (rent > 0) {
                rent = Math.round(rent);
                if (player.cash >= rent) {
                    player.cash -= rent;
                    player.cash = Math.round(player.cash);
                    if (monopolyState.players[owner]) {
                        monopolyState.players[owner].cash += rent;
                        monopolyState.players[owner].cash = Math.round(monopolyState.players[owner].cash);
                    }
                    monopolyIo.emit('systemMessage', `💸 ${player.username} paid $${rent} rent to ${monopolyState.players[owner]?.username || 'owner'}.`);
                } else {
                    monopolyIo.emit('systemMessage', `⚠️ ${player.username} does not have enough cash to pay $${rent} rent to ${monopolyState.players[owner]?.username || 'owner'}!`);
                    player.debtState = { type: 'rent', amount: rent, creditor: owner };
                }
            }
        }
    } else if (tileData && tileData.type === 'tax') {
        const amt = Math.round(tileData.amount || 2000);
        if (player.cash >= amt) {
            player.cash -= amt;
            player.cash = Math.round(player.cash);
            monopolyIo.emit('systemMessage', `🏛️ ${player.username} paid $${amt} in taxes to the Bank.`);
        } else {
            monopolyIo.emit('systemMessage', `⚠️ ${player.username} does not have enough cash to pay $${amt} taxes!`);
            player.debtState = { type: 'tax', amount: amt, creditor: null };
        }
    } else if (tileData && (tileData.type === 'chest' || tileData.type === 'chance')) {
        player.pendingAction = { type: 'draw_card', deck: tileData.type };
        monopolyIo.emit('gameState', monopolyState);
        if (player.isBot) {
            setTimeout(() => {
                const deckName = player.pendingAction?.deck + 'Deck';
                if (monopolyState[deckName] && monopolyState[deckName].length > 0) {
                    const drawnCard = monopolyState[deckName].shift();
                    drawnCard.deck = player.pendingAction?.deck;
                    if (drawnCard.action !== 'get_out_jail') {
                        monopolyState[deckName].push(drawnCard);
                    }
                    const oldPos = player.position;
                    const moved = applyCard(targetUuid, drawnCard);
                    if (monopolyState.players[targetUuid]) monopolyState.players[targetUuid].pendingAction = null;
                    if (moved) {
                        monopolyIo.emit('gameState', monopolyState);
                        if (player.inJail) {
                            setTimeout(() => { endTurnOrRollAgain(); }, 1500);
                        } else {
                            const steps = (player.position - oldPos + 40) % 40;
                            const delay = steps > 12 ? 800 : Math.max(800, steps * 200 + 400);
                            setTimeout(() => handleLanding(targetUuid), delay);
                        }
                        return;
                    }
                }
                if (monopolyState.players[targetUuid]) monopolyState.players[targetUuid].pendingAction = null;
                monopolyIo.emit('gameState', monopolyState);
                setTimeout(() => { endTurnOrRollAgain(); }, 2000);
            }, 1500);
        }
        return;
    } else if (tileData && tileData.type === 'go') {
        monopolyIo.emit('systemMessage', `🏁 ${player.username} landed on GO!`);
    } else if (tileData && tileData.type === 'jail') {
        monopolyIo.emit('systemMessage', `👀 ${player.username} is just visiting Jail.`);
    } else if (tileData && tileData.type === 'free_parking') {
        monopolyIo.emit('systemMessage', `🚗 ${player.username} is resting in Free Parking (Safe Zone).`);
    }

    monopolyIo.emit('gameState', monopolyState);

    if (!player.debtState) {
        if (player.isBot) {
            setTimeout(endTurnOrRollAgain, 2000);
        } else {
            setTimeout(endTurnOrRollAgain, 1500);
        }
    } else {
        if (player.isBot) {
            setTimeout(() => handleBotDebt(targetUuid), 1500);
        }
    }
  }

  function handleRollDice(targetUuid) {
    if (monopolyState.status !== 'PLAYING') return;
    if (monopolyState.isRolling) return;
    const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
    if (targetUuid !== currentPid) return;
    const player = monopolyState.players[targetUuid];
    if (!player || player.debtState || player.pendingAction) return;
    
    monopolyState.isRolling = true;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    let isDouble = (d1 === d2);
    const steps = d1 + d2;
    player.lastRoll = steps;
    
    const wasInJail = player.inJail;

    if (player.inJail) {
        if (isDouble) {
            player.inJail = false;
            player.jailTurns = 0;
            player.doublesCount = 0;
            player.justRolledDouble = false;
            isDouble = false; // Rolling doubles to exit jail does not grant another turn
            monopolyIo.emit('systemMessage', `🎲 ${player.username} rolled doubles (${d1}, ${d2}) and got out of Jail!`);
        } else {
            player.jailTurns = (player.jailTurns || 0) + 1;
            if (player.jailTurns >= 3) {
                if (player.cash >= 50) {
                    player.cash -= 50;
                    player.inJail = false;
                    player.jailTurns = 0;
                    monopolyIo.emit('systemMessage', `⚖️ ${player.username} served 3 turns in jail, paid $50 fine, and got out.`);
                } else {
                    monopolyIo.emit('systemMessage', `⚖️ ${player.username} could not pay $50 to leave jail!`);
                    player.debtState = { type: 'jail_fine', amount: 50, creditor: null };
                    monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid, steps });
                    monopolyIo.emit('gameState', monopolyState);
                    monopolyState.isRolling = false;
                    return;
                }
            } else {
                monopolyIo.emit('systemMessage', `🔒 ${player.username} rolled ${d1}+${d2} (no doubles) and stays in jail (${player.jailTurns}/3).`);
                monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid, steps });
                monopolyIo.emit('gameState', monopolyState);
                setTimeout(() => {
                    monopolyState.isRolling = false;
                    nextTurn();
                }, 1500);
                return;
            }
        }
    }

    if (isDouble) {
        player.doublesCount = (player.doublesCount || 0) + 1;
        if (player.doublesCount === 3) {
            player.position = 10;
            player.inJail = true;
            player.jailTurns = 0;
            player.doublesCount = 0;
            player.justRolledDouble = false;
            monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid, steps });
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => {
                monopolyIo.emit('systemMessage', `🚔 ${player.username} rolled 3 consecutive doubles and was sent to Jail!`);
                monopolyState.isRolling = false;
                nextTurn();
            }, 1500);
            return;
        }
    } else {
        player.doublesCount = 0;
    }

    player.justRolledDouble = isDouble;

    const oldPos = player.position;
    let newPos = oldPos + steps;
    let passedGo = false;
    if (newPos >= 40) {
        newPos -= 40;
        passedGo = true;
    }
    player.position = newPos;

    let sentToJail = false;
    if (player.position === 30) {
        sentToJail = true;
    }

    monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid, steps });
    monopolyIo.emit('gameState', monopolyState);

    // Each hop on client takes 200ms + 500ms dice roll animation
    const delay = 500 + (steps * 200) + 250;

    setTimeout(() => {
        if (sentToJail) {
            player.position = 10;
            player.inJail = true;
            player.jailTurns = 0;
            player.justRolledDouble = false;
            monopolyIo.emit('systemMessage', `🚔 ${player.username} landed on Go to Jail and was sent directly to Jail!`);
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => {
                monopolyState.isRolling = false;
                nextTurn();
            }, 1500);
            return;
        }
        if (passedGo) {
            player.cash += 2000;
            monopolyIo.emit('systemMessage', `💰 ${player.username} passed GO and collected $2000.`);
        }
        handleLanding(targetUuid);
    }, delay);
  }

  globalEndTurn = endTurnOrRollAgain;
  function endTurnOrRollAgain() {
      const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
      const player = monopolyState.players[currentPid];
      if (player && player.justRolledDouble && !player.inJail && !player.debtState) {
          player.justRolledDouble = false;
          monopolyState.isRolling = false;
          monopolyIo.emit('systemMessage', `🎲 ${player.username} rolled doubles and gets to roll again!`);
          monopolyIo.emit('gameState', monopolyState);
          if (player.isBot) {
              if (botTurnTimeout) clearTimeout(botTurnTimeout);
              botTurnTimeout = setTimeout(() => handleRollDice(currentPid), 2500);
          }
      } else {
          if (player) {
              player.justRolledDouble = false;
              if (player.isBot && !player.debtState) {
                  botUpgradeProperties(currentPid);
              }
          }
          monopolyState.isRolling = false;
          nextTurn();
      }
  }

  let botTurnTimeout = null;
  function nextTurn() {
    monopolyState.isRolling = false;
    if (botTurnTimeout) {
        clearTimeout(botTurnTimeout);
        botTurnTimeout = null;
    }
    if (!monopolyState.turnOrder || monopolyState.turnOrder.length === 0) return;
    if (checkGameOver()) return;
    let attempts = 0;
    do {
        monopolyState.currentTurnIndex = (monopolyState.currentTurnIndex + 1) % monopolyState.turnOrder.length;
        attempts++;
        const p = monopolyState.players[monopolyState.turnOrder[monopolyState.currentTurnIndex]];
        if (p && (p.online || p.isBot || p.isLocal)) break;
    } while (attempts < monopolyState.turnOrder.length);
    
    const newPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
    if (monopolyState.players[newPid]) {
        monopolyState.players[newPid].justRolledDouble = false;
    }
    
    monopolyIo.emit('gameState', monopolyState);
    checkBotTurn();
  }

  function botUpgradeProperties(botUuid) {
      const bot = monopolyState.players[botUuid];
      if (!bot || !bot.isBot || bot.debtState) return;

      const colorGroups = {};
      boardData.forEach((tile, idx) => {
          if (tile.type === 'property' && tile.color) {
              if (!colorGroups[tile.color]) colorGroups[tile.color] = [];
              colorGroups[tile.color].push({ tile, idx });
          }
      });

      let upgraded = false;
      for (const color of Object.keys(colorGroups)) {
          const group = colorGroups[color];
          const ownsAll = group.every(item => {
              const p = monopolyState.properties[item.idx];
              return p && p.owner === botUuid && !p.mortgaged;
          });
          if (!ownsAll) continue;

          let canUpgradeMore = true;
          while (canUpgradeMore) {
              const counts = group.map(item => monopolyState.properties[item.idx]?.houses || 0);
              const minH = Math.min(...counts);
              if (minH >= 5) break;

              const target = group.find(item => (monopolyState.properties[item.idx]?.houses || 0) === minH);
              if (!target) break;

              const cost = Math.round(target.tile.houseCost || 1000);
              // Safety reserve: keep at least $1000 cash for rent/tax buffer
              if (bot.cash >= (cost + 1000)) {
                  bot.cash -= cost;
                  bot.cash = Math.round(bot.cash);
                  const p = monopolyState.properties[target.idx];
                  p.houses = (p.houses || 0) + 1;
                  upgraded = true;
                  const bName = p.houses === 5 ? 'a Hotel' : `House #${p.houses}`;
                  monopolyIo.emit('systemMessage', `🤖 ${bot.username} upgraded ${target.tile.name} with ${bName}!`);
              } else {
                  canUpgradeMore = false;
              }
          }
      }
      if (upgraded) {
          monopolyIo.emit('gameState', monopolyState);
      }
  }

  function handleBotDebt(botUuid) {
      const bot = monopolyState.players[botUuid];
      if (!bot || !bot.isBot || !bot.debtState) return;

      const debt = bot.debtState.amount;
      if (bot.cash >= debt) {
          bot.cash -= debt;
          bot.cash = Math.round(bot.cash);
          if (bot.debtState.creditor && monopolyState.players[bot.debtState.creditor]) {
              monopolyState.players[bot.debtState.creditor].cash += debt;
              monopolyState.players[bot.debtState.creditor].cash = Math.round(monopolyState.players[bot.debtState.creditor].cash);
          }
          monopolyIo.emit('systemMessage', `🤖 ${bot.username} paid off their debt of $${debt}.`);
          bot.debtState = false;
          monopolyIo.emit('gameState', monopolyState);
          setTimeout(endTurnOrRollAgain, 1000);
          return;
      }

      // Sell houses first
      let ownedPropsWithHouses = Object.keys(monopolyState.properties)
          .map(Number)
          .filter(idx => monopolyState.properties[idx].owner === botUuid && monopolyState.properties[idx].houses > 0);
      
      while (bot.cash < debt && ownedPropsWithHouses.length > 0) {
          const idx = ownedPropsWithHouses[0];
          const p = monopolyState.properties[idx];
          const t = boardData[idx];
          const refund = Math.floor((t.houseCost || 100) / 2);
          p.houses -= 1;
          bot.cash += refund;
          bot.cash = Math.round(bot.cash);
          monopolyIo.emit('systemMessage', `🤖 ${bot.username} sold a house on ${t.name} for $${refund} to pay debt.`);
          ownedPropsWithHouses = Object.keys(monopolyState.properties)
              .map(Number)
              .filter(i => monopolyState.properties[i].owner === botUuid && monopolyState.properties[i].houses > 0);
      }

      // Mortgage unmortgaged properties
      if (bot.cash < debt) {
          const unmortgaged = Object.keys(monopolyState.properties)
              .map(Number)
              .filter(idx => monopolyState.properties[idx].owner === botUuid && !monopolyState.properties[idx].mortgaged && (!monopolyState.properties[idx].houses || monopolyState.properties[idx].houses === 0));
          
          for (const idx of unmortgaged) {
              if (bot.cash >= debt) break;
              const p = monopolyState.properties[idx];
              const t = boardData[idx];
              const mVal = Math.round(t.mortgageValue || 500);
              p.mortgaged = true;
              bot.cash += mVal;
              bot.cash = Math.round(bot.cash);
              monopolyIo.emit('systemMessage', `🤖 ${bot.username} mortgaged ${t.name} for $${mVal} to pay debt.`);
          }
      }

      if (bot.cash >= debt) {
          bot.cash -= debt;
          bot.cash = Math.round(bot.cash);
          if (bot.debtState.creditor && monopolyState.players[bot.debtState.creditor]) {
              monopolyState.players[bot.debtState.creditor].cash += debt;
              monopolyState.players[bot.debtState.creditor].cash = Math.round(monopolyState.players[bot.debtState.creditor].cash);
          }
          monopolyIo.emit('systemMessage', `🤖 ${bot.username} paid off their debt of $${debt}.`);
          bot.debtState = false;
          monopolyIo.emit('gameState', monopolyState);
          setTimeout(endTurnOrRollAgain, 1000);
      } else {
          monopolyIo.emit('systemMessage', `💥 🤖 ${bot.username} could not pay the debt of $${debt} and is BANKRUPT!`);
          executeBankruptcy(botUuid);
      }
  }

  function evaluateBotTrade(botUuid, proposerUuid, offerProps, offerCash, requestProps, requestCash) {
      const bot = monopolyState.players[botUuid];
      const proposer = monopolyState.players[proposerUuid];
      if (!bot || !proposer) return { accept: false, reason: 'Invalid players' };

      if (requestCash > bot.cash) {
          return { accept: false, reason: `I only have $${bot.cash} in cash right now.` };
      }
      if (offerCash > proposer.cash) {
          return { accept: false, reason: `You don't have $${offerCash} in cash!` };
      }

      let offerValue = offerCash;
      offerProps.forEach(idx => {
          const t = boardData[idx];
          let val = t.price || 1000;
          if (t.color) {
              const sameColor = boardData.filter(other => other.color === t.color);
              const botAlreadyOwns = sameColor.filter(other => {
                  const oi = boardData.indexOf(other);
                  return monopolyState.properties[oi]?.owner === botUuid;
              }).length;
              if (botAlreadyOwns === sameColor.length - 1) {
                  val *= 2.6; // Completing a monopoly is worth huge value to bot!
              } else if (botAlreadyOwns > 0) {
                  val *= 1.4;
              }
          }
          offerValue += val;
      });

      let requestValue = requestCash;
      let breaksMonopoly = false;
      requestProps.forEach(idx => {
          const t = boardData[idx];
          let val = t.price || 1000;
          if (t.color) {
              const sameColor = boardData.filter(other => other.color === t.color);
              const botAlreadyOwns = sameColor.filter(other => {
                  const oi = boardData.indexOf(other);
                  return monopolyState.properties[oi]?.owner === botUuid;
              }).length;
              if (botAlreadyOwns === sameColor.length) {
                  breaksMonopoly = true;
                  val *= 3.5; // Bot refuses to break monopoly unless offer is astronomical
              }
              const proposerAlreadyOwns = sameColor.filter(other => {
                  const oi = boardData.indexOf(other);
                  return monopolyState.properties[oi]?.owner === proposerUuid;
              }).length;
              if (proposerAlreadyOwns === sameColor.length - 1) {
                  val *= 1.6; // Threat multiplier
              }
          }
          requestValue += val;
      });

      if (breaksMonopoly && offerValue < requestValue * 1.5) {
          return { accept: false, reason: "I will not break my completed color monopoly for this offer!" };
      }

      if (offerValue >= requestValue) {
          return { accept: true };
      } else {
          const cashDiff = Math.round(requestValue - offerValue);
          return {
              accept: false,
              counterOfferCash: cashDiff,
              reason: `That deal is not balanced for me. If you add at least $${cashDiff} in cash, I will accept!`
          };
      }
  }

  function checkBotTurn() {
      if (botTurnTimeout) {
          clearTimeout(botTurnTimeout);
          botTurnTimeout = null;
      }
      if (monopolyState.status !== 'PLAYING') return;
      const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
      const currentPlayer = monopolyState.players[currentPid];
      if (!currentPlayer || !currentPlayer.isBot) return;

      if (currentPlayer.debtState) {
          botTurnTimeout = setTimeout(() => handleBotDebt(currentPid), 1500);
          return;
      }
      if (currentPlayer.pendingAction) return;

      botUpgradeProperties(currentPid);

      if (currentPlayer.inJail && currentPlayer.cash >= 50) {
          botTurnTimeout = setTimeout(() => {
              currentPlayer.cash -= 50;
              currentPlayer.cash = Math.round(currentPlayer.cash);
              currentPlayer.inJail = false;
              currentPlayer.jailTurns = 0;
              monopolyIo.emit('systemMessage', `⚖️ ${currentPlayer.username} paid $50 fine to get out of Jail.`);
              monopolyIo.emit('gameState', monopolyState);
              botTurnTimeout = setTimeout(() => handleRollDice(currentPid), 2000);
          }, 2000);
      } else {
          botTurnTimeout = setTimeout(() => handleRollDice(currentPid), 2500);
      }
  }

  socket.on('proposeTrade', (tradeData) => {
      const proposerUuid = tradeData.proposerUuid || socket.uuid;
      const targetUuid = tradeData.targetUuid;
      const offerProps = (tradeData.offerProps || []).map(Number);
      const offerCash = Math.max(0, Math.round(tradeData.offerCash || 0));
      const requestProps = (tradeData.requestProps || []).map(Number);
      const requestCash = Math.max(0, Math.round(tradeData.requestCash || 0));

      const proposer = monopolyState.players[proposerUuid];
      const target = monopolyState.players[targetUuid];
      if (!proposer || !target || proposerUuid === targetUuid) {
          return socket.emit('errorMsg', "Invalid trade participants.");
      }

      const canControlProposer = (socket.uuid === proposerUuid) || (proposer.isLocal && (proposer.hostId === socket.uuid || !proposer.hostId || monopolyState.host === socket.uuid));
      if (!canControlProposer) {
          return socket.emit('errorMsg', "You cannot trade on behalf of this player.");
      }

      if (proposer.cash < offerCash) {
          return socket.emit('errorMsg', `${proposer.username} doesn't have enough cash for this offer.`);
      }
      for (const idx of offerProps) {
          const p = monopolyState.properties[idx];
          if (!p || p.owner !== proposerUuid) {
              return socket.emit('errorMsg', `${proposer.username} does not own ${boardData[idx]?.name || 'this property'}.`);
          }
          if (p.houses > 0) {
              return socket.emit('errorMsg', `Cannot trade ${boardData[idx]?.name} while it has houses. Sell houses first!`);
          }
      }

      if (target.cash < requestCash) {
          return socket.emit('errorMsg', `${target.username} does not have $${requestCash} in cash.`);
      }
      for (const idx of requestProps) {
          const p = monopolyState.properties[idx];
          if (!p || p.owner !== targetUuid) {
              return socket.emit('errorMsg', `${target.username} does not own ${boardData[idx]?.name || 'this property'}.`);
          }
          if (p.houses > 0) {
              return socket.emit('errorMsg', `Cannot trade ${boardData[idx]?.name} while it has houses. Sell houses first!`);
          }
      }

      if (offerProps.length === 0 && offerCash === 0 && requestProps.length === 0 && requestCash === 0) {
          return socket.emit('errorMsg', "Trade offer cannot be empty!");
      }

      if (target.isBot) {
          const evalResult = evaluateBotTrade(targetUuid, proposerUuid, offerProps, offerCash, requestProps, requestCash);
          if (evalResult.accept) {
              offerProps.forEach(idx => { monopolyState.properties[idx].owner = targetUuid; });
              requestProps.forEach(idx => { monopolyState.properties[idx].owner = proposerUuid; });
              proposer.cash = Math.round(proposer.cash - offerCash + requestCash);
              target.cash = Math.round(target.cash + offerCash - requestCash);

              const offerNames = offerProps.map(i => boardData[i].name).join(', ') + (offerCash > 0 ? (offerProps.length > 0 ? ` + $${offerCash}` : `$${offerCash}`) : '');
              const requestNames = requestProps.map(i => boardData[i].name).join(', ') + (requestCash > 0 ? (requestProps.length > 0 ? ` + $${requestCash}` : `$${requestCash}`) : '');

              monopolyIo.emit('systemMessage', `🤝 TRADE COMPLETED: ${proposer.username} traded (${offerNames || '$0'}) with 🤖 ${target.username} for (${requestNames || '$0'})!`);
              monopolyIo.emit('gameState', monopolyState);
              socket.emit('tradeSuccess', { message: `🤖 ${target.username} accepted your trade!` });
              botUpgradeProperties(targetUuid);
          } else {
              socket.emit('tradeResponse', {
                  accepted: false,
                  reason: evalResult.reason,
                  counterOfferCash: evalResult.counterOfferCash
              });
          }
      } else {
          const isLocalTrade = (socket.uuid === targetUuid) || (target.isLocal && (target.hostId === socket.uuid || !target.hostId || monopolyState.host === socket.uuid));

          const tradeId = 'trade_' + Date.now();
          monopolyState.activeTrades[tradeId] = {
              tradeId,
              proposerUuid,
              targetUuid,
              offerProps,
              offerCash,
              requestProps,
              requestCash,
              isLocalTrade
          };
          monopolyIo.emit('tradeProposed', {
              tradeId,
              proposerName: proposer.username,
              proposerUuid,
              targetName: target.username,
              targetUuid,
              isLocalTrade,
              offerProps: offerProps.map(i => ({ index: i, name: boardData[i].name, color: boardData[i].color })),
              offerCash,
              requestProps: requestProps.map(i => ({ index: i, name: boardData[i].name, color: boardData[i].color })),
              requestCash
          });
          socket.emit('tradeStatus', { message: `Trade proposal submitted for ${target.username}. Awaiting review...` });
      }
  });

  socket.on('respondTrade', ({ tradeId, accepted }) => {
      const trade = monopolyState.activeTrades[tradeId];
      if (!trade) return;
      delete monopolyState.activeTrades[tradeId];

      const proposer = monopolyState.players[trade.proposerUuid];
      const target = monopolyState.players[trade.targetUuid];
      if (!proposer || !target) return;

      if (accepted) {
          trade.offerProps.forEach(idx => { monopolyState.properties[idx].owner = trade.targetUuid; });
          trade.requestProps.forEach(idx => { monopolyState.properties[idx].owner = trade.proposerUuid; });
          proposer.cash = Math.round(proposer.cash - trade.offerCash + trade.requestCash);
          target.cash = Math.round(target.cash + trade.offerCash - trade.requestCash);

          const offerNames = trade.offerProps.map(i => boardData[i].name).join(', ') + (trade.offerCash > 0 ? (trade.offerProps.length > 0 ? ` + $${trade.offerCash}` : `$${trade.offerCash}`) : '');
          const requestNames = trade.requestProps.map(i => boardData[i].name).join(', ') + (trade.requestCash > 0 ? (trade.requestProps.length > 0 ? ` + $${trade.requestCash}` : `$${trade.requestCash}`) : '');

          monopolyIo.emit('systemMessage', `🤝 TRADE COMPLETED: ${proposer.username} traded (${offerNames || '$0'}) with ${target.username} for (${requestNames || '$0'})!`);
          monopolyIo.emit('gameState', monopolyState);
          monopolyIo.emit('tradeResult', { tradeId, accepted: true, message: `Trade between ${proposer.username} and ${target.username} was completed!` });
      } else {
          monopolyIo.emit('systemMessage', `❌ ${target.username} declined trade proposal from ${proposer.username}.`);
          monopolyIo.emit('tradeResult', { tradeId, accepted: false, message: `${target.username} declined the trade offer.` });
      }
  });

  socket.on('playerEmote', (data) => {
    monopolyIo.emit('playerEmote', data);
  });

  socket.on('disconnect', () => {
    if (socket.uuid && monopolyState.players[socket.uuid]) {
        monopolyState.players[socket.uuid].online = false;
        monopolyIo.emit('gameState', monopolyState);
    }
  });
});
// ════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const ips = getNetworkIps();
  console.log(`\n=============================================================`);
  console.log(`🎲 Multi-Game Hub (Ludo & Monopoly) running on port ${PORT}`);
  console.log(`=============================================================`);
  console.log(`• Localhost:       http://localhost:${PORT}`);
  if (ips.length > 0) {
    ips.forEach(ip => {
      console.log(`• Network (${ip.name}): http://${ip.address}:${PORT}`);
    });
    console.log(`\n📱 Join from phones/tablets on Wi-Fi using the Network address!`);
    console.log(`  - Ludo:     http://${ips[0].address}:${PORT}/play`);
    console.log(`  - Monopoly: http://${ips[0].address}:${PORT}/monopoly/index.html`);
  }
  console.log(`=============================================================\n`);
});


