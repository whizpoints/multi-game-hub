with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\server.js", "r", encoding="utf-8") as f:
    content = f.read()

old_logic = '''    } else if (card.action.startsWith('pay_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash -= amt;'''

new_logic = '''    } else if (card.action === 'street_repairs') {
        let houses = 0;
        let hotels = 0;
        const boardData = require('./public/monopoly/boardData.js');
        boardData.forEach((t, i) => {
            if (t.type === 'property' && monopolyState.properties[i] && monopolyState.properties[i].owner === uuid) {
                const h = monopolyState.properties[i].houses || 0;
                if (h === 5) {
                    hotels += 1;
                } else {
                    houses += h;
                }
            }
        });
        const total = (houses * 40) + (hotels * 100);
        player.cash -= total;
    } else if (card.action.startsWith('pay_')) {
        const amt = parseInt(card.action.split('_')[1], 10);
        player.cash -= amt;'''

content = content.replace(old_logic, new_logic)

with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\server.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done Logic!")
