from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:3000/monopoly.html")
        time.sleep(2)  # Wait for socket connection and initial game state

        # Simulate Debt State for the local player
        page.evaluate('''() => {
            if (window.currentGameStateObj && window.socket) {
                const myId = window.socket.id;
                const myIndex = window.currentGameStateObj.players.findIndex(p => p.id === myId);
                if (myIndex !== -1) {
                    window.currentGameStateObj.currentPlayerIndex = myIndex;
                    window.currentGameStateObj.players[myIndex].debtState = { amount: 500 };
                    window.updateUI(window.currentGameStateObj);
                }
            }
        }''')

        time.sleep(1)
        page.screenshot(path="/home/jules/verification/verification_debt2.png")
        browser.close()

if __name__ == "__main__":
    run()
