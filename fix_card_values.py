with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\server.js", "r", encoding="utf-8") as f:
    content = f.read()

# Chest
content = content.replace("Bank error in your favor. Collect $200', action: 'collect_200'", "Bank error in your favor. Collect $2000', action: 'collect_2000'")
content = content.replace("Doctor\\'s fees. Pay $50', action: 'pay_50'", "Doctor\\'s fees. Pay $500', action: 'pay_500'")
content = content.replace("From sale of stock you get $50', action: 'collect_50'", "From sale of stock you get $500', action: 'collect_500'")
content = content.replace("Holiday Fund matures. Receive $100', action: 'collect_100'", "Holiday Fund matures. Receive $1000', action: 'collect_1000'")
content = content.replace("Income tax refund. Collect $20', action: 'collect_20'", "Income tax refund. Collect $2000', action: 'collect_2000'")
content = content.replace("Collect $10 from every player', action: 'collect_from_all', amount: 10", "Collect $100 from every player', action: 'collect_from_all', amount: 100")
content = content.replace("Life insurance matures. Collect $100', action: 'collect_100'", "Life insurance matures. Collect $1000', action: 'collect_1000'")
content = content.replace("Pay hospital fees of $100', action: 'pay_100'", "Pay hospital fees of $500', action: 'pay_500'")
content = content.replace("Pay school fees of $150', action: 'pay_150'", "Pay school fees of $500', action: 'pay_500'")
content = content.replace("Receive $25 consultancy fee', action: 'collect_25'", "Receive $250 consultancy fee', action: 'collect_250'")
content = content.replace("You are assessed for street repairs. Pay $40', action: 'pay_40'", "You are assessed for street repairs. Pay $40 per house and $100 per hotel', action: 'street_repairs'")
content = content.replace("beauty contest. Collect $10', action: 'collect_10'", "beauty contest. Collect $1000', action: 'collect_1000'")
content = content.replace("You inherit $100', action: 'collect_100'", "You inherit $1000', action: 'collect_1000'")

# Chance
content = content.replace("Bank pays you dividend of $50', action: 'collect_50'", "Bank pays you dividend of $500', action: 'collect_500'")
content = content.replace("Pay poor tax of $15', action: 'pay_15'", "Pay poor tax of $200', action: 'pay_200'")
content = content.replace("Pay each player $50', action: 'pay_all', amount: 50", "Pay each player $500', action: 'pay_all', amount: 500")
content = content.replace("Your building loan matures. Collect $150', action: 'collect_150'", "Your building loan matures. Collect $1500', action: 'collect_1500'")
content = content.replace("Speeding fine $15', action: 'pay_15'", "Speeding fine $200', action: 'pay_200'")
content = content.replace("crossword competition. Collect $100', action: 'collect_100'", "crossword competition. Collect $1000', action: 'collect_1000'")

with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\server.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done Text!")
