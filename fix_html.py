with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\public\monopoly\index.html", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('<script src="boardData.js"></script>', '<script src="boardData.js?v=2"></script>')
content = content.replace('<script src="game.js"></script>', '<script src="game.js?v=2"></script>')

with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\public\monopoly\index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")
