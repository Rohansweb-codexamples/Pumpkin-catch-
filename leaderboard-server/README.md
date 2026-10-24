# Pumpkin Catch leaderboard server

This folder contains a small Node.js API for the Pumpkin Catch game.

## Endpoints

- `GET /health` — health check
- `GET /api/leaderboard` — returns the top 10 scores
- `POST /api/leaderboard` — submits a score

Example request body:

```json
{
  "name": "Rohan",
  "score": 120
}
```

## Run locally

1. Install Node.js 20 or newer.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000/health`.

## Deploy on Render

1. Create a new **Web Service** from the repository `Rohansweb-codexamples/Pumpkin-catch-`.
2. Set **Root Directory** to `leaderboard-server`.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `npm start`.
5. Add a persistent disk mounted at `/var/data` so scores survive redeploys.
6. Add environment variable `DATA_DIR` = `/var/data`.
7. Optionally set `ALLOWED_ORIGIN` to your published game website origin. During initial testing, it defaults to `*`.
8. Deploy, then test `https://YOUR-SERVICE.onrender.com/health` and `https://YOUR-SERVICE.onrender.com/api/leaderboard`.

## Important

The game page must send scores to this API to display and submit scores. The API files alone do not automatically connect the game to the leaderboard. This basic version validates input but cannot prevent players from submitting fabricated scores; use server-side game verification if anti-cheat protection is needed.
