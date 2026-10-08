const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

const newTokens = `const tokenSymbols = [
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M4 17h16v2H4zm2-2h12v-6c0-2-1.5-4-4-4h-4c-2.5 0-4 2-4 4v6z"/></svg>', // Hat
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M21.9 14.2l-2.3-5.3c-.3-.8-1.2-1.4-2.1-1.4H6.5c-.9 0-1.7.6-2.1 1.4l-2.3 5.3C1.4 14.9 1 15.6 1 16.5V20c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h16v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-3.5c0-.9-.4-1.6-1.1-2.3zM7.5 9h9c.3 0 .6.2.7.4l1.6 3.6H5.2L6.8 9.4c.1-.2.4-.4.7-.4zm-3 8c-.8 0-1.5-.7-1.5-1.5S3.7 14 4.5 14 6 14.7 6 15.5 5.3 17 4.5 17zm15 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"/></svg>', // Car
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M19 14h-5v-1c0-2-1.5-3.5-3.5-3.5H9V5c0-1.1-.9-2-2-2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2z"/></svg>', // Boot
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M19 8h-2V6c0-1.1-.9-2-2-2H9C7.9 4 7 4.9 7 6v1H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h1v3c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-3h2v3c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-5h1c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg>', // Dog
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M22 17c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2 0-.7.4-1.4 1-1.7V5c0-1.1.9-2 2-2h4c.7 0 1.4.4 1.7 1h4.6c.3-.6 1-1 1.7-1h4c1.1 0 2 .9 2 2v10.3c.6.3 1 1 1 1.7z"/></svg>', // Ship
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M14 2c-1.1 0-2 .9-2 2 0 .4.1.7.3 1H9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v9H8v2h8v-2h-2v-9h1c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-.3c.2-.3.3-.6.3-1 0-1.1-.9-2-2-2z"/></svg>', // Horse
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M21 16h-2v-2h-5l-2-6H4c-1.1 0-2 .9-2 2v2h2v4c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-2h5l2 6h4c1.1 0 2-.9 2-2v-2z"/></svg>', // Cart
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M16 4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-3 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V6h2v2z"/></svg>'  // Thimble
];`;

server = server.replace(/const tokenSymbols = Array\(8\)[\s\S]*?<\/svg>'\);/g, newTokens);

fs.writeFileSync('server.js', server);
console.log('Replaced symbols');
