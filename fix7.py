with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\server.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    line = line.replace("Bank pays you dividend of '", "Bank pays you dividend of $50'")
    line = line.replace("Pay poor tax of '", "Pay poor tax of $15'")
    line = line.replace("Pay each player '", "Pay each player $50'")
    line = line.replace("Your building loan matures. Collect '", "Your building loan matures. Collect $150'")
    line = line.replace("Speeding fine '", "Speeding fine $15'")
    line = line.replace("crossword competition. Collect '", "crossword competition. Collect $100'")
    line = line.replace("Bank error in your favor. Collect '", "Bank error in your favor. Collect $200'")
    line = line.replace("Doctor\\'s fees. Pay '", "Doctor\\'s fees. Pay $50'")
    line = line.replace("From sale of stock you get '", "From sale of stock you get $50'")
    line = line.replace("Holiday Fund matures. Receive '", "Holiday Fund matures. Receive $100'")
    line = line.replace("Income tax refund. Collect '", "Income tax refund. Collect $20'")
    line = line.replace("Collect  from every", "Collect $10 from every")
    line = line.replace("Life insurance matures. Collect '", "Life insurance matures. Collect $100'")
    line = line.replace("Pay hospital fees of '", "Pay hospital fees of $100'")
    line = line.replace("Pay school fees of '", "Pay school fees of $150'")
    line = line.replace("Receive  consultancy", "Receive $25 consultancy")
    line = line.replace("street repairs. Pay '", "street repairs. Pay $40'")
    line = line.replace("beauty contest. Collect '", "beauty contest. Collect $10'")
    line = line.replace("You inherit '", "You inherit $100'")
    new_lines.append(line)

with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\server.js", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Done!")
