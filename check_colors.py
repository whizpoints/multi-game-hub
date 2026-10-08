import json, re
with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\public\monopoly\boardData.js", "r", encoding="utf-8") as f:
    text = f.read()

colors = re.findall(r'"color"\s*:\s*"(.*?)"', text)
names = re.findall(r'"name"\s*:\s*"(.*?)"', text)
print(list(set(colors)))
