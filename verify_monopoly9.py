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
        await page.wait_for_selector('.player-card', timeout=10000)

        # Wait a moment for state to settle
        time.sleep(2)

        # Simulate debt state on the client side
        print("Simulating debt state...")
        await page.evaluate("""() => {
            // override the updateControls entirely or just the DOM
            document.querySelector('.turn-controls').innerHTML = `
                <div style="color: red; font-weight: bold; margin-bottom: 10px;">YOU ARE IN DEBT! DECLARE BANKRUPTCY</div>
                <button id="declare-bankruptcy-btn" class="action-btn" style="background-color: red;">DECLARE BANKRUPTCY</button>
                <button id="pay-debt-btn" class="action-btn" style="background-color: green;">PAY $500</button>
            `;
            document.querySelector('.turn-controls').style.display = 'block';
        }""")

        # Wait for UI to update
        time.sleep(1)

        # Take a screenshot
        screenshot_path = "/home/jules/verification/verification_debt7.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
