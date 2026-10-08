const fs = require('fs');

// 1. UPDATE index.html
let html = fs.readFileSync('public/monopoly/index.html', 'utf8');
const diceRegex = /<div class="dice-container"[\s\S]*?<\/div>\s*<\/div>/;
const diceHTML = `<div class="dice-container" style="display: flex; gap: 30px; margin-bottom: 20px;">
                    <div class="scene">
                        <div id="die1" class="cube">
                            <div class="cube-face cube-face-front">⚀</div>
                            <div class="cube-face cube-face-back">⚅</div>
                            <div class="cube-face cube-face-right">⚂</div>
                            <div class="cube-face cube-face-left">⚃</div>
                            <div class="cube-face cube-face-top">⚄</div>
                            <div class="cube-face cube-face-bottom">⚁</div>
                        </div>
                    </div>
                    <div class="scene">
                        <div id="die2" class="cube">
                            <div class="cube-face cube-face-front">⚀</div>
                            <div class="cube-face cube-face-back">⚅</div>
                            <div class="cube-face cube-face-right">⚂</div>
                            <div class="cube-face cube-face-left">⚃</div>
                            <div class="cube-face cube-face-top">⚄</div>
                            <div class="cube-face cube-face-bottom">⚁</div>
                        </div>
                    </div>
                </div>`;
html = html.replace(diceRegex, diceHTML);
fs.writeFileSync('public/monopoly/index.html', html);


// 2. UPDATE style.css
let css = fs.readFileSync('public/monopoly/style.css', 'utf8');
// Fix board position relative
css = css.replace('.board {', '.board { position: relative;');
css += `
/* 3D Dice CSS */
.scene { width: 60px; height: 60px; perspective: 400px; }
.cube { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.cube.rolling { animation: roll-animation 0.5s linear infinite; }
.cube-face { position: absolute; width: 60px; height: 60px; background: white; border: 2px solid #ccc; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #000; box-shadow: inset 0 0 10px rgba(0,0,0,0.1); backface-visibility: hidden; }
.cube-face-front  { transform: rotateY(  0deg) translateZ(30px); }
.cube-face-back   { transform: rotateY(180deg) translateZ(30px); }
.cube-face-right  { transform: rotateY( 90deg) translateZ(30px); }
.cube-face-left   { transform: rotateY(-90deg) translateZ(30px); }
.cube-face-top    { transform: rotateX( 90deg) translateZ(30px); }
.cube-face-bottom { transform: rotateX(-90deg) translateZ(30px); }
@keyframes roll-animation { 0% { transform: rotateX(0deg) rotateY(0deg); } 100% { transform: rotateX(360deg) rotateY(360deg); } }

/* Animated Token */
.player-token-anim {
    position: absolute;
    width: 30px; height: 30px;
    font-size: 28px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
    z-index: 50;
    filter: drop-shadow(2px 4px 4px rgba(0,0,0,0.5));
}
`;
fs.writeFileSync('public/monopoly/style.css', css);


// 3. UPDATE game.js
let js = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Replace renderBoardTokens
const rbtRegex = /function renderBoardTokens\(state\) {[\s\S]*?}(?=\n\nfunction updateControls)/;
const newRbt = `function renderBoardTokens(state) {
    const board = document.querySelector('.board');
    
    Object.values(state.players).forEach(p => {
        let tokenEl = document.getElementById(\`token-\${p.uuid}\`);
        if (!tokenEl) {
            tokenEl = document.createElement('div');
            tokenEl.id = \`token-\${p.uuid}\`;
            tokenEl.className = 'player-token-anim';
            tokenEl.innerHTML = p.symbol || '🎩';
            board.appendChild(tokenEl);
        }
        
        const tile = document.getElementById(\`tile-\${p.position}\`);
        if (tile) {
            const tLeft = tile.offsetLeft;
            const tTop = tile.offsetTop;
            const tWidth = tile.offsetWidth;
            const tHeight = tile.offsetHeight;
            
            // Consistent deterministic offset based on uuid to prevent stacking
            let offset = 0;
            if (p.uuid) {
                const charCode = p.uuid.charCodeAt(0) || 0;
                offset = (charCode % 5) * 5 - 10;
            }
            
            tokenEl.style.left = \`\${tLeft + (tWidth/2) - 15 + offset}px\`;
            tokenEl.style.top = \`\${tTop + (tHeight/2) - 15 + offset}px\`;
        }
        tokenEl.style.opacity = p.online ? '1' : '0.3';
    });
}`;
js = js.replace(rbtRegex, newRbt);

// Replace diceRolled
const drRegex = /socket\.on\('diceRolled', \(data\) => {[\s\S]*?}\);/;
const newDr = `socket.on('diceRolled', (data) => {
    die1El.classList.add('rolling');
    die2El.classList.add('rolling');
    
    setTimeout(() => {
        die1El.classList.remove('rolling');
        die2El.classList.remove('rolling');
        
        const rotMap = {
            1: 'rotateY(0deg)',
            6: 'rotateY(180deg)',
            3: 'rotateY(-90deg)',
            4: 'rotateY(90deg)',
            5: 'rotateX(-90deg)',
            2: 'rotateX(90deg)'
        };
        
        die1El.style.transform = rotMap[data.d1];
        die2El.style.transform = rotMap[data.d2];
    }, 500);
});`;
js = js.replace(drRegex, newDr);

// Inject Purchase logic into gameState
const gsRegex = /socket\.on\('gameState', \(state\) => {[\s\S]*?updateControls\(state\);\n}\);/;
const newGs = `socket.on('gameState', (state) => {
    currentGameState = state;
    renderPlayersList(state);
    renderBoardTokens(state);
    updateControls(state);
    
    // Check for pending buy action
    const me = state.players[myUuid];
    if (me && me.pendingAction && me.pendingAction.type === 'buy') {
        const pAction = me.pendingAction;
        const tData = boardData[pAction.tileIndex];
        if (!window.isPromptingBuy) {
            window.isPromptingBuy = true;
            Swal.fire({
                title: 'Buy Property?',
                text: \`\${tData.name} costs $\${pAction.price}. Do you want to buy it?\`,
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
});`;
js = js.replace(gsRegex, newGs);

fs.writeFileSync('public/monopoly/game.js', js);
console.log('Frontend patched!');
