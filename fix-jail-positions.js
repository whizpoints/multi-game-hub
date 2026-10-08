const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const oldPos = `    if (uuid) {
        const charCode = uuid.charCodeAt(0) || 0;
        offsetLeft = (charCode % 5) * 6 - 12;
        offsetTop = (charCode % 3) * 6 - 6;
    }
    
    tokenEl.style.position = 'absolute';
    tokenEl.style.left = '50%';
    tokenEl.style.top = '50%';
    tokenEl.style.transform = \`translate(calc(-50% + \${offsetLeft}px), calc(-50% + \${offsetTop}px))\`;`;

const newPos = `    if (uuid) {
        const charCode = uuid.charCodeAt(0) || 0;
        offsetLeft = (charCode % 5) * 6 - 12;
        offsetTop = (charCode % 3) * 6 - 6;
    }
    
    tokenEl.style.position = 'absolute';
    
    if (posIndex === 10) {
        // Check if player is IN JAIL or JUST VISITING
        // Use global state
        let p = state.players[uuid];
        
        if (p && p.inJail) {
            tokenEl.style.left = '75%';
            tokenEl.style.top = '25%';
        } else {
            tokenEl.style.left = '30%';
            tokenEl.style.top = '70%';
        }
    } else {
        tokenEl.style.left = '50%';
        tokenEl.style.top = '50%';
    }
    tokenEl.style.transform = \`translate(calc(-50% + \${offsetLeft}px), calc(-50% + \${offsetTop}px))\`;`;

if (game.includes(oldPos)) {
    game = game.replace(oldPos, newPos);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log('Fixed jail positions');
}
