import asyncio
from playwright.async_api import async_playwright
import time

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("Navigating to http://localhost:3000/monopoly/")
        await page.goto("http://localhost:3000/monopoly/")

        # Wait for the game to load
        await page.wait_for_selector('.board', timeout=10000)

        # Wait a moment for state to settle
        time.sleep(2)

        # Simulate debt state on the client side using the real logic
        print("Simulating debt state via updateControls()...")
        await page.evaluate("""() => {
            if (window.currentGameStateObj && window.myUuid) {
                const myId = window.myUuid;

                // Set game status to PLAYING so controls update
                window.currentGameStateObj.status = 'PLAYING';

                // Add debt to current player
                window.currentGameStateObj.players[myId].debtState = {
                    amount: 500,
                    creditor: 'bank'
                };
                window.currentGameStateObj.players[myId].cash = 1000;

                // Ensure it's my turn
                if (!window.currentGameStateObj.turnOrder.includes(myId)) {
                    window.currentGameStateObj.turnOrder.push(myId);
                }
                const myIndex = window.currentGameStateObj.turnOrder.indexOf(myId);
                window.currentGameStateObj.currentTurnIndex = myIndex;

                // Force UI update directly
                if (typeof updateControls === 'function') {
                    updateControls(window.currentGameStateObj);
                }
            }
        }""")

        # Wait for UI to update
        time.sleep(2)

        # Take a screenshot
        screenshot_path = "/home/jules/verification/verification_debt9.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
