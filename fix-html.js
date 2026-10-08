const fs = require('fs');
let h = fs.readFileSync('public/monopoly/index.html', 'utf8');
h = h.replace(/<div class="cube-face cube-face-[^>]+>[^<]+<\/div>/g, (m) => {
    const f = m.match(/cube-face-(front|back|right|left|top|bottom)/)[1];
    const map = {front:'⚀',back:'⚅',right:'⚂',left:'⚃',top:'⚄',bottom:'⚁'};
    return '<div class="cube-face cube-face-' + f + '">' + map[f] + '</div>';
});
fs.writeFileSync('public/monopoly/index.html', h);
console.log('Fixed');
