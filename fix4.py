import sys
file_path = r'c:\Users\Josphat Mburu\Documents\codes\ludo\server.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_resolve = '''        const moved = applyCard(currentPid, drawnCard);
        
        if (moved) {
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { handleLanding(currentPid); }, 1500);
        } else {
            player.pendingAction = null;
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 4000);
        }'''

new_resolve = '''        const moved = applyCard(currentPid, drawnCard);
        player.pendingAction = null;
        
        if (moved) {
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { handleLanding(currentPid); }, 1500);
        } else {
            monopolyIo.emit('gameState', monopolyState);
            setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 4000);
        }'''
content = content.replace(old_resolve, new_resolve)


old_bot = '''                        const moved = applyCard(targetUuid, drawnCard);
                        if (moved) {
                            monopolyIo.emit('gameState', monopolyState);
                            setTimeout(() => { handleLanding(targetUuid); }, 1500);
                            return;
                        }
                    }
                    if (monopolyState.players[targetUuid]) monopolyState.players[targetUuid].pendingAction = null;
                    monopolyIo.emit('gameState', monopolyState);
                    setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 4000);'''

new_bot = '''                        const moved = applyCard(targetUuid, drawnCard);
                        if (monopolyState.players[targetUuid]) monopolyState.players[targetUuid].pendingAction = null;
                        if (moved) {
                            monopolyIo.emit('gameState', monopolyState);
                            setTimeout(() => { handleLanding(targetUuid); }, 1500);
                            return;
                        }
                    }
                    if (monopolyState.players[targetUuid]) monopolyState.players[targetUuid].pendingAction = null;
                    monopolyIo.emit('gameState', monopolyState);
                    setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 4000);'''
content = content.replace(old_bot, new_bot)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
