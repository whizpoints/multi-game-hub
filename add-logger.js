const fs = require('fs');
let js = fs.readFileSync('public/monopoly/game.js', 'utf8');
const errLogger = `
window.addEventListener('error', function(event) {
    fetch('/log-error?msg=' + encodeURIComponent(event.message + ' at ' + event.filename + ':' + event.lineno));
});
window.addEventListener('unhandledrejection', function(event) {
    fetch('/log-error?msg=' + encodeURIComponent(event.reason));
});
`;
fs.writeFileSync('public/monopoly/game.js', errLogger + js);

let srv = fs.readFileSync('server.js', 'utf8');
const srvLogger = `
app.get('/log-error', (req, res) => {
    console.error("CLIENT ERROR:", req.query.msg);
    res.send('ok');
});
`;
srv = srv.replace("app.use(express.static('public'));", "app.use(express.static('public'));\n" + srvLogger);
fs.writeFileSync('server.js', srv);
console.log('Added error loggers');
