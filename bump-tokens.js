const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Bump token sizes on the board from 24x24 to 40x40
game = game.replace(/width: 24px; height: 24px;/g, "width: 40px; height: 40px;");
game = game.replace(/width: 32px; height: 32px;/g, "width: 40px; height: 40px;");
// Adjust offsets to make sure the bigger tokens center nicely
game = game.replace(/offsetLeft = \(charCode % 5\) \* 8 - 16;/g, "offsetLeft = (charCode % 5) * 12 - 24;");
game = game.replace(/offsetTop = \(charCode % 3\) \* 8 - 8;/g, "offsetTop = (charCode % 3) * 12 - 12;");

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Token sizes and offsets bumped');
