const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const quitLogic = `
    socket.on('quitToLobby', () => {
        if (socket.uuid === monopolyState.host && monopolyState.status === 'PLAYING') {
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
`;

const target = "socket.on('removePlayer',";
if (!server.includes("socket.on('quitToLobby')")) {
    server = server.replace(target, quitLogic + "\n    " + target);
    fs.writeFileSync('server.js', server);
    console.log("Injected quitToLobby into server.js");
}
