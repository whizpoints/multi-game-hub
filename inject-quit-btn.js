const fs = require('fs');
let html = fs.readFileSync('public/monopoly/index.html', 'utf8');

const targetStr = '<div id="action-log" style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;"></div>\n            </div>';
const replacement = `<div id="action-log" style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;"></div>
            </div>
            <button id="quit-lobby-btn" class="glass-btn" style="background: #ef4444; margin-top: 10px; display: none;">QUIT TO LOBBY</button>`;

if (html.includes('<div id="action-log"')) {
    html = html.replace(targetStr, replacement);
    fs.writeFileSync('public/monopoly/index.html', html);
    console.log("Injected quit-lobby-btn into index.html");
}
