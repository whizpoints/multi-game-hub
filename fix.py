import sys

file_path = r'c:\Users\Josphat Mburu\Documents\codes\ludo\server.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Decks missing amounts due to PowerShell interpolation
# We will replace the entire startGame function again

start_str = '''    socket.on('startGame', () => {
        if (true && monopolyState.status === 'LOBBY') {'''

end_str = '''            monopolyState.chanceDeck = shuffleDeck([...initialChanceDeck]);
            monopolyState.chestDeck = shuffleDeck([...initialChestDeck]);'''

idx1 = content.find(start_str)
idx2 = content.find(end_str)
if idx1 != -1 and idx2 != -1:
    new_decks = '''    socket.on('startGame', () => {
        if (true && monopolyState.status === 'LOBBY') {
            monopolyState.status = 'PLAYING';
            monopolyState.currentTurnIndex = 0;

            const initialChanceDeck = [
                { text: 'Advance to GO', action: 'advance_to', target: 0 },
                { text: 'Advance to Illinois Ave', action: 'advance_to', target: 24 },
                { text: 'Advance to St. Charles Place', action: 'advance_to', target: 11 },
                { text: 'Advance to nearest Utility', action: 'advance_utility' },
                { text: 'Advance to nearest Railroad', action: 'advance_rail' },
                { text: 'Bank pays you dividend of ', action: 'collect_50' },
                { text: 'Get Out of Jail Free', action: 'get_out_jail' },
                { text: 'Go Back 3 Spaces', action: 'go_back_3' },
                { text: 'Go directly to Jail', action: 'go_jail' },
                { text: 'Pay poor tax of ', action: 'pay_15' },
                { text: 'Take a trip to Reading Railroad', action: 'advance_to', target: 5 },
                { text: 'Advance to Boardwalk', action: 'advance_to', target: 39 },
                { text: 'You have been elected Chairman of the Board. Pay each player ', action: 'pay_all', amount: 50 },
                { text: 'Your building loan matures. Collect ', action: 'collect_150' },
                { text: 'Speeding fine ', action: 'pay_15' },
                { text: 'Won a crossword competition. Collect ', action: 'collect_100' }
            ];

            const initialChestDeck = [
                { text: 'Advance to GO', action: 'advance_to', target: 0 },
                { text: 'Bank error in your favor. Collect ', action: 'collect_200' },
                { text: 'Doctor\\'s fees. Pay ', action: 'pay_50' },
                { text: 'From sale of stock you get ', action: 'collect_50' },
                { text: 'Get Out of Jail Free', action: 'get_out_jail' },
                { text: 'Go directly to Jail', action: 'go_jail' },
                { text: 'Holiday Fund matures. Receive ', action: 'collect_100' },
                { text: 'Income tax refund. Collect ', action: 'collect_20' },
                { text: 'It is your birthday. Collect  from every player', action: 'collect_from_all', amount: 10 },
                { text: 'Life insurance matures. Collect ', action: 'collect_100' },
                { text: 'Pay hospital fees of ', action: 'pay_100' },
                { text: 'Pay school fees of ', action: 'pay_150' },
                { text: 'Receive  consultancy fee', action: 'collect_25' },
                { text: 'You are assessed for street repairs. Pay ', action: 'pay_40' },
                { text: 'You have won second prize in a beauty contest. Collect ', action: 'collect_10' },
                { text: 'You inherit ', action: 'collect_100' }
            ];

            function shuffleDeck(deck) {
                for (let i = deck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
                return deck;
            }

            monopolyState.chanceDeck = shuffleDeck([...initialChanceDeck]);
            monopolyState.chestDeck = shuffleDeck([...initialChestDeck]);'''
    content = content[:idx1] + new_decks + content[idx2 + len(end_str):]


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done decks!')
