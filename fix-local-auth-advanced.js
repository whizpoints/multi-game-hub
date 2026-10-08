const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const authCheckOld = "prop.owner === uuid";
const authCheckNew = "(prop.owner === uuid || (monopolyState.players[prop.owner] && monopolyState.players[prop.owner].isLocal && monopolyState.players[prop.owner].hostId === uuid))";

server = server.split(authCheckOld).join(authCheckNew);

// Also update auction controls!
// In auction, activeBidders array has the IDs.
// If it's a local player's turn to bid, `socket.emit('auctionBid')` from the host should count for the local player!
const auctionBidOld = `    socket.on('auctionBid', (amount) => {
        const uuid = socket.uuid;
        if (monopolyState.status !== 'AUCTION' || !monopolyState.auction) return;
        if (!monopolyState.auction.activeBidders.includes(uuid)) return;`;
const auctionBidNew = `    socket.on('auctionBid', (amount) => {
        if (monopolyState.status !== 'AUCTION' || !monopolyState.auction) return;
        
        let uuid = socket.uuid;
        // Check if the host is bidding for an active local player
        if (!monopolyState.auction.activeBidders.includes(uuid)) {
            const localActive = monopolyState.auction.activeBidders.find(id => {
                const p = monopolyState.players[id];
                return p && p.isLocal && p.hostId === socket.uuid;
            });
            if (localActive) uuid = localActive;
        }
        if (!monopolyState.auction.activeBidders.includes(uuid)) return;`;
server = server.replace(auctionBidOld, auctionBidNew);

const auctionFoldOld = `    socket.on('auctionFold', () => {
        const uuid = socket.uuid;
        if (monopolyState.status !== 'AUCTION' || !monopolyState.auction) return;
        if (!monopolyState.auction.activeBidders.includes(uuid)) return;`;
const auctionFoldNew = `    socket.on('auctionFold', () => {
        if (monopolyState.status !== 'AUCTION' || !monopolyState.auction) return;
        
        let uuid = socket.uuid;
        if (!monopolyState.auction.activeBidders.includes(uuid)) {
            const localActive = monopolyState.auction.activeBidders.find(id => {
                const p = monopolyState.players[id];
                return p && p.isLocal && p.hostId === socket.uuid;
            });
            if (localActive) uuid = localActive;
        }
        if (!monopolyState.auction.activeBidders.includes(uuid)) return;`;
server = server.replace(auctionFoldOld, auctionFoldNew);

fs.writeFileSync('server.js', server);
console.log('Fixed advanced auth checks (mortgage, auction, etc)');
