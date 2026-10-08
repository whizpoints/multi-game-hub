import asyncio
from playwright.async_api import async_playwright
import time

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("Navigating to http://localhost:3000/monopoly/")
        await page.goto("http://localhost:3000/monopoly/")

        # Wait for the game to load and WebSocket to connect
        await page.wait_for_selector('.board', timeout=10000)
        await page.wait_for_selector('.player-card', timeout=10000)

        # Wait a moment for state to settle
        time.sleep(2)

        # Simulate debt state on the client side
        print("Simulating debt state...")
        await page.evaluate("""() => {
            if (window.currentGameStateObj && window.myUuid) {
                const myId = window.myUuid;

                // Inject debt state
                window.currentGameStateObj.players[myId].debtState = {
                    amount: 500,
                    creditor: 'bank'
                };

                // Make it my turn so the controls update
                const myIndex = window.currentGameStateObj.turnOrder.indexOf(myId);
                if (myIndex !== -1) {
                    window.currentGameStateObj.currentTurnIndex = myIndex;
                }

                // Force UI update
                if (typeof updateControls === 'function') {
                    updateControls(window.currentGameStateObj);
                }
            }
        }""")

        # Wait for UI to update
        time.sleep(2)

        # Take a screenshot
        screenshot_path = "/home/jules/verification/verification_debt5.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
