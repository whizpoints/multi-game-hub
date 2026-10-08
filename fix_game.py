import sys

file_path = r'c:\Users\Josphat Mburu\Documents\codes\ludo\public\monopoly\game.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_animate = '''            tokenEl.style.transition = 'all 0.25s linear';
            let steps = hop.to - hop.from;
            if (steps < 0 && hop.from !== 30) steps += 40; 
            
            if (hop.from === 30 && hop.to === 10) {
                positionTokenAt(tokenEl, hop.uuid, 10);
                await new Promise(r => setTimeout(r, 400));
            } else {
                let current = hop.from;
                for (let i = 0; i < steps; i++) {
                    current = (current + 1) % 40;
                    positionTokenAt(tokenEl, hop.uuid, current);
                    await new Promise(r => setTimeout(r, 250)); 
                }
            }'''

new_animate = '''            tokenEl.style.transition = 'all 0.25s linear';
            let steps = hop.to - hop.from;
            let dir = 1;
            if (steps === -3) {
                dir = -1;
            } else if (steps < 0 && hop.from !== 30) {
                steps += 40;
            }
            steps = Math.abs(steps);
            
            if (hop.from === 30 && hop.to === 10) {
                positionTokenAt(tokenEl, hop.uuid, 10);
                await new Promise(r => setTimeout(r, 400));
            } else {
                let current = hop.from;
                for (let i = 0; i < steps; i++) {
                    current = (current + dir + 40) % 40;
                    positionTokenAt(tokenEl, hop.uuid, current);
                    await new Promise(r => setTimeout(r, 250)); 
                }
            }'''

content = content.replace(old_animate, new_animate)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
