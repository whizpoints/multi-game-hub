const fs = require('fs');
const serverContent = fs.readFileSync('server.js', 'utf8');
const hubContent = fs.readFileSync('server-hub.js', 'utf8');

// We want to extract the entire Monopoly namespace from server-hub.js
const monopolyStart = hubContent.indexOf('const monopolyIo = io.of(\'/monopoly\');');
const monopolyEnd = hubContent.indexOf('// 3. LUDO NAMESPACE');

let monopolyCode = '';
if (monopolyStart !== -1 && monopolyEnd !== -1) {
    monopolyCode = hubContent.substring(monopolyStart, monopolyEnd);
} else {
    // just extract until disconnect
    const disEnd = hubContent.lastIndexOf('});\r\n});');
    monopolyCode = hubContent.substring(monopolyStart, disEnd + 8);
}

// Now replace the end of server.js
const serverEndIndex = serverContent.lastIndexOf('const PORT = process.env.PORT');

let newServerContent = serverContent.substring(0, serverEndIndex);
newServerContent += '\n// ════════════════════════════════════════════════════════════════\n';
newServerContent += '// MONOPOLY NAMESPACE\n';
newServerContent += '// ════════════════════════════════════════════════════════════════\n';
newServerContent += monopolyCode;
newServerContent += '\nconst PORT = process.env.PORT || 3000;\n';
newServerContent += 'server.listen(PORT, \'0.0.0.0\', () => {\n';
newServerContent += '  console.log(`\\n🎲 Multi-Game Hub (Ludo & Monopoly) running on port ${PORT}`);\n';
newServerContent += '});\n';

fs.writeFileSync('server.js', newServerContent);
console.log('Successfully merged Monopoly into server.js');
