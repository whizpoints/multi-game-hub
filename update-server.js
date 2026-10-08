const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

// Increase bot timeouts
s = s.replace(/setTimeout\(endTurnOrRollAgain, 1500\)/g, "setTimeout(endTurnOrRollAgain, 4000)");
s = s.replace(/setTimeout\(\(\) => handleRollDice\(newPid\), 1500\)/g, "setTimeout(() => handleRollDice(newPid), 4000)");
s = s.replace(/setTimeout\(\(\) => handleRollDice\(currentPid\), 1500\)/g, "setTimeout(() => handleRollDice(currentPid), 4000)");
s = s.replace(/setTimeout\(\(\) => \{[\s\S]*?const p = monopolyState\.players\[targetUuid\];[\s\S]*?\}, 1500\);/, (match) => {
    return match.replace(/1500/g, "4000");
});

// Inject buyHouse
if (!s.includes("socket.on('buyHouse'")) {
    const buyHouseCode = `
    socket.on('buyHouse', (tileIndex) => {
      const uuid = socket.uuid;
      const player = monopolyState.players[uuid];
      if (!player) return;
      
      const prop = monopolyState.properties[tileIndex];
      const tileData = boardData[tileIndex];
      
      if (prop && prop.owner === uuid && prop.houses < 5 && tileData.type === 'property') {
          const cost = tileData.houseCost || 50;
          if (player.cash >= cost) {
              const sameColorTiles = boardData.map((t, i) => ({ t, i })).filter(x => x.t.color === tileData.color);
              const ownsAll = sameColorTiles.every(x => monopolyState.properties[x.i] && monopolyState.properties[x.i].owner === uuid);
              
              if (ownsAll) {
                  player.cash -= cost;
                  prop.houses++;
                  monopolyIo.emit('systemMessage', \`\${player.username} upgraded \${tileData.name}!\`);
                  monopolyIo.emit('gameState', monopolyState);
              } else {
                  socket.emit('errorMsg', "You must own all properties of this color to upgrade.");
              }
          } else {
              socket.emit('errorMsg', "Not enough cash to upgrade.");
          }
      }
    });
`;
    s = s.replace("function handleRollDice", buyHouseCode + "\n  function handleRollDice");
}

fs.writeFileSync('server.js', s);
console.log('Server updated');
