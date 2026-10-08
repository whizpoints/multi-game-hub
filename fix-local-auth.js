const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// 1. Fix addLocalPlayer to include isLocal: true
server = server.replace(
    "online: true, isBot: false, hostId: socket.uuid,", 
    "online: true, isBot: false, isLocal: true, hostId: socket.uuid,"
);

// 2. Fix rollDice
const rollDiceOld = `    socket.on('rollDice', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (socket.uuid === currentPid) {
            handleRollDice(socket.uuid);
        }
    });`;
const rollDiceNew = `    socket.on('rollDice', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        const p = monopolyState.players[currentPid];
        if (socket.uuid === currentPid || (p && p.isLocal && p.hostId === socket.uuid)) {
            handleRollDice(currentPid);
        }
    });`;
server = server.replace(rollDiceOld, rollDiceNew);

// 3. Fix payJailFine
const jailFineOld = `    socket.on('payJailFine', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (socket.uuid === currentPid) {
            const player = monopolyState.players[currentPid];`;
const jailFineNew = `    socket.on('payJailFine', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        const pAuth = monopolyState.players[currentPid];
        if (socket.uuid === currentPid || (pAuth && pAuth.isLocal && pAuth.hostId === socket.uuid)) {
            const player = monopolyState.players[currentPid];`;
server = server.replace(jailFineOld, jailFineNew);

// 4. Fix useJailCard
const useCardOld = `    socket.on('useJailCard', () => {
        const uuid = socket.uuid;
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (uuid !== currentPid) return;
        const player = monopolyState.players[currentPid];`;
const useCardNew = `    socket.on('useJailCard', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        const pAuth = monopolyState.players[currentPid];
        if (!(socket.uuid === currentPid || (pAuth && pAuth.isLocal && pAuth.hostId === socket.uuid))) return;
        const player = monopolyState.players[currentPid];`;
server = server.replace(useCardOld, useCardNew);

// 5. Fix resolveCard
const resolveOld = `    socket.on('resolveCard', () => {
        const uuid = socket.uuid;
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (uuid !== currentPid) return;
        const player = monopolyState.players[currentPid];`;
const resolveNew = `    socket.on('resolveCard', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        const pAuth = monopolyState.players[currentPid];
        if (!(socket.uuid === currentPid || (pAuth && pAuth.isLocal && pAuth.hostId === socket.uuid))) return;
        const player = monopolyState.players[currentPid];`;
server = server.replace(resolveOld, resolveNew);

// 6. Fix buyProperty
const buyPropOld = `    socket.on('buyProperty', (willBuy) => {
        const uuid = socket.uuid;
        const player = monopolyState.players[uuid];`;
const buyPropNew = `    socket.on('buyProperty', (willBuy) => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        const pAuth = monopolyState.players[currentPid];
        if (!(socket.uuid === currentPid || (pAuth && pAuth.isLocal && pAuth.hostId === socket.uuid))) return;
        const uuid = currentPid;
        const player = monopolyState.players[uuid];`;
server = server.replace(buyPropOld, buyPropNew);

// 7. Fix mortgage/unmortgage/buyHouse
// These typically use `const uuid = socket.uuid; const player = monopolyState.players[uuid];`
// But if it's a local player, they don't have their own socket.
// To fix this without massive refactoring, we can just find where `const uuid = socket.uuid` is used 
// and replace it with a helper that resolves to the local player if it's their turn.
// BUT mortgage/unmortgage can be done out of turn in Monopoly!
// If it's out of turn, how does the host specify WHICH local player is mortgaging?
// In `game.js`, the buttons are bound to `window.currentViewedTileIndex`.
// It emits `socket.emit('mortgageProperty', window.currentViewedTileIndex)`.
// The server then checks if `socket.uuid` owns it.
// If it's a local player, the host's `socket.uuid` does NOT own it, the `localId` owns it!
// To fix this globally for the Host, the host should be allowed to perform actions on ANY property owned by themselves OR their local players!

fs.writeFileSync('server.js', server);
console.log('Fixed basic turn-based auth for local players.');
