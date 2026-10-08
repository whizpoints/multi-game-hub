const fs = require('fs');

// --- index.html ---
let html = fs.readFileSync('public/monopoly/index.html', 'utf8');
const auctionHTML = `
        <!-- AUCTION OVERLAY -->
        <div id="auction-overlay" class="hidden" style="position: absolute; inset: 0; background: rgba(15, 23, 42, 0.9); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;">
            <div style="background: #1e293b; padding: 30px; border-radius: 16px; width: 400px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 2px solid #334155;">
                <h2 style="font-size: 2rem; margin-bottom: 10px; color: #f59e0b; text-transform: uppercase;">LIVE AUCTION</h2>
                <h3 id="auction-property" style="font-size: 1.5rem; margin-bottom: 20px;">TROY</h3>
                
                <div style="font-size: 3rem; font-weight: 900; color: #22c55e; margin-bottom: 10px;" id="auction-bid">$10</div>
                <div id="auction-leader" style="font-size: 1rem; color: #94a3b8; margin-bottom: 20px;">Highest Bidder: NONE</div>
                
                <div style="font-size: 1.2rem; font-weight: bold; color: #ef4444; margin-bottom: 20px;" id="auction-timer">15s REMAINING</div>
                
                <div id="auction-controls" style="display: flex; gap: 10px; justify-content: center; margin-bottom: 15px;">
                    <button class="glass-btn" style="background: #3b82f6; flex: 1;" onclick="socket.emit('placeBid', 10)">BID +$10</button>
                    <button class="glass-btn" style="background: #8b5cf6; flex: 1;" onclick="socket.emit('placeBid', 50)">BID +$50</button>
                    <button class="glass-btn" style="background: #ef4444; flex: 1;" onclick="socket.emit('foldAuction')">FOLD</button>
                </div>
                
                <div id="auction-status" style="font-size: 0.85rem; color: #cbd5e1;">Waiting for bids...</div>
            </div>
        </div>
`;

if (!html.includes('id="auction-overlay"')) {
    html = html.replace('<!-- Center: The Board -->', auctionHTML + '\n        <!-- Center: The Board -->');
    fs.writeFileSync('public/monopoly/index.html', html);
    console.log('index.html updated with auction overlay');
}

// --- game.js ---
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const auctionUI = `
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
`;

if (!game.includes('state.status === \'AUCTION\'')) {
    game = game.replace(
        /function updateControls\(state\) \{/,
        "function updateControls(state) {\n" + auctionUI
    );
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log('game.js updated with auction UI');
}
