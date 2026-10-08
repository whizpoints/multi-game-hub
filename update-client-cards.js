const fs = require('fs');

let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Also fixing Jail positions based on player.inJail
const oldPos = `    if (uuid) {
        const charCode = uuid.charCodeAt(0) || 0;
        offsetLeft = (charCode % 5) * 6 - 12;
        offsetTop = (charCode % 3) * 6 - 6;
    }
    
    tokenEl.style.position = 'absolute';
    tokenEl.style.left = '50%';
    tokenEl.style.top = '50%';
    tokenEl.style.transform = \`translate(calc(-50% + \${offsetLeft}px), calc(-50% + \${offsetTop}px))\`;`;

const newPos = `    if (uuid) {
        const charCode = uuid.charCodeAt(0) || 0;
        offsetLeft = (charCode % 5) * 6 - 12;
        offsetTop = (charCode % 3) * 6 - 6;
    }
    
    tokenEl.style.position = 'absolute';
    
    if (posIndex === 10) {
        // Check if player is IN JAIL or JUST VISITING
        let p = null;
        if (currentGameState && currentGameState.players[uuid]) p = currentGameState.players[uuid];
        if (pendingGameState && pendingGameState.players[uuid]) p = pendingGameState.players[uuid];
        
        if (p && p.inJail) {
            tokenEl.style.left = '75%';
            tokenEl.style.top = '25%';
        } else {
            tokenEl.style.left = '30%';
            tokenEl.style.top = '70%';
        }
    } else {
        tokenEl.style.left = '50%';
        tokenEl.style.top = '50%';
    }
    tokenEl.style.transform = \`translate(calc(-50% + \${offsetLeft}px), calc(-50% + \${offsetTop}px))\`;`;

game = game.replace(oldPos, newPos);

const oldBuyPrompt = `        if (!window.isPromptingBuy) {
            window.isPromptingBuy = true;
            Swal.fire({`;

const newCardPrompt = `    } else if (me && me.pendingAction && me.pendingAction.type === 'draw_card') {
        const deckName = me.pendingAction.deck === 'chance' ? 'Chance' : 'Community Chest';
        if (!window.isPromptingCard) {
            window.isPromptingCard = true;
            Swal.fire({
                title: \`Draw a \${deckName} Card\`,
                html: \`
                    <div style="background: \${me.pendingAction.deck === 'chance' ? '#ef4444' : '#3b82f6'}; color: white; padding: 40px 20px; border-radius: 12px; cursor: pointer; border: 4px solid #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="Swal.clickConfirm()">
                        <div style="font-size: 3rem; font-weight: 900;">?</div>
                        <div style="font-size: 1.2rem; font-weight: bold; margin-top: 10px;">CLICK TO REVEAL</div>
                    </div>
                \`,
                showConfirmButton: false,
                allowOutsideClick: false,
                background: 'transparent',
                backdrop: 'rgba(15, 23, 42, 0.9)'
            }).then(() => {
                window.isPromptingCard = false;
                socket.emit('resolveCard');
            });
        }
    }
    
    if (me && me.pendingAction && me.pendingAction.type === 'buy') {
        const pAction = me.pendingAction;
        const tData = boardData[pAction.tileIndex];
        if (!window.isPromptingBuy) {
            window.isPromptingBuy = true;
            Swal.fire({`;

game = game.replace(/if \(me && me\.pendingAction && me\.pendingAction\.type === 'buy'\) \{[\s\S]*?if \(!window\.isPromptingBuy\) \{[\s\S]*?window\.isPromptingBuy = true;\n\s+Swal\.fire\(\{/, newCardPrompt);

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Client updated for cards and jail visuals');
