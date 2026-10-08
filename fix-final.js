const fs = require('fs');

let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// 1. FIX THE ICONS BLOCK to use the user's vectors
const iconsRegex = /let icon = '';[\s\S]*?if \(icon\) html \+= `<div class="icon">\$\{icon\}<\/div>`;/;
const newIcons = `let icon = '';
            if (tile.type === 'station') icon = '<img src="vectors/airport-14-svgrepo-com.svg" width="24" height="24" />';
            else if (tile.type === 'utility' && tile.name.toLowerCase().includes('power')) icon = '<img src="vectors/solar-power-svgrepo-com.svg" width="24" height="24" />';
            else if (tile.type === 'utility') icon = '<img src="vectors/waterworks.svg" width="24" height="24" />';
            else if (tile.type === 'chest') icon = '<img src="vectors/treasure_chest_ultra_clear.svg" width="32" height="32" />';
            else if (tile.type === 'chance') icon = '<img src="vectors/red-question-mark-svgrepo-com.svg" width="24" height="24" />';
            else if (tile.type === 'tax') icon = '<img src="vectors/cash-svgrepo-com.svg" width="24" height="24" />';

            if (icon) html += \`<div class="icon" style="margin-top: 5px;">\${icon}</div>\`;`;

game = game.replace(iconsRegex, newIcons);

// 2. FIX PLAYER HOVER DETAILS
const plRegex = /function renderPlayersList\(state\) \{[\s\S]*?function positionTokenAt/g;
const newPl = `function renderPlayersList(state) {
    playersListEl.innerHTML = '';
    state.turnOrder.forEach((uuid, index) => {
        const player = state.players[uuid];
        if (!player) return;

        const currentTurnUuid = state.turnOrder[state.currentTurnIndex];
        const el = document.createElement('div');
        el.className = 'player-card';
        el.style.borderLeft = \`4px solid \${player.color}\`;
        
        if (uuid === currentTurnUuid) {
            el.style.background = '#f1f5f9';
            el.style.transform = 'scale(1.02)';
        }

        // Determine owned properties for hover tooltip
        let ownedStr = '';
        Object.keys(state.properties).forEach(tIdx => {
            if (state.properties[tIdx].owner === player.uuid) {
                ownedStr += boardData[tIdx].name + ', ';
            }
        });
        if (ownedStr.length > 0) ownedStr = ownedStr.slice(0, -2);
        else ownedStr = 'No properties owned';

        el.title = \`Owned: \${ownedStr}\`; // Hover detail

        let html = \`
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 1.5rem; color: \${player.color};">\${player.symbol}</div>
            <div style="flex-grow: 1;">
                <div style="font-weight: 900; font-size: 0.9rem; color: #0f172a;">\${player.username} \${uuid === myUuid ? '(You)' : ''}</div>
                <div style="font-size: 1rem; font-weight: 900; color: #16a34a;">$\${player.cash}</div>
            </div>
        </div>
        \`;
        if (player.inJail) {
            html += \`<div style="font-size: 0.7rem; color: #ef4444; font-weight: bold; margin-top: 5px;">IN JAIL</div>\`;
        }
        if (!player.online) {
            html += \`<div style="font-size: 0.7rem; color: #94a3b8; margin-top: 5px;">Offline</div>\`;
        }
        
        el.innerHTML = html;
        playersListEl.appendChild(el);
    });
}

function positionTokenAt`;
game = game.replace(/function renderPlayersList\(state\) \{[\s\S]*?function positionTokenAt/, newPl);


// 3. FIX PROPERTY OWNERSHIP RENDER (Add name)
const propRegex = /function renderPropertyOwnership\(state\) \{[\s\S]*?function updateControls/;
const newProp = `function renderPropertyOwnership(state) {
    document.querySelectorAll('.owner-strip').forEach(el => el.remove());
    document.querySelectorAll('.owner-name-tag').forEach(el => el.remove());
    
    Object.keys(state.properties).forEach(tileIndex => {
        const prop = state.properties[tileIndex];
        const tile = document.getElementById(\`tile-\${tileIndex}\`);
        const owner = state.players[prop.owner];
        
        if (tile && owner) {
            // Strip
            const strip = document.createElement('div');
            strip.className = 'owner-strip';
            strip.style.position = 'absolute';
            strip.style.inset = '0';
            strip.style.border = \`4px solid \${owner.color}\`;
            strip.style.pointerEvents = 'none';
            strip.style.boxShadow = \`inset 0 0 10px \${owner.color}80\`;
            strip.style.zIndex = '10';
            tile.appendChild(strip);
            
            // Name Tag
            const tag = document.createElement('div');
            tag.className = 'owner-name-tag';
            tag.innerHTML = \`<span style="color: \${owner.color}; background: rgba(255,255,255,0.9); padding: 1px 4px; border-radius: 4px; border: 1px solid \${owner.color};">👤 \${owner.username}\</span>\`;
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

function updateControls`;
game = game.replace(propRegex, newProp);

// 4. FIX HANDLEGAMESTATE SYNTAX ERROR
// We will replace everything from "async function handleGameState" down to the diceRolled listener.
const stateRegex = /async function handleGameState[\s\S]*?socket\.on\('diceRolled'/;
const cleanState = `async function handleGameState(state) {
    if (isAnimatingHops) {
        pendingGameState = state;
        return;
    }
    
    currentGameState = state;
    renderPlayersList(state);
    
    await animateHopsForState(state);
    
    renderBoardTokens(state);
    renderPropertyOwnership(state);
    updateControls(state);
    
    const me = state.players[myUuid];
    if (me && me.pendingAction && me.pendingAction.type === 'buy') {
        const pAction = me.pendingAction;
        const tData = boardData[pAction.tileIndex];
        if (!window.isPromptingBuy) {
            window.isPromptingBuy = true;
            Swal.fire({
                title: 'Buy Property?',
                text: tData.name + ' costs $' + pAction.price + '. Do you want to buy it?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Buy',
                cancelButtonText: 'Pass',
                confirmButtonColor: '#16a34a',
                cancelButtonColor: '#ef4444',
                background: '#ffffff',
                color: '#0f172a',
                customClass: { popup: 'glass-panel' }
            }).then((result) => {
                window.isPromptingBuy = false;
                socket.emit('buyProperty', result.isConfirmed);
            });
        }
    }
    
    if (pendingGameState) {
        const nState = pendingGameState;
        pendingGameState = null;
        handleGameState(nState);
    }
}
socket.on('gameState', handleGameState);

socket.on('diceRolled'`;
game = game.replace(stateRegex, cleanState);

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Finished rebuilding game.js');
