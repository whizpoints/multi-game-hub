const boardData = require("./public/monopoly/boardData.js");
const monopolyState = {
    players: {
        "p1": { cash: 1500, username: "Player1", isLocal: false }
    },
    properties: {
        1: { owner: "p1", houses: 0, mortgaged: false }
    }
};
const uuid = "p1";
const tileIndex = 1;

const prop = monopolyState.properties[tileIndex];
const player = monopolyState.players[uuid];
const tileData = boardData[tileIndex];

if (prop && (prop.owner === uuid) && !prop.mortgaged && (!prop.houses || prop.houses === 0)) {
    if (tileData.mortgageValue) {
        player.cash += tileData.mortgageValue;
        prop.mortgaged = true;
        console.log("Mortgaged successfully! Cash:", player.cash);
    } else {
        console.log("No mortgage value");
    }
} else {
    console.log("Conditions failed");
}
