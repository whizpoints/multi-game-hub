const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const newShowPropertyDetails = `function showPropertyDetails(tile) {
    if (!document.getElementById('buy-house-btn')) {
        const createBtn = (id, text, color, fnName, fnBody) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = 'glass-btn';
            btn.style.width = '100%';
            btn.style.marginTop = '10px';
            btn.style.fontSize = '0.9rem';
            btn.style.background = color;
            btn.style.display = 'none';
            btn.textContent = text;
            btn.onclick = () => window[fnName]();
            document.getElementById('property-details').appendChild(btn);
            window[fnName] = function() {
                if (window.currentViewedTileIndex !== undefined) {
                    fnBody(window.currentViewedTileIndex);
                }
            };
            return btn;
        };
        
        createBtn('buy-house-btn', 'UPGRADE', '#22c55e', 'buyHouse', (idx) => socket.emit('buyHouse', idx));
        createBtn('mortgage-btn', 'MORTGAGE', '#ef4444', 'mortgageProp', (idx) => socket.emit('mortgageProperty', idx));
        createBtn('unmortgage-btn', 'UNMORTGAGE', '#3b82f6', 'unmortgageProp', (idx) => socket.emit('unmortgageProperty', idx));
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
    document.getElementById('pc-unmortgage').textContent = tile.unmortgageCost ? '$' + Math.round(tile.unmortgageCost) : '-';
    
    const buyHouseBtn = document.getElementById('buy-house-btn');
    const mortgageBtn = document.getElementById('mortgage-btn');
    const unmortgageBtn = document.getElementById('unmortgage-btn');
    
    buyHouseBtn.style.display = 'none';
    mortgageBtn.style.display = 'none';
    unmortgageBtn.style.display = 'none';
    
    if (tile.rent) {
        document.getElementById('pc-rent').textContent = tile.rent.base ? '$' + tile.rent.base : (tile.rent.base === 0 ? '$0' : tile.rent.base);
        
        const state = window.currentGameStateObj;
        if (state && state.properties[idx]) {
            const prop = state.properties[idx];
            const pAuth = state.players[prop.owner];
            const isOwner = (prop.owner === myUuid || (pAuth && pAuth.isLocal && pAuth.hostId === myUuid));
            
            if (isOwner) {
                if (prop.mortgaged) {
                    unmortgageBtn.style.display = 'block';
                    unmortgageBtn.textContent = 'UNMORTGAGE ($' + Math.round(tile.unmortgageCost) + ')';
                } else {
                    if (tile.type === 'property' && prop.houses < 5) {
                        buyHouseBtn.style.display = 'block';
                        buyHouseBtn.textContent = 'UPGRADE ($' + (tile.houseCost || 50) + ')';
                    }
                    if (prop.houses === 0) {
                        mortgageBtn.style.display = 'block';
                        mortgageBtn.textContent = 'MORTGAGE (+$' + tile.mortgageValue + ')';
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
                document.getElementById('pc-rent').innerHTML = '$25<br>2 Stations: $50<br>3 Stations: $100<br>4 Stations: $200';
            } else if (tile.type === 'utility') {
                document.getElementById('pc-rent').innerHTML = '1 Utility: 4x Dice<br>2 Utilities: 10x Dice';
            }
        }
    } else {
        document.getElementById('pc-houses-container').classList.add('hidden');
    }
}`;

// regex to replace showPropertyDetails
const startIndex = game.indexOf("function showPropertyDetails(tile) {");
// Find the end by looking for the next top-level function declaration, which is function renderBoardTokens
const endIndex = game.indexOf("function renderBoardTokens(state) {");

if (startIndex !== -1 && endIndex !== -1) {
    game = game.substring(0, startIndex) + newShowPropertyDetails + "\n\n" + game.substring(endIndex);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log("Updated showPropertyDetails to include mortgage logic and local auth");
} else {
    console.log("Could not find bounds for showPropertyDetails");
}
