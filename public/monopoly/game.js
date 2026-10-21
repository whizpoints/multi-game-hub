

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
    'Brown': '#78350f',
    'LightBlue': '#38bdf8',
    'Pink': '#f472b6',
    'Orange': '#fb923c',
    'Red': '#ef4444',
    'Yellow': '#facc15',
    'Green': '#16a34a',
    'DarkBlue': '#1d4ed8'
};

const propertyThemes = {
    'Brown': { bg: '#78350f', text: '#ffffff', price: '#fef08a', border: '#451a03', shadow: '0 1px 2px rgba(0,0,0,0.7)' },
    'LightBlue': { bg: '#38bdf8', text: '#0f172a', price: '#0f172a', border: '#0284c7', shadow: 'none' },
    'Pink': { bg: '#f472b6', text: '#0f172a', price: '#0f172a', border: '#db2777', shadow: 'none' },
    'Orange': { bg: '#fb923c', text: '#0f172a', price: '#0f172a', border: '#ea580c', shadow: 'none' },
    'Red': { bg: '#ef4444', text: '#ffffff', price: '#fef08a', border: '#b91c1c', shadow: '0 1px 2px rgba(0,0,0,0.6)' },
    'Yellow': { bg: '#facc15', text: '#0f172a', price: '#0f172a', border: '#ca8a04', shadow: 'none' },
    'Green': { bg: '#16a34a', text: '#ffffff', price: '#fef08a', border: '#15803d', shadow: '0 1px 2px rgba(0,0,0,0.6)' },
    'DarkBlue': { bg: '#1d4ed8', text: '#ffffff', price: '#fef08a', border: '#1e40af', shadow: '0 1px 2px rgba(0,0,0,0.7)' }
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
        const orientation = getOrientation(index);
        el.id = `tile-${index}`;
        el.style.gridArea = getGridArea(index);
        
        let html = '';
        if (tile.type === 'property' && tile.color && propertyThemes[tile.color]) {
            const theme = propertyThemes[tile.color];
            el.className = `tile property-tile ${orientation}`;
            el.style.backgroundColor = theme.bg;
            el.style.borderColor = theme.border;
            html += `<div class="name" style="color: ${theme.text}; text-shadow: ${theme.shadow}; font-weight: 900;">${tile.name}</div>`;
            html += `<div class="price" style="color: ${theme.price}; font-weight: 800;">$${tile.price}</div>`;
        } else {
            el.className = `tile ${orientation}`;
            // Exact Corner & Special Tile Designs
            if (tile.type === 'go') {
                html += `
                    <div style="font-size: 2.2rem; font-weight: 900; line-height: 1; letter-spacing: -1px;">GO</div>
                    <div style="color: #ef4444; margin: -5px 0;"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg></div>
                    <div style="font-size: 0.5rem; text-align: center; font-weight: 800; line-height: 1.2;">COLLECT $2000<br>AS YOU PASS</div>
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
                html += `<div class="name">${tile.name}</div>`;
                
                let icon = '';
                if (tile.type === 'station') icon = '<img src="vectors/airport-14-svgrepo-com.svg" width="24" height="24" />';
                else if (tile.type === 'utility' && tile.name.toLowerCase().includes('power')) icon = '<img src="vectors/solar-power-svgrepo-com.svg" width="24" height="24" />';
                else if (tile.type === 'utility') icon = '<img src="vectors/waterworks.svg" width="24" height="24" />';
                else if (tile.type === 'chest') icon = '<img src="vectors/treasure_chest_ultra_clear.svg" width="32" height="32" />';
                else if (tile.type === 'chance') icon = '<img src="vectors/red-question-mark-svgrepo-com.svg" width="24" height="24" />';
                else if (tile.type === 'tax') icon = '<img src="vectors/cash-svgrepo-com.svg" width="24" height="24" />';

                if (icon) html += `<div class="icon" style="margin-top: 5px;">${icon}</div>`;
                if (tile.type === 'tax') {
                    html += `<div class="price">PAY $${tile.amount || 1000}</div>`;
                }
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
let isAnimatingHops = false;
let visualPositions = {};
const stateQueue = [];
let isProcessingQueue = false;
let diceAnimationPromise = Promise.resolve();

let myUuid = localStorage.getItem('monopoly_uuid');
if (!myUuid) {
    myUuid = 'u_' + (window.crypto && crypto.randomUUID ? crypto.randomUUID().substring(0, 8) : Math.floor(Math.random() * 1000000));
    localStorage.setItem('monopoly_uuid', myUuid);
}

let myUsername = localStorage.getItem('monopoly_username') || localStorage.getItem('ludoName');
let myDbId = localStorage.getItem('monopoly_dbId') || localStorage.getItem('ludoDbId');

async function ensureUserProfile() {
    if (!myUsername) {
        window.showUserSelectionModal(true);
        return;
    }
    socket.emit('joinGame', { uuid: myUuid, username: myUsername, dbId: myDbId });
}

window.logoutUser = function() {
    localStorage.removeItem('monopoly_username');
    localStorage.removeItem('monopoly_dbId');
    localStorage.removeItem('ludoName');
    localStorage.removeItem('ludoDbId');
    myUsername = null;
    myDbId = null;
    window.showUserSelectionModal(true);
};

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
const add2BotsBtn = document.getElementById('add-2-bots-btn');
const addLocalBtn = document.getElementById('add-local-btn');
const startGameBtn = document.getElementById('start-game-btn');
const logoutBtn = document.getElementById('logout-btn');

if (addBotBtn) addBotBtn.addEventListener('click', () => socket.emit('addBot'));
if (add2BotsBtn) add2BotsBtn.addEventListener('click', () => socket.emit('addTwoBots'));
if (addLocalBtn) addLocalBtn.addEventListener('click', () => window.showAddLocalPlayerModal());
if (logoutBtn) logoutBtn.addEventListener('click', () => window.logoutUser());
if (startGameBtn) startGameBtn.addEventListener('click', () => socket.emit('startGame'));
window.showUserSelectionModal = async function() {
    try {
        const res = await fetch('/api/players');
        const players = await res.json();
        
        let html = `
        <div style="max-height: 320px; overflow-y: auto; text-align: left; margin-bottom: 16px; background: #f8fafc; border-radius: 12px; padding: 10px; border: 1px solid #e2e8f0;">
          <div style="display: grid; gap: 8px;">
        `;
        
        players.forEach(p => {
            const isMe = (p.name === myUsername);
            let classColor = '#64748b';
            if (p.rankClass === 'S++') classColor = '#ef4444';
            else if (p.rankClass === 'S') classColor = '#f59e0b';
            else if (p.rankClass === 'A') classColor = '#10b981';
            else if (p.rankClass === 'B') classColor = '#2563eb';
            else if (p.rankClass === 'C') classColor = '#64748b';

            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 14px; border-radius: 10px; border: 1px solid ${isMe ? '#2563eb' : '#e2e8f0'}; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-weight: 800; font-size: 1rem; color: #0f172a;">${p.name} ${isMe ? '<span style="color:#2563eb; font-size:0.75rem;">(Current)</span>' : ''}</span>
                  <span style="font-size: 0.75rem; color: #64748b;">Wins: ${p.gamesWon} • Class: <span style="color: ${classColor}; font-weight: 800;">${p.rankClass}</span></span>
                </div>
                <div>
                  ${isMe ? `<span style="font-size:0.8rem; font-weight:700; color:#10b981;">Active</span>` : `<button class="glass-btn" style="padding: 5px 12px; font-size: 0.8rem; background: #2563eb; color: #fff;" onclick="window.selectMyAccount('${p.name}', ${p.id})">Select</button>`}
                </div>
              </div>
            `;
        });
        
        html += `</div></div>`;
        html += `<h4 style="margin-bottom: 8px; font-size: 0.95rem; text-align: left; color: #0f172a; font-weight: 800;">Or Register New Player Profile:</h4>`;
        html += `<input type="text" id="new-profile-name" class="swal2-input glass-input" placeholder="Enter player callsign / name" style="max-width: 100%; margin: 0; width: 100%; box-sizing: border-box; font-size: 0.95rem; background: #ffffff; color: #0f172a; border: 2px solid #0284c7; padding: 10px 14px; border-radius: 8px; font-weight: 700;">`;

        window.selectMyAccount = (name, dbId) => {
            Swal.close();
            myUsername = name;
            myDbId = dbId;
            localStorage.setItem('monopoly_username', name);
            localStorage.setItem('monopoly_dbId', dbId);
            localStorage.setItem('ludoName', name);
            if (dbId) localStorage.setItem('ludoDbId', dbId);
            socket.emit('editName', { name, dbId });
            Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, title: `Playing as ${name}`, icon: 'success' });
        };

        Swal.fire({
            title: 'Select Your Profile',
            html: html,
            showCancelButton: true,
            confirmButtonText: 'Register & Play',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'glass-panel' },
            preConfirm: () => {
                const name = document.getElementById('new-profile-name').value.trim();
                if (!name) {
                    Swal.showValidationMessage('Please select a profile above or enter a new name');
                    return false;
                }
                return name;
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                try {
                    const regRes = await fetch('/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: result.value })
                    });
                    const data = await regRes.json();
                    if (!regRes.ok) return Swal.fire('Notice', data.error || 'Registration failed', 'warning');
                    window.selectMyAccount(data.name, data.id);
                } catch (e) {
                    Swal.fire('Error', 'Server connection error', 'error');
                }
            }
        });
    } catch (e) {
        Swal.fire('Error', 'Could not load player profiles', 'error');
    }
};

window.showAddLocalPlayerModal = async function() {
    try {
        const res = await fetch('/api/players');
        const players = await res.json();
        
        let html = `
        <div style="max-height: 320px; overflow-y: auto; text-align: left; margin-bottom: 16px; background: #f8fafc; border-radius: 12px; padding: 10px; border: 1px solid #e2e8f0;">
          <div style="display: grid; gap: 8px;">
        `;
        
        players.forEach(p => {
            let classColor = '#64748b';
            if (p.rankClass === 'S++') classColor = '#ef4444';
            else if (p.rankClass === 'S') classColor = '#f59e0b';
            else if (p.rankClass === 'A') classColor = '#10b981';
            else if (p.rankClass === 'B') classColor = '#2563eb';
            else if (p.rankClass === 'C') classColor = '#64748b';

            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-weight: 800; font-size: 1rem; color: #0f172a;">${p.name}</span>
                  <span style="font-size: 0.75rem; color: #64748b;">Wins: ${p.gamesWon} • Class: <span style="color: ${classColor}; font-weight: 800;">${p.rankClass}</span></span>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button class="glass-btn" style="padding: 5px 12px; font-size: 0.8rem; background: #16a34a; color: #fff;" onclick="window.selectLocalPlayer(${p.id}, '${p.name}')">Add</button>
                  <button class="glass-btn" style="padding: 5px 10px; font-size: 0.8rem; background: #ef4444; color: #fff;" onclick="window.deletePlayer(${p.id}, '${p.name}', event)">🗑</button>
                </div>
              </div>
            `;
        });
        
        html += `</div></div>`;
        html += `<h4 style="margin-bottom: 8px; font-size: 0.95rem; text-align: left; color: #0f172a; font-weight: 800;">Or Register New Operative:</h4>`;
        html += `<input type="text" id="new-local-name" class="swal2-input glass-input" placeholder="Enter player callsign / name" style="max-width: 100%; margin: 0; width: 100%; box-sizing: border-box; font-size: 0.95rem; background: #ffffff; color: #0f172a; border: 2px solid #0284c7; padding: 10px 14px; border-radius: 8px; font-weight: 700;">`;

        window.selectLocalPlayer = (dbId, name) => {
            Swal.close();
            socket.emit('addLocalPlayer', { name, dbId });
        };

        window.deletePlayer = async (dbId, name, e) => {
            e.stopPropagation();
            const conf = await Swal.fire({
                title: 'Delete Player?',
                text: `Are you sure you want to delete "${name}" permanently?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Delete',
                confirmButtonColor: '#ef4444'
            });
            if (conf.isConfirmed) {
                try {
                    await fetch(`/api/players/${dbId}`, { method: 'DELETE' });
                    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, title: 'Player deleted', icon: 'success' });
                    setTimeout(() => window.showAddLocalPlayerModal(), 300);
                } catch (err) {
                    Swal.fire('Error', 'Failed to delete player', 'error');
                }
            }
        };

        Swal.fire({
            title: 'Add Combatant to Squad',
            html: html,
            showCancelButton: true,
            confirmButtonText: 'Create & Add',
            confirmButtonColor: '#0284c7',
            cancelButtonText: 'Cancel',
            cancelButtonColor: '#64748b',
            customClass: { popup: 'swal-high-contrast-modal' },
            preConfirm: () => {
                const name = document.getElementById('new-local-name').value.trim();
                if (!name) {
                    Swal.showValidationMessage('Please enter a new name or select an existing player above');
                    return false;
                }
                return name;
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                try {
                    const regRes = await fetch('/api/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: result.value })
                    });
                    const data = await regRes.json();
                    if (!regRes.ok) return Swal.fire('Notice', data.error || 'Registration failed', 'warning');
                    socket.emit('addLocalPlayer', { name: data.name, dbId: data.id });
                } catch (e) {
                    Swal.fire('Error', 'Server connection error', 'error');
                }
            }
        });
    } catch (e) {
        Swal.fire('Error', 'Could not load player profiles', 'error');
    }
};

window.promptEditName = function() {
    window.showUserSelectionModal();
};

// Safely initialize user profile and trade controls after modals are registered
ensureUserProfile();
setTimeout(() => { if (typeof initTradeModal === 'function') initTradeModal(); }, 100);

function renderPlayersList(state) {
    const list = document.getElementById('players-list');
    if (list) {
        list.innerHTML = '';
        
        state.turnOrder.forEach((uuid, idx) => {
            const player = state.players[uuid];
            if (!player) return;
            
            const isMyTurn = (state.currentTurnIndex === idx);
            const isYou = (uuid === myUuid);
            
            // Clean, light-themed player row matching modern Flutter glassmorphism UI
            const html = `
            <div class="player-card ${isMyTurn ? 'active-turn' : ''}" data-uuid="${uuid}" style="position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; margin-bottom: 5px; border-radius: 9px; min-height: 38px; ${isMyTurn ? 'border: 2px solid #0284c7; background: #f0f9ff; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.22);' : 'border: 1.5px solid #e2e8f0; background: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.04);'};">
                <div style="width: 4px; background: ${player.color}; position: absolute; left: 0; top: 0; bottom: 0; border-radius: 9px 0 0 9px;"></div>
                
                <!-- Operative Symbol + Username (without irrelevant WAIT/BOT/PRO badges to maximize name space) -->
                <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; padding-left: 2px; flex: 1;">
                    <span class="player-token-icon" style="width: 22px; height: 22px; min-width: 22px; max-width: 22px; border-radius: 50%; border: 1.5px solid ${player.color}; color: ${player.color}; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;">${player.symbol || '🎩'}</span>
                    <span style="font-weight: 800; font-size: 0.88rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 145px;" title="${player.username}">${player.username}</span>
                    ${isYou ? '<span style="color:#0284c7; font-size:0.72rem; font-weight:800; flex-shrink:0;">(You)</span>' : ''}
                    ${player.inJail ? '<span style="font-size: 0.62rem; font-weight: 800; color: #ef4444; background: #fee2e2; border: 1px solid #f87171; padding: 1px 4px; border-radius: 4px; flex-shrink: 0;">JAIL</span>' : ''}
                </div>

                <!-- Cash + Lobby Quick Controls -->
                <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                    <span style="font-size: 0.95rem; font-weight: 900; color: #16a34a; letter-spacing: 0.3px;">$${Math.round(player.cash).toLocaleString()}</span>
                    ${state.status === 'LOBBY' && uuid === myUuid ? `<button onclick="window.promptEditName()" style="background: #e0f2fe; border: 1px solid #38bdf8; color: #0284c7; font-size: 0.72rem; cursor: pointer; padding: 2px 6px; border-radius: 4px; font-weight: 700;" title="Edit Name">✎</button>` : ''}
                    ${state.status === 'LOBBY' && uuid !== myUuid ? `<button onclick="window.socket.emit('removePlayer', '${uuid}')" style="background: #fee2e2; border: 1px solid #f87171; color: #dc2626; font-size: 0.75rem; cursor: pointer; padding: 2px 6px; border-radius: 4px; font-weight: 700;" title="Remove Player">&times;</button>` : ''}
                </div>
            </div>
            `;
            
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            list.appendChild(wrapper.firstElementChild);
        });
        
        // If in lobby and we're the host, append an 'Empty Slot' button at the bottom of the list
        if (state.status === 'LOBBY' && state.turnOrder.length < 8) {
            const addHtml = `
            <div class="player-card" style="border: 1.5px dashed rgba(255,255,255,0.2); background: rgba(255,255,255,0.02); cursor: pointer; display: flex; justify-content: center; align-items: center; padding: 6px; border-radius: 8px; min-height: 32px;" onclick="window.showAddLocalPlayerModal()">
                <span style="font-weight: 800; font-size: 0.72rem; color: #38bdf8; text-transform: uppercase;">+ Add Local Player</span>
            </div>
            `;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = addHtml;
            list.appendChild(wrapper.firstElementChild);
        }
    }

    // Also update the full PUBG Squad Ready Room overlay
    renderPubgLobbyOverlay(state);
}

function renderPubgLobbyOverlay(state) {
    const overlay = document.getElementById('monopoly-pubg-lobby-overlay');
    if (!overlay) return;

    if (state.status !== 'LOBBY') {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
        return;
    }

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';

    // Update player count display
    const countEl = document.getElementById('monopoly-lobby-player-count');
    if (countEl) countEl.textContent = state.turnOrder.length;

    // Update Wi-Fi Link input
    const shareInput = document.getElementById('monopoly-lobby-share-input');
    if (shareInput) {
        shareInput.value = window.location.origin + '/monopoly';
    }

    const copyBtn = document.getElementById('monopoly-lobby-copy-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(shareInput.value).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
            });
        };
    }

    // Deploy Button / Host Waiting Message
    const deployBtn = document.getElementById('monopoly-deploy-btn');
    const waitingMsg = document.getElementById('monopoly-lobby-waiting-msg');
    const isHost = (state.host === myUuid);

    if (deployBtn && waitingMsg) {
        if (isHost) {
            deployBtn.style.display = 'block';
            waitingMsg.style.display = 'none';
            deployBtn.onclick = () => {
                if (window.SoundFX && window.SoundFX.rollDice) window.SoundFX.rollDice();
                document.getElementById('start-game-btn')?.click();
            };
        } else {
            deployBtn.style.display = 'none';
            waitingMsg.style.display = 'block';
        }
    }

    // Wire up quick add buttons
    const addBotBtn = document.getElementById('lobby-modal-add-bot');
    const add2BotsBtn = document.getElementById('lobby-modal-add-2-bots');
    const addLocalBtn = document.getElementById('lobby-modal-add-local');

    if (addBotBtn) addBotBtn.onclick = () => { window.socket.emit('addBot'); };
    if (add2BotsBtn) add2BotsBtn.onclick = () => { window.socket.emit('addTwoBots'); };
    if (addLocalBtn) addLocalBtn.onclick = () => { window.showAddLocalPlayerModal(); };

    // Render 8 Operative Squad Grid
    const grid = document.getElementById('monopoly-pubg-squad-grid');
    if (!grid) return;
    grid.innerHTML = '';

    state.turnOrder.forEach((uuid, idx) => {
        const player = state.players[uuid];
        if (!player) return;

        const isYou = (uuid === myUuid);
        const isPlayerHost = (state.host === uuid);
        const tierName = player.tier || 'PLATINUM';
        const tierIcon = player.tierIcon || '🛡️';
        const tierColor = player.tierColor || '#10b981';
        const tierClass = player.tierClass || 'tier-platinum';
        const scoreVal = player.score ? Number(player.score).toLocaleString() : '1,500';
        const winRateVal = player.winRate ?? 50;
        const levelNum = Math.min(99, Math.max(14, Math.round((player.score || 500) / 45)));

        const card = document.createElement('div');
        card.style.cssText = `
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            border-radius: 16px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            position: relative;
            box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
            text-align: left;
            color: #0f172a;
        `;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-family: 'Rajdhani', sans-serif; font-size: 0.72rem; font-weight: 800; letter-spacing: 1px; padding: 2px 7px; border-radius: 6px; background: ${tierColor}18; color: ${tierColor}; border: 1px solid ${tierColor}66;">
                    ${tierIcon} ${tierName}
                </span>
                ${isPlayerHost ? `<span style="font-size: 0.65rem; font-weight: 900; color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 999px;">★ SQUAD LEADER</span>` : ''}
            </div>

            <div style="display: flex; align-items: center; justify-content: center; position: relative; margin: 4px 0 8px;">
                <div style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid ${player.color}; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; background: #f8fafc; box-shadow: 0 4px 12px rgba(0,0,0,0.06); overflow: hidden;">
                    <span class="player-token-icon" style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">${player.symbol || '🎩'}</span>
                </div>
                <span style="position: absolute; bottom: -6px; background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.2); color: #e2e8f0; font-family: monospace; font-size: 0.62rem; font-weight: 800; padding: 1px 5px; border-radius: 4px;">LV. ${levelNum}</span>
            </div>

            <div>
                <div style="font-family: 'Rajdhani', sans-serif; font-size: 1.15rem; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${player.username} ${isYou ? '<span style="color:#0284c7; font-size:0.75rem;">(You)</span>' : ''}
                </div>

                <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 4px;">
                    ${player.verified ? `<span style="background: #e0f2fe; border: 1px solid #38bdf8; color: #0284c7; padding: 2px 7px; border-radius: 999px; font-size: 0.62rem; font-weight: 900;">✓ VERIFIED PRO</span>` : ''}
                    ${player.isBot ? `<span style="background: #f3e8ff; border: 1px solid #c084fc; color: #7e22ce; padding: 2px 7px; border-radius: 999px; font-size: 0.62rem; font-weight: 800;">🤖 AI • ${player.botTrait || 'TYCOON'}</span>` : ''}
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 5px 8px; border-radius: 6px; font-size: 0.72rem; color: #334155; font-weight: 700;">
                <span style="color: #16a34a; font-weight: 900;">💰 $${Math.round(player.cash).toLocaleString()}</span>
                <span>⭐ ${scoreVal} RP</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: auto;">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 900; color: #16a34a;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #16a34a; box-shadow: 0 0 6px #16a34a;"></span>
                    <span>READY</span>
                </div>
                <div>
                    ${state.status === 'LOBBY' && uuid === myUuid ? `<button onclick="window.promptEditName()" style="background: #e0f2fe; border: 1px solid #38bdf8; color: #0284c7; font-size: 0.72rem; padding: 3px 8px; border-radius: 6px; cursor: pointer; font-weight: 700;">✎ Edit</button>` : ''}
                    ${state.status === 'LOBBY' && (isHost || uuid === myUuid) && !isPlayerHost ? `<button onclick="window.socket.emit('removePlayer', '${uuid}')" style="background: #fee2e2; border: 1px solid #f87171; color: #dc2626; font-size: 0.72rem; padding: 3px 8px; border-radius: 6px; cursor: pointer; font-weight: 700; margin-left: 4px;">✕ Kick</button>` : ''}
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    // Render Vacant Holographic Slots (up to 8)
    const emptySlotsCount = 8 - state.turnOrder.length;
    for (let i = 0; i < emptySlotsCount; i++) {
        const slotIdx = state.turnOrder.length + i + 1;
        const emptyCard = document.createElement('div');
        emptyCard.style.cssText = `
            background: rgba(248, 250, 252, 0.85);
            border: 2px dashed #cbd5e1;
            border-radius: 16px;
            padding: 18px 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-height: 230px;
            text-align: center;
        `;

        emptyCard.innerHTML = `
            <div style="font-family: 'Rajdhani', sans-serif; font-size: 0.75rem; font-weight: 800; letter-spacing: 2px; color: #64748b;">
                OPERATIVE 0${slotIdx}
            </div>
            <div style="width: 48px; height: 48px; border-radius: 50%; border: 1.5px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 1.4rem; background: #ffffff;">
                ＋
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                <button onclick="window.showAddLocalPlayerModal()" style="background: linear-gradient(135deg, #0284c7, #0369a1); border: 1px solid #38bdf8; color: #ffffff; font-family: 'Rajdhani', sans-serif; font-weight: 800; font-size: 0.78rem; letter-spacing: 1px; padding: 7px 10px; border-radius: 8px; cursor: pointer; text-transform: uppercase; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);">
                    + Local Operative
                </button>
                <button onclick="window.socket.emit('addBot')" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); border: 1px solid #a78bfa; color: #ffffff; font-family: 'Rajdhani', sans-serif; font-weight: 800; font-size: 0.78rem; letter-spacing: 1px; padding: 7px 10px; border-radius: 8px; cursor: pointer; text-transform: uppercase; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);">
                    + AI Bot 🤖
                </button>
            </div>
        `;

        grid.appendChild(emptyCard);
    }
}
function showPropertyDetails(tile) {
    if (!tile) return;
    const propertyDetails = document.getElementById('property-details');
    const placeholderText = document.querySelector('.placeholder-text');
    if (!propertyDetails || !placeholderText) return;

    const idx = boardData.indexOf(tile);
    window.currentViewedTileIndex = idx;
    
    placeholderText.style.display = 'none';
    propertyDetails.classList.remove('hidden');
    
    document.getElementById('pc-name').textContent = tile.name;
    const hex = neonColors[tile.color] || '#94a3b8';
    document.getElementById('pc-header').style.background = hex;
    
    document.getElementById('pc-price').textContent = tile.price ? '$' + Math.round(tile.price) : '-';
    document.getElementById('pc-house-cost').textContent = tile.houseCost ? '$' + Math.round(tile.houseCost) : '-';
    document.getElementById('pc-mortgage').textContent = tile.mortgageValue ? '$' + Math.round(tile.mortgageValue) : '-';
    document.getElementById('pc-unmortgage').textContent = tile.unmortgageCost ? '$' + Math.round(tile.unmortgageCost) : '-';
    
    const buyHouseBtn = document.getElementById('buy-house-btn');
    const sellHouseBtn = document.getElementById('sell-house-btn');
    const mortgageBtn = document.getElementById('mortgage-btn');
    const unmortgageBtn = document.getElementById('unmortgage-btn');
    const ownerTag = document.getElementById('pc-owner-tag');
    const buyGroup = document.getElementById('pc-buy-group');
    const pcBtnBuy = document.getElementById('pc-btn-buy');
    const pcBtnPass = document.getElementById('pc-btn-pass');
    
    if (buyHouseBtn) buyHouseBtn.style.display = 'none';
    if (sellHouseBtn) sellHouseBtn.style.display = 'none';
    if (mortgageBtn) mortgageBtn.style.display = 'none';
    if (unmortgageBtn) unmortgageBtn.style.display = 'none';
    if (buyGroup) buyGroup.style.display = 'none';
    
    document.querySelectorAll('.pc-row').forEach(r => r.classList.remove('active-rent-row'));
    
    const state = window.currentGameStateObj;
    const currentTurnUuid = state && state.turnOrder ? state.turnOrder[state.currentTurnIndex] : null;
    const currentPlayer = state && state.players ? state.players[currentTurnUuid] : null;
    const isMe = (currentTurnUuid === myUuid);
    const isMyLocal = (state && state.host === myUuid && currentPlayer && currentPlayer.isLocal);
    const activePlayer = isMe ? (state ? state.players[myUuid] : null) : (isMyLocal ? currentPlayer : null);
    
    const prop = state && state.properties ? state.properties[idx] : null;
    const owner = prop && state && state.players ? state.players[prop.owner] : null;
    
    if (ownerTag) {
        if (prop && owner) {
            ownerTag.textContent = `Owned by ${owner.username}` + (prop.mortgaged ? ' (Mortgaged)' : '');
            ownerTag.style.color = owner.color || '#0f172a';
        } else {
            ownerTag.textContent = 'Unowned (Bank)';
            ownerTag.style.color = '#64748b';
        }
    }

    // Direct On-Card BUY / AUCTION Action
    if (buyGroup && activePlayer && activePlayer.pendingAction && activePlayer.pendingAction.type === 'buy' && activePlayer.pendingAction.tileIndex === idx) {
        const pAction = activePlayer.pendingAction;
        buyGroup.style.display = 'flex';
        const priceVal = Math.round(pAction.price || tile.price || 0);
        const buyPriceSpan = document.getElementById('pc-buy-price');
        if (buyPriceSpan) buyPriceSpan.textContent = priceVal;

        if (pcBtnBuy) {
            const canAfford = activePlayer.cash >= priceVal;
            const diff = priceVal - Math.round(activePlayer.cash);
            pcBtnBuy.disabled = false;
            pcBtnBuy.style.opacity = canAfford ? '1' : '0.85';
            pcBtnBuy.style.background = canAfford ? '#16a34a' : '#d97706';
            pcBtnBuy.textContent = canAfford ? `BUY PROPERTY ($${priceVal})` : `NEED $${diff} MORE (MORTGAGE)`;
            pcBtnBuy.onclick = () => {
                if (!canAfford) {
                    Swal.fire({
                        title: 'Insufficient Cash',
                        html: `You need <strong>$${diff}</strong> more cash to buy <strong>${tile.name}</strong>.<br><br>Click any of your properties on the board or sidebar to mortgage them for instant cash!`,
                        icon: 'info',
                        confirmButtonText: 'Got It',
                        confirmButtonColor: '#2563eb',
                        customClass: { popup: 'glass-panel' }
                    });
                    return;
                }
                if (window.isPromptingBuy) {
                    Swal.close();
                    window.isPromptingBuy = false;
                }
                if (window.SoundFX && window.SoundFX.cash) window.SoundFX.cash();
                socket.emit('buyProperty', true);
                buyGroup.style.display = 'none';
            };
        }
        if (pcBtnPass) {
            pcBtnPass.onclick = () => {
                if (window.isPromptingBuy) {
                    Swal.close();
                    window.isPromptingBuy = false;
                }
                socket.emit('buyProperty', false);
                buyGroup.style.display = 'none';
            };
        }
    }

    let ownsMonopoly = false;
    if (tile.type === 'property' && tile.color && prop && prop.owner) {
        const sameColorTiles = boardData.filter(t => t.color === tile.color);
        ownsMonopoly = sameColorTiles.every(t => {
            const tIdx = boardData.indexOf(t);
            const p = state.properties[tIdx];
            return p && p.owner === prop.owner && !p.mortgaged;
        });
    }

    if (tile.rent) {
        if (tile.type === 'property') {
            document.getElementById('pc-houses-container').classList.remove('hidden');
            document.getElementById('pc-h1').textContent = '$' + tile.rent.house1;
            document.getElementById('pc-h2').textContent = '$' + tile.rent.house2;
            document.getElementById('pc-h3').textContent = '$' + tile.rent.house3;
            document.getElementById('pc-h4').textContent = '$' + tile.rent.house4;
            document.getElementById('pc-hotel').textContent = '$' + tile.rent.hotel;

            const baseRent = tile.rent.base || 0;
            const rentValEl = document.getElementById('pc-rent');
            if (ownsMonopoly && (!prop || prop.houses === 0)) {
                rentValEl.innerHTML = `$${baseRent * 2} <span style="font-size: 0.65rem; color: #16a34a; font-weight: 800;">(Doubled - Set Owned!)</span>`;
            } else {
                rentValEl.textContent = '$' + baseRent;
            }

            if (prop && !prop.mortgaged) {
                if (prop.houses === 0) document.getElementById('pc-row-base')?.classList.add('active-rent-row');
                else if (prop.houses === 1) document.getElementById('pc-row-h1')?.classList.add('active-rent-row');
                else if (prop.houses === 2) document.getElementById('pc-row-h2')?.classList.add('active-rent-row');
                else if (prop.houses === 3) document.getElementById('pc-row-h3')?.classList.add('active-rent-row');
                else if (prop.houses === 4) document.getElementById('pc-row-h4')?.classList.add('active-rent-row');
                else if (prop.houses === 5) document.getElementById('pc-row-hotel')?.classList.add('active-rent-row');
            }
        } else {
            document.getElementById('pc-houses-container').classList.add('hidden');
            if (tile.type === 'station') {
                let ownedStations = 0;
                if (prop && prop.owner) {
                    ownedStations = boardData.filter((t, i) => t.type === 'station' && state.properties[i] && state.properties[i].owner === prop.owner && !state.properties[i].mortgaged).length;
                }
                document.getElementById('pc-rent').innerHTML = `
                    <div class="${ownedStations === 1 ? 'active-rent-row' : ''}">1 Station: $250</div>
                    <div class="${ownedStations === 2 ? 'active-rent-row' : ''}">2 Stations: $500</div>
                    <div class="${ownedStations === 3 ? 'active-rent-row' : ''}">3 Stations: $1,000</div>
                    <div class="${ownedStations >= 4 ? 'active-rent-row' : ''}">4 Stations: $2,000</div>
                `;
            } else if (tile.type === 'utility') {
                let ownedUtilities = 0;
                if (prop && prop.owner) {
                    ownedUtilities = boardData.filter((t, i) => t.type === 'utility' && state.properties[i] && state.properties[i].owner === prop.owner && !state.properties[i].mortgaged).length;
                }
                document.getElementById('pc-rent').innerHTML = `
                    <div class="${ownedUtilities === 1 ? 'active-rent-row' : ''}">1 Utility: 40x Dice Roll</div>
                    <div class="${ownedUtilities >= 2 ? 'active-rent-row' : ''}">2 Utilities: 100x Dice Roll</div>
                `;
            }
        }

        if (state && prop) {
            const pAuth = state.players[prop.owner];
            const isOwner = (prop.owner === myUuid || (pAuth && pAuth.isLocal && pAuth.hostId === myUuid));
            
            if (isOwner) {
                if (prop.mortgaged) {
                    if (unmortgageBtn) {
                        unmortgageBtn.style.display = 'block';
                        unmortgageBtn.textContent = 'UNMORTGAGE ($' + Math.round(tile.unmortgageCost) + ')';
                        unmortgageBtn.onclick = () => socket.emit('unmortgageProperty', idx);
                    }
                } else {
                    if (tile.type === 'property' && prop.houses < 5 && ownsMonopoly) {
                        const sameColorTiles = boardData.filter(t => t.color === tile.color);
                        const houseCounts = sameColorTiles.map(t => state.properties[boardData.indexOf(t)]?.houses || 0);
                        const minHouses = Math.min(...houseCounts);
                        const canBuildEvenly = (prop.houses || 0) === minHouses;

                        if (buyHouseBtn) {
                            buyHouseBtn.style.display = 'block';
                            buyHouseBtn.textContent = (prop.houses === 4 ? 'BUILD HOTEL ($' : 'UPGRADE ($') + (tile.houseCost || 50) + ')';
                            if (!canBuildEvenly) {
                                buyHouseBtn.disabled = true;
                                buyHouseBtn.style.opacity = '0.5';
                                buyHouseBtn.title = 'Even Building Rule: Upgrade other properties in this set first!';
                            } else {
                                buyHouseBtn.disabled = false;
                                buyHouseBtn.style.opacity = '1';
                                buyHouseBtn.title = '';
                            }
                            buyHouseBtn.onclick = () => socket.emit('buyHouse', idx);
                        }
                    }
                    if (tile.type === 'property' && prop.houses > 0) {
                        const sameColorTiles = boardData.filter(t => t.color === tile.color);
                        const houseCounts = sameColorTiles.map(t => state.properties[boardData.indexOf(t)]?.houses || 0);
                        const maxHouses = Math.max(...houseCounts);
                        const canSellEvenly = (prop.houses || 0) === maxHouses;

                        if (sellHouseBtn) {
                            sellHouseBtn.style.display = 'block';
                            sellHouseBtn.textContent = 'SELL (+$' + Math.floor((tile.houseCost || 50)/2) + ')';
                            if (!canSellEvenly) {
                                sellHouseBtn.disabled = true;
                                sellHouseBtn.style.opacity = '0.5';
                                sellHouseBtn.title = 'Even Selling Rule: Sell houses from other properties in this set first!';
                            } else {
                                sellHouseBtn.disabled = false;
                                sellHouseBtn.style.opacity = '1';
                                sellHouseBtn.title = '';
                            }
                            sellHouseBtn.onclick = () => socket.emit('sellHouse', idx);
                        }
                    }
                    if (prop.houses === 0) {
                        if (mortgageBtn) {
                            mortgageBtn.style.display = 'block';
                            mortgageBtn.textContent = 'MORTGAGE (+$' + Math.round(tile.mortgageValue) + ')';
                            mortgageBtn.onclick = () => socket.emit('mortgageProperty', idx);
                        }
                    }
                }
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
    // 1. Remove DOM tokens for players who are no longer in the game
    const activeUuids = new Set((state.turnOrder || []).filter(id => state.players && state.players[id]));
    document.querySelectorAll('.player-token').forEach(el => {
        const id = el.id.replace('token-', '');
        if (!activeUuids.has(id)) {
            el.remove();
            delete visualPositions[id];
        }
    });

    // 2. Hide tokens during LOBBY state to keep board and GO clear
    if (state.status === 'LOBBY') {
        document.querySelectorAll('.player-token').forEach(el => {
            el.style.display = 'none';
        });
        return;
    }

    // 3. Render and position active player tokens
    Object.values(state.players).forEach(p => {
        let tokenEl = document.getElementById('token-' + p.uuid);
        if (!tokenEl) {
            tokenEl = document.createElement('div');
            tokenEl.id = 'token-' + p.uuid;
            tokenEl.className = 'player-token-anim';
            tokenEl.innerHTML = `<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; overflow: visible; font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${p.symbol}</div>`;
            tokenEl.style.color = p.color;
            tokenEl.style.zIndex = '100';
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
    
    if (hops.length === 0) return;

    isAnimatingHops = true;
    for (const hop of hops) {
        const tokenEl = document.getElementById('token-' + hop.uuid);
        if (!tokenEl) {
            visualPositions[hop.uuid] = hop.to;
            continue;
        }

        const inner = tokenEl.querySelector('.token-inner');

        // Go to Jail direct warp: Tile 30 -> Tile 10
        if (hop.from === 30 && hop.to === 10) {
            if (window.SoundFX && window.SoundFX.jail) window.SoundFX.jail();
            tokenEl.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            positionTokenAt(tokenEl, hop.uuid, 10);
            visualPositions[hop.uuid] = 10;
            await new Promise(r => setTimeout(r, 650));
            tokenEl.style.transition = '';
            continue;
        }

        let steps = hop.to - hop.from;
        let dir = 1;
        if (steps === -3) {
            // "Go back 3 spaces" card
            dir = -1;
            steps = 3;
        } else if (steps < 0) {
            steps += 40;
        }

        // Card warp / teleport
        if (steps > 12) {
            tokenEl.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
            positionTokenAt(tokenEl, hop.uuid, hop.to);
            visualPositions[hop.uuid] = hop.to;
            if (window.SoundFX && window.SoundFX.card) window.SoundFX.card();
            await new Promise(r => setTimeout(r, 550));
            tokenEl.style.transition = '';
            continue;
        }

        // Realistic Step-by-Step Jumping Arc
        tokenEl.style.transition = 'transform 0.18s cubic-bezier(0.25, 1, 0.5, 1)';
        let current = hop.from;

        for (let i = 0; i < steps; i++) {
            current = (current + dir + 40) % 40;
            visualPositions[hop.uuid] = current; // Keep visual position accurate at every single step!

            if (inner) {
                inner.classList.remove('hopping');
                void inner.offsetWidth; // Force reflow to retrigger animation
                inner.classList.add('hopping');
            }

            positionTokenAt(tokenEl, hop.uuid, current);
            if (window.SoundFX && window.SoundFX.hop) window.SoundFX.hop();

            await new Promise(r => setTimeout(r, 200));

            if (inner) inner.classList.remove('hopping');
        }

        tokenEl.style.transition = '';
        visualPositions[hop.uuid] = hop.to;
    }
    isAnimatingHops = false;
}

function isColorLight(color) {
    if (!color) return false;
    const lower = color.toLowerCase();
    if (lower === '#ffff00' || lower === '#facc15' || lower === '#f59e0b' || lower === '#eab308' || lower === 'yellow' || lower === '#00ffff' || lower === '#00ff88' || lower === '#ffffff') return true;
    if (color.startsWith('#')) {
        let c = color.substring(1);
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        if (!isNaN(num)) {
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
            return hsp > 150;
        }
    }
    return false;
}

function renderPropertyOwnership(state) {
    if (!state || !state.properties) return;
    document.querySelectorAll('.owner-strip, .owner-name-tag, .house-indicator').forEach(el => el.remove());
    
    Object.keys(state.properties).forEach(tileIndex => {
        const prop = state.properties[tileIndex];
        const tile = document.getElementById('tile-' + tileIndex);
        const owner = state.players[prop.owner];
        
        if (tile && owner) {
            const playerNum = state.turnOrder.indexOf(prop.owner) + 1;
            const isBottom = tile.classList.contains('bottom');
            const isTop = tile.classList.contains('top');
            const isLeft = tile.classList.contains('left');
            const isRight = tile.classList.contains('right');

            // High contrast text & border for light/yellow colors (e.g. Player 4)
            const lightColor = isColorLight(owner.color);

            // Add Player Number Badge - oriented outside color band
            const tag = document.createElement('div');
            tag.className = 'owner-name-tag';
            tag.textContent = playerNum;
            tag.style.position = 'absolute';
            tag.style.width = '20px';
            tag.style.height = '20px';
            tag.style.borderRadius = '50%';
            tag.style.background = owner.color;
            tag.style.color = lightColor ? '#0f172a' : '#ffffff';
            tag.style.display = 'flex';
            tag.style.alignItems = 'center';
            tag.style.justifyContent = 'center';
            tag.style.fontSize = '0.68rem';
            tag.style.fontWeight = '900';
            tag.style.zIndex = '30';
            tag.style.border = lightColor ? '2px solid #0f172a' : '1.5px solid rgba(255,255,255,0.85)';
            tag.style.boxShadow = '0 2px 5px rgba(0,0,0,0.35)';

            if (isLeft) {
                // Color band is on the right -> place tag on top-left
                tag.style.top = '4px';
                tag.style.left = '4px';
            } else if (isBottom) {
                // Color band is on top -> place tag on bottom-right
                tag.style.bottom = '4px';
                tag.style.right = '4px';
            } else {
                // Top or right -> place tag on top-right
                tag.style.top = '4px';
                tag.style.right = '4px';
            }
            tile.appendChild(tag);
            
            // Add Houses Indicator - positioned cleanly on top without covering or hiding color bands
            if (prop.houses > 0) {
                const hInd = document.createElement('div');
                hInd.className = 'house-indicator';
                hInd.style.position = 'absolute';
                hInd.style.color = '#fff';
                hInd.style.fontWeight = '900';
                hInd.style.fontSize = '0.62rem';
                hInd.style.background = prop.houses === 5 ? '#dc2626' : '#15803d';
                hInd.style.padding = '2px 4px';
                hInd.style.borderRadius = '4px';
                hInd.style.letterSpacing = '1px';
                hInd.style.zIndex = '30';
                hInd.style.boxShadow = '0 2px 4px rgba(0,0,0,0.35)';
                hInd.textContent = prop.houses === 5 ? '🏨 Hotel' : '🏠'.repeat(prop.houses);

                if (isBottom) {
                    // Color band is on top -> position at bottom-left
                    hInd.style.bottom = '4px';
                    hInd.style.left = '4px';
                } else if (isLeft) {
                    // Color band is on right -> position at bottom-left
                    hInd.style.bottom = '4px';
                    hInd.style.left = '4px';
                } else if (isRight) {
                    // Color band is on left -> position at bottom-right
                    hInd.style.bottom = '4px';
                    hInd.style.right = '4px';
                } else {
                    // Top row: color band is on bottom -> position at top-left
                    hInd.style.top = '4px';
                    hInd.style.left = '4px';
                }
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
                mIcon.style.zIndex = '5';
                mIcon.style.pointerEvents = 'none';
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
        const propEl = document.getElementById('auction-property');
        if (propEl && tData) {
            propEl.textContent = tData.name;
            const hex = neonColors[tData.color] || '#f59e0b';
            propEl.style.color = hex;
        }
        const colorBar = document.getElementById('auction-color-bar');
        if (colorBar && tData) {
            colorBar.style.background = neonColors[tData.color] || '#3b82f6';
        }
        document.getElementById('auction-bid').textContent = '$' + state.auction.currentBid;
        
        const leader = state.players[state.auction.highestBidder];
        const leaderEl = document.getElementById('auction-leader');
        if (leader) {
            leaderEl.innerHTML = `<span class="token-icon" style="width: 20px; height: 20px; min-width: 20px; max-width: 20px; display: inline-flex; align-items: center; justify-content: center; color: ${leader.color}; flex-shrink: 0; overflow: hidden;">${leader.symbol || '🎩'}</span> <span style="color: ${leader.color}; font-weight: 900;">${leader.username}</span>`;
        } else {
            leaderEl.textContent = 'NONE';
        }
        document.getElementById('auction-timer').textContent = state.auction.timer + 's REMAINING';
        
        // Multi-Bidder Stations (Every human player gets their own card!)
        const gridEl = document.getElementById('auction-players-grid');
        if (gridEl) {
            gridEl.innerHTML = '';
            
            // Get all human players in this match
            const humanPlayers = Object.values(state.players).filter(p => !p.isBot && p.online);
            
            if (humanPlayers.length <= 4) {
                gridEl.style.gridTemplateColumns = `repeat(${Math.max(2, humanPlayers.length)}, 1fr)`;
            } else {
                gridEl.style.gridTemplateColumns = 'repeat(4, 1fr)';
            }
            gridEl.style.gap = '14px';
            
            humanPlayers.forEach(p => {
                const isActive = (state.auction.activeBidders || []).includes(p.uuid);
                const isLeader = (state.auction.highestBidder === p.uuid);
                const next10 = state.auction.currentBid + 10;
                const next50 = state.auction.currentBid + 50;
                const next100 = state.auction.currentBid + 100;

                const card = document.createElement('div');
                card.className = 'auction-card';
                card.style.cssText = `
                    background: ${isLeader ? '#fffbeb' : (isActive ? '#ffffff' : '#f8fafc')};
                    border: 2px solid ${isLeader ? '#f59e0b' : (isActive ? '#0284c7' : '#cbd5e1')};
                    border-radius: 16px;
                    padding: 16px 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    box-shadow: ${isLeader ? '0 6px 20px rgba(245, 158, 11, 0.28)' : '0 4px 14px rgba(15, 23, 42, 0.06)'};
                    opacity: ${isActive ? '1' : '0.45'};
                    transition: all 0.2s;
                    text-align: left;
                    min-height: 145px;
                `;

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 8px; text-align: left; overflow: hidden; flex: 1;">
                            <span class="token-icon" style="width: 26px; height: 26px; min-width: 26px; max-width: 26px; display: inline-flex; align-items: center; justify-content: center; color: ${p.color}; flex-shrink: 0; overflow: hidden;">${p.symbol || '🎩'}</span>
                            <div style="overflow: hidden; flex: 1;">
                                <div style="font-weight: 800; font-size: 1.05rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${p.username}">${p.username}</div>
                                <div style="font-size: 0.95rem; color: #16a34a; font-weight: 900;">$${Math.round(p.cash).toLocaleString()}</div>
                            </div>
                        </div>
                        <span style="font-size: 0.7rem; font-weight: 900; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; background: ${isLeader ? '#f59e0b' : (isActive ? '#dcfce7' : '#fee2e2')}; color: ${isLeader ? '#ffffff' : (isActive ? '#15803d' : '#b91c1c')}; border: 1px solid ${isLeader ? '#d97706' : (isActive ? '#86efac' : '#fca5a5')}; flex-shrink: 0;">
                            ${isLeader ? '👑 LEADER' : (isActive ? 'ACTIVE' : 'FOLDED')}
                        </span>
                    </div>

                    <!-- Spacious Bid Buttons with Generous Touch Targets -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                        <button class="glass-btn" style="padding: 10px 0; min-height: 42px; font-size: 0.92rem; font-weight: 900; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border: 1px solid #3b82f6; border-radius: 8px; cursor: pointer; transition: all 0.2s; ${(!isActive || p.cash < next10) ? 'opacity:0.35; cursor:not-allowed;' : ''}" 
                            ${(!isActive || p.cash < next10) ? 'disabled' : ''} 
                            onclick="window.bidForPlayer('${p.uuid}', 10)">+$10</button>
                        <button class="glass-btn" style="padding: 10px 0; min-height: 42px; font-size: 0.92rem; font-weight: 900; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; border: 1px solid #8b5cf6; border-radius: 8px; cursor: pointer; transition: all 0.2s; ${(!isActive || p.cash < next50) ? 'opacity:0.35; cursor:not-allowed;' : ''}" 
                            ${(!isActive || p.cash < next50) ? 'disabled' : ''} 
                            onclick="window.bidForPlayer('${p.uuid}', 50)">+$50</button>
                        <button class="glass-btn" style="padding: 10px 0; min-height: 42px; font-size: 0.92rem; font-weight: 900; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; border: 1px solid #38bdf8; border-radius: 8px; cursor: pointer; transition: all 0.2s; ${(!isActive || p.cash < next100) ? 'opacity:0.35; cursor:not-allowed;' : ''}" 
                            ${(!isActive || p.cash < next100) ? 'disabled' : ''} 
                            onclick="window.bidForPlayer('${p.uuid}', 100)">+$100</button>
                    </div>

                    <!-- Distinct Separate Fold / Pass Button to completely prevent misclicks -->
                    <div>
                        <button class="glass-btn" style="width: 100%; padding: 8px 0; min-height: 34px; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.5px; background: rgba(239, 68, 68, 0.1); color: #dc2626; border: 1.5px solid rgba(239, 68, 68, 0.35); border-radius: 8px; cursor: pointer; transition: all 0.2s; ${!isActive ? 'opacity:0.35; cursor:not-allowed;' : ''}" 
                            ${!isActive ? 'disabled' : ''} 
                            onclick="window.foldForPlayer('${p.uuid}')">✕ FOLD AUCTION</button>
                    </div>
                `;
                gridEl.appendChild(card);
            });
        }

        // Active Bots status ticker
        const botStatusEl = document.getElementById('auction-bot-status');
        if (botStatusEl) {
            const botList = Object.values(state.players).filter(p => p.isBot);
            if (botList.length > 0) {
                const botChips = botList.map(b => {
                    const isBActive = (state.auction.activeBidders || []).includes(b.uuid);
                    const isBLeader = (state.auction.highestBidder === b.uuid);
                    return `<span style="color: ${isBLeader ? '#d97706' : (isBActive ? '#0284c7' : '#94a3b8')}; font-weight: 700;">${b.username} (${isBLeader ? '👑 Leading' : (isBActive ? 'Active' : 'Folded')})</span>`;
                }).join(' • ');
                botStatusEl.innerHTML = `🤖 AI Bots: ${botChips}`;
            } else {
                botStatusEl.textContent = 'All auction combatants are active local human players';
            }
        }
    } else if (aucOverlay) {
        aucOverlay.classList.add('hidden');
        aucOverlay.style.display = 'none';
    }

    const turnIndicator = document.getElementById('turn-indicator');

    const inGameControlsEl = document.getElementById('in-game-controls');
    const sidebarActionBar = document.getElementById('sidebar-action-bar');
    const lobbyNetworkCard = document.getElementById('lobby-network-card');
    const quitLobbyBtn = document.getElementById('quit-lobby-btn');

    if (state.status === 'LOBBY') {
        if (hostControlsEl) hostControlsEl.classList.remove('hidden');
        if (inGameControlsEl) inGameControlsEl.classList.add('hidden');
        if (sidebarActionBar) sidebarActionBar.style.display = 'none';
        if (lobbyNetworkCard) {
            lobbyNetworkCard.classList.remove('hidden');
            lobbyNetworkCard.style.display = 'block';
        }
    } else {
        if (hostControlsEl) hostControlsEl.classList.add('hidden');
        if (inGameControlsEl) {
            inGameControlsEl.classList.remove('hidden');
            inGameControlsEl.style.display = 'flex';
        }
        if (sidebarActionBar) sidebarActionBar.style.display = 'flex';
        if (lobbyNetworkCard) {
            lobbyNetworkCard.classList.add('hidden');
            lobbyNetworkCard.style.display = 'none';
        }
    }

    if (state.status === 'LOBBY') {
        if (turnIndicator) {
            turnIndicator.textContent = 'WAITING FOR PLAYERS...';
            turnIndicator.style.color = '#64748b';
            turnIndicator.style.borderColor = '#e2e8f0';
            turnIndicator.style.background = '#f8fafc';
        }
        rollBtn.textContent = 'WAITING FOR PLAYERS';
        rollBtn.style.opacity = '0.5';
        rollBtn.disabled = true;
        return;
    }

    if (window.lastTurnIndex !== state.currentTurnIndex) {
        window.lastTurnIndex = state.currentTurnIndex;
        window.hasPromptedJailThisTurn = false;
    }

    const currentTurnUuid = state.turnOrder[state.currentTurnIndex];
    const currentPlayer = state.players[currentTurnUuid];
    if (turnIndicator && currentPlayer) {
        turnIndicator.textContent = `${currentPlayer.username}'s Turn`;
        turnIndicator.style.color = currentPlayer.color || '#2563eb';
        turnIndicator.style.borderColor = currentPlayer.color || '#2563eb';
        turnIndicator.style.background = (currentPlayer.color || '#2563eb') + '15';
    }
    
    const payJailBtn = document.getElementById('pay-jail-btn');
    const useJailCardBtn = document.getElementById('use-jail-card-btn');

    if (currentTurnUuid === myUuid || (state.host === myUuid && currentPlayer && currentPlayer.isLocal)) {
        if (currentPlayer.debtState) {
            rollBtn.textContent = 'YOU ARE IN DEBT! DECLARE BANKRUPTCY';
            rollBtn.style.background = '#ef4444';
            if (payJailBtn) payJailBtn.style.display = 'none';
            if (useJailCardBtn) useJailCardBtn.style.display = 'none';
            const jailContainer = document.getElementById('jail-actions-container');
            if (jailContainer) jailContainer.style.display = 'none';

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
            payBtn.textContent = `PAY $${currentPlayer.debtState.amount}`;
            payBtn.style.display = 'inline-block';
            payBtn.disabled = currentPlayer.cash < currentPlayer.debtState.amount;
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
        } else if (currentPlayer.pendingAction && currentPlayer.pendingAction.type === 'buy') {
            const payBtn = document.getElementById('pay-debt-btn');
            if (payBtn) payBtn.style.display = 'none';
            const jailContainer = document.getElementById('jail-actions-container');
            if (jailContainer) jailContainer.style.display = 'none';

            rollBtn.textContent = 'RESOLVE PURCHASE (BUY OR AUCTION)';
            rollBtn.style.background = '#64748b';
            rollBtn.disabled = true;
            rollBtn.style.opacity = '0.6';
        } else {
            const payBtn = document.getElementById('pay-debt-btn');
            if (payBtn) payBtn.style.display = 'none';

            const jailContainer = document.getElementById('jail-actions-container');

            if (currentPlayer.inJail) {
                rollBtn.textContent = '🎲 ROLL FOR DOUBLES';
                rollBtn.style.background = '#eab308';
                rollBtn.disabled = false;
                rollBtn.style.opacity = '1';
                rollBtn.onclick = () => {
                    rollBtn.disabled = true;
                    rollBtn.style.opacity = '0.5';
                    if (window.SoundFX && window.SoundFX.rollDice) window.SoundFX.rollDice();
                    if (window.socket) window.socket.emit('rollDice');
                };

                if (jailContainer) jailContainer.style.display = 'flex';

                if (payJailBtn) {
                    payJailBtn.style.display = 'inline-flex';
                    payJailBtn.disabled = false;
                    payJailBtn.style.opacity = '1';

                    const canPay = currentPlayer.cash >= 50;
                    if (canPay) {
                        payJailBtn.classList.remove('need-cash');
                        payJailBtn.innerHTML = '💵 Pay $50 Fine';
                        payJailBtn.onclick = () => {
                            payJailBtn.disabled = true;
                            if (window.socket) window.socket.emit('payJailFine');
                        };
                    } else {
                        payJailBtn.classList.add('need-cash');
                        payJailBtn.innerHTML = `💵 Pay $50 Fine <span style="font-size:0.7rem; opacity:0.85;">(Need $${50 - Math.round(currentPlayer.cash)})</span>`;
                        payJailBtn.onclick = () => {
                            const unmortgagedProps = Object.entries(state.properties || {}).filter(([idx, p]) => {
                                return p.owner === currentPlayer.uuid && !p.mortgaged;
                            });
                            if (unmortgagedProps.length > 0) {
                                Swal.fire({
                                    title: 'Insufficient Cash to Pay Jail Fine',
                                    html: `<div style="font-size: 1rem; margin-bottom: 8px;">You have <strong>$${Math.round(currentPlayer.cash)}</strong> cash, but need <strong>$50</strong> to leave jail.</div>
                                           <div style="font-size: 0.88rem; color: #475569; margin-bottom: 12px;">You can mortgage properties for instant cash, roll for doubles, or declare bankruptcy.</div>`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    showDenyButton: true,
                                    confirmButtonText: 'Mortgage Properties',
                                    confirmButtonColor: '#2563eb',
                                    denyButtonText: '🎲 Roll Doubles',
                                    denyButtonColor: '#eab308',
                                    cancelButtonText: 'Declare Bankruptcy',
                                    cancelButtonColor: '#ef4444',
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    customClass: { popup: 'glass-panel' }
                                }).then(res => {
                                    if (res.isConfirmed) {
                                        Swal.fire({
                                            title: 'Mortgage Properties',
                                            text: 'Click any of your properties on the board or sidebar to mortgage them for instant cash, then click Pay $50 Fine!',
                                            icon: 'info',
                                            confirmButtonText: 'Got It',
                                            confirmButtonColor: '#2563eb',
                                            customClass: { popup: 'glass-panel' }
                                        });
                                    } else if (res.isDenied) {
                                        if (window.SoundFX && window.SoundFX.rollDice) window.SoundFX.rollDice();
                                        if (window.socket) window.socket.emit('rollDice');
                                    } else if (res.dismiss === Swal.DismissReason.cancel) {
                                        Swal.fire({
                                            title: 'Declare Bankruptcy?',
                                            text: 'Are you sure? You will forfeit all assets and be eliminated from the game.',
                                            icon: 'warning',
                                            showCancelButton: true,
                                            confirmButtonText: 'Yes, Declare Bankruptcy',
                                            confirmButtonColor: '#ef4444',
                                            cancelButtonText: 'Keep Playing',
                                            customClass: { popup: 'glass-panel' }
                                        }).then(bRes => {
                                            if (bRes.isConfirmed && window.socket) window.socket.emit('declareBankruptcy');
                                        });
                                    }
                                });
                            } else {
                                Swal.fire({
                                    title: 'Insufficient Cash to Pay Jail Fine',
                                    html: `<div style="font-size: 1rem; margin-bottom: 8px;">You have <strong>$${Math.round(currentPlayer.cash)}</strong> cash and no properties to mortgage.</div>
                                           <div style="font-size: 0.88rem; color: #475569; margin-bottom: 12px;">You must roll for doubles to escape jail, or declare bankruptcy.</div>`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: '🎲 Roll for Doubles',
                                    confirmButtonColor: '#eab308',
                                    cancelButtonText: 'Declare Bankruptcy',
                                    cancelButtonColor: '#ef4444',
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    customClass: { popup: 'glass-panel' }
                                }).then(res => {
                                    if (res.isConfirmed) {
                                        if (window.SoundFX && window.SoundFX.rollDice) window.SoundFX.rollDice();
                                        if (window.socket) window.socket.emit('rollDice');
                                    } else if (res.dismiss === Swal.DismissReason.cancel) {
                                        Swal.fire({
                                            title: 'Declare Bankruptcy?',
                                            text: 'Are you sure? You will be eliminated from the game.',
                                            icon: 'warning',
                                            showCancelButton: true,
                                            confirmButtonText: 'Yes, Declare Bankruptcy',
                                            confirmButtonColor: '#ef4444',
                                            cancelButtonText: 'Keep Playing',
                                            customClass: { popup: 'glass-panel' }
                                        }).then(bRes => {
                                            if (bRes.isConfirmed && window.socket) window.socket.emit('declareBankruptcy');
                                        });
                                    }
                                });
                            }
                        };
                    }
                }

                if (useJailCardBtn) {
                    const hasCard = (currentPlayer.getOutJailFree > 0 || currentPlayer.getOutCards > 0);
                    useJailCardBtn.style.display = hasCard ? 'inline-flex' : 'none';
                    if (hasCard) {
                        useJailCardBtn.disabled = false;
                        useJailCardBtn.style.opacity = '1';
                        useJailCardBtn.onclick = () => {
                            useJailCardBtn.disabled = true;
                            if (window.socket) window.socket.emit('useJailCard');
                        };
                    }
                }
            } else {
                if (jailContainer) jailContainer.style.display = 'none';

                rollBtn.textContent = 'ROLL DICE';
                rollBtn.style.background = '#16a34a';
                rollBtn.disabled = false;
                rollBtn.style.opacity = '1';
                rollBtn.onclick = () => {
                    if (rollBtn.disabled) return;
                    rollBtn.disabled = true;
                    rollBtn.style.opacity = '0.5';
                    if (window.SoundFX && window.SoundFX.rollDice) window.SoundFX.rollDice();
                    if (window.socket) window.socket.emit('rollDice');
                };
            }
        }
    } else {
        rollBtn.textContent = (currentPlayer ? `${currentPlayer.username.toUpperCase()}'S TURN` : 'OPPONENT TURN');
        rollBtn.style.opacity = '0.5';
        rollBtn.disabled = true;
        rollBtn.style.background = '#2563eb';
        const jailContainer = document.getElementById('jail-actions-container');
        if (jailContainer) jailContainer.style.display = 'none';
    }
}

function checkPendingActions(state) {
    if (!state || !state.players) return;
    const currentTurnUuid = state.turnOrder[state.currentTurnIndex];
    const currentPlayer = state.players[currentTurnUuid];
    const isMe = (currentTurnUuid === myUuid);
    const isMyLocal = (state.host === myUuid && currentPlayer && currentPlayer.isLocal);
    const activePlayer = isMe ? state.players[myUuid] : (isMyLocal ? currentPlayer : null);

    // Clear any previous pending purchase highlight
    document.querySelectorAll('.pending-purchase-tile').forEach(el => el.classList.remove('pending-purchase-tile'));

    const pendingBuyBar = document.getElementById('pending-buy-bar');

    if (activePlayer && activePlayer.pendingAction && activePlayer.pendingAction.type === 'buy') {
        const pAction = activePlayer.pendingAction;
        const tData = boardData[pAction.tileIndex];
        const tileEl = document.getElementById('tile-' + pAction.tileIndex);
        if (tileEl) tileEl.classList.add('pending-purchase-tile');

        // Center hub pending buy bar
        if (pendingBuyBar && tData) {
            pendingBuyBar.style.display = 'flex';
            const priceVal = Math.round(pAction.price || tData.price || 0);
            const canAfford = activePlayer.cash >= priceVal;
            const diff = priceVal - Math.round(activePlayer.cash);

            const infoEl = document.getElementById('pending-buy-info');
            if (infoEl) {
                if (canAfford) {
                    infoEl.innerHTML = `🏠 Ready to buy <strong style="color: #16a34a;">${tData.name}</strong> ($${priceVal})!`;
                } else {
                    infoEl.innerHTML = `🏠 <strong style="color: #2563eb;">${tData.name}</strong> ($${priceVal}) — Need <strong style="color: #ef4444;">$${diff}</strong> more (mortgage properties to raise cash)`;
                }
            }

            const pBtnBuy = document.getElementById('pending-btn-buy');
            const pBtnPass = document.getElementById('pending-btn-pass');
            if (pBtnBuy) {
                pBtnBuy.disabled = false;
                pBtnBuy.style.opacity = canAfford ? '1' : '0.85';
                pBtnBuy.style.background = canAfford ? '#16a34a' : '#d97706';
                pBtnBuy.textContent = canAfford ? `BUY PROPERTY ($${priceVal})` : `NEED $${diff} MORE`;
                pBtnBuy.onclick = () => {
                    if (!canAfford) {
                        Swal.fire({
                            title: 'Insufficient Cash',
                            html: `You need <strong>$${diff}</strong> more to buy <strong>${tData.name}</strong>.<br><br>Click any of your properties on the board or sidebar to mortgage them for instant cash!`,
                            icon: 'info',
                            confirmButtonText: 'Got It',
                            confirmButtonColor: '#2563eb',
                            customClass: { popup: 'glass-panel' }
                        });
                        return;
                    }
                    if (window.isPromptingBuy) {
                        Swal.close();
                        window.isPromptingBuy = false;
                    }
                    if (window.SoundFX && window.SoundFX.cash) window.SoundFX.cash();
                    socket.emit('buyProperty', true);
                };
            }
            if (pBtnPass) {
                pBtnPass.onclick = () => {
                    if (window.isPromptingBuy) {
                        Swal.close();
                        window.isPromptingBuy = false;
                    }
                    socket.emit('buyProperty', false);
                };
            }
        }

        if (tData) {
            showPropertyDetails(tData);
        }

        // Only prompt modal if not previously dismissed for this specific tile
        if (!window.isPromptingBuy && window.dismissedBuyTileIndex !== pAction.tileIndex && tData) {
            window.isPromptingBuy = true;
            const actorName = isMyLocal ? `${activePlayer.username}` : 'You';
            const priceVal = Math.round(pAction.price);
            const canAfford = activePlayer.cash >= priceVal;
            const diff = priceVal - Math.round(activePlayer.cash);

            Swal.fire({
                title: 'Buy Property?',
                html: `<div style="font-size:1.05rem; margin-bottom:8px;"><strong>${actorName}</strong> landed on <strong>${tData.name}</strong></div>
                       <div style="font-size:1.1rem; color:#16a34a; font-weight:800; margin-bottom:8px;">Price: $${priceVal} | Cash: $${Math.round(activePlayer.cash)}</div>
                       ${!canAfford ? `<div style="font-size:0.85rem; color:#ef4444; margin-bottom:6px; font-weight:700;">⚠️ You need $${diff} more cash. You can click outside or "Mortgage Properties" to raise cash first!</div>` : ''}
                       <div style="font-size:0.85rem; color:#64748b;">Do you want to buy this property or send it to Auction?</div>`,
                icon: 'question',
                showCancelButton: true,
                showDenyButton: !canAfford,
                confirmButtonText: canAfford ? `Buy Property ($${priceVal})` : `Buy ($${priceVal})`,
                cancelButtonText: 'Pass to Auction',
                denyButtonText: 'Mortgage Properties First',
                confirmButtonColor: canAfford ? '#16a34a' : '#94a3b8',
                cancelButtonColor: '#ef4444',
                denyButtonColor: '#d97706',
                allowOutsideClick: true,
                background: '#ffffff',
                color: '#0f172a',
                customClass: { popup: 'glass-panel' }
            }).then((res) => {
                window.isPromptingBuy = false;
                if (res.isConfirmed) {
                    if (activePlayer.cash < priceVal) {
                        window.dismissedBuyTileIndex = pAction.tileIndex;
                        Swal.fire({
                            title: 'Insufficient Cash',
                            html: `You need <strong>$${diff}</strong> more cash to buy <strong>${tData.name}</strong>.<br><br>Click any of your properties on the board or sidebar to mortgage them for instant cash!`,
                            icon: 'info',
                            confirmButtonText: 'Mortgage Properties',
                            confirmButtonColor: '#2563eb',
                            customClass: { popup: 'glass-panel' }
                        });
                        return;
                    }
                    if (window.SoundFX && window.SoundFX.cash) window.SoundFX.cash();
                    socket.emit('buyProperty', true);
                } else if (res.isDenied) {
                    window.dismissedBuyTileIndex = pAction.tileIndex;
                } else if (res.dismiss === Swal.DismissReason.backdrop || res.dismiss === Swal.DismissReason.esc || res.dismiss === Swal.DismissReason.close) {
                    window.dismissedBuyTileIndex = pAction.tileIndex;
                } else if (res.dismiss === Swal.DismissReason.cancel) {
                    socket.emit('buyProperty', false);
                }
            });
        }
    } else {
        window.isPromptingBuy = false;
        window.dismissedBuyTileIndex = null;
        if (pendingBuyBar) pendingBuyBar.style.display = 'none';
    }

    const chanceDeck = document.querySelector('.chance-deck');
    const chestDeck = document.querySelector('.chest-deck');
    if (chanceDeck) chanceDeck.classList.remove('glow-deck');
    if (chestDeck) chestDeck.classList.remove('glow-deck');

    if (activePlayer && activePlayer.pendingAction && activePlayer.pendingAction.type === 'draw_card') {
        const targetDeck = document.querySelector('.' + activePlayer.pendingAction.deck + '-deck');
        if (targetDeck) {
            targetDeck.classList.add('glow-deck');
            if (window.SoundFX && window.SoundFX.card) window.SoundFX.card();
        }
    }
}

function spawnCashAnimation(uuid, diff) {
    if (!diff || diff <= 0) return;
    try {
        if (window.SoundFX && window.SoundFX.cash) window.SoundFX.cash();

        let posX = window.innerWidth / 2;
        let posY = window.innerHeight / 2;

        const tokenEl = document.getElementById('token-' + uuid);
        if (tokenEl) {
            const rect = tokenEl.getBoundingClientRect();
            posX = rect.left + rect.width / 2;
            posY = rect.top;
        } else {
            const playerCard = document.querySelector(`.player-card[data-uuid="${uuid}"]`);
            if (playerCard) {
                const rect = playerCard.getBoundingClientRect();
                posX = rect.left + rect.width / 2;
                posY = rect.top + rect.height / 2;
            }
        }

        const bubble = document.createElement('div');
        bubble.className = 'floating-cash-bubble';
        bubble.innerHTML = `<span>💵</span> <span>+$${Number(diff).toLocaleString()}</span>`;
        bubble.style.left = posX + 'px';
        bubble.style.top = posY + 'px';
        document.body.appendChild(bubble);

        for (let i = 0; i < 4; i++) {
            const bill = document.createElement('div');
            bill.className = 'floating-bill';
            bill.textContent = (i % 2 === 0) ? '💵' : '💰';
            const offsetX = (Math.random() - 0.5) * 80;
            const offsetY = (Math.random() - 0.5) * 40;
            bill.style.left = (posX + offsetX) + 'px';
            bill.style.top = (posY + offsetY) + 'px';
            document.body.appendChild(bill);
            setTimeout(() => bill.remove(), 2000);
        }

        setTimeout(() => bubble.remove(), 1850);
    } catch (e) {
        console.warn('Cash animation error:', e);
    }
}

async function processStateQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (stateQueue.length > 0) {
        const state = stateQueue.shift();

        // Wait for any 3D dice roll to settle before moving tokens
        await diceAnimationPromise;

        // Detect cash gains for any player (human or bot) and trigger animations!
        if (currentGameState && currentGameState.players && state.players && state.status !== 'LOBBY') {
            Object.keys(state.players).forEach(uuid => {
                const oldCash = currentGameState.players[uuid]?.cash || 0;
                const newCash = state.players[uuid]?.cash || 0;
                if (newCash > oldCash) {
                    spawnCashAnimation(uuid, newCash - oldCash);
                }
            });
        }

        currentGameState = state;
        window.currentGameStateObj = state;
        renderPlayersList(state);

        await animateHopsForState(state);

        renderBoardTokens(state);
        renderPropertyOwnership(state);
        updateControls(state);
        checkPendingActions(state);

        if (state.lastDrawnCard) {
            const cObj = state.lastDrawnCard.card || state.lastDrawnCard;
            updateDrawnCardDisplay(cObj, state.lastDrawnCard.playerName || cObj.playerName);
        } else {
            updateDrawnCardDisplay(null);
        }

        if (window.currentViewedTileIndex !== undefined && boardData[window.currentViewedTileIndex]) {
            showPropertyDetails(boardData[window.currentViewedTileIndex]);
        }
    }

    isProcessingQueue = false;
}

function updateDrawnCardDisplay(card, playerName) {
    const panels = document.querySelectorAll('.drawn-card-panel');
    panels.forEach(panel => {
        const placeholder = panel.querySelector('.drawn-card-placeholder');
        const cardEl = panel.querySelector('.monopoly-drawn-card');
        if (!placeholder || !cardEl) return;

        if (!card || !card.text) {
            placeholder.classList.remove('hidden');
            cardEl.classList.add('hidden');
            return;
        }

        placeholder.classList.add('hidden');
        cardEl.classList.remove('hidden');
        const isChance = card.deck === 'chance';
        cardEl.className = 'monopoly-drawn-card ' + (isChance ? 'card-chance' : 'card-chest');

        const badge = cardEl.querySelector('.drawn-card-badge');
        if (badge) badge.textContent = isChance ? 'CHANCE' : 'COMMUNITY CHEST';

        const playerEl = cardEl.querySelector('.drawn-card-player');
        if (playerEl) {
            const pName = playerName || card.playerName;
            playerEl.textContent = pName ? `Drawn by ${pName}` : '';
            if (card.playerColor) playerEl.style.color = card.playerColor;
        }

        const icon = cardEl.querySelector('.drawn-card-icon');
        if (icon) icon.textContent = isChance ? '❓' : '🎁';

        const title = cardEl.querySelector('.drawn-card-title');
        if (title) title.textContent = card.title || (isChance ? 'Chance Card' : 'Community Chest');

        const text = cardEl.querySelector('.drawn-card-text');
        if (text) text.textContent = card.text || '';

        const subtext = cardEl.querySelector('.drawn-card-subtext');
        if (subtext) subtext.textContent = card.subtext || '';
    });
}

socket.on('gameState', (state) => {
    stateQueue.push(state);
    processStateQueue();
});

socket.on('diceRolled', (data) => {
    die1El.classList.add('rolling');
    die2El.classList.add('rolling');
    if (window.SoundFX && window.SoundFX.rollDice) window.SoundFX.rollDice();

    diceAnimationPromise = new Promise(resolve => {
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

            die1El.style.transform = rotMap[data.d1] || 'none';
            die2El.style.transform = rotMap[data.d2] || 'none';
            resolve();
        }, 500);
    });
});
socket.on('systemMessage', (msg) => {
    // Suppress pop-up toasts for card draws since they are displayed in the persistent Drawn Card panel
    if (!msg.includes('drew: "')) {
        Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, title: msg, icon: 'info' });
    }
    const log = document.getElementById('action-log');
    if (log) {
        const entry = document.createElement('div');
        entry.className = 'log-item';
        entry.textContent = msg;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
        const countEl = document.getElementById('log-count');
        if (countEl) countEl.textContent = `${log.children.length} events`;
    }
});

socket.on('errorMsg', (msg) => {
    Swal.fire('Error', msg, 'error');
});
initBoard();


// ====== CARD CLICK & DRAW LOGIC ======

document.addEventListener('DOMContentLoaded', () => {
    const chanceDeck = document.querySelector('.chance-deck');
    const chestDeck = document.querySelector('.chest-deck');
    
    const clickHandler = (e) => {
        if (!currentGameState) return;
        const currentPid = currentGameState.turnOrder[currentGameState.currentTurnIndex];
        const currentPlayer = currentGameState.players[currentPid];
        const isMe = (currentPid === myUuid);
        const isMyLocal = (currentGameState.host === myUuid && currentPlayer && currentPlayer.isLocal);
        const activePlayer = isMe ? currentGameState.players[myUuid] : (isMyLocal ? currentPlayer : null);

        if (!activePlayer || !activePlayer.pendingAction || activePlayer.pendingAction.type !== 'draw_card') return;

        const deckType = activePlayer.pendingAction.deck;
        if (e.currentTarget.classList.contains(deckType + '-deck')) {
            if (window.SoundFX && window.SoundFX.card) window.SoundFX.card();
            socket.emit('resolveCard');
            e.currentTarget.classList.remove('glow-deck');
        }
    };

    if (chanceDeck) chanceDeck.addEventListener('click', clickHandler);
    if (chestDeck) chestDeck.addEventListener('click', clickHandler);
    initTradeModal();
});

socket.on('cardDrawn', (data) => {
    // Completely remove any popups so users can read the card comfortably in the left sidebar
    const existingOverlay = document.getElementById('card-display-overlay');
    if (existingOverlay) existingOverlay.remove();

    // Update the card displayed on the left panel (persists until the next user/bot draws)
    updateDrawnCardDisplay(data, data.playerName);
});
// ====== TRADE & NEGOTIATION LOGIC ======

function initTradeModal() {
    const tradeButtons = document.querySelectorAll('#open-trade-btn, .open-trade-btn');
    const closeTradeBtn = document.getElementById('close-trade-btn');
    const cancelTradeBtn = document.getElementById('cancel-trade-btn');
    const sendTradeBtn = document.getElementById('send-trade-btn');
    const partnerSelect = document.getElementById('trade-partner-select');
    const overlay = document.getElementById('trade-overlay');
    const statusBox = document.getElementById('trade-status-box');

    tradeButtons.forEach(btn => {
        btn.onclick = () => {
            const state = window.currentGameStateObj;
            if (!state) return;

            const purchaseable = boardData.filter(t => t.type === 'property' || t.type === 'station' || t.type === 'utility');
            const unsold = purchaseable.filter(t => !state.properties[boardData.indexOf(t)]).length;

            if (unsold > 0) {
                Swal.fire({
                    title: 'Negotiations Locked',
                    html: `Property negotiations and trading unlock only when <strong>all properties on the board have been purchased from the bank</strong>!<br><br>Remaining unsold properties: <strong style="color: #ef4444; font-size: 1.25rem;">${unsold}</strong>`,
                    icon: 'info',
                    confirmButtonColor: '#2563eb',
                    customClass: { popup: 'glass-panel' }
                });
                return;
            }

            openTradeDialog();
        };
    });

    if (closeTradeBtn) closeTradeBtn.onclick = () => overlay.classList.add('hidden');
    if (cancelTradeBtn) cancelTradeBtn.onclick = () => overlay.classList.add('hidden');

    if (partnerSelect) {
        partnerSelect.onchange = () => {
            populateTradeProps();
        };
    }

    if (sendTradeBtn) {
        sendTradeBtn.onclick = () => {
            const partnerUuid = partnerSelect.value;
            if (!partnerUuid) {
                Swal.fire('Notice', 'Please select a player or bot to negotiate with.', 'warning');
                return;
            }

            const offeredPropCheckboxes = document.querySelectorAll('#trade-my-props input[type="checkbox"]:checked');
            const requestedPropCheckboxes = document.querySelectorAll('#trade-partner-props input[type="checkbox"]:checked');

            const offerProps = Array.from(offeredPropCheckboxes).map(cb => parseInt(cb.value));
            const requestProps = Array.from(requestedPropCheckboxes).map(cb => parseInt(cb.value));

            const offerCash = Math.max(0, parseInt(document.getElementById('trade-my-cash').value) || 0);
            const requestCash = Math.max(0, parseInt(document.getElementById('trade-partner-cash').value) || 0);

            if (offerProps.length === 0 && requestProps.length === 0 && offerCash === 0 && requestCash === 0) {
                Swal.fire('Notice', 'Please offer or request at least one property or cash amount.', 'warning');
                return;
            }

            statusBox.classList.remove('hidden');
            statusBox.style.background = '#f1f5f9';
            statusBox.style.color = '#334155';
            statusBox.textContent = 'Proposing deal to partner...';

            socket.emit('proposeTrade', {
                targetUuid: partnerUuid,
                offerProps,
                offerCash,
                requestProps,
                requestCash
            });
        };
    }
}

function openTradeDialog() {
    const state = window.currentGameStateObj;
    if (!state) return;
    const partnerSelect = document.getElementById('trade-partner-select');
    const overlay = document.getElementById('trade-overlay');
    const statusBox = document.getElementById('trade-status-box');

    partnerSelect.innerHTML = '';
    const otherPlayers = state.turnOrder
        .filter(id => id !== myUuid && state.players[id] && !state.players[id].debtState);

    if (otherPlayers.length === 0) {
        Swal.fire('Notice', 'No active players available to trade with.', 'info');
        return;
    }

    otherPlayers.forEach(id => {
        const p = state.players[id];
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `${p.username} (${p.isBot ? 'Bot' : 'Player'}) - $${Math.round(p.cash).toLocaleString()}`;
        partnerSelect.appendChild(opt);
    });

    statusBox.classList.add('hidden');
    statusBox.textContent = '';
    document.getElementById('trade-my-cash').value = '0';
    document.getElementById('trade-partner-cash').value = '0';

    populateTradeProps();
    overlay.classList.remove('hidden');
}

function populateTradeProps() {
    const state = window.currentGameStateObj;
    if (!state) return;
    const partnerUuid = document.getElementById('trade-partner-select').value;
    const myPropsEl = document.getElementById('trade-my-props');
    const partnerPropsEl = document.getElementById('trade-partner-props');

    myPropsEl.innerHTML = '';
    partnerPropsEl.innerHTML = '';

    const myProps = [];
    const partnerProps = [];

    Object.entries(state.properties).forEach(([idxStr, prop]) => {
        const idx = parseInt(idxStr);
        const tile = boardData[idx];
        if (!tile) return;
        if (prop.owner === myUuid) {
            myProps.push({ idx, tile, prop });
        } else if (prop.owner === partnerUuid) {
            partnerProps.push({ idx, tile, prop });
        }
    });

    const renderPropsList = (list, containerEl) => {
        if (list.length === 0) {
            containerEl.innerHTML = `<div style="font-size: 0.75rem; color: #94a3b8; font-style: italic; padding: 6px;">No properties owned</div>`;
            return;
        }

        list.forEach(item => {
            const row = document.createElement('label');
            row.className = 'trade-prop-item';
            const hex = neonColors[item.tile.color] || (item.tile.type === 'station' ? '#64748b' : '#0284c7');
            const hasHouses = (item.prop.houses || 0) > 0;
            const isMortgaged = item.prop.mortgaged;

            row.innerHTML = `
                <input type="checkbox" value="${item.idx}" ${hasHouses ? 'disabled' : ''}>
                <span class="trade-prop-color" style="background: ${hex};"></span>
                <span class="trade-prop-name">${item.tile.name}</span>
                <span class="trade-prop-badge">${hasHouses ? item.prop.houses + ' houses (must sell first)' : (isMortgaged ? 'Mortgaged' : '$' + item.tile.price)}</span>
            `;
            containerEl.appendChild(row);
        });
    };

    renderPropsList(myProps, myPropsEl);
    renderPropsList(partnerProps, partnerPropsEl);
}

socket.on('tradeSuccess', (data) => {
    const statusBox = document.getElementById('trade-status-box');
    if (statusBox) {
        statusBox.classList.remove('hidden');
        statusBox.style.background = '#dcfce7';
        statusBox.style.color = '#15803d';
        statusBox.textContent = `✅ ${data.message}`;
    }
    if (window.SoundFX && window.SoundFX.cash) window.SoundFX.cash();
    setTimeout(() => {
        document.getElementById('trade-overlay')?.classList.add('hidden');
    }, 2000);
});

socket.on('tradeResponse', (data) => {
    const statusBox = document.getElementById('trade-status-box');
    if (statusBox) {
        statusBox.classList.remove('hidden');
        statusBox.style.background = '#fee2e2';
        statusBox.style.color = '#b91c1c';
        let msg = `❌ ${data.reason || 'Trade declined.'}`;
        if (data.counterOfferCash !== undefined && data.counterOfferCash !== null) {
            msg += ` 💡 Counter-offer: The bot will accept if you offer $${data.counterOfferCash} cash.`;
            document.getElementById('trade-my-cash').value = data.counterOfferCash;
        }
        statusBox.textContent = msg;
    }
});

window.bidForPlayer = function(bidderUuid, amount) {
    if (window.SoundFX && window.SoundFX.cash) window.SoundFX.cash();
    socket.emit('placeBid', { bidderUuid, amount });
};

window.foldForPlayer = function(bidderUuid) {
    socket.emit('foldAuction', { bidderUuid });
};

socket.on('tradeStatus', (data) => {
    const statusBox = document.getElementById('trade-status-box');
    if (statusBox) {
        statusBox.classList.remove('hidden');
        statusBox.style.background = '#f1f5f9';
        statusBox.style.color = '#334155';
        statusBox.textContent = data.message;
    }
});

socket.on('tradeProposed', (data) => {
    const state = window.currentGameStateObj;
    const targetPlayer = state && state.players ? state.players[data.targetUuid] : null;
    const isTargetMeOrMyLocal = (data.targetUuid === myUuid) || (targetPlayer && targetPlayer.isLocal && (targetPlayer.hostId === myUuid || !targetPlayer.hostId || state.host === myUuid));
    if (!isTargetMeOrMyLocal) return;

    window.currentIncomingTrade = data;
    const modal = document.getElementById('pass-play-trade-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    const gateStep = document.getElementById('ppt-gate-step');
    const reviewStep = document.getElementById('ppt-review-step');
    const gatePlayer = document.getElementById('ppt-gate-player');
    const pptTitle = document.getElementById('ppt-title');
    const pptSubtitle = document.getElementById('ppt-subtitle');

    const targetDisplayName = targetPlayer ? targetPlayer.username : (data.targetName || 'Target Player');
    if (gatePlayer) gatePlayer.textContent = targetDisplayName;
    if (pptTitle) pptTitle.textContent = `Hand device to ${targetDisplayName}`;
    if (pptSubtitle) pptSubtitle.textContent = `${data.proposerName} has proposed a deal. Review and choose to accept, decline, or counter!`;

    if (gateStep) gateStep.style.display = 'block';
    if (reviewStep) reviewStep.style.display = 'none';

    const proceedBtn = document.getElementById('ppt-btn-proceed');
    if (proceedBtn) {
        proceedBtn.textContent = `I AM ${targetDisplayName.toUpperCase()} — REVIEW TRADE`;
        proceedBtn.onclick = () => {
            if (gateStep) gateStep.style.display = 'none';
            if (reviewStep) reviewStep.style.display = 'flex';
            populatePassPlayTradeReview(data);
        };
    }
});

function populatePassPlayTradeReview(data) {
    const recPropsEl = document.getElementById('ppt-receive-props');
    const recCashEl = document.getElementById('ppt-receive-cash');
    const givePropsEl = document.getElementById('ppt-give-props');
    const giveCashEl = document.getElementById('ppt-give-cash');

    if (recPropsEl) {
        recPropsEl.innerHTML = (data.offerProps && data.offerProps.length > 0)
            ? data.offerProps.map(p => `<div>• <strong>${p.name}</strong> <span style="font-size:0.7rem; color:${neonColors[p.color] || '#3b82f6'}; font-weight:800;">(${p.color || 'Special'})</span></div>`).join('')
            : '<div style="color: #64748b; font-style: italic;">No properties</div>';
    }
    if (recCashEl) {
        recCashEl.textContent = data.offerCash > 0 ? `+ $${data.offerCash} Cash` : '';
    }

    if (givePropsEl) {
        givePropsEl.innerHTML = (data.requestProps && data.requestProps.length > 0)
            ? data.requestProps.map(p => `<div>• <strong>${p.name}</strong> <span style="font-size:0.7rem; color:${neonColors[p.color] || '#3b82f6'}; font-weight:800;">(${p.color || 'Special'})</span></div>`).join('')
            : '<div style="color: #64748b; font-style: italic;">No properties</div>';
    }
    if (giveCashEl) {
        giveCashEl.textContent = data.requestCash > 0 ? `- $${data.requestCash} Cash` : '';
    }

    const acceptBtn = document.getElementById('ppt-btn-accept');
    if (acceptBtn) {
        acceptBtn.onclick = () => {
            closePassPlayTradeModal();
            if (window.SoundFX && window.SoundFX.cash) window.SoundFX.cash();
            socket.emit('respondTrade', { tradeId: data.tradeId, accepted: true });
        };
    }

    const declineBtn = document.getElementById('ppt-btn-decline');
    if (declineBtn) {
        declineBtn.onclick = () => {
            closePassPlayTradeModal();
            socket.emit('respondTrade', { tradeId: data.tradeId, accepted: false });
        };
    }

    const counterBtn = document.getElementById('ppt-btn-counter');
    if (counterBtn) {
        counterBtn.onclick = () => {
            closePassPlayTradeModal();
            socket.emit('respondTrade', { tradeId: data.tradeId, accepted: false });
            openTradeModalWithCounter(data);
        };
    }
}

function closePassPlayTradeModal() {
    const modal = document.getElementById('pass-play-trade-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function openTradeModalWithCounter(data) {
    const tradeOverlay = document.getElementById('trade-overlay');
    if (!tradeOverlay) return;
    tradeOverlay.classList.remove('hidden');
    
    const partnerSelect = document.getElementById('trade-partner-select');
    if (partnerSelect) {
        partnerSelect.value = data.proposerUuid;
        partnerSelect.dispatchEvent(new Event('change'));
    }

    const myCashInput = document.getElementById('trade-my-cash');
    const partnerCashInput = document.getElementById('trade-partner-cash');
    if (myCashInput) myCashInput.value = data.requestCash || 0;
    if (partnerCashInput) partnerCashInput.value = data.offerCash || 0;

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `Counter-Offer: Adjust your terms for ${data.proposerName} and click Propose Trade!`,
        timer: 4500,
        showConfirmButton: false
    });
}

socket.on('tradeResult', (data) => {
    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        title: data.message,
        icon: data.accepted ? 'success' : 'info'
    });
    const overlay = document.getElementById('trade-overlay');
    if (overlay && data.accepted) {
        overlay.classList.add('hidden');
    }
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

window.promptEditName = function() {
    window.showUserSelectionModal();
};

const quitLobbyButtons = document.querySelectorAll('#quit-lobby-btn, .quit-lobby-btn');
quitLobbyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        Swal.fire({
            title: 'Restart Game & Return to Lobby?',
            text: 'This will reset all properties, cash, and positions so you can add new players or bots!',
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
});

async function initShareLink() {
    const input = document.getElementById('monopoly-share-url');
    const copyBtn = document.getElementById('copy-monopoly-link-btn');
    const hint = document.getElementById('monopoly-ip-hint');
    if (!input) return;

    let shareUrl = window.location.href;
    try {
        const res = await fetch('/api/server-info');
        if (res.ok) {
            const data = await res.json();
            if (data.primaryIp && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                shareUrl = `http://${data.primaryIp}:${data.port || 3000}/monopoly/index.html`;
                if (hint) hint.textContent = `Wi-Fi IP: ${data.primaryIp} (Share with phones/PCs on your Wi-Fi)`;
            }
        }
    } catch (e) {
        console.warn('Could not fetch server-info', e);
    }

    input.value = shareUrl;

    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(input.value).then(() => {
                const orig = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                copyBtn.style.background = '#16a34a';
                setTimeout(() => {
                    copyBtn.textContent = orig;
                    copyBtn.style.background = '';
                }, 2000);
            }).catch(() => {
                input.select();
                document.execCommand('copy');
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
            });
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initShareLink();
    initFullscreen();
});
initShareLink();
initFullscreen();

// ====== FULLSCREEN SUPPORT ======
function initFullscreen() {
    const fsBtn = document.getElementById('fullscreen-btn');
    if (!fsBtn) return;

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Fullscreen request failed:', err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(err => {
                    console.warn('Exit fullscreen failed:', err);
                });
            }
        }
    }

    fsBtn.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fsBtn.innerHTML = '🗗';
            fsBtn.title = 'Exit Fullscreen (F or Esc)';
        } else {
            fsBtn.innerHTML = '⛶';
            fsBtn.title = 'Toggle Fullscreen (F)';
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.key === 'f' || e.key === 'F') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
            toggleFullscreen();
        }
    });
}

// ====== VICTORY CELEBRATION & GAME OVER ======
function fireVictoryConfetti() {
    if (typeof confetti === 'function') {
        const count = 220;
        const defaults = { origin: { y: 0.7 } };

        function fire(particleRatio, opts) {
            confetti(Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio)
            }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    }
}

socket.on('gameOver', (data) => {
    if (window.SoundFX && window.SoundFX.winGame) window.SoundFX.winGame();
    fireVictoryConfetti();

    const isWinnerMe = (data.winnerUuid === myUuid);
    const titleText = isWinnerMe ? '🎉 VICTORY! YOU WON!' : `👑 ${data.winnerName} WINS!`;
    const message = isWinnerMe
        ? `Supreme tycoon status! You drove all competitors into bankruptcy and seized total ownership of Megacity Monopoly!`
        : `All other tycoons went bankrupt. ${data.winnerName} dominates the board!`;

    Swal.fire({
        title: titleText,
        html: `
            <div style="text-align: center; padding: 10px 0;">
                <div style="font-size: 3.5rem; margin-bottom: 8px;">🏆</div>
                <p style="font-size: 1rem; color: #475569; margin-bottom: 16px;">${message}</p>
                <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 16px;">
                    <div style="background: #f8fafc; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 0.72rem; color: #64748b; font-weight: 800; letter-spacing: 0.5px;">FINAL CASH</div>
                        <div style="font-size: 1.35rem; font-weight: 900; color: #16a34a; margin-top: 2px;">$${Number(data.winnerCash || 0).toLocaleString()}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 0.72rem; color: #64748b; font-weight: 800; letter-spacing: 0.5px;">PROPERTIES OWNED</div>
                        <div style="font-size: 1.35rem; font-weight: 900; color: #2563eb; margin-top: 2px;">${data.propertiesCount || 0}</div>
                    </div>
                </div>
            </div>
        `,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '🔄 Play Again',
        confirmButtonColor: '#16a34a',
        denyButtonText: '📋 Back to Lobby',
        denyButtonColor: '#2563eb',
        cancelButtonText: '🏆 Wall of Fame',
        cancelButtonColor: '#eab308',
        allowOutsideClick: false,
        customClass: { popup: 'glass-panel' }
    }).then((result) => {
        if (result.isConfirmed) {
            socket.emit('restartGame');
        } else if (result.isDenied) {
            socket.emit('quitToLobby');
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            window.location.href = '/#wall-of-fame';
        }
    });
});
