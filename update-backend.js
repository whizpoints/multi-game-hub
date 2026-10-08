const fs = require('fs');

// 1. Update server.js
let serverContent = fs.readFileSync('server.js', 'utf8');

const monopolyStart = serverContent.indexOf('// MONOPOLY NAMESPACE');
const bootStart = serverContent.indexOf('// ════════════════════════════════════════════════════════════════', monopolyStart + 50);

if (monopolyStart !== -1 && bootStart !== -1) {
    const newMonopolyLogic = `// MONOPOLY NAMESPACE
const monopolyIo = io.of('/monopoly');
const boardData = require('./public/monopoly/boardData.js');

const monopolyState = {
  status: 'LOBBY',
  host: null,
  players: {}, 
  turnOrder: [],
  currentTurnIndex: 0,
  properties: {} // Track ownership: { tileIndex: { ownerUuid, houses: 0 } }
};

const tokenColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#f97316', '#06b6d4', '#8b5cf6'];
const tokenSymbols = ['🎩', '🏎️', '🐕', '🚢', '👢', '🐈', '🐧', '🦖'];

monopolyIo.on('connection', (socket) => {
  socket.on('joinGame', (data) => {
    const { uuid, username } = data;
    if (!uuid) return;

    if (!monopolyState.host) {
        monopolyState.host = uuid;
    }

    if (!monopolyState.players[uuid]) {
      if (monopolyState.turnOrder.length >= 8) {
        return socket.emit('error', 'Monopoly lobby is full');
      }
      const pIdx = monopolyState.turnOrder.length;
      monopolyState.players[uuid] = {
        uuid,
        username: username || 'Player',
        color: tokenColors[pIdx],
        symbol: tokenSymbols[pIdx],
        cash: 15000, position: 0, inJail: false, doublesCount: 0, debtState: false,
        online: true, isBot: false, isLocal: false
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
      const pIdx = monopolyState.turnOrder.length;
      monopolyState.players[botId] = {
          uuid: botId,
          username: 'AI Bot ' + (pIdx + 1),
          color: tokenColors[pIdx],
          symbol: tokenSymbols[pIdx],
          cash: 15000, position: 0, inJail: false, doublesCount: 0, debtState: false,
          online: true, isBot: true, isLocal: false
      };
      monopolyState.turnOrder.push(botId);
      monopolyIo.emit('gameState', monopolyState);
  });

  socket.on('addLocalPlayer', (name) => {
      if (socket.uuid !== monopolyState.host || monopolyState.turnOrder.length >= 8 || monopolyState.status === 'PLAYING') return;
      const localId = 'local_' + Math.random().toString(36).substr(2,9);
      const pIdx = monopolyState.turnOrder.length;
      monopolyState.players[localId] = {
          uuid: localId,
          username: name || 'Local ' + (pIdx + 1),
          color: tokenColors[pIdx],
          symbol: tokenSymbols[pIdx],
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
          checkBotTurn();
      }
  });

  socket.on('rollDice', () => {
    const uuid = socket.uuid;
    const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
    const isHostRollingForLocal = (uuid === monopolyState.host && monopolyState.players[currentPid] && monopolyState.players[currentPid].isLocal);
    if (uuid !== currentPid && !isHostRollingForLocal) return; 
    handleRollDice(currentPid);
  });

  socket.on('buyProperty', (buy) => {
    const uuid = socket.uuid;
    const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
    const isHostForLocal = (uuid === monopolyState.host && monopolyState.players[currentPid] && monopolyState.players[currentPid].isLocal);
    if (uuid !== currentPid && !isHostForLocal) return; 
    
    const player = monopolyState.players[currentPid];
    const tileIndex = player.position;
    const tileData = boardData[tileIndex];
    
    // Resolve the pending action
    player.pendingAction = null;

    if (buy && tileData && tileData.price && player.cash >= tileData.price) {
        player.cash -= tileData.price;
        monopolyState.properties[tileIndex] = { owner: currentPid, houses: 0 };
        monopolyIo.emit('systemMessage', \`\${player.username} bought \${tileData.name}!\`);
    }

    monopolyIo.emit('gameState', monopolyState);
    if (player.isBot) {
        setTimeout(endTurnOrRollAgain, 1000);
    } else {
        endTurnOrRollAgain();
    }
  });

  function handleRollDice(targetUuid) {
    if (monopolyState.status !== 'PLAYING') return;
    const player = monopolyState.players[targetUuid];
    if (!player || player.debtState || player.pendingAction) return;
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    let isDouble = (d1 === d2);
    
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
        nextTurn();
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

    // Save double status to process after action
    player.justRolledDouble = isDouble;

    monopolyIo.emit('diceRolled', { d1, d2, uuid: targetUuid });
    
    // Check tile logic
    const tileIndex = player.position;
    const tileData = boardData[tileIndex];
    
    if (tileData && (tileData.type === 'property' || tileData.type === 'station' || tileData.type === 'utility')) {
        const prop = monopolyState.properties[tileIndex];
        if (!prop) {
            // Unowned
            player.pendingAction = { type: 'buy', tileIndex, price: tileData.price };
            monopolyIo.emit('gameState', monopolyState);

            // If Bot, auto decide
            if (player.isBot) {
                setTimeout(() => {
                    const willBuy = player.cash > (tileData.price + 500); // Simple logic
                    monopolyState.players[targetUuid].pendingAction = null;
                    if (willBuy) {
                        player.cash -= tileData.price;
                        monopolyState.properties[tileIndex] = { owner: targetUuid, houses: 0 };
                        monopolyIo.emit('systemMessage', \`\${player.username} bought \${tileData.name}\`);
                    }
                    monopolyIo.emit('gameState', monopolyState);
                    setTimeout(endTurnOrRollAgain, 1000);
                }, 1500);
            }
            return; // Wait for buy decision
        } else if (prop.owner !== targetUuid) {
            // Pay rent
            const rent = tileData.rent ? tileData.rent.base : 100; // Simplified for now
            player.cash -= rent;
            if (monopolyState.players[prop.owner]) {
                monopolyState.players[prop.owner].cash += rent;
            }
            monopolyIo.emit('systemMessage', \`\${player.username} paid $\${rent} rent to \${monopolyState.players[prop.owner].username}\`);
        }
    }

    monopolyIo.emit('gameState', monopolyState);
    
    if (player.isBot) {
        setTimeout(endTurnOrRollAgain, 1500);
    } else {
        endTurnOrRollAgain();
    }
  }

  function endTurnOrRollAgain() {
      const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
      const player = monopolyState.players[currentPid];
      if (player && player.justRolledDouble && !player.inJail && !player.debtState) {
          player.justRolledDouble = false;
          if (player.isBot) setTimeout(() => handleRollDice(currentPid), 1500);
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
          setTimeout(() => handleRollDice(currentPid), 1500);
      }
  }

  socket.on('disconnect', () => {
    if (socket.uuid && monopolyState.players[socket.uuid]) {
        monopolyState.players[socket.uuid].online = false;
        monopolyIo.emit('gameState', monopolyState);
    }
  });
});\n`;
    
    const updatedServer = serverContent.substring(0, monopolyStart) + newMonopolyLogic + serverContent.substring(bootStart);
    fs.writeFileSync('server.js', updatedServer);
    console.log('Updated server.js');
} else {
    console.log('Could not find injection points in server.js');
}
