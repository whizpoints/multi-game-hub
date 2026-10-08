const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:9229/a17421d6-84b2-4aeb-91b9-9417a8876a93');

ws.on('open', () => {
  console.log('Connected to debugger');
  // Execute code to unpause
  const expression = `
    if (typeof gs !== 'undefined' && gs.status === 'PAUSED') {
      gs.status = 'PLAYING';
      gs.pausedFor = null;
      io.emit('gameResumed');
      'UNPAUSED';
    } else {
      'NOT_PAUSED_OR_GS_NOT_FOUND';
    }
  `;
  
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: expression }
  }));
});

ws.on('message', (data) => {
  console.log('Response:', data.toString());
  ws.close();
});
