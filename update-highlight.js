const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// The second duplicate of renderPlayersList is the one JS uses, but let's replace BOTH
game = game.replace(/if \(uuid === currentTurnUuid\) \{\s+el\.style\.background = '#f1f5f9';\s+el\.style\.transform = 'scale\(1\.02\)';\s+\}/g, 
`if (uuid === currentTurnUuid) {
            el.style.background = '#e2e8f0';
            el.style.transform = 'scale(1.05)';
            el.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            el.style.borderLeft = \`8px solid \${player.color}\`;
        }`);

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Player card highlight updated');
