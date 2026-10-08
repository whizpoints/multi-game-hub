const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const targetStr = `        } else {
            window.hasPromptedJailThisTurn = false;
            rollBtn.textContent = 'ROLL DICE';
            rollBtn.style.background = '#16a34a'; 
        }`;

const replacement = `        } else {
            window.hasPromptedJailThisTurn = false;
            if (state.players[currentTurnUuid].pendingAction && state.players[currentTurnUuid].pendingAction.type === 'draw_card') {
                rollBtn.textContent = 'DRAW CARD';
                rollBtn.style.background = '#ef4444';
                rollBtn.classList.add('pulse-anim');
                const targetDeck = document.querySelector('.' + state.players[currentTurnUuid].pendingAction.deck + '-deck');
                if (targetDeck) targetDeck.classList.add('glow-deck');
            } else {
                rollBtn.textContent = 'ROLL DICE';
                rollBtn.style.background = '#16a34a'; 
                rollBtn.classList.remove('pulse-anim');
                const chanceDeck = document.querySelector('.chance-deck');
                const chestDeck = document.querySelector('.chest-deck');
                if (chanceDeck) chanceDeck.classList.remove('glow-deck');
                if (chestDeck) chestDeck.classList.remove('glow-deck');
            }
        }`;

game = game.replace(targetStr, replacement);
fs.writeFileSync('public/monopoly/game.js', game);
console.log("Injected properly.");
