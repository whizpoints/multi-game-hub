const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// Add global reference
if (!server.includes('let globalEndTurn = null;')) {
    server = server.replace(/const monopolyState = \{/, 'let globalEndTurn = null;\nconst monopolyState = {');
}

// Update endAuction to use the global reference
server = server.replace(/setTimeout\(endTurnOrRollAgain, 2000\);/g, "setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 2000);");

// Same for applyCard which is also outside!
server = server.replace(/setTimeout\(endTurnOrRollAgain, 1000\);/g, "setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 1000);");

// Hook the reference inside connection
const regexHook = /function endTurnOrRollAgain\(\) \{/;
if (!server.includes('globalEndTurn = endTurnOrRollAgain;')) {
    server = server.replace(regexHook, "globalEndTurn = endTurnOrRollAgain;
  function endTurnOrRollAgain() {");
}

fs.writeFileSync('server.js', server);
console.log('Fixed endTurnOrRollAgain scope reference!');
