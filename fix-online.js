const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const oldJoinGame = `    socket.on('joinGame', (data) => {
        socket.uuid = data.uuid;
        if (!monopolyState.players[data.uuid]) {`;

const newJoinGame = `    socket.on('joinGame', (data) => {
        socket.uuid = data.uuid;
        if (monopolyState.players[data.uuid]) {
            monopolyState.players[data.uuid].online = true;
        }
        if (!monopolyState.players[data.uuid]) {`;

if (server.includes(oldJoinGame)) {
    server = server.replace(oldJoinGame, newJoinGame);
    fs.writeFileSync('server.js', server);
    console.log('Fixed reconnect online status!');
} else {
    console.log('Could not find oldJoinGame');
}
