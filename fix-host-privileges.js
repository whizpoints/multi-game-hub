const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// 1. Let anyone add bots / local players / remove players / start game in Monopoly
const oldAddBot = `socket.on('addBot', () => {\n        if (socket.uuid === monopolyState.host`;
const newAddBot = `socket.on('addBot', () => {\n        if (true`;
server = server.replace(oldAddBot, newAddBot);

const oldStartGame = `socket.on('startGame', () => {\n        if (socket.uuid === monopolyState.host`;
const newStartGame = `socket.on('startGame', () => {\n        if (true`;
server = server.replace(oldStartGame, newStartGame);

const oldRemove = `socket.on('removePlayer', (targetUuid) => {\n        if (socket.uuid === monopolyState.host`;
const newRemove = `socket.on('removePlayer', (targetUuid) => {\n        if (true`;
server = server.replace(oldRemove, newRemove);

fs.writeFileSync('server.js', server);
console.log('Server logic relaxed to allow any connected user to manage the lobby.');

let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// 2. Change updateControls to show hostControlsEl to everyone in LOBBY
const oldUpdate = `if (state.status === 'LOBBY' && state.host === myUuid) {\n            hostControlsEl.classList.remove('hidden');\n        } else {\n            hostControlsEl.classList.add('hidden');\n        }`;
const newUpdate = `if (state.status === 'LOBBY') {\n            hostControlsEl.classList.remove('hidden');\n        } else {\n            hostControlsEl.classList.add('hidden');\n        }`;
game = game.replace(oldUpdate, newUpdate);

// 3. Change renderPlayersList to show the X button and the Empty Slot button to everyone
const oldListHostCheck1 = `&& state.host === myUuid && uuid !== myUuid`;
const newListHostCheck1 = `&& uuid !== myUuid`;
game = game.replace(oldListHostCheck1, newListHostCheck1);

const oldListHostCheck2 = `if (state.status === 'LOBBY' && state.host === myUuid && state.turnOrder.length < 8) {`;
const newListHostCheck2 = `if (state.status === 'LOBBY' && state.turnOrder.length < 8) {`;
game = game.replace(oldListHostCheck2, newListHostCheck2);

// 4. Ensure window.socket is set and used for promptEditName
game = game.replace(`const socket = io('/monopoly');`, `window.socket = io('/monopoly');\nconst socket = window.socket;`);
game = game.replace(`socket.emit('editName', name)`, `window.socket.emit('editName', name)`);

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Client logic relaxed to show host controls to everyone in the lobby.');
