const fs = require('fs');
let srv = fs.readFileSync('server.js', 'utf8');

const pawnSVG = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M12 2C10.3 2 9 3.3 9 5c0 1.3.8 2.4 1.9 2.8C9 9.3 7 11.9 7 15v1h10v-1c0-3.1-2-5.7-3.9-7.2C14.2 7.4 15 6.3 15 5c0-1.7-1.3-3-3-3zm-5 18v2h10v-2H7z"/></svg>';

srv = srv.replace(/const tokenSymbols = Array\(8\)\.fill\('\$\{ludoPawn\}'\);/, `const tokenSymbols = Array(8).fill('${pawnSVG}');`);

fs.writeFileSync('server.js', srv);
console.log('Fixed tokenSymbols in server.js');
