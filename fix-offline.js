const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// The code looks like this currently:
// // if (!player.online) {
// // html += `<div style="font-size: 0.7rem; color: #94a3b8; margin-top: 5px;">Offline</div>`;
// }

game = game.replace(/\/\/ if \(\!player\.online\) \{[\s\S]*?\/\/ html \+= `<div style="font-size: 0\.7rem; color: #94a3b8; margin-top: 5px;">Offline<\/div>`;\n\s*\}/g, "");
// And also try the non-commented version just in case
game = game.replace(/if \(\!player\.online\) \{[\s\S]*?html \+= `<div style="font-size: 0\.7rem; color: #94a3b8; margin-top: 5px;">Offline<\/div>`;\n\s*\}/g, "");

fs.writeFileSync('public/monopoly/game.js', game);
