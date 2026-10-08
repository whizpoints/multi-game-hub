const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

const target = "if (me && me.pendingAction && me.pendingAction.type === 'buy') {";
const drawCardLogic = `
    if (me && me.pendingAction && me.pendingAction.type === 'draw_card') {
        const deckName = me.pendingAction.deck === 'chance' ? 'Chance' : 'Community Chest';
        if (!window.isPromptingCard) {
            window.isPromptingCard = true;
            Swal.fire({
                title: \`Draw a \${deckName} Card\`,
                html: \`
                    <div style="background: \${me.pendingAction.deck === 'chance' ? '#ef4444' : '#3b82f6'}; color: white; padding: 40px 20px; border-radius: 12px; cursor: pointer; border: 4px solid #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="Swal.clickConfirm()">
                        <div style="font-size: 3rem; font-weight: 900;">?</div>
                        <div style="font-size: 1.2rem; font-weight: bold; margin-top: 10px;">CLICK TO REVEAL</div>
                    </div>
                \`,
                showConfirmButton: false,
                allowOutsideClick: false,
                background: 'transparent',
                backdrop: 'rgba(15, 23, 42, 0.9)'
            }).then(() => {
                window.isPromptingCard = false;
                socket.emit('resolveCard');
            });
        }
    }
`;

if (!game.includes("window.isPromptingCard = true;")) {
    game = game.replace(target, drawCardLogic + '\n    ' + target);
    fs.writeFileSync('public/monopoly/game.js', game);
    console.log('Injected draw_card logic!');
} else {
    console.log('Already injected!');
}
