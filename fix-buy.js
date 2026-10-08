const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const regex = /socket\.on\('buyProperty', \(buy\) => \{[\s\S]*?if \(player\.isBot\) \{/g;
const replacement = `socket.on('buyProperty', (buy) => {
    const uuid = socket.uuid;
    const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
    const isHostForLocal = (uuid === monopolyState.host && monopolyState.players[currentPid] && monopolyState.players[currentPid].isLocal);
    if (uuid !== currentPid && !isHostForLocal) return; 
    
    const player = monopolyState.players[currentPid];
    const tileIndex = player.position;
    const tileData = boardData[tileIndex];
    
    player.pendingAction = null;

    if (buy) {
        if (tileData && tileData.price && player.cash >= tileData.price) {
            player.cash -= tileData.price;
            monopolyState.properties[tileIndex] = { owner: currentPid, houses: 0 };
            monopolyIo.emit('systemMessage', \`\${player.username} bought \${tileData.name}!\`);
        } else {
            socket.emit('errorMsg', "Insufficient funds! Property sent to auction.");
            monopolyIo.emit('systemMessage', \`\${tileData.name} went to Auction! (Auction bidding UI coming soon)\`);
        }
    } else {
        monopolyIo.emit('systemMessage', \`\${player.username} passed on \${tileData.name}. It goes to Auction!\`);
    }

    monopolyIo.emit('gameState', monopolyState);
    if (player.isBot) {`;

server = server.replace(regex, replacement);
fs.writeFileSync('server.js', server);
console.log('buyProperty fixed');
