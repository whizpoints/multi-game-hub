// Basic test to simulate bankruptcy and debt payment
const assert = require('assert');

let state = {
    players: {
        'uuid1': { username: 'P1', cash: 10, debtState: null },
        'uuid2': { username: 'P2', cash: 100, debtState: null }
    },
    properties: {
        '1': { owner: 'uuid1', houses: 1 },
        '2': { owner: 'uuid1', houses: 0 }
    },
    turnOrder: ['uuid1', 'uuid2']
};

let player = state.players['uuid1'];
let owner = 'uuid2';
let rent = 50;

if (player.cash >= rent) {
    player.cash -= rent;
} else {
    player.debtState = { type: 'rent', amount: rent, creditor: owner };
}
assert.strictEqual(player.debtState.amount, 50);

// Simulate selling house
player.cash += 25; // sell house for 50/2
assert.strictEqual(player.cash, 35);

// Simulate paying debt (still not enough)
if (player.cash >= player.debtState.amount) {
    player.cash -= player.debtState.amount;
    player.debtState = false;
}
assert.strictEqual(player.debtState.amount, 50); // still in debt

// Simulate mortgaging property
player.cash += 30; // mortgage value
assert.strictEqual(player.cash, 65);

// Now they can pay
if (player.cash >= player.debtState.amount) {
    player.cash -= player.debtState.amount;
    state.players[player.debtState.creditor].cash += player.debtState.amount;
    player.debtState = false;
}
assert.strictEqual(player.cash, 15);
assert.strictEqual(player.debtState, false);
assert.strictEqual(state.players['uuid2'].cash, 150);

console.log("Bankruptcy/Debt logic tests passed!");
