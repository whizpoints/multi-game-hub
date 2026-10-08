import json, re
with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\public\monopoly\boardData.js", "r", encoding="utf-8") as f:
    text = f.read()

types = re.findall(r'"type"\s*:\s*"(.*?)"', text)
names = re.findall(r'"name"\s*:\s*"(.*?)"', text)

for i in range(len(names)):
    t = types[i] if i < len(types) else "go"
    print(f"Tile {i}: {names[i]}, type: {t}")
