import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("http://localhost:3000")

        await page.wait_for_selector("#join-btn")
        await page.click("#join-btn")

        await page.wait_for_selector("#start-game-btn")
        await page.click("#start-game-btn")

        # Wait for game to initialize
        await page.wait_for_timeout(2000)

        # Inject debt state and make it our turn
        await page.evaluate("""() => {
            const myId = window.myId;
            if (!window.currentGameStateObj) return;

            // Give ourselves a debt of 500
            window.currentGameStateObj.players[myId].debtState = { amount: 500, to: null, type: 'TAX' };
            // Make sure we don't have enough cash
            window.currentGameStateObj.players[myId].cash = 300;

            // Set it to be our turn!
            const myIndex = window.currentGameStateObj.turnOrder.indexOf(myId);
            window.currentGameStateObj.currentTurnIndex = myIndex;

            // Update UI
            window.updateControls(window.currentGameStateObj);
        }""")

        await page.wait_for_timeout(1000)

        await page.screenshot(path="verification_debt10.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
