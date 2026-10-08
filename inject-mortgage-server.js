const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

const regex = /socket\.on\('buyHouse', \(tileIndex\) => \{[\s\S]*?\}\);/g;

const mortgageLogic = `socket.on('buyHouse', (tileIndex) => {
    const uuid = socket.uuid;
    const player = monopolyState.players[uuid];
    if (!player) return;
    const prop = monopolyState.properties[tileIndex];
    const tileData = boardData[tileIndex];
    
    if (prop && prop.owner === uuid && !prop.mortgaged && prop.houses < 5) {
        const cost = tileData.houseCost || 50;
        if (player.cash >= cost) {
            player.cash -= cost;
            prop.houses = (prop.houses || 0) + 1;
            monopolyIo.emit('systemMessage', \`\${player.username} upgraded \${tileData.name}.\`);
            monopolyIo.emit('gameState', monopolyState);
        } else {
            socket.emit('errorMsg', "Not enough cash to upgrade!");
        }
    }
});

socket.on('mortgageProperty', (tileIndex) => {
    const uuid = socket.uuid;
    const player = monopolyState.players[uuid];
    if (!player) return;
    const prop = monopolyState.properties[tileIndex];
    const tileData = boardData[tileIndex];
    
    if (prop && prop.owner === uuid && !prop.mortgaged && (!prop.houses || prop.houses === 0)) {
        if (tileData.mortgageValue) {
            player.cash += tileData.mortgageValue;
            prop.mortgaged = true;
            monopolyIo.emit('systemMessage', \`\${player.username} mortgaged \${tileData.name} for $\${tileData.mortgageValue}.\`);
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
    
    if (prop && prop.owner === uuid && prop.mortgaged) {
        const cost = tileData.unmortgageCost || Math.ceil((tileData.mortgageValue || 0) * 1.1);
        if (player.cash >= cost) {
            player.cash -= cost;
            prop.mortgaged = false;
            monopolyIo.emit('systemMessage', \`\${player.username} unmortgaged \${tileData.name} for $\${cost}.\`);
            monopolyIo.emit('gameState', monopolyState);
        } else {
            socket.emit('errorMsg', "Not enough cash to unmortgage!");
        }
    }
});`;

server = server.replace(regex, mortgageLogic);
fs.writeFileSync('server.js', server);
console.log('Server mortgage logic injected');
