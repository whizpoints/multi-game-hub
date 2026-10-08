const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const injection = `
    socket.on('addLocalPlayer', (name) => {
        if (socket.uuid === monopolyState.host && monopolyState.status === 'LOBBY' && monopolyState.turnOrder.length < 8) {
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
                online: true, isBot: false, hostId: socket.uuid,
                doublesCount: 0, inJail: false, jailTurns: 0, getOutCards: 0
            };
            monopolyState.turnOrder.push(localId);
            monopolyIo.emit('systemMessage', \`\${name || 'Local Player'} joined the lobby.\`);
            monopolyIo.emit('gameState', monopolyState);
        }
    });

    socket.on('removePlayer', (targetUuid) => {
        if (socket.uuid === monopolyState.host && monopolyState.status === 'LOBBY') {
            if (targetUuid === socket.uuid) return;
            const p = monopolyState.players[targetUuid];
            if (p) {
                delete monopolyState.players[targetUuid];
                monopolyState.turnOrder = monopolyState.turnOrder.filter(id => id !== targetUuid);
                monopolyIo.emit('systemMessage', \`\${p.username} was removed from the lobby.\`);
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
                monopolyIo.emit('systemMessage', \`\${oldName} changed their name to \${p.username}.\`);
                monopolyIo.emit('gameState', monopolyState);
            }
        }
    });
`;

// 1. Remove the incorrectly injected block from the Ludo section.
const removeStartStr = "    socket.on('addLocalPlayer', (name) => {";
const removeEndStr = "monopolyIo.emit('gameState', monopolyState);\n            }\n        }\n    });\n\n    socket.on('addBot', () => {"; // wait, the original injection replaced addBot so it ends before addBot.

// Actually, I can just use a regex to delete it.
const regexToRemove = /\s*socket\.on\('addLocalPlayer', \(name\) => \{[\s\S]*?monopolyIo\.emit\('gameState', monopolyState\);\s*\}\s*\}\);\s*/;
server = server.replace(regexToRemove, '\n');

// 2. Inject it securely into the Monopoly section.
const monopolyTarget = "monopolyIo.on('connection', (socket) => {";
server = server.replace(monopolyTarget, monopolyTarget + '\n' + injection);

fs.writeFileSync('server.js', server);
console.log('Fixed lobby events scoping in server.js');
