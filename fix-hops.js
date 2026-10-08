const fs = require('fs');
let js = fs.readFileSync('public/monopoly/game.js', 'utf8');

const positionFn = `
let visualPositions = {};
let isAnimatingHops = false;
let pendingGameState = null;

function positionTokenAt(tokenEl, uuid, posIndex) {
    const board = document.querySelector('.board');
    const tile = document.getElementById('tile-' + posIndex);
    if (!tile || !board) return;
    
    const boardRect = board.getBoundingClientRect();
    const tileRect = tile.getBoundingClientRect();
    const tLeft = tileRect.left - boardRect.left;
    const tTop = tileRect.top - boardRect.top;
    
    let offset = 0;
    if (uuid) {
        const charCode = uuid.charCodeAt(0) || 0;
        offset = (charCode % 5) * 5 - 10;
    }
    
    tokenEl.style.left = (tLeft + (tileRect.width/2) - 15 + offset) + 'px';
    tokenEl.style.top = (tTop + (tileRect.height/2) - 15 + offset) + 'px';
}

function renderBoardTokens(state) {
    const board = document.querySelector('.board');
    Object.values(state.players).forEach(p => {
        let tokenEl = document.getElementById('token-' + p.uuid);
        if (!tokenEl) {
            tokenEl = document.createElement('div');
            tokenEl.id = 'token-' + p.uuid;
            tokenEl.className = 'player-token-anim';
            tokenEl.innerHTML = p.symbol;
            tokenEl.style.color = p.color;
            board.appendChild(tokenEl);
        }
        
        if (!isAnimatingHops) {
            positionTokenAt(tokenEl, p.uuid, p.position);
            visualPositions[p.uuid] = p.position;
        }
        tokenEl.style.opacity = p.online ? '1' : '0.3';
    });
}

async function animateHopsForState(state) {
    const hops = [];
    Object.values(state.players).forEach(p => {
        if (visualPositions[p.uuid] !== undefined && visualPositions[p.uuid] !== p.position) {
            hops.push({ uuid: p.uuid, from: visualPositions[p.uuid], to: p.position });
        }
        if (visualPositions[p.uuid] === undefined) {
            visualPositions[p.uuid] = p.position; 
        }
    });
    
    if (hops.length > 0) {
        isAnimatingHops = true;
        for (const hop of hops) {
            const tokenEl = document.getElementById('token-' + hop.uuid);
            if (!tokenEl) continue;
            
            tokenEl.style.transition = 'all 0.25s linear';
            let steps = hop.to - hop.from;
            if (steps < 0 && hop.from !== 30) steps += 40; 
            
            if (hop.from === 30 && hop.to === 10) {
                positionTokenAt(tokenEl, hop.uuid, 10);
                await new Promise(r => setTimeout(r, 400));
            } else {
                let current = hop.from;
                for (let i = 0; i < steps; i++) {
                    current = (current + 1) % 40;
                    positionTokenAt(tokenEl, hop.uuid, current);
                    await new Promise(r => setTimeout(r, 250)); 
                }
            }
            
            tokenEl.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
            visualPositions[hop.uuid] = hop.to;
        }
        isAnimatingHops = false;
    }
}
`;

js = js.replace(/function renderBoardTokens\(state\) \{[\s\S]*?tokenEl\.style\.opacity = p\.online \? '1' : '0\.3';\n    \}\);\n\}/, positionFn);

// Rewrite handleGameState
const handleStateStr = `
async function handleGameState(state) {
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
`;

js = js.replace(/async function handleGameState\(state\) \{[\s\S]*?socket\.on\('gameState', handleGameState\);/, handleStateStr);

fs.writeFileSync('public/monopoly/game.js', js);
console.log('game.js updated');
