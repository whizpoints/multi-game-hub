const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const regex = /btn\.textContent = 'UPGRADE \([\s\S]*?document\.getElementById\('pc-houses-container'\)\.classList\.remove\('hidden'\);/g;

game = game.replace(regex, `btn.textContent = 'UPGRADE ($' + (boardData[window.currentViewedTileIndex].houseCost || 50) + ')';
                } else {
                    btn.style.display = 'none';
                }
            } else if (btn) {
                btn.style.display = 'none';
            }
              document.getElementById('pc-houses-container').classList.remove('hidden');`);

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Fixed syntax errors with regex');
