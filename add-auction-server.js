const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// We need to inject the auction logic into server.js
// First, add auction state variables to monopolyState
if (!server.includes('auction: null')) {
    server = server.replace(
        /properties: \{\},/,
        "properties: {},\n    auction: null,"
    );
}

// Add startAuction function
const auctionLogic = `
let auctionInterval = null;

function startAuction(tileIndex, basePrice) {
    monopolyState.status = 'AUCTION';
    const activeUuids = monopolyState.turnOrder.filter(uuid => {
        const p = monopolyState.players[uuid];
        return p && !p.debtState && !p.isBot; // bots fold instantly for now to keep it simple
    });
    
    monopolyState.auction = {
        tileIndex,
        currentBid: 10,
        highestBidder: null,
        activeBidders: activeUuids,
        timer: 15
    };
    
    monopolyIo.emit('gameState', monopolyState);
    monopolyIo.emit('systemMessage', \`Auction started for \${boardData[tileIndex].name}!\`);
    
    if (auctionInterval) clearInterval(auctionInterval);
    auctionInterval = setInterval(() => {
        if (monopolyState.status !== 'AUCTION') {
            clearInterval(auctionInterval);
            return;
        }
        monopolyState.auction.timer--;
        if (monopolyState.auction.timer <= 0 || monopolyState.auction.activeBidders.length < 2 && monopolyState.auction.highestBidder) {
            endAuction();
        } else if (monopolyState.auction.activeBidders.length === 0) {
            endAuction();
        } else {
            monopolyIo.emit('gameState', monopolyState); // Sync timer
        }
    }, 1000);
}

function endAuction() {
    clearInterval(auctionInterval);
    const auc = monopolyState.auction;
    monopolyState.status = 'PLAYING';
    monopolyState.auction = null;
    
    if (auc.highestBidder) {
        const winner = monopolyState.players[auc.highestBidder];
        if (winner) {
            winner.cash -= auc.currentBid;
            monopolyState.properties[auc.tileIndex] = { owner: auc.highestBidder, houses: 0 };
            monopolyIo.emit('systemMessage', \`\${winner.username} won the auction for \${boardData[auc.tileIndex].name} at $\${auc.currentBid}!\`);
        }
    } else {
        monopolyIo.emit('systemMessage', \`Nobody bid on \${boardData[auc.tileIndex].name}.\`);
    }
    
    monopolyIo.emit('gameState', monopolyState);
    setTimeout(endTurnOrRollAgain, 2000);
}

// Auction Socket Events
monopolyIo.on('connection', (socket) => {
    socket.on('placeBid', (amount) => {
        if (monopolyState.status !== 'AUCTION' || !monopolyState.auction) return;
        const uuid = socket.uuid;
        const player = monopolyState.players[uuid];
        if (!player || !monopolyState.auction.activeBidders.includes(uuid)) return;
        
        const newBid = monopolyState.auction.currentBid + amount;
        if (player.cash >= newBid) {
            monopolyState.auction.currentBid = newBid;
            monopolyState.auction.highestBidder = uuid;
            monopolyState.auction.timer = 10; // reset timer on bid
            monopolyIo.emit('systemMessage', \`\${player.username} bid $\${newBid}!\`);
            monopolyIo.emit('gameState', monopolyState);
        } else {
            socket.emit('errorMsg', "Not enough cash to make that bid!");
        }
    });

    socket.on('foldAuction', () => {
        if (monopolyState.status !== 'AUCTION' || !monopolyState.auction) return;
        const uuid = socket.uuid;
        monopolyState.auction.activeBidders = monopolyState.auction.activeBidders.filter(id => id !== uuid);
        const p = monopolyState.players[uuid];
        if (p) monopolyIo.emit('systemMessage', \`\${p.username} folded.\`);
        
        if (monopolyState.auction.activeBidders.length === 0 || 
           (monopolyState.auction.activeBidders.length === 1 && monopolyState.auction.highestBidder)) {
            endAuction();
        } else {
            monopolyIo.emit('gameState', monopolyState);
        }
    });
`;

// Inject auction logic before io.on('connection'
if (!server.includes('function startAuction')) {
    server = server.replace(/monopolyIo\.on\('connection', \(socket\) => \{/, auctionLogic);
}

// Hook startAuction into buyProperty
server = server.replace(
    /socket\.emit\('errorMsg', "Insufficient funds! Property sent to auction\."\);\n\s+monopolyIo\.emit\('systemMessage', `\$\{tileData\.name\} went to Auction! \(Auction bidding UI coming soon\)`\);/,
    "startAuction(tileIndex, tileData.price);"
);

server = server.replace(
    /monopolyIo\.emit\('systemMessage', `\$\{player\.username\} passed on \$\{tileData\.name\}\. It goes to Auction!`\);/,
    "startAuction(tileIndex, tileData.price);"
);

// We need to prevent endTurnOrRollAgain from firing immediately if status is AUCTION
// Actually wait! In buyProperty:
server = server.replace(
    /monopolyIo\.emit\('gameState', monopolyState\);\n\s+if \(player\.isBot\) \{/,
    `monopolyIo.emit('gameState', monopolyState);
    if (monopolyState.status === 'AUCTION') return;
    if (player.isBot) {`
);

fs.writeFileSync('server.js', server);
console.log('Auction server logic added');
