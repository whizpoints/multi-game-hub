const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/log-error', (req, res) => { console.error('CLIENT ERROR:', req.query.msg); res.send('logged'); });

app.get('/play', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'play.html'));
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

function stepToCommonIndex(color, step) {
  if (step < 1 || step > 51) return null;
  return (COLOR_START[color] + step - 1) % 52;
}

function playersArray() {
  return gs.turnOrder.map(pid => {
    const p = gs.players[pid];
    return { id: pid, name: p.name, color: p.color, connected: p.connected, hostId: p.hostId };
  });
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
  if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
  
  // 30 seconds wait before skipping/converting to bot
  p.disconnectTimer = setTimeout(() => {
    if (!p.connected && gs.pausedFor === pid) {
       p.isBot = true;
       p.wasConvertedToBot = true;
       gs.status = 'PLAYING';
       gs.pausedFor = null;
       io.emit('gameResumed');
       io.emit('errorMsg', `${p.name} disconnected for too long and was converted to a bot.`);
       setTimeout(() => performRoll(pid), 1500);
    }
  }, 30000); 
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

  io.emit('playSound', 'turnChange');
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
      try { db.addMatchResult(gs.rankings, gs.rankings[0].name); } catch(e){}
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
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const player = db.registerPlayer(name);
    res.json(player);  
  } catch (err) {
    res.status(409).json({ error: 'Name already taken' });
  }
});

app.post('/api/login', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const player = db.loginPlayer(name);
  if (!player) return res.status(404).json({ error: 'Player not found' });
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
  res.json(db.getRecentMatches());
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

  
    socket.on('quitToLobby', () => {
        if (true && monopolyState.status === 'PLAYING') {
            monopolyState.status = 'LOBBY';
            monopolyState.properties = {};
            monopolyState.currentTurnIndex = 0;
            monopolyState.auction = null;
            
            Object.values(monopolyState.players).forEach(p => {
                p.cash = 15000;
                p.position = 0;
                p.inJail = false;
                p.jailTurns = 0;
                p.doublesCount = 0;
                p.pendingAction = null;
                p.getOutCards = 0;
            });
            
            monopolyIo.emit('systemMessage', "The host has reset the game to the Lobby.");
            monopolyIo.emit('gameState', monopolyState);
        }
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
socket.on('removePlayer', (targetUuid) => {
        if (true && monopolyState.status === 'LOBBY') {
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

    socket.on('editName', (newName) => {
        if (monopolyState.status === 'LOBBY' && socket.uuid) {
            const p = monopolyState.players[socket.uuid];
            if (p && newName && newName.trim().length > 0) {
                const oldName = p.username;
                p.username = newName.trim().substring(0, 15);
                monopolyIo.emit('systemMessage', `${oldName} changed their name to ${p.username}.`);
                monopolyIo.emit('gameState', monopolyState);
            }
        }
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

    gs.players[botId] = {
      socketId: 'bot',
      color: assignedColor,
      name: 'Bot ' + Math.floor(Math.random() * 1000),
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
    
    if (!currentPlayer || currentPlayer.socketId !== socket.id) return;
    performRoll(currentPid);
  });

  // ─── SELECT TOKEN ───
  socket.on('selectToken', ({ tokenIndex }) => {
    if (gs.status !== 'PLAYING') return;
    const currentPid = gs.turnOrder[gs.currentTurnIndex];
    const currentPlayer = gs.players[currentPid];
    
    if (!currentPlayer || currentPlayer.socketId !== socket.id) return;
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
  properties: {} // Track ownership: { tileIndex: { ownerUuid, houses: 0 } }
};

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

function startAuction(tileIndex, basePrice) {
    monopolyState.status = 'AUCTION';
    const activeUuids = monopolyState.turnOrder.filter(uuid => {
        const p = monopolyState.players[uuid];
        return p && !p.debtState && !p.isBot; // bots fold instantly for now to keep it simple
    });
    
    monopolyState.auction = {
        tileIndex,
        currentBid: 10,
        highestBidder: null,
        activeBidders: activeUuids,
        timer: 15
    };
    
    monopolyIo.emit('gameState', monopolyState);
    monopolyIo.emit('systemMessage', `Auction started for ${boardData[tileIndex].name}!`);
    
    if (auctionInterval) clearInterval(auctionInterval);
    auctionInterval = setInterval(() => {
        if (monopolyState.status !== 'AUCTION') {
            clearInterval(auctionInterval);
            return;
        }
        monopolyState.auction.timer--;
        if (monopolyState.auction.timer <= 0 || monopolyState.auction.activeBidders.length < 2 && monopolyState.auction.highestBidder) {
            endAuction();
        } else if (monopolyState.auction.activeBidders.length === 0) {
            endAuction();
        } else {
            monopolyIo.emit('gameState', monopolyState); // Sync timer
        }
    }, 1000);
}

function endAuction() {
    clearInterval(auctionInterval);
    const auc = monopolyState.auction;
    monopolyState.status = 'PLAYING';
    monopolyState.auction = null;
    
    if (auc.highestBidder) {
        const winner = monopolyState.players[auc.highestBidder];
        if (winner) {
            winner.cash -= auc.currentBid;
            monopolyState.properties[auc.tileIndex] = { owner: auc.highestBidder, houses: 0 };
            monopolyIo.emit('systemMessage', `${winner.username} won the auction for ${boardData[auc.tileIndex].name} at ${auc.currentBid}!`);
        }
    } else {
        monopolyIo.emit('systemMessage', `Nobody bid on ${boardData[auc.tileIndex].name}.`);
    }
    
    monopolyIo.emit('gameState', monopolyState);
    setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 2000);
}

// Auction Socket Events


    function applyCard(uuid, card) {
    const player = monopolyState.players[uuid];
    if (!player) return;
    monopolyIo.emit('systemMessage', `${player.username} drew: "${card.text}"`);
    monopolyIo.emit('cardDrawn', { uuid, text: card.text });
    
    if (card.action === 'advance_to') {
        const oldPos = player.position;
        player.position = card.target;
        if (player.position < oldPos && player.position !== 0) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', `${player.username} passed GO and collected $200.`);
        }
    } else if (card.action === 'advance_rail') {
        const p = player.position;
        let target = 5;
        if (p >= 5 && p < 15) target = 15;
        else if (p >= 15 && p < 25) target = 25;
        else if (p >= 25 && p < 35) target = 35;
        
        if (target === 5 && p >= 35) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', `${player.username} passed GO and collected $200.`);
        }
        player.position = target;
    } else if (card.action === 'advance_utility') {
        const p = player.position;
        let target = 12;
        if (p >= 12 && p < 28) target = 28;
        
        if (target === 12 && p >= 28) {
            player.cash += 200; // Passed GO
            monopolyIo.emit('systemMessage', `${player.username} passed GO and collected $200.`);
        }
        player.position = target;
    } else if (card.action === 'go_back_3') {
        player.position = (player.position - 3 + 40) % 40;
    } else if (card.action === 'get_out_jail') {
        player.getOutJailFree = (player.getOutJailFree || 0) + 1;
    } else if (card.action === 'go_jail') {
        player.position = 10;
        player.inJail = true;
    } else if (card.action.startsWith('pay_all')) {
        const amt = card.amount || 50;
        let totalPaid = 0;
        monopolyState.turnOrder.forEach(uid => {
            if (uid !== uuid) {
                monopolyState.players[uid].cash += amt;
                totalPaid += amt;
            }
        });
        player.cash -= totalPaid;
    } else if (card.action.startsWith('collect_from_all')) {
        const amt = card.amount || 10;
        let totalCollected = 0;
        monopolyState.turnOrder.forEach(uid => {
            if (uid !== uuid) {
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
        const total = (houses * 40) + (hotels * 100);
        player.cash -= total;
    } else if (card.action.startsWith('pay_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash -= amt;
        } else if (card.action.startsWith('collect_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash += amt;
    }
}

monopolyIo.on('connection', (socket) => {

    socket.on('addLocalPlayer', (name) => {
        if (true && monopolyState.status === 'LOBBY' && monopolyState.turnOrder.length < 8) {
            const localId = 'local_' + Math.floor(Math.random() * 100000);
            const neonColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ff8800', '#00ff88'];
            const color = neonColors[monopolyState.turnOrder.length % neonColors.length];
            monopolyState.players[localId] = {
                uuid: localId,
                username: name || 'Local Player',
                cash: 15000,
                position: 0,
                color: color,
                symbol: tokenSymbols[monopolyState.turnOrder.length % tokenSymbols.length],
                online: true, isBot: false, isLocal: true, hostId: socket.uuid,
                doublesCount: 0, inJail: false, jailTurns: 0, getOutCards: 0
            };
            monopolyState.turnOrder.push(localId);
            monopolyIo.emit('systemMessage', `${name || 'Local Player'} joined the lobby.`);
            monopolyIo.emit('gameState', monopolyState);
        }
    });

    socket.on('removePlayer', (targetUuid) => {
        if (true && monopolyState.status === 'LOBBY') {
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

    socket.on('editName', (newName) => {
        if (monopolyState.status === 'LOBBY' && socket.uuid) {
            const p = monopolyState.players[socket.uuid];
            if (p && newName && newName.trim().length > 0) {
                const oldName = p.username;
                p.username = newName.trim().substring(0, 15);
                monopolyIo.emit('systemMessage', `${oldName} changed their name to ${p.username}.`);
                monopolyIo.emit('gameState', monopolyState);
            }
        }
    });

    socket.on('joinGame', (data) => {
        socket.uuid = data.uuid; if(monopolyState.players[data.uuid]) monopolyState.players[data.uuid].online = true;
        if (!monopolyState.players[data.uuid]) {
            const neonColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ff8800', '#00ff88'];
            const color = neonColors[monopolyState.turnOrder.length % neonColors.length];
            monopolyState.players[data.uuid] = {
                uuid: data.uuid,
                username: data.username || 'Guest',
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
            if (!monopolyState.turnOrder.includes(data.uuid)) {
                monopolyState.turnOrder.push(data.uuid);
            }
            if (!monopolyState.host) {
                monopolyState.host = data.uuid;
            }
        }
        monopolyIo.emit('systemMessage', `${data.username || 'A player'} joined the lobby.`);
        monopolyIo.emit('gameState', monopolyState);
    });

    socket.on('addBot', () => {
        if (true && monopolyState.status === 'LOBBY' && monopolyState.turnOrder.length < 8) {
            const botId = 'bot_' + Math.floor(Math.random() * 10000);
            const neonColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ff8800', '#00ff88'];
            const color = neonColors[monopolyState.turnOrder.length % neonColors.length];
            monopolyState.players[botId] = {
                uuid: botId,
                username: 'Bot ' + Math.floor(Math.random() * 100),
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
            monopolyState.turnOrder.push(botId);
            monopolyIo.emit('systemMessage', `${monopolyState.players[botId].username} joined the lobby.`);
            monopolyIo.emit('gameState', monopolyState);
        }
    });

    socket.on('startGame', () => {
        if (true && monopolyState.status === 'LOBBY') {
            monopolyState.status = 'PLAYING';
            monopolyState.currentTurnIndex = 0;

            const initialChanceDeck = [
                { text: 'Advance to GO', action: 'advance_to', target: 0 },
                { text: 'Advance to Mumbai', action: 'advance_to', target: 24 },
                { text: 'Advance to Kobe', action: 'advance_to', target: 11 },
                { text: 'Advance to nearest Utility', action: 'advance_utility' },
                { text: 'Advance to nearest Railroad', action: 'advance_rail' },
                { text: 'Bank pays you dividend of $500', action: 'collect_500' },
                { text: 'Get Out of Jail Free', action: 'get_out_jail' },
                { text: 'Go Back 3 Spaces', action: 'go_back_3' },
                { text: 'Go directly to Jail', action: 'go_jail' },
                { text: 'Pay poor tax of $200', action: 'pay_200' },
                { text: 'Take a trip to Rail 3', action: 'advance_to', target: 5 },
                { text: 'Advance to Baku', action: 'advance_to', target: 39 },
                { text: 'You have been elected Chairman of the Board. Pay each player $500', action: 'pay_all', amount: 500 },
                { text: 'Your building loan matures. Collect $1500', action: 'collect_1500' },
                { text: 'Speeding fine $200', action: 'pay_200' },
                { text: 'Won a crossword competition. Collect $1000', action: 'collect_1000' }
            ];

            const initialChestDeck = [
                { text: 'Advance to GO', action: 'advance_to', target: 0 },
                { text: 'Bank error in your favor. Collect $2000', action: 'collect_2000' },
                { text: 'Doctor\'s fees. Pay $500', action: 'pay_500' },
                { text: 'From sale of stock you get $500', action: 'collect_500' },
                { text: 'Get Out of Jail Free', action: 'get_out_jail' },
                { text: 'Go directly to Jail', action: 'go_jail' },
                { text: 'Holiday Fund matures. Receive $1000', action: 'collect_1000' },
                { text: 'Income tax refund. Collect $2000', action: 'collect_2000' },
                { text: 'It is your birthday. Collect $100 from every player', action: 'collect_from_all', amount: 100 },
                { text: 'Life insurance matures. Collect $1000', action: 'collect_1000' },
                { text: 'Pay hospital fees of $500', action: 'pay_500' },
                { text: 'Pay school fees of $500', action: 'pay_500' },
                { text: 'Receive $250 consultancy fee', action: 'collect_250' },
                { text: 'You are assessed for street repairs. Pay $40 per house and $100 per hotel', action: 'street_repairs' },
                { text: 'You have won second prize in a beauty contest. Collect $1000', action: 'collect_1000' },
                { text: 'You inherit $1000', action: 'collect_1000' }
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
            monopolyIo.emit('systemMessage', `The game has started!`);
            monopolyIo.emit('gameState', monopolyState);
            checkBotTurn();
        }
    });

    socket.on('rollDice', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (socket.uuid === currentPid) {
            handleRollDice(socket.uuid);
        }
    });

    socket.on('payJailFine', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (socket.uuid === currentPid) {
            const player = monopolyState.players[socket.uuid];
            if (player && player.inJail) {
                if (player.cash >= 50) {
                    player.cash -= 50;
                    player.inJail = false;
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
        if (!(socket.uuid === currentPid || (pAuth && pAuth.isLocal && pAuth.hostId === socket.uuid))) return;
        const uuid = currentPid;
        const player = monopolyState.players[uuid];
        if (player && player.pendingAction && player.pendingAction.type === 'buy') {
            const tileIndex = player.pendingAction.tileIndex;
            const price = player.pendingAction.price;
            
            if (willBuy) {
                if (player.cash >= price) {
                    player.cash -= price;
                    monopolyState.properties[tileIndex] = { owner: uuid, houses: 0, mortgaged: false };
                    
                    const boardData = require('./public/monopoly/boardData.js');
                    const name = boardData[tileIndex] ? boardData[tileIndex].name : ('Property ' + tileIndex);
                    monopolyIo.emit('systemMessage', `${player.username} bought ${name}.`);
                } else {
                    socket.emit('errorMsg', "Insufficient funds to buy this property.");
                    startAuction(tileIndex, Math.max(10, Math.floor(price / 4)));
                    player.pendingAction = null;
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

    socket.on('placeBid', (amount) => {
        if (monopolyState.status === 'AUCTION') {
            const auc = monopolyState.auction;
            if (auc && auc.activeBidders.includes(socket.uuid)) {
                auc.currentBid += amount;
                auc.highestBidder = socket.uuid;
                auc.timer = 15;
                monopolyIo.emit('gameState', monopolyState);
            }
        }
    });

    socket.on('foldAuction', () => {
        if (monopolyState.status === 'AUCTION') {
            const auc = monopolyState.auction;
            if (auc) {
                auc.activeBidders = auc.activeBidders.filter(u => u !== socket.uuid);
                if (auc.activeBidders.length < 2 && auc.highestBidder) {
                    endAuction();
                } else if (auc.activeBidders.length === 0) {
                    endAuction();
                } else {
                    monopolyIo.emit('gameState', monopolyState);
                }
            }
        }
    });

    socket.on('buyHouse', (tileIndex) => {
        const uuid = socket.uuid;
        const player = monopolyState.players[uuid];
        if (!player) return;
        const prop = monopolyState.properties[tileIndex];
        const tileData = boardData[tileIndex];
        
        if (prop && (prop.owner === uuid || (monopolyState.players[prop.owner] && monopolyState.players[prop.owner].isLocal && monopolyState.players[prop.owner].hostId === uuid)) && !prop.mortgaged && prop.houses < 5) {
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
            }
            const cost = tileData.houseCost || 50;
            if (player.cash >= cost) {
                player.cash -= cost;
                prop.houses = (prop.houses || 0) + 1;
                monopolyIo.emit('systemMessage', `${player.username} upgraded ${tileData.name}.`);
                monopolyIo.emit('gameState', monopolyState);
            } else {
                socket.emit('errorMsg', "Not enough cash to upgrade!");
            }
        }
    });

    
    socket.on('useJailCard', () => {
        const uuid = socket.uuid;
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (uuid !== currentPid) return;
        const player = monopolyState.players[currentPid];
        if (player && player.inJail && player.getOutJailFree > 0) {
            player.getOutJailFree -= 1;
            player.inJail = false;
            monopolyIo.emit('systemMessage', `${player.username} used a Get Out of Jail Free card!`);
            monopolyIo.emit('gameState', monopolyState);
        }
    });

    socket.on('resolveCard', () => {
        const uuid = socket.uuid;
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (uuid !== currentPid) return;
        const player = monopolyState.players[currentPid];
        if (!player || !player.pendingAction || player.pendingAction.type !== 'draw_card') return;
        
        const deckName = player.pendingAction.deck + 'Deck';
        if (!monopolyState[deckName] || monopolyState[deckName].length === 0) return;
        
        const drawnCard = monopolyState[deckName].shift();
        monopolyState[deckName].push(drawnCard); // put at bottom
        
        const moved = applyCard(currentPid, drawnCard);
        player.pendingAction = null;
        
        if (moved) {
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { handleLanding(currentPid); }, 1500);
        } else {
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 4000);
        }
    });

    socket.on('mortgageProperty', (tileIndex) => {
    const uuid = socket.uuid;
    const player = monopolyState.players[uuid];
    if (!player) return;
    const prop = monopolyState.properties[tileIndex];
    const tileData = boardData[tileIndex];
    
    if (prop && (prop.owner === uuid || (monopolyState.players[prop.owner] && monopolyState.players[prop.owner].isLocal && monopolyState.players[prop.owner].hostId === uuid)) && !prop.mortgaged && (!prop.houses || prop.houses === 0)) {
        if (tileData.mortgageValue) {
            player.cash += tileData.mortgageValue;
            prop.mortgaged = true;
            monopolyIo.emit('systemMessage', `${player.username} mortgaged ${tileData.name} for ${tileData.mortgageValue}.`);
            monopolyIo.emit('gameState', monopolyState);
        }
    }
});

socket.on('unmortgageProperty', (tileIndex) => {
    const uuid = socket.uuid;
    const player = monopolyState.players[uuid];
    if (!player) return;
    const prop = monopolyState.properties[tileIndex];
    const tileData = boardData[tileIndex];
    
    if (prop && (prop.owner === uuid || (monopolyState.players[prop.owner] && monopolyState.players[prop.owner].isLocal && monopolyState.players[prop.owner].hostId === uuid)) && prop.mortgaged) {
        const cost = tileData.unmortgageCost || Math.ceil((tileData.mortgageValue || 0) * 1.1);
        if (player.cash >= cost) {
            player.cash -= cost;
            prop.mortgaged = false;
            monopolyIo.emit('systemMessage', `${player.username} unmortgaged ${tileData.name} for ${cost}.`);
            monopolyIo.emit('gameState', monopolyState);
        } else {
            socket.emit('errorMsg', "Not enough cash to unmortgage!");
        }
    }
});

  function handleRollDice(targetUuid) {
    if (monopolyState.status !== 'PLAYING') return;
    const player = monopolyState.players[targetUuid];
    if (!player || player.debtState || player.pendingAction) return;
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    let isDouble = (d1 === d2);
    const steps = d1 + d2;
    player.lastRoll = steps;
    
    if (player.inJail) {
        if (isDouble) {
            player.inJail = false;
        } else {
            monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
            nextTurn();
            return;
        }
    }

    if (isDouble) {
        player.doublesCount++;
        if (player.doublesCount === 3) {
            player.position = 10;
            player.inJail = true;
            player.doublesCount = 0;
            monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => {
                monopolyIo.emit('systemMessage', `${player.username} went to jail for 3 doubles!`);
                nextTurn();
            }, 600 + 400 + 100);
            return;
        }
    } else {
        player.doublesCount = 0;
    }

    player.position += steps;
    let passedGo = false;
    if (player.position >= 40) {
        player.position -= 40;
        passedGo = true;
    }
    
    let sentToJail = false;
    if (player.position === 30) {
        player.position = 10;
        player.inJail = true;
        isDouble = false; 
        sentToJail = true;
    }

    player.justRolledDouble = isDouble;
    monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
    monopolyIo.emit('gameState', monopolyState); // Emit movement instantly for client animation

    let delay = 600 + (steps * 250) + 100;
    if (sentToJail) delay += 400;

    setTimeout(() => {
        if (passedGo) {
            player.cash += 2000;
            monopolyIo.emit('systemMessage', `${player.username} collected $2000 for passing GO.`);
        }

        const tileIndex = player.position;
        const tileData = boardData[tileIndex];
        
        if (tileData && (tileData.type === 'property' || tileData.type === 'station' || tileData.type === 'utility')) {
            const prop = monopolyState.properties[tileIndex];
            if (!prop) {
                // Unowned
                player.pendingAction = { type: 'buy', tileIndex, price: tileData.price };
                monopolyIo.emit('gameState', monopolyState);
    
                if (player.isBot) {
                    setTimeout(() => {
                        const willBuy = player.cash > (tileData.price + 500); 
                        monopolyState.players[targetUuid].pendingAction = null;
                        if (willBuy) {
                            player.cash -= tileData.price;
                            monopolyState.properties[tileIndex] = { owner: targetUuid, houses: 0 };
                            monopolyIo.emit('systemMessage', `${player.username} bought ${tileData.name}`);
                        }
                        monopolyIo.emit('gameState', monopolyState);
                        setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 1000);
                    }, 1500);
                }
                return;
            } else if (prop.owner !== targetUuid && !prop.mortgaged) {
                const owner = prop.owner;
                let rent = tileData.rent ? tileData.rent.base : 100;
                
                if (tileData.type === 'property') {
                    const houses = prop.houses || 0;
                    if (houses === 1) rent = tileData.rent.house1;
                    else if (houses === 2) rent = tileData.rent.house2;
                    else if (houses === 3) rent = tileData.rent.house3;
                    else if (houses === 4) rent = tileData.rent.house4;
                    else if (houses === 5) rent = tileData.rent.hotel;
                    else {
                        const sameColor = boardData.filter(t => t.color === tileData.color);
                        const ownsAll = sameColor.every((t, i) => {
                            const idx = boardData.indexOf(t);
                            return monopolyState.properties[idx] && monopolyState.properties[idx].owner === owner;
                        });
                        if (ownsAll) rent *= 2;
                    }
                }
                
                if (rent > 0) {
                    player.cash -= rent;
                    if (monopolyState.players[owner]) {
                        monopolyState.players[owner].cash += rent;
                    }
                    monopolyIo.emit('systemMessage', `${player.username} paid ${rent} rent to ${monopolyState.players[owner].username}.`);
                }
            }
        } else if (tileData && tileData.type === 'tax') {
            const amt = tileData.amount || 2000;
            player.cash -= amt;
            monopolyIo.emit('systemMessage', `${player.username} paid ${amt} in taxes.`);
        } else if (tileData && (tileData.type === 'chest' || tileData.type === 'chance')) {
            player.pendingAction = { type: 'draw_card', deck: tileData.type };
            monopolyIo.emit('gameState', monopolyState);
            if (player.isBot) {
                setTimeout(() => {
                    const deckName = player.pendingAction.deck + 'Deck';
                    if (monopolyState[deckName] && monopolyState[deckName].length > 0) {
                        const drawnCard = monopolyState[deckName].shift();
                        monopolyState[deckName].push(drawnCard);
                        applyCard(targetUuid, drawnCard);
                    }
                    if (monopolyState.players[targetUuid]) monopolyState.players[targetUuid].pendingAction = null;
                    monopolyIo.emit('gameState', monopolyState);
                    setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 4000);
                }, 1500);
            }
            return;
        }
        
        monopolyIo.emit('gameState', monopolyState);
        
        if (player.isBot) {
            setTimeout(endTurnOrRollAgain, 4000);
        } else {
            endTurnOrRollAgain();
        }
        
    }, delay);
}

globalEndTurn = endTurnOrRollAgain;
function endTurnOrRollAgain() {
      const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
      const player = monopolyState.players[currentPid];
      if (player && player.justRolledDouble && !player.inJail && !player.debtState) {
          player.justRolledDouble = false;
          if (player.isBot) setTimeout(() => handleRollDice(currentPid), 4000);
      } else {
          nextTurn();
      }
  }

  function nextTurn() {
    let attempts = 0;
    do {
        monopolyState.currentTurnIndex = (monopolyState.currentTurnIndex + 1) % monopolyState.turnOrder.length;
        attempts++;
    } while (!monopolyState.players[monopolyState.turnOrder[monopolyState.currentTurnIndex]].online && attempts < 8);
    
    const newPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
    if (monopolyState.players[newPid]) {
        monopolyState.players[newPid].justRolledDouble = false;
    }
    
    monopolyIo.emit('gameState', monopolyState);
    checkBotTurn();
  }

  function checkBotTurn() {
      if (monopolyState.status !== 'PLAYING') return;
      const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
      const currentPlayer = monopolyState.players[currentPid];
      if (currentPlayer && currentPlayer.isBot && !currentPlayer.pendingAction) {
          if (currentPlayer.inJail && currentPlayer.cash >= 50) {
              setTimeout(() => {
                  currentPlayer.cash -= 50;
                  currentPlayer.inJail = false;
                  monopolyIo.emit('systemMessage', currentPlayer.username + ' paid  to leave jail.');
                  monopolyIo.emit('gameState', monopolyState);
                  setTimeout(() => handleRollDice(currentPid), 2000);
              }, 2000);
          } else {
              setTimeout(() => handleRollDice(currentPid), 4000);
          }
      }
  }

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
  console.log(`\n🎲 Multi-Game Hub (Ludo & Monopoly) running on port ${PORT}`);
});


