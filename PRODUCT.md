# PokerNight — Product Description

## What It Is

A lightweight, browser-based web app designed for one purpose: making your **friendly home poker session** frictionless to manage. No accounts. No ads. No complexity. Open it on any phone or laptop at the table, and everyone can see what's happening in real time.

---

## The Problem

Every home poker night has the same pain points:
- Someone's scribbling buy-ins and rebuys on a napkin
- Disputes at cashout because nobody tracked the 2nd rebuy from player 3
- "Who's winning?" requires mental math mid-game
- Existing apps are built for grinders tracking bankrolls — not for 6 friends on a Friday night

---

## The Vision

A poker table's **digital co-host**. Minimal taps. Always visible. Feels as natural as passing the dealer button.

---

## Market Landscape

| App | Strengths | Gaps for home games |
|---|---|---|
| **PokerBank** | Clean UI, auto-settlement | Overkill features, account required |
| **Bink** | Ledger + tournament modes | Complex onboarding |
| **Poker Ledger Pro** | Live session tracking, hourly rates | Solo-focused, not multi-player live view |
| **HomeGame Poker Tracker** | Group stat tracking | Clunky during-game UX |
| **Poler** | Stack notes, modern design | Bankroll-focused, not party-friendly |

**Gap:** No app nails the "everyone staring at the same screen mid-game" use case with dead-simple interaction.

---

## Core Experience — 3 Tabs

### Tab 1: SETUP
- Name the session (e.g., "Friday Night — March")
- Add players (up to 10)
- Set buy-in amount (e.g., 20 CHF)
- Choose chip denomination (optional)
- One tap to **Start Game**

### Tab 2: LIVE TABLE  ← the heart of the app
The main screen during play. Shows every player as a card with:

```
+------------------+
| Alex             |
| In: 40 CHF       |
| Stack: 320 chips |
| Net: +20 CHF     |
|  [- REBUY]  [CASHOUT] |
+------------------+
```

- **+/- chip stack** controls — big tap targets, glanceable numbers
- **Rebuy** button — records another buy-in with one tap, updates net instantly
- **Stack slider or number input** — update chips after each round
- **Running pot integrity check** — total chips on table always matches total buy-ins (catches errors)
- **Round log** — timestamped event feed (rebuy, stack update) at the bottom

### Tab 3: LEADERBOARD
Live-sorted ranking by net profit/loss. Updates as you log stacks.

```
RANK  PLAYER    IN      STACK    NET
 1    Marco    40 CHF   510 ch   +26 CHF  [crown]
 2    Sara     60 CHF   340 ch   +  2 CHF
 3    Alex     40 CHF   210 ch   - 10 CHF
 4    Luca     80 CHF    90 ch   - 18 CHF
```

- Color-coded green / red
- "At cashout" mode: enter final chip counts, app calculates exact who-pays-who

---

## Key Interactions

### During a Round
1. Round ends
2. Tap each player's card
3. Enter new chip stack (number pad pops up, big)
4. Swipe to next player
5. Done — leaderboard auto-updates

### Rebuy Flow
- Tap [REBUY] on player card
- Confirm amount (default = initial buy-in, editable)
- One more tap — done. Logged with timestamp.

### End of Session
1. Everyone enters final stack
2. App shows settlement screen:
   - Who owes who exactly how much
   - Optimized for minimum transactions (e.g., instead of 4 Venmo transfers, 2)
3. Share session summary as image or text

---

## Chip Integrity System

One killer feature no app does well:

> **Total chips in play must always equal total money in.**

The app tracks this live. If chips don't add up (miscount, forgotten rebuy), a warning badge appears. This eliminates end-of-night disputes.

---

## Design Language

- **Color palette:** Dark green felt (#1a3d2b), deep black, gold accents — classic casino aesthetic, easy on eyes in dim rooms
- **Typography:** Bold, high-contrast — readable at arm's length across the table
- **Layout:** Card-based grid — each player is a tactile card, easy to tap
- **Animations:** Subtle chip-clink animation on rebuy, rank changes animate on the leaderboard
- **Sound:** Optional chip shuffle sound on key actions

---

## Technical Approach

- **Frontend:** React + TypeScript — fast, component-based, reusable player cards
- **State:** Local state (Zustand or Context) — no backend needed for MVP
- **Persistence:** localStorage — session survives page refresh
- **Sharing:** URL-based session state (base64 encoded) — share link to anyone at table to view live on their phone
- **PWA:** Installable on home screen, works offline

---

## MVP Scope (v1)

| Feature | Priority |
|---|---|
| Player setup (up to 10) | Must |
| Live chip stack editing | Must |
| Rebuy tracking | Must |
| Live leaderboard | Must |
| Chip integrity checker | Must |
| End-of-night settlement calculator | Must |
| Session history (localStorage) | Should |
| Shareable session link | Should |
| Round-by-round log | Should |
| Animations / sounds | Nice |
| Past sessions stats / graphs | Future |
| Multi-device sync | Future |

---

## What Makes This Different

1. **No login, no friction** — open URL, start game in 30 seconds
2. **Built for the table** — big tap targets, readable across the table
3. **Chip integrity** — real-time validation that catches errors
4. **Settlement optimizer** — minimum transfers, maximum peace
5. **Aesthetic** — feels like a poker app, not a spreadsheet

---

## Name Candidates

| Name | Feel |
|---|---|
| **Felt** | Minimal, evokes the table |
| **The Pot** | Casual, friendly |
| **PokerNight** | Clear, searchable |
| **All-In** | Fun energy |
| **The Ledger** | Serious, trustworthy |
| **Kitty** | Playful (poker slang for the pot) |
