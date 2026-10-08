const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// Fix joinGame
server = server.replace(/color: color,(\s+)isBot: false,/, "color: color,\n                symbol: tokenSymbols[monopolyState.turnOrder.length % tokenSymbols.length],$1isBot: false,");

// Fix addBot
server = server.replace(/color: color,(\s+)isBot: true,/, "color: color,\n                symbol: tokenSymbols[monopolyState.turnOrder.length % tokenSymbols.length],$1isBot: true,");

fs.writeFileSync('server.js', server);
console.log('Fixed symbol assignment');
