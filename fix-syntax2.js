const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

while (game.indexOf("btn.textContent = 'UPGRADE (\n") !== -1 || game.indexOf("btn.textContent = 'UPGRADE (\r\n") !== -1) {
    const badLineIdx = game.indexOf("btn.textContent = 'UPGRADE (");
    const endOfBad = game.indexOf("              document.getElementById('pc-houses-container').classList.remove('hidden');", badLineIdx);
    
    const correctCode = `btn.textContent = 'UPGRADE ($' + (boardData[window.currentViewedTileIndex].houseCost || 50) + ')';
                } else {
                    btn.style.display = 'none';
                }
            } else if (btn) {
                btn.style.display = 'none';
            }
`;
    game = game.substring(0, badLineIdx) + correctCode + game.substring(endOfBad);
}

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Fixed all syntax errors');
