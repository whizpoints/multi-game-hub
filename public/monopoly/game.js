

window.addEventListener('error', function(event) {
    fetch('/log-error?msg=' + encodeURIComponent('Uncaught: ' + event.message + ' at ' + event.filename + ':' + event.lineno));
});
window.addEventListener('unhandledrejection', function(event) {
    fetch('/log-error?msg=' + encodeURIComponent('Unhandled Rejection: ' + (event.reason ? event.reason.stack || event.reason : '')));
});

window.addEventListener('unhandledrejection', function(event) {
    fetch('/log-error?msg=' + encodeURIComponent(event.reason));
});
const neonColors = {
    'Brown': '#8b4513',
    'LightBlue': '#06b6d4',
    'Pink': '#ec4899',
    'Orange': '#f97316',
    'Red': '#ef4444',
    'Yellow': '#eab308',
    'Green': '#16a34a',
    'DarkBlue': '#2563eb'
};

const boardEl = document.getElementById('board');
const propertyDetails = document.getElementById('property-details');
const placeholderText = document.querySelector('.placeholder-text');
const rollBtn = document.getElementById('roll-btn');
const die1El = document.getElementById('die1');
const die2El = document.getElementById('die2');

function getGridArea(index) {
    if (index <= 10) {
        const col = 11 - index;
        return `11 / ${col} / 12 / ${col + 1}`;
    }
    if (index <= 19) {
        const row = 10 - (index - 11);
        return `${row} / 1 / ${row + 1} / 2`;
    }
    if (index <= 30) {
        const col = 1 + (index - 20);
        return `1 / ${col} / 2 / ${col + 1}`;
    }
    if (index <= 39) {
        const row = 2 + (index - 31);
        return `${row} / 11 / ${row + 1} / 12`;
    }
}

function getOrientation(index) {
    if (index % 10 === 0) return 'corner';
    if (index > 0 && index < 10) return 'bottom';
    if (index > 10 && index < 20) return 'left';
    if (index > 20 && index < 30) return 'top';
    if (index > 30 && index < 40) return 'right';
}

function initBoard() {
    boardData.forEach((tile, index) => {
        const el = document.createElement('div');
        el.className = `tile ${getOrientation(index)}`;
        el.id = `tile-${index}`;
        el.style.gridArea = getGridArea(index);
        
        let html = '';
        if (tile.color) {
            const hex = neonColors[tile.color];
            html += `<div class="color-band" style="background: ${hex};"></div>`;
        }

        // Exact Corner Designs based on Image
        if (tile.type === 'go') {
            html += `
                <div style="font-size: 2.2rem; font-weight: 900; line-height: 1; letter-spacing: -1px;">GO</div>
                <div style="color: #ef4444; margin: -5px 0;"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg></div>
                <div style="font-size: 0.5rem; text-align: center; font-weight: 800; line-height: 1.2;">COLLECT $200<br>AS YOU PASS</div>
            `;
        } else if (tile.type === 'jail') {
            html += `
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                    <div style="position: absolute; bottom: 8px; left: 8px; font-size: 0.65rem; font-weight: 900; line-height: 1.1; color: #64748b; text-align: left;">
                        JUST<br>VISITING
                    </div>
                    <div style="position: absolute; top: 0; right: 0; width: 65%; height: 65%; background: #ffedd5; border-bottom: 2px solid #cbd5e1; border-left: 2px solid #cbd5e1; border-radius: 0 0 0 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 0 10px rgba(0,0,0,0.05);">
                        <span style="font-size: 0.65rem; font-weight: 900; color: #c2410c;">IN JAIL</span>
                        <span style="margin-top: 2px;"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c2410c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><path d="M8 11v10"></path><path d="M16 11v10"></path></svg></span>
                    </div>
                </div>
            `;
        } else if (tile.type === 'free_parking') {
            html += `
                <div style="font-weight: 900; margin-bottom: 8px; font-size: 0.8rem;">PARKING</div>
                <div style="background: #2563eb; color: white; padding: 4px 12px; border-radius: 8px; font-size: 1.8rem; font-weight: 900; line-height: 1;">P</div>
            `;
        } else if (tile.type === 'go_to_jail') {
            html += `
                <div style="font-weight: 900; margin-bottom: 5px; font-size: 0.8rem;">GO TO JAIL</div>
                <div><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><path d="M8 11v10"></path><path d="M16 11v10"></path></svg></div>
            `;
        } else {
            // Normal Properties
            html += `<div class="name">${tile.name}</div>`;
            
            
            let icon = '';
            if (tile.type === 'station') icon = '<img src="vectors/airport-14-svgrepo-com.svg" width="24" height="24" />';
            else if (tile.type === 'utility' && tile.name.toLowerCase().includes('power')) icon = '<img src="vectors/solar-power-svgrepo-com.svg" width="24" height="24" />';
            else if (tile.type === 'utility') icon = '<img src="vectors/waterworks.svg" width="24" height="24" />';
            else if (tile.type === 'chest') icon = '<img src="vectors/treasure_chest_ultra_clear.svg" width="32" height="32" />';
            else if (tile.type === 'chance') icon = '<img src="vectors/red-question-mark-svgrepo-com.svg" width="24" height="24" />';
            else if (tile.type === 'tax') icon = '<img src="vectors/cash-svgrepo-com.svg" width="24" height="24" />';

            if (icon) html += `<div class="icon" style="margin-top: 5px;">${icon}</div>`;
            
            // Only taxes show prices on the board in the new design
            if (tile.type === 'tax') {
                html += `<div class="price">PAY $${tile.amount || 1000}</div>`;
            }
        }
        
        el.innerHTML = html;

        if (tile.type === 'property' || tile.type === 'station' || tile.type === 'utility') {
            el.addEventListener('mouseenter', () => showPropertyDetails(tile));
        }

        boardEl.appendChild(el);
    });
}



window.socket = io('/monopoly');
const socket = window.socket;
let currentGameState = null;
let pendingGameState = null;
let isAnimatingHops = false;
let visualPositions = {};

let myUuid = localStorage.getItem('monopoly_uuid');
if (!myUuid) {
    myUuid = 'guest_' + Math.floor(Math.random() * 100000);
    localStorage.setItem('monopoly_uuid', myUuid);
}

let myUsername = localStorage.getItem('monopoly_username');
if (!myUsername) {
    myUsername = 'Guest ' + Math.floor(Math.random() * 1000);
    localStorage.setItem('monopoly_username', myUsername);
}

socket.emit('joinGame', { uuid: myUuid, username: myUsername });

socket.on('systemMessage', (msg) => {
    const log = document.getElementById('action-log');
    if (log) {
        const div = document.createElement('div');
        div.style.padding = '4px 8px';
        div.style.borderBottom = '1px solid #e2e8f0';
        div.style.fontSize = '0.85rem';
        div.textContent = msg;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }
});

socket.on('errorMsg', (msg) => {
    Swal.fire({
        title: 'Notice',
        text: msg,
        icon: 'error',
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'glass-panel' }
    });
});

const hostControlsEl = document.getElementById('host-controls');
const addBotBtn = document.getElementById('add-bot-btn');
const addLocalBtn = document.getElementById('add-local-btn');
const startGameBtn = document.getElementById('start-game-btn');

if (addBotBtn) addBotBtn.addEventListener('click', () => socket.emit('addBot'));
if (addLocalBtn) addLocalBtn.addEventListener('click', async () => {
    const { value: name } = await Swal.fire({
        title: 'Add Local Player',
        input: 'text',
        inputLabel: 'Enter player name',
        inputPlaceholder: 'e.g., Player 2',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        background: '#ffffff',
        color: '#0f172a',
        customClass: { popup: 'glass-panel' }
    });
    if (name) socket.emit('addLocalPlayer', name);
});
if (startGameBtn) startGameBtn.addEventListener('click', () => socket.emit('startGame'));

function renderPlayersList(state) {
    const list = document.getElementById('players-list');
    if (!list) return;
    list.innerHTML = '';
    
    state.turnOrder.forEach((uuid, idx) => {
        const player = state.players[uuid];
        if (!player) return;
        
        const isMyTurn = (state.currentTurnIndex === idx);
        const html = `
        <div class="player-card" style="${isMyTurn ? 'border: 2px solid #2563eb; transform: scale(1.02);' : ''} padding: 8px 12px; margin-bottom: 6px;">
            <div style="width: 4px; background: ${player.color}; position: absolute; left: 0; top: 0; bottom: 0; border-radius: 8px 0 0 8px;"></div>
            <div style="display: flex; flex-direction: column; width: 100%;">
                <div style="font-weight: 800; font-size: 0.75rem; color: #0f172a; display: flex; justify-content: space-between; align-items: center; text-transform: uppercase;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">${idx + 1}. ${player.username} ${uuid === myUuid ? '(You)' : ''}</span>
                    <span style="display: flex; flex-shrink: 0;">
                        ${state.status === 'LOBBY' && uuid === myUuid ? `<button onclick="window.promptEditName()" style="background: transparent; border: none; color: #3b82f6; font-size: 0.9rem; cursor: pointer; padding: 0 4px;" title="Edit Name">✎</button>` : ''}
                        ${state.status === 'LOBBY' && uuid !== myUuid ? `<button onclick="window.socket.emit('removePlayer', '${uuid}')" style="background: transparent; border: none; color: #ef4444; font-size: 1rem; cursor: pointer; padding: 0 4px;" title="Remove Player">&times;</button>` : ''}
                    </span>
                </div>
                <div style="font-size: 0.85rem; font-weight: 900; color: #16a34a; margin-top: 2px;">$${player.cash}</div>
            </div>
        </div>
        `;
        
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        list.appendChild(wrapper.firstElementChild);
    });
    
    // If in lobby and we're the host, let's append an 'Empty Slot' button at the bottom of the list for easy access.
    if (state.status === 'LOBBY' && state.turnOrder.length < 8) {
        const addHtml = `
        <div class="player-card" style="border: 2px dashed #cbd5e1; background: transparent; cursor: pointer; display: flex; justify-content: center; align-items: center; padding: 10px;" onclick="document.getElementById('add-local-btn').click()">
            <span style="font-weight: 800; font-size: 0.75rem; color: #64748b; text-transform: uppercase;">+ Add Local Player</span>
        </div>
        `;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = addHtml;
        list.appendChild(wrapper.firstElementChild);
    }
}


function showPropertyDetails(tile) {
    if (!document.getElementById('buy-house-btn')) {
        const createBtn = (id, text, color, fnName, fnBody) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = 'glass-btn';
            btn.style.width = '100%';
            btn.style.marginTop = '10px';
            btn.style.fontSize = '0.9rem';
            btn.style.background = color;
            btn.style.display = 'none';
            btn.textContent = text;
            btn.onclick = () => window[fnName]();
            document.getElementById('property-details').appendChild(btn);
            window[fnName] = function() {
                if (window.currentViewedTileIndex !== undefined) {
                    fnBody(window.currentViewedTileIndex);
                }
            };
            return btn;
        };
        
        createBtn('buy-house-btn', 'UPGRADE', '#22c55e', 'buyHouse', (idx) => socket.emit('buyHouse', idx));
        createBtn('sell-house-btn', 'SELL HOUSE', '#ef4444', 'sellHouse', (idx) => socket.emit('sellHouse', idx));
        createBtn('mortgage-btn', 'MORTGAGE', '#ef4444', 'mortgageProp', (idx) => socket.emit('mortgageProperty', idx));
        createBtn('unmortgage-btn', 'UNMORTGAGE', '#3b82f6', 'unmortgageProp', (idx) => socket.emit('unmortgageProperty', idx));
    }
    
    const idx = boardData.indexOf(tile);
    window.currentViewedTileIndex = idx;
    
    placeholderText.style.display = 'none';
    propertyDetails.classList.remove('hidden');
    
    document.getElementById('pc-name').textContent = tile.name;
    const hex = neonColors[tile.color] || '#94a3b8';
    document.getElementById('pc-header').style.background = hex;
    
    document.getElementById('pc-price').textContent = tile.price ? '$' + tile.price : '-';
    document.getElementById('pc-house-cost').textContent = tile.houseCost ? '$' + tile.houseCost : '-';
    document.getElementById('pc-mortgage').textContent = tile.mortgageValue ? '$' + tile.mortgageValue : '-';
    document.getElementById('pc-unmortgage').textContent = tile.unmortgageCost ? '$' + Math.round(tile.unmortgageCost) : '-';
    
    const buyHouseBtn = document.getElementById('buy-house-btn');
    const sellHouseBtn = document.getElementById('sell-house-btn');
    const mortgageBtn = document.getElementById('mortgage-btn');
    const unmortgageBtn = document.getElementById('unmortgage-btn');
    
    buyHouseBtn.style.display = 'none';
    sellHouseBtn.style.display = 'none';
    mortgageBtn.style.display = 'none';
    unmortgageBtn.style.display = 'none';
    
    if (tile.rent) {
        document.getElementById('pc-rent').textContent = tile.rent.base ? '$' + tile.rent.base : (tile.rent.base === 0 ? '$0' : tile.rent.base);
        
        const state = window.currentGameStateObj;
        if (state && state.properties[idx]) {
            const prop = state.properties[idx];
            const pAuth = state.players[prop.owner];
            const isOwner = (prop.owner === myUuid || (pAuth && pAuth.isLocal && pAuth.hostId === myUuid));
            
            if (isOwner) {
                if (prop.mortgaged) {
                    unmortgageBtn.style.display = 'block';
                    unmortgageBtn.textContent = 'UNMORTGAGE ($' + Math.round(tile.unmortgageCost) + ')';
                } else {
                    if (tile.type === 'property' && prop.houses < 5) {
                        buyHouseBtn.style.display = 'block';
                        buyHouseBtn.textContent = 'UPGRADE ($' + (tile.houseCost || 50) + ')';
                    }
                    if (tile.type === 'property' && prop.houses > 0) {
                        sellHouseBtn.style.display = 'block';
                        sellHouseBtn.textContent = 'SELL HOUSE (+$' + (tile.houseCost || 50)/2 + ')';
                    }
                    if (prop.houses === 0) {
                        mortgageBtn.style.display = 'block';
                        mortgageBtn.textContent = 'MORTGAGE (+$' + tile.mortgageValue + ')';
                    }
                }
            }
        }
        
        if (tile.type === 'property') {
            document.getElementById('pc-houses-container').classList.remove('hidden');
            document.getElementById('pc-h1').textContent = '$' + tile.rent.house1;
            document.getElementById('pc-h2').textContent = '$' + tile.rent.house2;
            document.getElementById('pc-h3').textContent = '$' + tile.rent.house3;
            document.getElementById('pc-h4').textContent = '$' + tile.rent.house4;
            document.getElementById('pc-hotel').textContent = '$' + tile.rent.hotel;
        } else {
            document.getElementById('pc-houses-container').classList.add('hidden');
            if (tile.type === 'station') {
                document.getElementById('pc-rent').innerHTML = '$25<br>2 Stations: $50<br>3 Stations: $100<br>4 Stations: $200';
            } else if (tile.type === 'utility') {
                document.getElementById('pc-rent').innerHTML = '1 Utility: 4x Dice<br>2 Utilities: 10x Dice';
            }
        }
    } else {
        document.getElementById('pc-houses-container').classList.add('hidden');
    }
}

function positionTokenAt(tokenEl, uuid, position) {
    const tile = document.getElementById('tile-' + position);
    if (!tile) return;
    
    const rect = tile.getBoundingClientRect();
    const boardRect = document.getElementById('board').getBoundingClientRect();
    
    let playersOnTile = [];
    if (window.currentGameStateObj) {
        playersOnTile = Object.values(window.currentGameStateObj.players)
            .filter(p => p.position === position)
            .map(p => p.uuid)
            .sort();
    }
    
    const myIndex = Math.max(0, playersOnTile.indexOf(uuid));
    
    const offsetX = (myIndex % 2) * 20 - 10;
    const offsetY = Math.floor(myIndex / 2) * 20 - 10;
    
    const centerX = rect.left - boardRect.left + (rect.width / 2) + offsetX;
    const centerY = rect.top - boardRect.top + (rect.height / 2) + offsetY;
    
    tokenEl.style.transform = `translate(${centerX}px, ${centerY}px) translate(-50%, -50%)`;
}

function renderBoardTokens(state) {
    Object.values(state.players).forEach(p => {
        let tokenEl = document.getElementById('token-' + p.uuid);
        if (!tokenEl) {
            tokenEl = document.createElement('div');
            tokenEl.id = 'token-' + p.uuid;
            tokenEl.className = 'player-token-anim';
            tokenEl.innerHTML = `<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; overflow: visible; font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${p.symbol}</div>`;
            tokenEl.style.color = p.color;
            tokenEl.style.zIndex = '10';
            tokenEl.style.position = 'absolute';
            tokenEl.style.top = '0';
            tokenEl.style.left = '0';
            tokenEl.style.pointerEvents = 'none';
            document.getElementById('board').appendChild(tokenEl);
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
            let dir = 1;
            if (steps === -3) {
                dir = -1;
            } else if (steps < 0 && hop.from !== 30) {
                steps += 40;
            }
            steps = Math.abs(steps);
            
            if (hop.from === 30 && hop.to === 10) {
                positionTokenAt(tokenEl, hop.uuid, 10);
                await new Promise(r => setTimeout(r, 400));
            } else {
                let current = hop.from;
                for (let i = 0; i < steps; i++) {
                    current = (current + dir + 40) % 40;
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




function renderPropertyOwnership(state) {
    document.querySelectorAll('.owner-strip, .owner-name-tag, .house-indicator').forEach(el => el.remove());
    
    Object.keys(state.properties).forEach(tileIndex => {
        const prop = state.properties[tileIndex];
        const tile = document.getElementById('tile-' + tileIndex);
        const owner = state.players[prop.owner];
        
        if (tile && owner) {
            const playerNum = state.turnOrder.indexOf(prop.owner) + 1;
            
            // Add Player Number Badge
            const tag = document.createElement('div');
            tag.className = 'owner-name-tag';
            tag.textContent = playerNum;
            tag.style.position = 'absolute';
            tag.style.top = '4px';
            tag.style.right = '4px';
            tag.style.width = '20px';
            tag.style.height = '20px';
            tag.style.borderRadius = '50%';
            tag.style.background = owner.color;
            tag.style.color = '#fff';
            tag.style.display = 'flex';
            tag.style.alignItems = 'center';
            tag.style.justifyContent = 'center';
            tag.style.fontSize = '0.65rem';
            tag.style.fontWeight = '900';
            tag.style.zIndex = '15';
            tag.style.border = '1px solid rgba(255,255,255,0.5)';
            tile.appendChild(tag);
            
            // Add Houses Indicator
            if (prop.houses > 0) {
                const hInd = document.createElement('div');
                hInd.className = 'house-indicator';
                hInd.style.position = 'absolute';
                hInd.style.top = '4px';
                hInd.style.left = '4px';
                hInd.style.color = '#fff';
                hInd.style.fontWeight = '900';
                hInd.style.fontSize = '0.65rem';
                hInd.style.zIndex = '15';
                hInd.style.background = prop.houses === 5 ? '#ef4444' : '#22c55e';
                hInd.style.padding = '2px 4px';
                hInd.style.borderRadius = '4px';
                hInd.textContent = prop.houses === 5 ? 'H' : '⌂'.repeat(prop.houses);
                tile.appendChild(hInd);
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


function updateControls(state) {
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

        const quitLobbyBtn = document.getElementById('quit-lobby-btn');
    if (quitLobbyBtn) {
        if (state.status === 'PLAYING' && state.host === myUuid) {
            quitLobbyBtn.style.display = 'block';
        } else {
            quitLobbyBtn.style.display = 'none';
        }
    }

    if (hostControlsEl) {
        if (state.status === 'LOBBY') {
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
        if (state.players[currentTurnUuid].debtState) {
            rollBtn.textContent = 'YOU ARE IN DEBT! DECLARE BANKRUPTCY';
            rollBtn.style.background = '#ef4444';

            // Add a pay debt button if they can afford it
            let payBtn = document.getElementById('pay-debt-btn');
            if (!payBtn) {
                payBtn = document.createElement('button');
                payBtn.id = 'pay-debt-btn';
                payBtn.className = 'glass-btn';
                payBtn.style.background = '#22c55e';
                payBtn.style.marginLeft = '10px';
                payBtn.onclick = () => socket.emit('payDebt');
                rollBtn.parentNode.insertBefore(payBtn, rollBtn.nextSibling);
            }
            payBtn.textContent = `PAY $${state.players[currentTurnUuid].debtState.amount}`;
            payBtn.style.display = 'inline-block';
            payBtn.disabled = state.players[currentTurnUuid].cash < state.players[currentTurnUuid].debtState.amount;
            payBtn.style.opacity = payBtn.disabled ? '0.5' : '1';

            rollBtn.onclick = () => {
                Swal.fire({
                    title: 'Declare Bankruptcy?',
                    text: 'Are you sure? You will lose all your properties and be removed from the game.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Declare Bankruptcy',
                    confirmButtonColor: '#ef4444',
                    customClass: { popup: 'glass-panel' }
                }).then(res => {
                    if (res.isConfirmed) {
                        socket.emit('declareBankruptcy');
                    }
                });
            };
        } else {
            const payBtn = document.getElementById('pay-debt-btn');
            if (payBtn) payBtn.style.display = 'none';

            // Restore roll button default click handler
            rollBtn.onclick = () => {
                if (window.socket) window.socket.emit('rollDice');
            };

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
        }
    } else {
        rollBtn.textContent = 'OPPONENT TURN';
        rollBtn.style.opacity = '0.5';
        rollBtn.disabled = true;
        rollBtn.style.background = '#2563eb';
        if (document.getElementById('pay-jail-btn')) document.getElementById('pay-jail-btn').style.display = 'none';
        if (document.getElementById('use-jail-card-btn')) document.getElementById('use-jail-card-btn').style.display = 'none';
    }
}

socket.on('gameState', async (state) => {
    if (isAnimatingHops) {
        pendingGameState = state;
        return;
    }
    currentGameState = state;
    window.currentGameStateObj = state; renderPlayersList(state);
    
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

    const chanceDeck = document.querySelector('.chance-deck');
    const chestDeck = document.querySelector('.chest-deck');
    if (chanceDeck) chanceDeck.classList.remove('glow-deck');
    if (chestDeck) chestDeck.classList.remove('glow-deck');
    if (me && me.pendingAction && me.pendingAction.type === 'draw_card') {
        const targetDeck = document.querySelector('.' + me.pendingAction.deck + '-deck');
        if (targetDeck) targetDeck.classList.add('glow-deck');
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
initBoard();


// ====== CARD CLICK LOGIC ======



document.addEventListener('DOMContentLoaded', () => {
    const chanceDeck = document.querySelector('.chance-deck');
    const chestDeck = document.querySelector('.chest-deck');
    
    const clickHandler = (e) => {
        if (!currentGameState) return;
        const me = currentGameState.players[myUuid];
        if (!me || !me.pendingAction || me.pendingAction.type !== 'draw_card') return;
        
        const deckType = me.pendingAction.deck;
        if (e.currentTarget.classList.contains(deckType + '-deck')) {
            socket.emit('resolveCard');
            e.currentTarget.classList.remove('glow-deck');
        }
    };
    
    if (chanceDeck) chanceDeck.addEventListener('click', clickHandler);
    if (chestDeck) chestDeck.addEventListener('click', clickHandler);
});

socket.on('cardDrawn', (data) => {
    // Show the card temporarily in the center of the board
    let display = document.getElementById('card-display-overlay');
    if (!display) {
        display = document.createElement('div');
        display.id = 'card-display-overlay';
        display.style.position = 'absolute';
        display.style.top = '50%';
        display.style.left = '50%';
        display.style.transform = 'translate(-50%, -50%) scale(0.5)';
        display.style.width = '260px';
        display.style.height = '160px';
        display.style.background = 'white';
        display.style.border = '4px solid #0f172a';
        display.style.borderRadius = '16px';
        display.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        display.style.display = 'flex';
        display.style.alignItems = 'center';
        display.style.justifyContent = 'center';
        display.style.padding = '20px';
        display.style.textAlign = 'center';
        display.style.fontSize = '1.2rem';
        display.style.fontWeight = 'bold';
        display.style.color = '#0f172a';
        display.style.zIndex = '1000';
        display.style.opacity = '0';
        display.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        display.style.pointerEvents = 'none'; // click through
        document.querySelector('.board').appendChild(display);
    }
    
    display.textContent = data.text;
    
    // Animate in
    setTimeout(() => {
        display.style.opacity = '1';
        display.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 50);
    
    // Animate out
    setTimeout(() => {
        display.style.opacity = '0';
        display.style.transform = 'translate(-50%, -50%) scale(0.5)';
    }, 3000);
});

// Add CSS for glowing deck
const style = document.createElement('style');
style.textContent = `
    .glow-deck {
        box-shadow: 0 0 20px 10px rgba(239, 68, 68, 0.6) !important;
        transform: scale(1.05);
        cursor: pointer;
        z-index: 50;
    }
    .chest-deck.glow-deck {
        box-shadow: 0 0 20px 10px rgba(59, 130, 246, 0.6) !important;
    }
    .deck { transition: all 0.2s; }
`;
document.head.appendChild(style);

window.promptEditName = async function() { const { value: name } = await Swal.fire({ title: 'Edit Name', input: 'text', inputLabel: 'Enter new name', inputValue: currentGameState && currentGameState.players[myUuid] ? currentGameState.players[myUuid].username : '', showCancelButton: true, confirmButtonColor: '#2563eb', background: '#ffffff', color: '#0f172a', customClass: { popup: 'glass-panel' } }); if (name) window.socket.emit('editName', name); };






const quitLobbyBtn = document.getElementById('quit-lobby-btn');
if (quitLobbyBtn) {
    quitLobbyBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Quit to Lobby?',
            text: 'This will end the current game and reset all progress!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reset Game',
            confirmButtonColor: '#ef4444',
            background: '#ffffff',
            color: '#0f172a',
            customClass: { popup: 'glass-panel' }
        }).then(res => {
            if (res.isConfirmed) {
                socket.emit('quitToLobby');
            }
        });
    });
}





document.addEventListener('DOMContentLoaded', () => {
    const rBtn = document.getElementById('roll-btn');
    if (rBtn) {
        rBtn.addEventListener('click', () => {
            if (window.socket) window.socket.emit('rollDice');
        });
    }

    const payJailBtn = document.getElementById('pay-jail-btn');
    if (payJailBtn) {
        payJailBtn.addEventListener('click', () => {
            if (window.socket) window.socket.emit('payJailFine');
        });
    }

    const useJailCardBtn = document.getElementById('use-jail-card-btn');
    if (useJailCardBtn) {
        useJailCardBtn.addEventListener('click', () => {
            if (window.socket) window.socket.emit('useJailCard');
        });
    }
});
