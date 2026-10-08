with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\server.js", "r", encoding="utf-8") as f:
    content = f.read()

old_buyHouse = '''    socket.on('buyHouse', (tileIndex) => {
        const uuid = socket.uuid;
        const player = monopolyState.players[uuid];
        if (!player) return;
        const prop = monopolyState.properties[tileIndex];
        const tileData = boardData[tileIndex];
        
        if (prop && (prop.owner === uuid || (monopolyState.players[prop.owner] && monopolyState.players[prop.owner].isLocal && monopolyState.players[prop.owner].hostId === uuid)) && !prop.mortgaged && prop.houses < 5) {
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
    });'''

new_buyHouse = '''    socket.on('buyHouse', (tileIndex) => {
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
    });'''

content = content.replace(old_buyHouse, new_buyHouse)
with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\server.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")
