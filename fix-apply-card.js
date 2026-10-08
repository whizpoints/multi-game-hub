const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const oldApplyCard = `    monopolyIo.emit('systemMessage', \\\`\\\${\player.username} drew: "\\\${\card.text}"\\\`);`;
const newApplyCard = `    monopolyIo.emit('systemMessage', \`\${player.username} drew: "\${card.text}"\`);
    monopolyIo.emit('cardDrawn', { uuid, deck: player.pendingAction ? player.pendingAction.deck : (card.action.includes('chest') ? 'chest' : 'chance'), text: card.text });`;

server = server.replace(/monopolyIo\.emit\('systemMessage', `\$\{player\.username\} drew: "\$\{card\.text\}"`\);/, "monopolyIo.emit('systemMessage', `\${player.username} drew: \"\${card.text}\"`);\n    monopolyIo.emit('cardDrawn', { uuid, text: card.text });");

fs.writeFileSync('server.js', server);
console.log('Added cardDrawn event to applyCard');
