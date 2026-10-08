import sys
file_path = r'c:\Users\Josphat Mburu\Documents\codes\ludo\server.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_use = '''    socket.on('useJailCard', () => {
        const uuid = socket.uuid;
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (uuid !== currentPid) return;
        const player = monopolyState.players[currentPid];
        if (player && player.inJail && player.getOutJailFree > 0) {
            player.getOutJailFree -= 1;
            player.inJail = false;
            monopolyIo.emit('systemMessage', ${player.username} used a Get Out of Jail Free card!);
            monopolyIo.emit('gameState', monopolyState);
        }
    });'''

new_use = '''    socket.on('useJailCard', () => {
        const player = monopolyState.players[socket.uuid];
        if (player && player.inJail && player.getOutJailFree > 0) {
            player.getOutJailFree -= 1;
            player.inJail = false;
            player.turnsInJail = 0;
            monopolyIo.emit('systemMessage', ${player.username} used a Get Out of Jail Free card!);
            monopolyIo.emit('gameState', monopolyState);
        }
    });'''

content = content.replace(old_use, new_use)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
