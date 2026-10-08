const fs = require('fs');

let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const regex = /function showPropertyDetails\(tile\) \{[\s\S]*?\}\n\}\n/g;

const newShowPropertyDetails = `function showPropertyDetails(tile) {
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
        buyHouseBtn.onclick = () => {
            if (window.currentViewedTileIndex !== undefined) socket.emit('buyHouse', window.currentViewedTileIndex);
        };
        document.getElementById('property-details').appendChild(buyHouseBtn);

        const mortgageBtn = document.createElement('button');
        mortgageBtn.id = 'mortgage-btn';
        mortgageBtn.className = 'glass-btn';
        mortgageBtn.style.width = '100%';
        mortgageBtn.style.marginTop = '10px';
        mortgageBtn.style.fontSize = '0.9rem';
        mortgageBtn.style.background = '#ef4444';
        mortgageBtn.style.display = 'none';
        mortgageBtn.onclick = () => {
            if (window.currentViewedTileIndex !== undefined) socket.emit('mortgageProperty', window.currentViewedTileIndex);
        };
        document.getElementById('property-details').appendChild(mortgageBtn);

        const unmortgageBtn = document.createElement('button');
        unmortgageBtn.id = 'unmortgage-btn';
        unmortgageBtn.className = 'glass-btn';
        unmortgageBtn.style.width = '100%';
        unmortgageBtn.style.marginTop = '10px';
        unmortgageBtn.style.fontSize = '0.9rem';
        unmortgageBtn.style.background = '#3b82f6';
        unmortgageBtn.style.display = 'none';
        unmortgageBtn.onclick = () => {
            if (window.currentViewedTileIndex !== undefined) socket.emit('unmortgageProperty', window.currentViewedTileIndex);
        };
        document.getElementById('property-details').appendChild(unmortgageBtn);
    }
    
    const idx = boardData.indexOf(tile);
    window.currentViewedTileIndex = idx;
    
    placeholderText.style.display = 'none';
    propertyDetails.classList.remove('hidden');
    
    document.getElementById('pc-name').textContent = tile.name;
    const hex = neonColors[tile.color] || '#94a3b8';
    document.getElementById('pc-header').style.background = hex;
    
    document.getElementById('pc-price').textContent = tile.price ? '$' + tile.price : '-';
    document.getElementById('pc-house-cost').textContent = tile.houseCost ? '$' + tile.houseCost : '-';
    document.getElementById('pc-mortgage').textContent = tile.mortgageValue ? '$' + tile.mortgageValue : '-';
    
    const unmortgageCost = tile.unmortgageCost || (tile.mortgageValue ? Math.ceil(tile.mortgageValue * 1.1) : 0);
    document.getElementById('pc-unmortgage').textContent = unmortgageCost ? '$' + unmortgageCost : '-';
    
    const btn = document.getElementById('buy-house-btn');
    const mBtn = document.getElementById('mortgage-btn');
    const uBtn = document.getElementById('unmortgage-btn');
    
    btn.style.display = 'none';
    mBtn.style.display = 'none';
    uBtn.style.display = 'none';

    if (tile.rent) {
        document.getElementById('pc-rent').textContent = tile.rent.base ? '$' + tile.rent.base : (tile.rent.base === 0 ? '$0' : tile.rent.base);
        
        if (currentGameState && currentGameState.properties[idx]) {
            const prop = currentGameState.properties[idx];
            if (prop.owner === myUuid) {
                if (!prop.mortgaged && (!prop.houses || prop.houses === 0) && tile.mortgageValue) {
                    mBtn.style.display = 'block';
                    mBtn.textContent = 'MORTGAGE (+$' + tile.mortgageValue + ')';
                }
                if (prop.mortgaged) {
                    uBtn.style.display = 'block';
                    uBtn.textContent = 'UNMORTGAGE (-$' + unmortgageCost + ')';
                }
                if (tile.type === 'property' && !prop.mortgaged && prop.houses < 5) {
                    // Make sure they own all colors
                    const sameColor = boardData.filter(t => t.color === tile.color);
                    const ownsAll = sameColor.every((t, i) => {
                        const tIdx = boardData.indexOf(t);
                        return currentGameState.properties[tIdx] && currentGameState.properties[tIdx].owner === myUuid;
                    });
                    if (ownsAll) {
                        btn.style.display = 'block';
                        btn.textContent = 'UPGRADE ($' + (tile.houseCost || 50) + ')';
                    }
                }
            }
        }

        if (tile.type === 'property') {
            document.getElementById('pc-houses-container').classList.remove('hidden');
            document.getElementById('pc-h1').textContent = '$' + tile.rent.house1;
            document.getElementById('pc-h2').textContent = '$' + tile.rent.house2;
            document.getElementById('pc-h3').textContent = '$' + tile.rent.house3;
            document.getElementById('pc-h4').textContent = '$' + tile.rent.house4;
            document.getElementById('pc-hotel').textContent = '$' + tile.rent.hotel;
        } else {
            document.getElementById('pc-houses-container').classList.add('hidden');
            if (tile.type === 'station') {
                document.getElementById('pc-rent').innerHTML = \`1: $250 | 2: $500 | 3: $1000 | 4: $2000\`;
            }
        }
    } else {
        document.getElementById('pc-houses-container').classList.add('hidden');
        document.getElementById('pc-rent').textContent = 'N/A';
    }
}
`;

game = game.replace(regex, newShowPropertyDetails);

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Client mortgage buttons injected');
