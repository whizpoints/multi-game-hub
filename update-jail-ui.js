const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// Hook up the buttons
const eventHook = `
const payJailBtn = document.getElementById('pay-jail-btn');
if (payJailBtn) payJailBtn.addEventListener('click', () => socket.emit('payJailFine'));

const useJailCardBtn = document.getElementById('use-jail-card-btn');
if (useJailCardBtn) useJailCardBtn.addEventListener('click', () => socket.emit('useJailCard'));
`;
if (!game.includes("document.getElementById('pay-jail-btn')")) {
    game = game.replace(/rollBtn\.addEventListener\('click', \(\) => \{\s*socket\.emit\('rollDice'\);\s*\}\);/, "rollBtn.addEventListener('click', () => { socket.emit('rollDice'); });\n" + eventHook);
}

// Show/hide logic in updateControls
const oldJailControls = `            if (state.players[currentTurnUuid].inJail) {
                rollBtn.textContent = 'ROLL FOR DOUBLES (JAIL)';
                if (!window.hasPromptedJailThisTurn && currentTurnUuid === myUuid) {
                    window.hasPromptedJailThisTurn = true;
                    Swal.fire({
                        title: 'You are in Jail!',
                        text: 'You can pay $50 to get out now, or roll for doubles (if you fail 3 times, you must pay).',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Pay $50',
                        cancelButtonText: 'Roll for Doubles',
                        confirmButtonColor: '#22c55e',
                        cancelButtonColor: '#3b82f6',
                        background: '#ffffff',
                        customClass: { title: 'swal-title', htmlContainer: 'swal-text' }
                    }).then((res) => {
                        if (res.isConfirmed) {
                            socket.emit('payJailFine');
                        } else if (res.dismiss === Swal.DismissReason.cancel) {
                            socket.emit('rollDice');
                        }
                    });
                }
            } else {
                window.hasPromptedJailThisTurn = false;
                rollBtn.textContent = 'ROLL DICE';
            }`;

const newJailControls = `            if (state.players[currentTurnUuid].inJail) {
                rollBtn.textContent = 'ROLL FOR DOUBLES';
                if (payJailBtn) payJailBtn.style.display = 'block';
                if (useJailCardBtn && state.players[currentTurnUuid].getOutJailFree > 0) {
                    useJailCardBtn.style.display = 'block';
                } else if (useJailCardBtn) {
                    useJailCardBtn.style.display = 'none';
                }
            } else {
                rollBtn.textContent = 'ROLL DICE';
                if (payJailBtn) payJailBtn.style.display = 'none';
                if (useJailCardBtn) useJailCardBtn.style.display = 'none';
            }`;

game = game.replace(oldJailControls, newJailControls);

// Also reset prompting on turn changed (not needed since we removed the prompt, but good to have)
game = game.replace(/socket\.on\('turnChanged', \(data\) => \{/, "socket.on('turnChanged', (data) => {\n    if(document.getElementById('pay-jail-btn')) document.getElementById('pay-jail-btn').style.display = 'none';\n    if(document.getElementById('use-jail-card-btn')) document.getElementById('use-jail-card-btn').style.display = 'none';");

fs.writeFileSync('public/monopoly/game.js', game);
console.log('Client jail buttons updated');
