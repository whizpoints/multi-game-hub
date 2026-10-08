const fs = require('fs');

// 1. UPDATE game.js
let js = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Insert renderPropertyOwnership into gameState listener
const gsRegex = /renderBoardTokens\(state\);/;
js = js.replace(gsRegex, "renderBoardTokens(state);\n    renderPropertyOwnership(state);");

// Append renderPropertyOwnership function
js += `
function renderPropertyOwnership(state) {
    document.querySelectorAll('.owner-strip').forEach(el => el.remove());
    Object.keys(state.properties).forEach(tileIndex => {
        const prop = state.properties[tileIndex];
        const tile = document.getElementById(\`tile-\${tileIndex}\`);
        const owner = state.players[prop.owner];
        
        if (tile && owner) {
            const strip = document.createElement('div');
            strip.className = 'owner-strip';
            strip.style.position = 'absolute';
            strip.style.inset = '0';
            strip.style.border = \`5px solid \${owner.color}\`;
            strip.style.pointerEvents = 'none';
            strip.style.boxShadow = \`inset 0 0 15px \${owner.color}80\`;
            strip.style.zIndex = '10';
            tile.appendChild(strip);
            
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
                mIcon.style.zIndex = '11';
                mIcon.style.fontSize = '0.7rem';
                tile.appendChild(mIcon);
            }
        }
    });
}
`;

// Update updateControls for Jail
const ucRegex = /if \(currentTurnUuid === myUuid[\s\S]*?\} else \{/;
const newUc = `if (currentTurnUuid === myUuid || (state.host === myUuid && state.players[currentTurnUuid] && state.players[currentTurnUuid].isLocal)) {
        if (state.players[currentTurnUuid].inJail) {
            rollBtn.textContent = 'ROLL FOR DOUBLES (JAIL)';
            rollBtn.style.background = '#eab308';
            if (!window.hasPromptedJailThisTurn && currentTurnUuid === myUuid) {
                window.hasPromptedJailThisTurn = true;
                Swal.fire({
                    title: 'You are in Jail!',
                    text: 'Pay $50 to get out now, or try to roll doubles.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Pay $50',
                    cancelButtonText: 'Roll Doubles',
                    customClass: { popup: 'glass-panel' }
                }).then((res) => {
                    if (res.isConfirmed) {
                        socket.emit('payJailFine');
                    }
                });
            }
        } else {
            window.hasPromptedJailThisTurn = false;
            rollBtn.textContent = 'ROLL DICE';
            rollBtn.style.background = '#16a34a'; 
        }
        rollBtn.style.opacity = '1';
        rollBtn.disabled = false;
    } else {`;
js = js.replace(ucRegex, newUc);

fs.writeFileSync('public/monopoly/game.js', js);


// 2. UPDATE server.js
let srv = fs.readFileSync('server.js', 'utf8');

// Add payJailFine listener
const jailRegex = /function handleRollDice\(targetUuid\)/;
const newJail = `socket.on('payJailFine', () => {
    const uuid = socket.uuid;
    const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
    if (uuid !== currentPid) return;
    const player = monopolyState.players[currentPid];
    if (player && player.inJail && player.cash >= 50) {
        player.cash -= 50;
        player.inJail = false;
        monopolyIo.emit('systemMessage', \`\${player.username} paid $50 to get out of jail.\`);
        monopolyIo.emit('gameState', monopolyState);
    }
  });\n\n  function handleRollDice(targetUuid)`;
srv = srv.replace(jailRegex, newJail);

fs.writeFileSync('server.js', srv);
console.log('Ownership and Jail mechanics added!');
