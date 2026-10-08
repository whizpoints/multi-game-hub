const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const missingFunc = `
function renderPropertyOwnership(state) {
    document.querySelectorAll('.owner-strip').forEach(el => el.remove());
    document.querySelectorAll('.owner-name-tag').forEach(el => el.remove());
    
    Object.keys(state.properties).forEach(tileIndex => {
        const prop = state.properties[tileIndex];
        const tile = document.getElementById('tile-' + tileIndex);
        const owner = state.players[prop.owner];
        
        if (tile && owner) {
            // Strip
            const strip = document.createElement('div');
            strip.className = 'owner-strip';
            strip.style.position = 'absolute';
            strip.style.inset = '0';
            strip.style.border = '4px solid ' + owner.color;
            strip.style.pointerEvents = 'none';
            strip.style.boxShadow = 'inset 0 0 10px ' + owner.color + '80';
            strip.style.zIndex = '10';
            tile.appendChild(strip);
            
            // Name Tag
            const tag = document.createElement('div');
            tag.className = 'owner-name-tag';
            tag.innerHTML = '<span style="color: ' + owner.color + '; background: rgba(255,255,255,0.9); padding: 1px 4px; border-radius: 4px; border: 1px solid ' + owner.color + ';">👤 ' + owner.username + '</span>';
            tag.style.position = 'absolute';
            tag.style.bottom = '20px';
            tag.style.width = '100%';
            tag.style.textAlign = 'center';
            tag.style.fontSize = '0.55rem';
            tag.style.fontWeight = '900';
            tag.style.zIndex = '15';
            tile.appendChild(tag);
            
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

if (game.indexOf('function renderPropertyOwnership') === -1 || game.indexOf('function renderPropertyOwnership') === game.lastIndexOf('function renderPropertyOwnership')) {
    game += missingFunc;
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log('Appended renderPropertyOwnership');
} else {
    console.log('Already exists');
}
