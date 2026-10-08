const assert = require('assert');

// Simulate the logic in server.js handleRollDice logic for Jail.
let player = {
    username: "Test",
    inJail: true,
    jailTurns: 0,
    cash: 50,
    debtState: null,
    doublesCount: 0
};

// Turn 1: Don't roll doubles
let d1 = 1, d2 = 2, isDouble = false;
let wasInJail = player.inJail;

if (player.inJail) {
    if (isDouble) {
        player.inJail = false;
        player.jailTurns = 0;
    } else {
        player.jailTurns = (player.jailTurns || 0) + 1;
        if (player.jailTurns >= 3) {
            // pay
        } else {
            console.log("Stays in jail, turn:", player.jailTurns);
        }
    }
}
assert.strictEqual(player.inJail, true);
assert.strictEqual(player.jailTurns, 1);

// Turn 2: Don't roll doubles
player.jailTurns = 1;
d1 = 1; d2 = 2; isDouble = false;
if (player.inJail) {
    if (isDouble) {
        // ...
    } else {
        player.jailTurns = (player.jailTurns || 0) + 1;
        if (player.jailTurns >= 3) {
            // pay
        } else {
            console.log("Stays in jail, turn:", player.jailTurns);
        }
    }
}
assert.strictEqual(player.inJail, true);
assert.strictEqual(player.jailTurns, 2);

// Turn 3: Don't roll doubles - must pay and get out
player.jailTurns = 2;
d1 = 1; d2 = 2; isDouble = false;
if (player.inJail) {
    if (isDouble) {
        // ...
    } else {
        player.jailTurns = (player.jailTurns || 0) + 1;
        if (player.jailTurns >= 3) {
            if (player.cash >= 50) {
                player.cash -= 50;
                player.inJail = false;
                player.jailTurns = 0;
                console.log("Served 3 turns, paid 50, got out");
            }
        } else {
            console.log("Stays in jail, turn:", player.jailTurns);
        }
    }
}
assert.strictEqual(player.inJail, false);
assert.strictEqual(player.jailTurns, 0);
assert.strictEqual(player.cash, 0);

console.log("Jail logic tests passed!");
