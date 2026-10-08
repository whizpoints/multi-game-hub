const fs = require('fs');
let game = fs.readFileSync('public/monopoly/game.js', 'utf8');

// The top of the file currently looks like:
/*
window.addEventListener('error', function(event) {
    fetch('/log-error?msg=' + encodeURIComponent('Uncaught: ' + event.message + ' at ' + event.filename + ':' + event.lineno));
});
}
window.addEventListener('unhandledrejection', function(event) {
    fetch('/log-error?msg=' + encodeURIComponent('Unhandled Rejection: ' + (event.reason ? event.reason.stack || event.reason : '')));
});

}
window.addEventListener('unhandledrejection', function(event) {
    fetch('/log-error?msg=' + encodeURIComponent(event.reason));
});
*/

game = game.replace(/}\r?\nwindow\.addEventListener/g, "window.addEventListener");

// Now we need to make sure renderPlayersList is closed properly.
// It should be somewhere before "const socket = io('/monopoly');"
// Wait! `renderPlayersList` was inserted before `showPropertyDetails`. 
// Let's just find the end of renderPlayersList.
let rIndex = game.indexOf("function renderPlayersList(state)");
if (rIndex !== -1) {
    let sub = game.substring(rIndex);
    let btnIndex = sub.indexOf("add-local-btn').click()");
    if (btnIndex !== -1) {
        // the function needs a closing brace
        // let's just ensure we have one
    }
}

fs.writeFileSync('public/monopoly/game.js', game);
