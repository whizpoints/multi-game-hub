const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Find the malformed btn.textContent = 'UPGRADE (
const badLineIdx = game.indexOf("btn.textContent = 'UPGRADE (");
if (badLineIdx !== -1) {
    const endOfBad = game.indexOf("              document.getElementById('pc-houses-container').classList.remove('hidden');");
    
    const correctCode = `btn.textContent = 'UPGRADE ($' + (boardData[window.currentViewedTileIndex].houseCost || 50) + ')';
                } else {
                    btn.style.display = 'none';
                }
            } else if (btn) {
                btn.style.display = 'none';
            }
`;
    game = game.substring(0, badLineIdx) + correctCode + game.substring(endOfBad);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log('Fixed syntax error');
} else {
    console.log('Could not find syntax error');
}
