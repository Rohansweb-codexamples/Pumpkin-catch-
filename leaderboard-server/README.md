# Pumpkin Catch game + leaderboard server

This folder contains the Node.js server for the Pumpkin Catch game and its shared leaderboard.

## Endpoints

- `GET /` — serves the repository's root `index.html` game
- `GET /health` — health check
- `GET /api/leaderboard` — returns the top 10 scores
- `POST /api/leaderboard` — submits a score

The game calculates the score itself from pumpkins caught and submits that score automatically when the two-minute round ends. Players only choose a display name; there is no manual score-entry field.

## Deploy on Render

1. Open the existing Render service for `https://pumpkin-catch.onrender.com/` (or create a Web Service connected to this repository).
2. Set **Root Directory** to `leaderboard-server`.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `npm start`.
5. In Render, add a **persistent disk** to this web service and set its mount path to `/var/data`.
6. Add environment variable `DATA_DIR` with value `/var/data`.
7. Deploy the latest commit from `main`.

After deployment, check `https://pumpkin-catch.onrender.com/health` and `https://pumpkin-catch.onrender.com/api/leaderboard`.

## Score persistence

Scores are written to `DATA_DIR/leaderboard.json`. On Render, the disk mounted at `/var/data` keeps this file across deploys and restarts. **Without a persistent disk, Render's ordinary service filesystem is ephemeral and scores can be lost on restart/redeploy.** The server cannot attach the disk through code; it must be added in the Render Dashboard.

If scores already exist in a previous deployment's temporary filesystem, they must be copied to the persistent disk before that old filesystem is discarded. This code does not intentionally clear saved scores.

## Important

This basic API validates score format, but it cannot fully prevent fabricated score submissions from a modified client. Production anti-cheat requires server-side game verification.
