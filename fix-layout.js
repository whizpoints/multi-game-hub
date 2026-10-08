const fs = require('fs');
let html = fs.readFileSync('public/monopoly/index.html', 'utf8');

const s = html.indexOf('<div class="center-hub">');
const e = html.indexOf('<!-- Right Sidebar: Property Details -->');

const centerHub = `                <div class="center-hub">
                    <div class="decks">
                        <div class="deck chance-deck">
                            <div class="deck-icon">❓</div>
                            <div>CHANCE</div>
                        </div>
                        <div class="dice-arena">
                            <div class="dice-container" style="display: flex; gap: 30px; margin-bottom: 20px;">
                                <div class="dice-scene">
                                    <div id="die1" class="dice-cube">
                                        <div class="dice-face face-1"><span class="pip p-c"></span></div>
                                        <div class="dice-face face-2"><span class="pip p-tl"></span><span class="pip p-br"></span></div>
                                        <div class="dice-face face-3"><span class="pip p-tl"></span><span class="pip p-c"></span><span class="pip p-br"></span></div>
                                        <div class="dice-face face-4"><span class="pip p-tl"></span><span class="pip p-tr"></span><span class="pip p-bl"></span><span class="pip p-br"></span></div>
                                        <div class="dice-face face-5"><span class="pip p-tl"></span><span class="pip p-tr"></span><span class="pip p-c"></span><span class="pip p-bl"></span><span class="pip p-br"></span></div>
                                        <div class="dice-face face-6"><span class="pip p-tl"></span><span class="pip p-tr"></span><span class="pip p-ml"></span><span class="pip p-mr"></span><span class="pip p-bl"></span><span class="pip p-br"></span></div>
                                    </div>
                                </div>
                                <div class="dice-scene">
                                    <div id="die2" class="dice-cube">
                                        <div class="dice-face face-1"><span class="pip p-c"></span></div>
                                        <div class="dice-face face-2"><span class="pip p-tl"></span><span class="pip p-br"></span></div>
                                        <div class="dice-face face-3"><span class="pip p-tl"></span><span class="pip p-c"></span><span class="pip p-br"></span></div>
                                        <div class="dice-face face-4"><span class="pip p-tl"></span><span class="pip p-tr"></span><span class="pip p-bl"></span><span class="pip p-br"></span></div>
                                        <div class="dice-face face-5"><span class="pip p-tl"></span><span class="pip p-tr"></span><span class="pip p-c"></span><span class="pip p-bl"></span><span class="pip p-br"></span></div>
                                        <div class="dice-face face-6"><span class="pip p-tl"></span><span class="pip p-tr"></span><span class="pip p-ml"></span><span class="pip p-mr"></span><span class="pip p-bl"></span><span class="pip p-br"></span></div>
                                    </div>
                                </div>
                            </div>
                            <button id="roll-btn" class="glass-btn glow-primary">ROLL DICE</button>
                        </div>
                        <div class="deck chest-deck">
                            <div class="deck-icon">🎁</div>
                            <div>COMMUNITY</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        `;
html = html.substring(0, s) + centerHub + html.substring(e);
fs.writeFileSync('public/monopoly/index.html', html);

// Server Fix
let srv = fs.readFileSync('server.js', 'utf8');
const regex = /const tokenSymbols = \[[^\]]+\];/;
const correctSymbols = "const tokenSymbols = ['\\uD83C\\uDFA9', '\\uD83C\\uDFCE\\uFE0F', '\\uD83D\\uDC15', '\\uD83D\\uDEA2', '\\uD83D\\uDC62', '\\uD83D\\uDC08', '\\uD83D\\uDC27', '\\uD83E\\uDD96'];";
srv = srv.replace(regex, correctSymbols);
fs.writeFileSync('server.js', srv);
