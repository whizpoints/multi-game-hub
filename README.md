<div align="center">
  <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/master/svgs/solid/dice.svg" width="100" height="100" alt="Logo">
  <h1>🎲 Multi-Game Hub (Ludo & Monopoly)</h1>
  <p><strong>A Real-time Multiplayer Web Application for classic board games.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="NodeJS">
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="ExpressJS">
    <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io">
    <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  </p>
</div>

<hr>

## 🌟 Overview
Welcome to the **Multi-Game Hub**, a fast, real-time multiplayer server running the ultimate classics: **Ludo** and **Monopoly** (with custom Global Cities properties!). Built natively with standard web technologies, it features automated bots, real-time animations, localized multiplayer on single devices, and seamless network play.

## 🚀 Implemented Features

### 🏢 Monopoly (Global Cities Edition)
*   **Real-time Multiplayer:** Seamless `Socket.io` synchronization with a robust event-driven architecture.
*   **Custom Board Data:** Features world cities (Mumbai, Kobe, Baku, etc.) instead of standard properties, scaling property values and rents by a massive **x10 multiplier**.
*   **Intelligent Bot AI:** Bots that can roll, buy unowned properties, automatically evaluate and pay jail fines, and seamlessly pass turns.
*   **Advanced Game Rules Enforced:**
    *   **Jail Mechanics:** Tracks 3-turn limits, doubles to escape, and perfectly handles the $50 early release fine/jail cards.
    *   **House/Hotel Upgrades:** Enforces strict color-group monopoly ownership before allowing house builds.
    *   **Dynamic Rent:** Fully implements dynamic scaling for Utilities (40x / 100x Dice) and Stations ($250-$2000).
    *   **Card Actions:** Deep action mapping for all 32 Chance & Community Chest cards (teleporting, backwards hops, dynamic street repair assessments).
*   **Slick UI/UX:** Powered by `SweetAlert2` for beautiful, interactive dialogues and custom token hopping animations.

### 🔴 Ludo
*   **Real-time Synchronization:** Smooth dice rolls and token movements.
*   **Local & Network Play:** Allows multiple people to play on a single shared device, or connect remotely over the local network.
*   **State Recovery:** Players can seamlessly drop in/out without destroying the game state.

---

## 🚧 What's Missing / Upcoming Features

While the core engines are running smoothly, the following features are not yet implemented and are actively being researched:

### 1. Monopoly Missing Features
*   **Player-to-Player Trading:** A secure interface to propose, counter, and accept property/cash trades.
*   **Bankruptcy & Debt Management:** The ability to permanently bankrupt players, return their properties to the bank or creditors, and properly clear them from the turn order.
*   **Auction System:** While the skeleton exists in the UI, full real-time competitive bidding for unowned properties when a player clicks "Pass" is incomplete.
*   **3D Dice Animations:** Replacing the basic text-based randomizer with interactive 3D WebGL dice physics.

### 2. Ludo Missing Features
*   **Automated Bot AI for Ludo:** Currently, Ludo relies primarily on human interaction.
*   **Safe Zones:** Visual markers and strict safe-zone enforcement logic to prevent token captures on starred tiles.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Node.js, Express.js
- **Real-Time Engine:** Socket.io (with multiple isolated namespaces like `/monopoly`)
- **Database:** `better-sqlite3` for fast, synchronous persistence of player stats/history.
- **Frontend:** Vanilla JavaScript (ES6), HTML5, CSS3, `SweetAlert2` (No heavy frameworks used!).

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/multi-game-hub.git
   cd multi-game-hub
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Start the Server:**
   ```bash
   npm start
   # Or using node directly: node server.js
   ```
4. **Play:**
   Open your browser and navigate to `http://localhost:3000`.

---
<div align="center">
  <p>Built with ❤️ by passionate developers.</p>
</div>
