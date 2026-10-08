const fs = require('fs');

// 1. UPDATE index.html
let html = fs.readFileSync('public/monopoly/index.html', 'utf8');
const diceRegex = /<div class="dice-container"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const authenticDiceHtml = `<div class="dice-container" style="display: flex; gap: 30px; margin-bottom: 20px;">
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
</div>`;

html = html.replace(diceRegex, authenticDiceHtml);
fs.writeFileSync('public/monopoly/index.html', html);


// 2. UPDATE style.css
let css = fs.readFileSync('public/monopoly/style.css', 'utf8');

// Replace old CSS
const oldCssRegex = /\/\* 3D Dice CSS \*\/[\s\S]*?@keyframes roll-animation \{[^}]+\}/;
const authenticCss = `/* 3D Dice CSS */
.dice-scene { width: 50px; height: 50px; perspective: 300px; }
.dice-cube {
  width: 50px; height: 50px; position: relative;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.dice-cube.rolling { animation: roll-animation 0.5s linear infinite; }
.dice-face {
  position: absolute;
  width: 50px; height: 50px;
  background: linear-gradient(145deg, #fafafa, #e8e8e8);
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.08);
}
.pip {
  position: absolute;
  width: 10px; height: 10px;
  background: radial-gradient(circle at 30% 30%, #555, #222);
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
}
.p-tl { top: 8px; left: 8px; }
.p-tr { top: 8px; right: 8px; }
.p-ml { top: 50%; left: 8px; transform: translateY(-50%); }
.p-mr { top: 50%; right: 8px; transform: translateY(-50%); }
.p-bl { bottom: 8px; left: 8px; }
.p-br { bottom: 8px; right: 8px; }
.p-c  { top: 50%; left: 50%; transform: translate(-50%, -50%); }

.face-1 { transform: rotateY(0deg) translateZ(25px); }
.face-2 { transform: rotateY(180deg) translateZ(25px); }
.face-3 { transform: rotateY(-90deg) translateZ(25px); }
.face-4 { transform: rotateY(90deg) translateZ(25px); }
.face-5 { transform: rotateX(-90deg) translateZ(25px); }
.face-6 { transform: rotateX(90deg) translateZ(25px); }

@keyframes roll-animation { 0% { transform: rotateX(0deg) rotateY(0deg); } 100% { transform: rotateX(360deg) rotateY(360deg); } }`;

css = css.replace(oldCssRegex, authenticCss);
fs.writeFileSync('public/monopoly/style.css', css);


// 3. UPDATE game.js
let js = fs.readFileSync('public/monopoly/game.js', 'utf8');

const rotRegex = /const rotMap = \{[\s\S]*?\};/;
const newRotMap = `const rotMap = {
            1: 'rotateY(0deg)',
            2: 'rotateY(180deg)',
            3: 'rotateY(-90deg)',
            4: 'rotateY(90deg)',
            5: 'rotateX(-90deg)',
            6: 'rotateX(90deg)'
        };`;
js = js.replace(rotRegex, newRotMap);

fs.writeFileSync('public/monopoly/game.js', js);

console.log('Dice reverted to authentic Ludo pips!');
