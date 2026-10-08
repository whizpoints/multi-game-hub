with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\server.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("Advance to Illinois Ave", "Advance to Mumbai")
content = content.replace("Advance to St. Charles Place", "Advance to Kobe")
content = content.replace("Take a trip to Reading Railroad", "Take a trip to Rail 3")
content = content.replace("Advance to Boardwalk", "Advance to Baku")

with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\server.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")
