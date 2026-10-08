const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// Remove the bad hook if it exists inside the function body
server = server.replace(/function endTurnOrRollAgain\(\) \{\s*globalEndTurn = endTurnOrRollAgain;/g, "function endTurnOrRollAgain() {");

// Add the hook right before the function definition
server = server.replace(/function endTurnOrRollAgain\(\) \{/g, "globalEndTurn = endTurnOrRollAgain;\nfunction endTurnOrRollAgain() {");

fs.writeFileSync('server.js', server);
console.log('Fixed assignment');
