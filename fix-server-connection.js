const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// First, fix the dangling brackets by removing them.
// The dangling brackets look like this:
/*
    } else if (card.action.startsWith('collect_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash += amt;
    }
}
    }
});
*/
// Let's replace the end of applyCard and the dangling brackets with a clean applyCard end + connection wrapper.

const fixRegex = /\} else if \(card\.action\.startsWith\('collect_'\)\) \{[\s\S]*?socket\.on\('mortgageProperty'/;

const replacement = `    } else if (card.action.startsWith('collect_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash += amt;
    }
}

monopolyIo.on('connection', (socket) => {
    socket.on('resolveCard', () => {
        const uuid = socket.uuid;
        const currentPid = monopolyState.turnOrder[monopolyState.currentTurnIndex];
        if (uuid !== currentPid) return;
        const player = monopolyState.players[currentPid];
        if (!player || !player.pendingAction || player.pendingAction.type !== 'draw_card') return;
        
        const deckName = player.pendingAction.deck + 'Deck';
        if (!monopolyState[deckName] || monopolyState[deckName].length === 0) return;
        
        const drawnCard = monopolyState[deckName].shift();
        monopolyState[deckName].push(drawnCard); // put at bottom
        
        applyCard(currentPid, drawnCard);
        player.pendingAction = null;
        
        monopolyIo.emit('gameState', monopolyState);
        setTimeout(() => { if (globalEndTurn) globalEndTurn(); }, 1000);
    });

    socket.on('mortgageProperty'`;

server = server.replace(fixRegex, replacement);

fs.writeFileSync('server.js', server);
console.log('Fixed server.js missing connection block and dangling brackets!');
