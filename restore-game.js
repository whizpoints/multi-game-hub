const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Slice off the corrupted part starting at function updateControls
const uIdx = game.indexOf('function updateControls(state) {');
game = game.substring(0, uIdx);

const newEnd = `function updateControls(state) {
    const aucOverlay = document.getElementById('auction-overlay');
    if (state.status === 'AUCTION' && state.auction) {
        aucOverlay.classList.remove('hidden');
        aucOverlay.style.display = 'flex';
        const tData = boardData[state.auction.tileIndex];
        document.getElementById('auction-property').textContent = tData ? tData.name : 'PROPERTY';
        document.getElementById('auction-bid').textContent = '$' + state.auction.currentBid;
        
        const leader = state.players[state.auction.highestBidder];
        document.getElementById('auction-leader').textContent = 'Highest Bidder: ' + (leader ? leader.username : 'NONE');
        document.getElementById('auction-timer').textContent = state.auction.timer + 's REMAINING';
        
        const controls = document.getElementById('auction-controls');
        const status = document.getElementById('auction-status');
        
        if (state.auction.activeBidders.includes(myUuid)) {
            controls.style.display = 'flex';
            status.textContent = "It's your turn to bid or fold!";
        } else {
            controls.style.display = 'none';
            status.textContent = "You have folded. Waiting for others...";
        }
    } else if (aucOverlay) {
        aucOverlay.classList.add('hidden');
        aucOverlay.style.display = 'none';
    }

    let turnIndicator = document.getElementById('turn-indicator');
    if (!turnIndicator) {
        turnIndicator = document.createElement('div');
        turnIndicator.id = 'turn-indicator';
        turnIndicator.style.fontSize = '1.8rem';
        turnIndicator.style.fontWeight = '900';
        turnIndicator.style.color = '#0f172a';
        turnIndicator.style.textAlign = 'center';
        turnIndicator.style.marginBottom = '20px';
        turnIndicator.style.textTransform = 'uppercase';
        rollBtn.parentNode.insertBefore(turnIndicator, rollBtn);
    }

    if (hostControlsEl) {
        if (state.status === 'LOBBY' && state.host === myUuid) {
            hostControlsEl.classList.remove('hidden');
        } else {
            hostControlsEl.classList.add('hidden');
        }
    }

    if (state.status === 'LOBBY') {
        if (document.getElementById('turn-indicator')) {
            document.getElementById('turn-indicator').textContent = 'WAITING FOR PLAYERS...';
        }
        rollBtn.textContent = 'WAITING FOR PLAYERS';
        rollBtn.style.opacity = '0.5';
        rollBtn.disabled = true;
        return;
    }

    const currentTurnUuid = state.turnOrder[state.currentTurnIndex];
    const currentPlayer = state.players[currentTurnUuid];
    if (document.getElementById('turn-indicator') && currentPlayer) {
        document.getElementById('turn-indicator').textContent = (currentTurnUuid === myUuid ? 'YOUR TURN' : currentPlayer.username + "'S TURN");
    }
    
    if (currentTurnUuid === myUuid || (state.host === myUuid && state.players[currentTurnUuid] && state.players[currentTurnUuid].isLocal)) {
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
                    } else if (res.dismiss === Swal.DismissReason.cancel) {
                        socket.emit('rollDice');
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
    } else {
        rollBtn.textContent = 'OPPONENT TURN';
        rollBtn.style.opacity = '0.5';
        rollBtn.disabled = true;
        rollBtn.style.background = '#2563eb';
    }
}

socket.on('gameState', async (state) => {
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
                color: '#0f172a'
            }).then((res) => {
                window.isPromptingBuy = false;
                if (res.isConfirmed) {
                    socket.emit('buyProperty', true);
                } else {
                    socket.emit('buyProperty', false);
                }
            });
        }
    }
});

socket.on('diceRolled', (data) => {
    die1El.classList.add('rolling');
    die2El.classList.add('rolling');
    
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
        
        isAnimatingHops = false;
        if (pendingGameState) {
            const st = pendingGameState;
            pendingGameState = null;
            // process queued state
            socket._callbacks['$gameState'][0](st);
        }
    }, 600);
});

socket.on('systemMessage', (msg) => {
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
});

socket.on('errorMsg', (msg) => {
    Swal.fire('Error', msg, 'error');
});
`;

fs.writeFileSync('public/monopoly/game.js', game + newEnd);
console.log('Restored game.js!');
