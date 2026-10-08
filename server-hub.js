const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// ════════════════════════════════════════════════════════════════
// 1. HUB & LOBBY NAMESPACE
// ════════════════════════════════════════════════════════════════
const lobbyIo = io.of('/lobby');
const hubPlayers = {}; // Shared player presence tracking

lobbyIo.on('connection', (socket) => {
  console.log(`[LOBBY] Connected: ${socket.id}`);

  // Shared Identity Tracking
  socket.on('identify', (uuid, username) => {
    if (!uuid || !username) return;
    hubPlayers[uuid] = {
      socketId: socket.id,
      username: username,
      online: true,
      currentGame: 'lobby'
    };
    
    // Broadcast updated hub players to the lobby
    lobbyIo.emit('hubUpdate', Object.values(hubPlayers));
  });

  socket.on('disconnect', () => {
    // Find player by socket id and mark offline
    const uuid = Object.keys(hubPlayers).find(id => hubPlayers[id].socketId === socket.id);
    if (uuid) {
      hubPlayers[uuid].online = false;
      lobbyIo.emit('hubUpdate', Object.values(hubPlayers));
    }
  });
});

// ════════════════════════════════════════════════════════════════
// 2. MONOPOLY NAMESPACE
// ════════════════════════════════════════════════════════════════
const monopolyIo = io.of('/monopoly');
const monopolyState = {
  status: 'LOBBY', // LOBBY, PLAYING
  host: null,
  players: {}, 
  turnOrder: [],
  currentTurnIndex: 0,
  properties: {} // Track ownership
};

const tokenColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#f97316', '#06b6d4', '#8b5cf6'];

monopolyIo.on('connection', (socket) => {
  console.log(`[MONOPOLY] Connected: ${socket.id}`);

  socket.on('joinGame', (data) => {
    const { uuid, username } = data;
    if (!uuid) return;

    if (!monopolyState.host) {
        monopolyState.host = uuid; // First player is host
    }

    // Add player if not exists
    if (!monopolyState.players[uuid]) {
      if (monopolyState.turnOrder.length >= 8) {
        return socket.emit('error', 'Monopoly lobby is full');
      }
      
      monopolyState.players[uuid] = {
        uuid,
        username: username || 'Player',
        color: tokenColors[monopolyState.turnOrder.length],
        cash: 15000,
        position: 0,
        inJail: false,
        doublesCount: 0,
        debtState: false,
        online: true,
        isBot: false,
        isLocal: false
      };
      monopolyState.turnOrder.push(uuid);
    } else {
      monopolyState.players[uuid].online = true;
    }
    
    socket.uuid = uuid;
    monopolyIo.emit('gameState', monopolyState);
  });

  socket.on('addBot', () => {
      if (socket.uuid !== monopolyState.host || monopolyState.turnOrder.length >= 8 || monopolyState.status === 'PLAYING') return;
      const botId = 'bot_' + Math.random().toString(36).substr(2,9);
      monopolyState.players[botId] = {
          uuid: botId,
          username: 'AI Bot ' + (monopolyState.turnOrder.length + 1),
          color: tokenColors[monopolyState.turnOrder.length],
          cash: 15000, position: 0, inJail: false, doublesCount: 0, debtState: false,
          online: true, isBot: true, isLocal: false
      };
      monopolyState.turnOrder.push(botId);
      monopolyIo.emit('gameState', monopolyState);
  });

  socket.on('addLocalPlayer', (name) => {
      if (socket.uuid !== monopolyState.host || monopolyState.turnOrder.length >= 8 || monopolyState.status === 'PLAYING') return;
      const localId = 'local_' + Math.random().toString(36).substr(2,9);
      monopolyState.players[localId] = {
          uuid: localId,
          username: name || 'Local ' + (monopolyState.turnOrder.length + 1),
          color: tokenColors[monopolyState.turnOrder.length],
          cash: 15000, position: 0, inJail: false, doublesCount: 0, debtState: false,
          online: true, isBot: false, isLocal: true
      };
      monopolyState.turnOrder.push(localId);
      monopolyIo.emit('gameState', monopolyState);
  });

  socket.on('startGame', () => {
      if (socket.uuid !== monopolyState.host) return;
      if (monopolyState.turnOrder.length >= 2) {
          monopolyState.status = 'PLAYING';
          monopolyIo.emit('gameState', monopolyState);
          checkBotTurn(); // In case bot is first
      }
  });

  socket.on('rollDice', () => {
    const uuid = socket.uuid;
    const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
    
    // Allow host to roll for local players
    const isHostRollingForLocal = (uuid === monopolyState.host && monopolyState.players[currentPid].isLocal);
    
    if (uuid !== currentPid && !isHostRollingForLocal) return; 
    
    handleRollDice(currentPid);
  });

  function handleRollDice(targetUuid) {
    if (monopolyState.status !== 'PLAYING') return;
    const player = monopolyState.players[targetUuid];
    if (!player || player.debtState) return;
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    let isDouble = (d1 === d2);
    
    if (player.inJail) {
        if (isDouble) {
            player.inJail = false;
        } else {
            nextTurn();
            monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
            monopolyIo.emit('gameState', monopolyState);
            return;
        }
    }

    if (isDouble) {
      player.doublesCount++;
      if (player.doublesCount === 3) {
        player.position = 10; // Jail
        player.inJail = true;
        player.doublesCount = 0;
        nextTurn();
        monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
        monopolyIo.emit('gameState', monopolyState);
        return;
      }
    } else {
      player.doublesCount = 0;
    }

    player.position += (d1 + d2);
    
    if (player.position >= 40) {
      player.position -= 40;
      player.cash += 2000; 
    }
    
    if (player.position === 30) {
        player.position = 10;
        player.inJail = true;
        isDouble = false; 
    }

    monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
    monopolyIo.emit('gameState', monopolyState);
    
    if (!isDouble && !player.debtState) {
      nextTurn();
    } else if (player.isBot && !player.debtState) {
        // Bot rolled doubles, goes again
        setTimeout(() => handleRollDice(targetUuid), 1500);
    }
  }

  function nextTurn() {
    let attempts = 0;
    do {
        monopolyState.currentTurnIndex = (monopolyState.currentTurnIndex + 1) % monopolyState.turnOrder.length;
        attempts++;
    } while (!monopolyState.players[monopolyState.turnOrder[monopolyState.currentTurnIndex]].online && attempts < 8);
    
    monopolyIo.emit('gameState', monopolyState);
    checkBotTurn();
  }

  function checkBotTurn() {
      if (monopolyState.status !== 'PLAYING') return;
      const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
      const currentPlayer = monopolyState.players[currentPid];
      
      if (currentPlayer && currentPlayer.isBot) {
          setTimeout(() => {
              handleRollDice(currentPid);
          }, 1500);
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
// 3. LUDO NAMESPACE
// ════════════════════════════════════════════════════════════════
const ludoIo = io.of('/ludo');
ludoIo.on('connection', (socket) => {
    // Current Ludo code transitions here...
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Multi-Game Hub running on port ${PORT}`));
