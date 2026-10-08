const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const replacement = `function showPropertyDetails(tile) {
    if (!document.getElementById('buy-house-btn')) {
        const buyHouseBtn = document.createElement('button');
        buyHouseBtn.id = 'buy-house-btn';
        buyHouseBtn.className = 'glass-btn';
        buyHouseBtn.style.width = '100%';
        buyHouseBtn.style.marginTop = '15px';
        buyHouseBtn.style.fontSize = '0.9rem';
        buyHouseBtn.style.background = '#22c55e';
        buyHouseBtn.style.display = 'none';
        buyHouseBtn.textContent = 'UPGRADE';
        buyHouseBtn.onclick = () => window.buyHouse();
        document.getElementById('property-details').appendChild(buyHouseBtn);
        window.buyHouse = function() {
            if (window.currentViewedTileIndex !== undefined) {
                socket.emit('buyHouse', window.currentViewedTileIndex);
            }
        };
    }
    const idx = parseInt(tile.id.replace('tile-', ''), 10);
    window.currentViewedTileIndex = idx;
    
    placeholderText.style.display = 'none';
    propertyDetails.classList.remove('hidden');
    
    document.getElementById('pc-name').textContent = tile.name;
    const hex = neonColors[tile.color] || '#94a3b8';
    document.getElementById('pc-header').style.background = hex;
    
    document.getElementById('pc-price').textContent = tile.price ? '$' + tile.price : '-';
    document.getElementById('pc-house-cost').textContent = tile.houseCost ? '$' + tile.houseCost : '-';
    document.getElementById('pc-mortgage').textContent = tile.mortgageValue ? '$' + tile.mortgageValue : '-';
    document.getElementById('pc-unmortgage').textContent = tile.unmortgageCost ? '$' + Math.round(tile.unmortgageCost) : '-';
    
    if (tile.rent) {
        document.getElementById('pc-rent').textContent = tile.rent.base ? '$' + tile.rent.base : (tile.rent.base === 0 ? '$0' : tile.rent.base);
        
        if (tile.type === 'property') {
            const btn = document.getElementById('buy-house-btn');
            if (btn && currentGameState && currentGameState.properties[window.currentViewedTileIndex]) {
                const prop = currentGameState.properties[window.currentViewedTileIndex];
                if (prop.owner === myUuid && prop.houses < 5) {
                    btn.style.display = 'block';
                    btn.textContent = 'UPGRADE ($' + (tile.houseCost || 50) + ')';
                } else {
                    btn.style.display = 'none';
                }
            } else if (btn) {
                btn.style.display = 'none';
            }
            document.getElementById('pc-houses-container').classList.remove('hidden');
            document.getElementById('pc-h1').textContent = '$' + tile.rent.house1;
            document.getElementById('pc-h2').textContent = '$' + tile.rent.house2;
            document.getElementById('pc-h3').textContent = '$' + tile.rent.house3;
            document.getElementById('pc-h4').textContent = '$' + tile.rent.house4;
            document.getElementById('pc-hotel').textContent = '$' + tile.rent.hotel;
        } else {`;

const sIdx = game.indexOf('function showPropertyDetails(tile) {');
const eIdx = game.indexOf('        } else {', sIdx);
game = game.substring(0, sIdx) + replacement + game.substring(eIdx + 16);

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Fixed function entirely');
