with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\public\monopoly\index.html", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("game.js?v=2", "game.js?v=3")

with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\public\monopoly\index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated index.html cache buster")
