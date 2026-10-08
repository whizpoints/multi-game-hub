const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const newTokens = `
const tokenSymbols = [
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>', // Heart
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"/></svg>', // Star
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M19 3H5L2 9l10 12L22 9l-3-6z"/></svg>', // Diamond
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.37-.71.39-.74l4.99-8.6h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/></svg>', // Bolt
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>', // Shield
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>', // Moon
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M2 19h20v2H2v-2zM4 17h16v-2l-2-10H6L4 15v2z"/></svg>', // Hat
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>' // Bell
];`;

server = server.replace(/const tokenSymbols = \[[\s\S]*?\];/, newTokens.trim());
fs.writeFileSync('server.js', server);
console.log('Vectors replaced');
