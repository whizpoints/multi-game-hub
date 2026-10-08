const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const rpo = `
function renderPropertyOwnership(state) {
    document.querySelectorAll('.owner-strip, .owner-name-tag, .house-indicator').forEach(el => el.remove());
    
    Object.keys(state.properties).forEach(tileIndex => {
        const prop = state.properties[tileIndex];
        const tile = document.getElementById('tile-' + tileIndex);
        const owner = state.players[prop.owner];
        
        if (tile && owner) {
            const playerNum = state.turnOrder.indexOf(prop.owner) + 1;
            
            // Add Player Number Badge
            const tag = document.createElement('div');
            tag.className = 'owner-name-tag';
            tag.textContent = playerNum;
            tag.style.position = 'absolute';
            tag.style.top = '4px';
            tag.style.right = '4px';
            tag.style.width = '20px';
            tag.style.height = '20px';
            tag.style.borderRadius = '50%';
            tag.style.background = owner.color;
            tag.style.color = '#fff';
            tag.style.display = 'flex';
            tag.style.alignItems = 'center';
            tag.style.justifyContent = 'center';
            tag.style.fontSize = '0.65rem';
            tag.style.fontWeight = '900';
            tag.style.zIndex = '15';
            tag.style.border = '1px solid rgba(255,255,255,0.5)';
            tile.appendChild(tag);
            
            // Add Houses Indicator
            if (prop.houses > 0) {
                const hInd = document.createElement('div');
                hInd.className = 'house-indicator';
                hInd.style.position = 'absolute';
                hInd.style.top = '4px';
                hInd.style.left = '4px';
                hInd.style.color = '#fff';
                hInd.style.fontWeight = '900';
                hInd.style.fontSize = '0.65rem';
                hInd.style.zIndex = '15';
                hInd.style.background = prop.houses === 5 ? '#ef4444' : '#22c55e';
                hInd.style.padding = '2px 4px';
                hInd.style.borderRadius = '4px';
                hInd.textContent = prop.houses === 5 ? 'H' : '⌂'.repeat(prop.houses);
                tile.appendChild(hInd);
            }
            
            if (prop.mortgaged) {
                const mIcon = document.createElement('div');
                mIcon.innerHTML = 'MORTGAGED';
                mIcon.className = 'owner-strip';
                mIcon.style.position = 'absolute';
                mIcon.style.inset = '0';
                mIcon.style.background = 'rgba(0,0,0,0.7)';
                mIcon.style.color = '#fff';
                mIcon.style.display = 'flex';
                mIcon.style.alignItems = 'center';
                mIcon.style.justifyContent = 'center';
                mIcon.style.fontWeight = '900';
                mIcon.style.zIndex = '16';
                mIcon.style.fontSize = '0.7rem';
                tile.appendChild(mIcon);
            }
        }
    });
}
`;

if (!game.includes('function renderPropertyOwnership(state) {')) {
    game = game.replace(/function updateControls\(state\) \{/, rpo + "\n\nfunction updateControls(state) {");
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log('Restored renderPropertyOwnership!');
}
