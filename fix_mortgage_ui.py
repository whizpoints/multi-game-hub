import sys

with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\public\monopoly\game.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the condition
old_cond = "if (prop.houses === 0) {"
new_cond = "if (!prop.houses || prop.houses === 0) {"
content = content.replace(old_cond, new_cond)

# 2. Add panel refresh to gameState
old_gs = "updateControls(state);"
new_gs = "updateControls(state);\n    if (window.currentViewedTileIndex !== undefined) { showPropertyDetails(boardData[window.currentViewedTileIndex]); }"
content = content.replace(old_gs, new_gs)

with open(r"c:\Users\Josphat Mburu\Documents\codes\ludo\public\monopoly\game.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Done Client!")
