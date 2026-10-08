import re
with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\public\monopoly\boardData.js", "r", encoding="utf-8") as f:
    text = f.read()
tiles = re.findall(r'\{\s*"name"\s*:\s*"(.*?)"', text)
print(f"Tile 5: {tiles[5]}")
print(f"Tile 11: {tiles[11]}")
print(f"Tile 24: {tiles[24]}")
print(f"Tile 39: {tiles[39]}")
