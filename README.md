# Word Walk

An interactive word-search competition app for the **English Department** at Jesus Youth Pazhassiraja College — walk through the Word and beat the clock.

## Tech Stack

- Pure HTML / CSS / JS (no build step, no frameworks)
- Firebase Firestore for live player registration, scoring, leaderboard & live admin control

## Pages

| Page | Description |
| --- | --- |
| `index.html` | Player registration / login, how-to-play guide, live leaderboard |
| `game.html` | Word-search gameplay with levels, 5-minute timer, definitions |
| `admin.html` | Admin control panel — global game control, live players, word bank, spectate, CSV export |

## Run Locally

Serve the folder with any static server, e.g.:

```bash
npx serve .
```

Then open the printed URL (default `http://localhost:3000`).

## Firebase Setup

1. Create a Firebase project and enable Cloud Firestore.
2. In `firebase-service.js`, replace the `YOUR_API_KEY` / `YOUR_PROJECT.firebaseapp.com` placeholders in `firebaseConfig` with your project credentials.
3. Deploy or apply the rules in `firestore.rules` (update the `word_bank` document structure in `firebase-service.js` to match your schema).

## Structure

- `style.css` — shared design system (modern minimal light theme)
- `game.css` — game-page styles
- `admin.css` — admin-panel styles
- `script.js` / `game.js` / `admin.js` — per-page logic
- `dictionary.js` — word definitions used by the game
- `firebase-service.js` — Firestore integration (shared module)