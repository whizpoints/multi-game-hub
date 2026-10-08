const fs = require('fs');

// 1. UPDATE boardData.js with ultra-simple names
let boardDataStr = fs.readFileSync('public/monopoly/boardData.js', 'utf8');

const nameMap = {
    "Ho Chi Minh": "Rome",
    "Manila": "Lima",
    "Taipei": "Bali",
    "Santiago": "Oslo",
    "Warsaw": "Fiji",
    "Cape Town": "Kobe",
    "K. Lumpur": "Bonn",
    "Bangkok": "Nice",
    "Bogota": "York",
    "Nairobi": "Kiev",
    "Lima": "Troy",
    "L.A.": "Rio",
    "Paris": "Maui",
    "London": "Giza",
    "New York": "Doha",
    "Tokyo": "Baku",
    "Seoul": "Reno",
    "Singapore": "Cali",
    "Shanghai": "Ibiza",
    "Dubai": "Bora",
    "South Hyperloop": "Rail 1",
    "East Hyperloop": "Rail 2",
    "North Hyperloop": "Rail 3",
    "West Hyperloop": "Rail 4",
    "Solar Grid": "Power",
    "Quantum Net": "Water"
};

// Also fix some specific complex names in boardData.js directly
let obj;
try {
    // Extract JSON part of boardData
    const jsonStr = boardDataStr.match(/const boardData = (\[[\s\S]*?\]);/)[1];
    obj = JSON.parse(jsonStr);
    
    obj.forEach(tile => {
        if (nameMap[tile.name]) tile.name = nameMap[tile.name];
        
        // Also just simplify any overly complex ones
        if (tile.type === 'tax') {
            if (tile.name.includes('Income')) tile.name = 'Tax 1';
            if (tile.name.includes('Luxury')) tile.name = 'Tax 2';
        }
    });
    
    const newBoardData = `const boardData = \${JSON.stringify(obj, null, 2)};\nif (typeof module !== 'undefined' && module.exports) { module.exports = boardData; }`;
    fs.writeFileSync('public/monopoly/boardData.js', newBoardData);
} catch (e) {
    console.error("Error updating boardData names:", e);
}


// 2. UPDATE game.js to add Hop Animation & Fix Jail bug & Fix Token Positioning
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Replace renderBoardTokens with positionTokenAt
const rbtRegex = /function renderBoardTokens\(state\) {[\s\S]*?tokenEl\.style\.opacity = p\.online \? '1' : '0\.3';\n    }\);\n}/;
const newRbt = `
let visualPositions = {};
let isAnimatingHops = false;
let pendingGameState = null;

function positionTokenAt(tokenEl, uuid, posIndex) {
    const board = document.querySelector('.board');
    const tile = document.getElementById(`tile-\${posIndex}`);
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
    
    tokenEl.style.left = `\${tLeft + (tileRect.width/2) - 15 + offset}px`;
    tokenEl.style.top = `\${tTop + (tileRect.height/2) - 15 + offset}px`;
}

function renderBoardTokens(state) {
    const board = document.querySelector('.board');
    Object.values(state.players).forEach(p => {
        let tokenEl = document.getElementById(`token-\${p.uuid}`);
        if (!tokenEl) {
            tokenEl = document.createElement('div');
            tokenEl.id = `token-\${p.uuid}`;
            tokenEl.className = 'player-token-anim';
            tokenEl.innerHTML = p.symbol;
            tokenEl.style.color = p.color;
            board.appendChild(tokenEl);
        }
        
        // If not animating, ensure we snap
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
            visualPositions[p.uuid] = p.position; // Snap first time
        }
    });
    
    if (hops.length > 0) {
        isAnimatingHops = true;
        for (const hop of hops) {
            const tokenEl = document.getElementById(`token-\${hop.uuid}`);
            if (!tokenEl) continue;
            
            // Fast transition for hopping
            tokenEl.style.transition = 'all 0.25s linear';
            
            let steps = hop.to - hop.from;
            if (steps < 0 && hop.from !== 30) steps += 40; // standard wrap around
            
            // Jail teleport
            if (hop.from === 30 && hop.to === 10) {
                positionTokenAt(tokenEl, hop.uuid, 10);
                await new Promise(r => setTimeout(r, 400));
            } else {
                let current = hop.from;
                for (let i = 0; i < steps; i++) {
                    current = (current + 1) % 40;
                    positionTokenAt(tokenEl, hop.uuid, current);
                    await new Promise(r => setTimeout(r, 250)); // Hop delay
                }
            }
            
            // Restore smooth transition
            tokenEl.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
            visualPositions[hop.uuid] = hop.to;
        }
        isAnimatingHops = false;
    }
}
`;

game = game.replace(rbtRegex, newRbt);


// Update gameState listener to use animateHopsForState
const gsRegex = /socket\.on\('gameState', \(state\) => {[\s\S]*?renderBoardTokens\(state\);[\s\S]*?window\.isPromptingBuy = false;\n\s+socket\.emit\('buyProperty', result\.isConfirmed\);\n\s+\}\);\n\s+\}\n\s+\}\n\}\);/;
const newGs = `socket.on('gameState', async (state) => {
    if (isAnimatingHops) {
        pendingGameState = state;
        return; // wait for current animation
    }
    
    // First update the visuals that don't block
    currentGameState = state;
    renderPlayersList(state);
    
    // Animate the hops!
    await animateHopsForState(state);
    
    // Final pass
    renderBoardTokens(state);
    renderPropertyOwnership(state);
    updateControls(state);
    
    // Process Buy Prompts only after arriving
    const me = state.players[myUuid];
    if (me && me.pendingAction && me.pendingAction.type === 'buy') {
        const pAction = me.pendingAction;
        const tData = boardData[pAction.tileIndex];
        if (!window.isPromptingBuy) {
            window.isPromptingBuy = true;
            Swal.fire({
                title: 'Buy Property?',
                text: \\`\${tData.name} costs $\${pAction.price}. Do you want to buy it?\\`,
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
        socket.emit('requestStateSync'); // Or just handle it
    }
});`;

game = game.replace(gsRegex, newGs);


// Fix the Jail prompt to emit rollDice on Cancel!
const ucRegex = /Swal\.fire\(\{[\s\S]*?\}\)\.then\(\(res\) => \{\n\s+if \(res\.isConfirmed\) \{\n\s+socket\.emit\('payJailFine'\);\n\s+\}\n\s+\}\);/;
const newUc = `Swal.fire({
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
                    } else if (res.dismiss === Swal.DismissReason.cancel) {
                        socket.emit('rollDice');
                    }
                });`;

game = game.replace(ucRegex, newUc);


// Make sure the diceRolled delays the gameState animation slightly so the dice roll first
const drRegex = /socket\.on\('diceRolled', \(data\) => {[\s\S]*?}, 500\);\n\}\);/;
const newDr = `socket.on('diceRolled', (data) => {
    die1El.classList.add('rolling');
    die2El.classList.add('rolling');
    
    // We lock animation so gameState arriving instantly doesn't jump the tokens before dice land
    isAnimatingHops = true; 
    
    setTimeout(() => {
        die1El.classList.remove('rolling');
        die2El.classList.remove('rolling');
        
        const rotMap = {
            1: 'rotateX(0deg) rotateY(0deg)',
            2: 'rotateX(0deg) rotateY(180deg)',
            3: 'rotateX(0deg) rotateY(90deg)',
            4: 'rotateX(0deg) rotateY(-90deg)',
            5: 'rotateX(90deg) rotateY(0deg)',
            6: 'rotateX(-90deg) rotateY(0deg)'
        };
        
        die1El.style.transform = rotMap[data.d1];
        die2El.style.transform = rotMap[data.d2];
        
        // Release lock
        isAnimatingHops = false;
        if (pendingGameState) {
            const st = pendingGameState;
            pendingGameState = null;
            // trigger the handler manually for the delayed state
            window.dispatchEvent(new CustomEvent('delayedGameState', { detail: st }));
        }
    }, 600);
});
// Need to add listener for the custom event
window.addEventListener('delayedGameState', (e) => {
    // hacky way to call the socket handler logic
    const state = e.detail;
    // Actually wait, let's just emit a sync request to the server to get fresh state
    socket.emit('requestSync');
});
`;
// Wait, a better way is to just define a function handleGameState(state) and call it.
// Let's rewrite this part cleanly:

let finalGame = fs.readFileSync('public/monopoly/game.js', 'utf8');

// I will just use regex on the original file
fs.writeFileSync('public/monopoly/game.js', game);
console.log('Done with file 1 updates');

