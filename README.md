# Crossword Clash

A competitive tile-placement word game on Starknet, built with Dojo Engine. Place tiles on a crossword board, complete words, outscore your opponent, and earn on-chain achievements.

---

## How It Works

You and your opponent share a 15x15 crossword board. Each cell has a hidden solution letter. On your turn, you place tiles from your rack onto the board:

- **Correct placement** locks the tile in and earns points
- **Wrong placement** bounces back and costs you points
- Complete entire words for big bonuses

The game ends when the board is full, tiles run out, or both players skip too many times. Highest score wins.

Every action — tile placements, scores, word completions, game results — is recorded on-chain via Starknet smart contracts. Your stats, achievements, and game history live permanently on the blockchain.

---

## Game Modes

### VS Computer
Challenge an AI opponent with three difficulty levels:

| Difficulty | Board Pre-filled | AI Tiles/Turn | AI Accuracy |
|------------|-----------------|---------------|-------------|
| Easy | 55-65% | Up to 2 | 70% |
| Normal | 35-45% | Up to 3 | 90% |
| Hard | 20-30% | Up to 4 | 100% |

The AI thinks for 1.5-3.5 seconds, prioritizes word completions on Normal/Hard, and plays optimally on Hard.

### Online
Play against a friend in real-time. Create a room, share the 4-character code, and your friend joins. The game uses WebSockets for live synchronization — both players see moves instantly.

Both players' actions are tracked on-chain. The host calls `startGame` on the contract, relays the on-chain game ID to the guest, and the guest calls `joinGame`. From there, each player records their own scores, tile placements, and word completions independently.

---

## Scoring

| Action | Points |
|--------|--------|
| Correct tile placement | +10 |
| Consecutive correct placement bonus | +5 per streak |
| Wrong tile placement | -5 |
| Complete a word | +50 |
| Complete a long word (7+ letters) | +75 (x1.5) |
| Use all tiles in one turn | +30 |
| Fast turn (under 10 seconds) | +15 |

Each turn has a **60-second timer**. You get **6 tiles** in your rack, refilled at the end of each turn.

---

## Turn Actions

- **Place Tiles** — Tap a tile, tap a cell. Correct placements stick, wrong ones bounce
- **End Turn** — Lock in your placements and pass to your opponent
- **Swap Tiles** — Return all tiles and draw new ones (ends your turn)
- **Skip Turn** — Pass without placing. 4 consecutive skips (2 per player) ends the game

---

## Achievements

12 on-chain achievements tracked by the smart contract. Achievements are checked in real-time as you play — some trigger mid-game, others at game end.

| # | Achievement | How to Unlock |
|---|-------------|---------------|
| 1 | **First Clash** | Complete your first game |
| 2 | **Word Smith** | Complete 5+ words in a single game |
| 3 | **Veteran** | Play 10 games |
| 4 | **Perfect Round** | Win with your opponent scoring 0 |
| 5 | **Dominator** | Win by 50+ points |
| 6 | **Word Master** | Complete 10+ words in a single game |
| 7 | **High Scorer** | Score 500+ points in a single game |
| 8 | **Social Player** | Apply a referral code |
| 9 | **Influencer** | Refer 5 players |
| 10 | **Streak Keeper** | Reach a 7-day daily login streak |
| 11 | **Online Champion** | Win 5 online games |
| 12 | **Hard Mode Hero** | Win a game on Hard difficulty |

Achievements are permanent and stored on-chain. View them from the main menu.

---

## Daily Rewards

Log in daily and claim your reward from the main menu. Maintain a streak for bonus points:

- 20-hour cooldown between claims
- Streak counter tracks consecutive days
- Reach a 7-day streak to unlock the **Streak Keeper** achievement

---

## Referral System

Every registered player gets a unique referral code. Share it with friends:

- Find your code in **Settings**
- Friends enter it in their Settings to apply
- Each referral is tracked on-chain
- Refer 5 players to unlock the **Influencer** achievement
- Applying a code unlocks **Social Player**

Referral codes are one-time use per player (you can only apply one code, and you can't use your own).

---

## On-Chain Architecture

The game is built on **Starknet** using the **Dojo Engine** framework.

### Deployed Addresses (Sepolia)

| | Address |
|---|---------|
| **World** | `0x36eaf02725b952929a57f710458f1036ca43de0f500fa64c679b031198251c6` |
| **Actions Contract** | `0x6b25d6c28f2b785b0cf18faa1fcf569a4349cc2d2c18e85fc7f750b03c2693e` |

### Smart Contract Models

| Model | Purpose |
|-------|---------|
| `Player` | Player stats: score, games, wins, words, tiles, level |
| `Game` | Active game state: both players, scores, turns, status |
| `PlayerGame` | Maps a player to their current active game |
| `GameResult` | Permanent record of each completed game |
| `Achievement` | Per-player achievement unlock status |
| `DailyStreak` | Login streak tracking |
| `ReferralCode` | Maps referral codes to player addresses |

### Contract Functions

**Game Lifecycle:**
- `start_game(difficulty, mode)` — Create a new game
- `join_game(game_id)` — Join an online game
- `score_points(game_id, points, for_opponent)` — Record points scored
- `place_tile(game_id, for_opponent)` — Record a tile placement
- `complete_word(game_id, for_opponent)` — Record a word completion
- `end_turn(game_id)` — End the current turn
- `skip_turn(game_id)` — Skip without placing
- `swap_tiles(game_id)` — Swap all tiles
- `end_game(game_id, result_reason)` — Finalize the game and record results
- `forfeit_game(game_id)` — Forfeit the current game

**Player Actions:**
- `register_player(username)` — Register with a username
- `apply_referral(code)` — Apply a referral code
- `claim_daily_reward()` — Claim daily login reward

### How Both Players Are Tracked

In online mode, the `Game` model stores both players' addresses and scores. The contract identifies the caller and updates the correct player's stats. At game end, `finalize_player_stats` runs for **both** players — writing `GameResult` records, updating lifetime stats, and checking achievements for each.

For AI games, `player_two` is the zero address (`0x0`). The human player reports AI scores using the `for_opponent` flag, which is only allowed in vs-AI mode.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| State | Zustand |
| Blockchain | Starknet, Dojo Engine 1.8, Cairo 2.13 |
| Wallet | Cartridge Controller |
| Multiplayer | Socket.IO (Node.js backend) |
| Audio | Howler.js |

### Install as App

Crossword Clash is a Progressive Web App. On mobile, tap "Add to Home Screen" from your browser menu. On desktop Chrome, click the install icon in the address bar. The game caches assets for offline loading and auto-updates when new versions are deployed.

---

## Project Structure

```
crossword/
├── contract/              # Cairo smart contracts (Dojo)
│   ├── src/
│   │   ├── models.cairo         # Data models
│   │   ├── systems/
│   │   │   └── actions.cairo    # All game logic + achievements
│   │   └── tests/
│   │       └── test_world.cairo # 59 tests
│   ├── Scarb.toml
│   └── dojo_sepolia.toml
│
├── frontend/              # React web app
│   ├── src/
│   │   ├── screens/       # Full-page views (menu, gameplay, achievements...)
│   │   ├── components/    # UI components (board, tiles, scoreboard...)
│   │   ├── engine/        # Game logic (board, tile pool, AI, crossword gen)
│   │   ├── store/         # Zustand state (gameStore, onlineStore)
│   │   ├── hooks/         # React hooks (useContract, useOnChainSync...)
│   │   ├── dojo/          # Blockchain bindings (contracts, models, provider)
│   │   ├── socket/        # WebSocket client for multiplayer
│   │   └── utils/         # Contract reader, constants, bridge
│   └── package.json
│
└── backend/               # Multiplayer server
    ├── src/
    │   ├── index.ts       # Express + Socket.IO server
    │   ├── handlers.ts    # Socket event handlers
    │   ├── Room.ts        # Game room logic
    │   ├── RoomManager.ts # Room lifecycle management
    │   └── shared/        # Shared game logic (board, tiles, scoring)
    └── package.json
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- [Dojo](https://book.dojoengine.org/getting-started) toolchain (`sozo`, `katana`, `torii`)

### Contract
```bash
cd contract
sozo build
sozo test          # runs 59 tests
katana             # start local chain (separate terminal)
sozo migrate       # deploy to local katana
torii              # start indexer (separate terminal)
```

### Backend
```bash
cd backend
npm install
npm run dev        # starts on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # starts on port 5173
```

### Environment Variables (Frontend)
```
VITE_PUBLIC_NODE_URL=http://localhost:5050
VITE_PUBLIC_TORII=http://localhost:8080
VITE_PUBLIC_DEPLOY_TYPE=localhost
```

### Deploying to Sepolia
```bash
cd contract
./deploy-sepolia.sh
```
Update `frontend/src/dojo/manifest.json` with the new contract addresses from the migration output.

---

## Game Over Conditions

- **Board Full** — All cells are filled
- **Pool Empty** — No tiles left to draw and both racks are empty
- **Consecutive Skips** — 4 skips in a row (2 per player)
- **Forfeit** — A player quits
- **Opponent Left** — Online opponent disconnects permanently

---
