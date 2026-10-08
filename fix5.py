import sys
file_path = r'c:\Users\Josphat Mburu\Documents\codes\ludo\server.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_pay = '''    socket.on('payJailFine', () => {
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (socket.uuid === currentPid) {
            const player = monopolyState.players[socket.uuid];
            if (player && player.inJail) {
                if (player.cash >= 50) {
                    player.cash -= 50;
                    player.inJail = false;
                    monopolyIo.emit('systemMessage', ${player.username} paid  to leave jail.);
                    monopolyIo.emit('gameState', monopolyState);
                } else {
                    socket.emit('errorMsg', "Insufficient funds. Roll for doubles!");
                }
            }
        }
    });'''

new_pay = '''    socket.on('payJailFine', () => {
        const player = monopolyState.players[socket.uuid];
        if (player && player.inJail) {
            if (player.cash >= 50) {
                player.cash -= 50;
                player.inJail = false;
                player.turnsInJail = 0;
                monopolyIo.emit('systemMessage', ${player.username} paid  to leave jail.);
                monopolyIo.emit('gameState', monopolyState);
            } else {
                socket.emit('errorMsg', "Insufficient funds. Roll for doubles!");
            }
        }
    });'''

content = content.replace(old_pay, new_pay)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
