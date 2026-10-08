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

if (!server.includes("socket.on('addLocalPlayer'")) {
    server = server.replace(/socket\.on\('addBot',\s*\(\)\s*=>\s*\{/, injection + "\n    socket.on('addBot', () => {");
    fs.writeFileSync('server.js', server);
    console.log("Injected lobby player management events into server.js");
} else {
    // Wait, earlier I found it for Ludo! So it DOES include `socket.on('addLocalPlayer'`.
    // I need to be more specific.
    if (!server.includes("localId = 'local_' + Math.floor(Math.random() * 100000);")) {
        server = server.replace(/socket\.on\('addBot',\s*\(\)\s*=>\s*\{/, injection + "\n    socket.on('addBot', () => {");
        fs.writeFileSync('server.js', server);
        console.log("Injected lobby player management events into server.js");
    } else {
        console.log("Already injected.");
    }
}
