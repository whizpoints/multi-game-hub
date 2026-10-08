const fs = require('fs');
let content = fs.readFileSync('public/monopoly/game.js', 'utf8');

const oldStr = `        // if (!player.online) {
            // html += \`<div style="font-size: 0.7rem; color: #94a3b8; margin-top: 5px;">Offline</div>\`;
        }`;

content = content.replace(oldStr, "");
fs.writeFileSync('public/monopoly/game.js', content);
