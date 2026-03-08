# Felt

A browser-based poker session tracker for home cash games. No accounts, no servers, no fees -- just open the app and start playing.

Felt runs entirely in the browser. Session data lives in `localStorage`, syncs across tabs via `BroadcastChannel`, and can be shared across devices through peer-to-peer WebRTC connections. It works offline as an installable PWA.

---

## Demo

> Screenshot / screen recording placeholder.
>
> To see Felt in action, visit the live deployment at
> [https://\<your-username\>.github.io/felt-poker/](https://<your-username>.github.io/felt-poker/)

---

## Features

### Session Setup
- Configure session name and default buy-in amount
- Add players with named seats
- Add players mid-session without restarting

### Live Table
- Player cards showing current stack, total buy-in, and net P&L
- Stack updates -- tap a player card to adjust their chip count
- Rebuys -- add chips to a player mid-session
- Cash out -- lock a player's final stack
- Rejoin -- bring a cashed-out player back into the game
- Real-time chip integrity checker (chips issued vs. chips in play)

### Leaderboard
- Live-sorted rankings by net profit/loss
- Updates in real time as stacks change

### Settlement
- Greedy two-pointer algorithm that minimizes the number of transfers
- Clear "who pays whom" transfer cards
- One-tap share button to generate a snapshot link

### History
- Last 50 completed sessions stored locally
- Session summary cards with date, players, and results
- Dismiss individual sessions from history

### Hand Evaluator
- Texas Hold'em 5-card hand evaluator
- Interactive card picker UI
- Ranks all standard hands from High Card to Royal Flush
- Hand comparison (which 5-card hand wins)

### Sharing & Live Spectating
- **Read-only snapshots** (`#share=...`) -- base64-encoded session summary in the URL, no server needed
- **Live spectating** (`#live=...`) -- real-time P2P connection via PeerJS/WebRTC; spectators see the table update live
- **Multi-tab sync** -- all tabs on the same origin stay in sync via `BroadcastChannel`

### PWA
- Installable on home screens (iOS, Android, desktop)
- Offline-capable after first load via Workbox service worker
- Auto-updating (`registerType: 'autoUpdate'`)

---

## Tech Stack

| Category | Tool | Version |
|----------|------|---------|
| Framework | React | 19 |
| Language | TypeScript | 5.7+ |
| Build | Vite | 6 |
| Styling | Tailwind CSS | 4 |
| State | Zustand | 5 |
| P2P Sync | PeerJS | 1.5 |
| PWA | vite-plugin-pwa | 0.21 |
| Testing | Vitest + Testing Library | 3 / 16 |
| Linting | ESLint | 9 |
| Formatting | Prettier | 3 |

**Runtime dependencies (4):** `react`, `react-dom`, `zustand`, `peerjs`.
Everything else is a dev dependency.

---

## Architecture

Felt uses **event sourcing** as its core data model. Every user action is recorded as an immutable, timestamped `GameEvent` in an append-only log. The visible game state is a **derived projection** computed by replaying that log through a pure function.

### Event Types

```
GameStarted -> BuyIn -> StackUpdate -> CashOut -> Rejoin -> SessionSettled
```

Each event is a tagged union (`type` discriminant) with a `BaseEvent` carrying a unique `EventId` and `timestamp`. Events are never mutated or deleted.

### Projection

`projectSession(session)` replays the event log and produces a `SessionProjection`:

```
Session (config + players + events[])
  |
  v  projectSession()  -- pure function, no side effects
  |
SessionProjection
  ├── playersByPosition[]   (sorted by seat)
  ├── sortedLeaderboard[]   (sorted by net P&L, descending)
  ├── chronologicalEvents[] (the raw log)
  ├── integrity             (chips issued vs. chips in play)
  ├── totalPotValue
  ├── eventCount
  └── lastEventAt
```

### Store

Zustand manages a single `SessionStore` with selector-based subscriptions. Each component subscribes to exactly the slice of state it renders, so a stack update on one player card does not re-render the other nine.

The store calls `projectSession()` after every mutation and eagerly persists to `localStorage` (no debounce -- iOS Safari kills PWA pages without firing `beforeunload`).

### Settlement Algorithm

A greedy two-pointer algorithm minimizes the number of transfers between creditors and debtors:

1. Compute each player's `netProfitLoss` (current stack minus total buy-in).
2. Split into creditors (positive) and debtors (negative), sorted by magnitude.
3. Walk both lists with two pointers, transferring `min(creditor.owed, debtor.owes)` at each step.

This produces at most `n - 1` transfers for `n` players with non-zero balances.

### Data Flow

```
User Action
  -> store.addEvent(event)
    -> append event to session.events[]
    -> projectSession(updatedSession)         // re-derive projection
    -> persistCurrentSession(updatedSession)  // localStorage write
    -> set({ currentSession, projection })    // Zustand update
    -> broadcastState(...)                    // BroadcastChannel to sibling tabs
    -> React re-renders (selector-scoped)
```

---

## Project Structure

```
src/
├── types/                # Domain types (branded IDs, events, session, projection, settlement)
│   ├── ids.ts            # PlayerId, SessionId, EventId (branded strings via crypto.randomUUID)
│   ├── events.ts         # GameEvent union type (6 event types)
│   ├── session.ts        # Session, SessionConfig, PlayerConfig
│   ├── projection.ts     # SessionProjection, PlayerState, IntegrityReport
│   ├── settlement.ts     # Transfer, Settlement, ShareableSnapshot
│   └── index.ts          # Barrel re-exports
│
├── engine/               # Pure business logic (no React, no side effects)
│   ├── projection.ts     # projectSession() -- event replay -> SessionProjection
│   ├── settlement.ts     # computeSettlement() -- greedy min-transfer algorithm
│   ├── integrity.ts      # computeIntegrity() -- chip balance verification
│   ├── hand-eval.ts      # evaluateHand(), compareHands() -- 5-card poker hand evaluator
│   ├── currency.ts       # formatChips(), formatChipsPnL()
│   └── share.ts          # encode/decode shareable snapshots (base64 URL fragments)
│
├── store/                # Zustand state management
│   ├── session-store.ts  # useSessionStore -- actions, persistence, tab-sync subscriber
│   └── selectors.ts      # Memoization-friendly selector functions
│
├── hooks/                # React hooks
│   ├── use-session.ts    # Session config and status
│   ├── use-player.ts     # Single player state selector
│   ├── use-player-actions.ts  # Buy-in, stack update, cash out, rejoin actions
│   ├── use-settlement.ts # Settlement computation hook
│   ├── use-integrity.ts  # Integrity report hook
│   ├── use-tab.ts        # Active tab state
│   ├── use-tab-sync.ts   # BroadcastChannel listener
│   └── use-peer-host.ts  # PeerJS host lifecycle
│
├── components/           # React components
│   ├── setup/            # Session configuration UI
│   ├── table/            # Live table: PlayerCard, StackEditor, RebuyDialog, EventLog
│   ├── leaderboard/      # Rankings view
│   ├── settlement/       # Transfer cards, share button
│   ├── history/          # Past sessions list
│   ├── eval/             # Hand evaluator: CardPicker, HandEvalView
│   ├── layout/           # Header, Sidebar, TabBar, IntegrityBanner
│   ├── ui/               # Primitives: Button, Badge, Dialog, NumberPad, CurrencyDisplay, icons
│   ├── ReadOnlyView.tsx  # #share= snapshot renderer
│   └── LiveSpectatorView.tsx  # #live= P2P spectator renderer
│
├── lib/                  # Utilities
│   ├── broadcast-channel.ts  # BroadcastChannel wrapper (tab sync)
│   ├── peer-sync.ts      # PeerJS host/spectator lifecycle
│   ├── cn.ts             # className utility
│   └── format.ts         # Formatting helpers
│
├── persistence/          # localStorage I/O
│   ├── local-storage.ts  # persist/load current session and history
│   ├── migrations.ts     # Schema migration for stored sessions
│   └── constants.ts      # Storage keys, schema version
│
├── App.tsx               # Root component, routing, hash detection
├── main.tsx              # React DOM entry point
└── index.css             # Tailwind imports and custom styles

tests/
├── engine/               # Unit tests for projection, settlement, integrity, currency, share
├── store/                # Store action tests
├── integration/          # Full game lifecycle test
├── persistence/          # Migration tests
├── helpers.ts            # Test factories
└── setup.ts              # Vitest setup (jsdom, testing-library matchers)
```

### Dependency Graph

```
types -> engine -> store -> hooks -> components
```

No backward arrows. The `engine/` layer is pure functions with zero React imports. The `store/` depends on `engine/` for projection and settlement. Hooks depend on the store. Components depend on hooks.

---

## Getting Started

### Prerequisites

- **Node.js** >= 20 (the CI deploy uses Node 20)
- **npm** (ships with Node)

### Install

```bash
git clone https://github.com/<your-username>/felt-poker.git
cd felt-poker
npm install
```

### Development

```bash
npm run dev
```

Opens a local Vite dev server (default `http://localhost:5173/felt-poker/`).

### Build

```bash
npm run build
```

Runs `tsc -b` for type checking, then Vite production build. Output goes to `dist/`.

### Preview

```bash
npm run preview
```

Serves the production build locally for testing.

### Deploy

The project deploys to **GitHub Pages** automatically on every push to `main` via the workflow at `.github/workflows/deploy.yml`. The Vite `base` is set to `/felt-poker/`.

To deploy manually:

```bash
npm run build
# Then upload dist/ to your static host of choice
```

---

## Running Tests

```bash
# Watch mode (re-runs on file changes)
npm test

# Single run (CI-friendly)
npm run test:run

# Interactive UI
npm run test:ui
```

Tests use **Vitest** with a **jsdom** environment and **Testing Library** for component tests. The test suite covers:

- **Engine**: projection replay, settlement algorithm, integrity checks, share encoding/decoding, currency formatting
- **Store**: session creation, event dispatch, settlement, history management
- **Integration**: full game lifecycle (setup -> buy-ins -> stack updates -> cash outs -> settlement)
- **Persistence**: schema migrations

### Linting

```bash
npm run lint
```

Uses ESLint 9 with TypeScript and React hooks plugins.

---

## Sharing and Live Spectating

Felt supports two sharing mechanisms, both serverless:

### Read-Only Snapshots (`#share=`)

1. The host taps the **Share** button on the Settlement view.
2. The app encodes a `ShareableSnapshot` (session name, player names, net P&L, buy-ins, stacks) as base64 in a URL hash fragment.
3. Anyone who opens the link sees a static, read-only summary. No connection to the host is needed.

```
https://example.github.io/felt-poker/#share=eyJuIjoiRnJpZGF5Li4u
```

### Live Spectating (`#live=`)

1. When a session is active, the host's URL automatically updates to `#live=<sessionId>`.
2. The host registers a PeerJS peer with ID `felt-<sessionId>` on the public PeerJS broker (`0.peerjs.com`).
3. When a spectator opens the `#live=` link, PeerJS negotiates a WebRTC data channel directly to the host.
4. The host pushes a `ShareableSnapshot` over the data channel on every state change.
5. The spectator renders a live, updating view of the table.

PeerJS is loaded as an async chunk (~80KB) and only imported when a session is active or a `#live=` link is opened.

### Multi-Tab Sync

All tabs on the same origin share a `BroadcastChannel` named `felt:session`. The store subscribes to mutations and broadcasts the full state to sibling tabs. Receiving tabs call `syncFromBroadcast()` which updates the store without re-broadcasting, preventing echo loops.

---

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-change`).
3. Make your changes. The `engine/` layer should remain pure functions with no React imports.
4. Add tests for new logic in `tests/`.
5. Run the full pre-push checklist (see below) to verify.
6. Open a pull request.

### Pre-commit / pre-push checklist

**Always run these locally before committing or pushing.** The CI deploy will fail if any of them error.

```bash
npm run build      # must complete with zero errors and zero warnings
npm run test:run   # all tests must pass (92 tests)
npm run lint       # no ESLint errors
```

`npm run build` runs `tsc -b` (strict TypeScript, `noUnusedLocals`, exhaustive switch checks) followed by Vite. Common things it catches that a dev server won't:

- Unused types or variables (e.g. a dead `type Foo = ...` declaration)
- Missing cases in exhaustive switch statements over union types (the `default: never` pattern)
- Import/export mismatches that HMR silently tolerates

If the build fails locally, fix it before pushing — the GitHub Pages deploy runs the same build step and will fail identically.

---

## License

This project does not currently specify a license. All rights are reserved by the author until a license is added.
