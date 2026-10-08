const fs = require('fs');

const ludoPawn = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M12 2C10.3 2 9 3.3 9 5c0 1.3.8 2.4 1.9 2.8C9 9.3 7 11.9 7 15v1h10v-1c0-3.1-2-5.7-3.9-7.2C14.2 7.4 15 6.3 15 5c0-1.7-1.3-3-3-3zm-5 18v2h10v-2H7z"/></svg>`;

// 1. UPDATE SERVER.JS
let srv = fs.readFileSync('server.js', 'utf8');
srv = srv.replace(/const tokenSymbols = \['.*?\];/, `const tokenSymbols = Array(8).fill('\${ludoPawn}');`);
fs.writeFileSync('server.js', srv);

// 2. UPDATE GAME.JS
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');
// Fix all the innerHTML renders where there were broken emojis
// GO
game = game.replace(/<div style="color: #ef4444; font-size: 1\.5rem; margin: -5px 0;">.*?<\/div>/, '<div style="color: #ef4444; margin: -5px 0;"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg></div>');

// JAIL (The cop car)
game = game.replace(/<span style="font-size: 1\.6rem; margin-top: 2px;">.*?<\/span>/, '<span style="margin-top: 2px;"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c2410c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><path d="M8 11v10"></path><path d="M16 11v10"></path></svg></span>');

// GO TO JAIL
game = game.replace(/<div style="font-size: 2\.2rem;">.*?<\/div>/, '<div><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><path d="M8 11v10"></path><path d="M16 11v10"></path></svg></div>');

// The normal properties (station, utility, chest, chance, tax)
const iconsPatch = `
            let icon = '';
            if (tile.type === 'station') icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L3 8l5 5-3 3-3-1-1 1 3 3 1-1-1-3 3-3 5 5 1.2-.7c.4-.2.7-.6.6-1.1z"></path></svg>';
            else if (tile.type === 'utility' && tile.name.toLowerCase().includes('solar')) icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
            else if (tile.type === 'utility') icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>';
            else if (tile.type === 'chest') icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13"></path><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"></path></svg>';
            else if (tile.type === 'chance') icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            else if (tile.type === 'tax') icon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>';
`;

// We must replace the old block starting from "let icon = '';" to "if (icon) html += ..."
game = game.replace(/let icon = '';[\s\S]*?if \(icon\) html \+= `<div class="icon">\$\{icon\}<\/div>`;/, iconsPatch + "\n            if (icon) html += `<div class=\"icon\">\${icon}</div>`;");

// Replace the fallback token emoji in renderBoardTokens
game = game.replace(/tokenEl\.innerHTML = p\.symbol \|\| '.*?';/, `tokenEl.innerHTML = p.symbol || '\${ludoPawn}';`);
game = game.replace(/tokenEl\.style\.color = p\.color;/, ''); // ensure we inject it if needed
// Actually, we need to set color so the SVG fill works
game = game.replace(/board\.appendChild\(tokenEl\);/, "tokenEl.style.color = p.color;\n            board.appendChild(tokenEl);");

fs.writeFileSync('public/monopoly/game.js', game);

// 3. UPDATE INDEX.HTML (for the center hub decks)
let html = fs.readFileSync('public/monopoly/index.html', 'utf8');
html = html.replace(/<div class="deck-icon">.*?<\/div>\s*<div>CHANCE<\/div>/, '<div class="deck-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>\n                            <div>CHANCE</div>');
html = html.replace(/<div class="deck-icon">.*?<\/div>\s*<div>COMMUNITY<\/div>/, '<div class="deck-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13"></path><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"></path></svg></div>\n                            <div>COMMUNITY</div>');
fs.writeFileSync('public/monopoly/index.html', html);

console.log('All vectors applied successfully');
