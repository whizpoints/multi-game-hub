const fs = require('fs');

// --- UPDATE SERVER.JS ---
let server = fs.readFileSync('server.js', 'utf8');

server = server.replace(
    /\} else if \(tileData\.type === 'tax'\) \{[\s\S]*?monopolyIo\.emit\('systemMessage', `\$\{player\.username\} paid \$\$\{tileData\.price\} in taxes\.`\);\n\s+\}/,
    `} else if (tileData.type === 'tax') {
        const amt = tileData.amount || 2000;
        player.cash -= amt;
        monopolyIo.emit('systemMessage', \`\${player.username} paid $\${amt} in taxes.\`);
    } else if (tileData.type === 'chest' || tileData.type === 'chance') {
        const isGood = Math.random() > 0.5;
        const amt = isGood ? 1000 : -500;
        player.cash += amt;
        const msg = isGood ? 'received $1000 from the bank' : 'paid $500 to the bank';
        monopolyIo.emit('systemMessage', \`\${player.username} drew \${tileData.name} and \${msg}.\`);
    }`
);

fs.writeFileSync('server.js', server);
console.log('Server tax and chance fixed.');

// --- UPDATE GAME.JS ---
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// 1. Fix Action Log
game = game.replace(
    /socket\.on\('systemMessage', \(msg\) => \{ Swal\.fire\(\{ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, title: msg, icon: 'info' \}\); \}\);/g,
    `socket.on('systemMessage', (msg) => {
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 4000, title: msg, icon: 'info' });
    const log = document.getElementById('action-log');
    if (log) {
        const entry = document.createElement('div');
        entry.style.fontSize = '0.8rem';
        entry.style.padding = '4px 8px';
        entry.style.borderBottom = '1px solid #e2e8f0';
        entry.style.color = '#334155';
        entry.textContent = msg;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }
});`
);

// 2. Fix Smooth Token Hops (Offset positioning)
const newPositionTokenAt = `
function positionTokenAt(tokenEl, uuid, posIndex) {
    const board = document.querySelector('.board');
    const tile = document.getElementById('tile-' + posIndex);
    if (!tile || !board) return;
    
    // Smooth transition needs the token to be a direct child of .board
    if (tokenEl.parentElement !== board) {
        board.appendChild(tokenEl);
    }
    
    let offsetLeft = 0;
    let offsetTop = 0;
    if (uuid) {
        const charCode = uuid.charCodeAt(0) || 0;
        offsetLeft = (charCode % 5) * 8 - 16;
        offsetTop = (charCode % 3) * 8 - 8;
    }
    
    // Get exact center of tile relative to board padding-box
    const cx = tile.offsetLeft + (tile.offsetWidth / 2);
    const cy = tile.offsetTop + (tile.offsetHeight / 2);
    
    tokenEl.style.position = 'absolute';
    tokenEl.style.left = cx + 'px';
    tokenEl.style.top = cy + 'px';
    tokenEl.style.transform = \`translate(calc(-50% + \${offsetLeft}px), calc(-50% + \${offsetTop}px))\`;
}
`;
game = game.replace(/function positionTokenAt\(tokenEl, uuid, posIndex\) \{[\s\S]*?tokenEl\.parentElement !== tile\) \{\n\s+tile\.appendChild\(tokenEl\);\n\s+\}\n\}/, newPositionTokenAt.trim());

// 3. Fix Property Ownership Badge & Houses (Numbered small circle instead of strip)
const newRenderPropertyOwnership = `
function renderPropertyOwnership(state) {
    document.querySelectorAll('.owner-strip, .owner-name-tag, .house-indicator').forEach(el => el.remove());
    
    Object.keys(state.properties).forEach(tileIndex => {
        const prop = state.properties[tileIndex];
        const tile = document.getElementById('tile-' + tileIndex);
        const owner = state.players[prop.owner];
        
        if (tile && owner) {
            const playerNum = state.turnOrder.indexOf(prop.owner) + 1;
            
            // Numbered Circle Badge
            const tag = document.createElement('div');
            tag.className = 'owner-name-tag';
            tag.innerHTML = playerNum;
            tag.style.position = 'absolute';
            tag.style.top = '2px';
            tag.style.right = '2px';
            tag.style.width = '20px';
            tag.style.height = '20px';
            tag.style.borderRadius = '50%';
            tag.style.background = owner.color;
            tag.style.color = '#fff';
            tag.style.display = 'flex';
            tag.style.alignItems = 'center';
            tag.style.justifyContent = 'center';
            tag.style.fontSize = '0.75rem';
            tag.style.fontWeight = '900';
            tag.style.zIndex = '15';
            tag.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
            tag.title = owner.username;
            tile.appendChild(tag);
            
            // Houses
            if (prop.houses > 0) {
                const houseTag = document.createElement('div');
                houseTag.className = 'house-indicator';
                houseTag.style.position = 'absolute';
                houseTag.style.top = '2px';
                houseTag.style.left = '2px';
                houseTag.style.background = prop.houses === 5 ? '#ef4444' : '#22c55e';
                houseTag.style.color = '#fff';
                houseTag.style.padding = '2px 4px';
                houseTag.style.borderRadius = '4px';
                houseTag.style.fontSize = '0.65rem';
                houseTag.style.fontWeight = 'bold';
                houseTag.style.zIndex = '15';
                houseTag.style.lineHeight = '1';
                
                if (prop.houses === 5) {
                    houseTag.innerHTML = 'H';
                } else {
                    let dots = '';
                    for(let i=0; i<prop.houses; i++) dots += '⌂';
                    houseTag.innerHTML = dots;
                }
                tile.appendChild(houseTag);
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
game = game.replace(/function renderPropertyOwnership\(state\) \{[\s\S]*?\}\n    \}\);\n\}/, newRenderPropertyOwnership.trim());

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Game UI bugs fixed.');
