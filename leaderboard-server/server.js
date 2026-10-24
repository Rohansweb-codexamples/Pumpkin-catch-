const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// On Render, attach a persistent disk mounted at /var/data and set DATA_DIR=/var/data.
const DATA_DIR = process.env.DATA_DIR || (process.env.RENDER ? "/var/data" : path.join(__dirname, "data"));
const DATA_FILE = path.join(DATA_DIR, "leaderboard.json");
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "10kb" }));

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readScores() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScores(scores) {
  ensureStore();
  const tempFile = DATA_FILE + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(scores, null, 2), "utf8");
  fs.renameSync(tempFile, DATA_FILE);
}

function cleanName(value) {
  return String(value || "")
    .replace(/[<>\u0000-\u001f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 18);
}

app.get("/", (_req, res) => {
  // Serve the game from the repository root so the Render service can host
  // both the game page and its leaderboard API from the same origin.
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/scoreboard", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "scoreboard.html"));
});

app.get("/scoreboard.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "scoreboard.html"));
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pumpkin-catch-leaderboard" });
});

app.get("/api/leaderboard", (_req, res) => {
  const scores = readScores()
    .sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 10);
  res.json({ leaderboard: scores });
});

app.post("/api/leaderboard", (req, res) => {
  const name = cleanName(req.body && req.body.name);
  const score = Number(req.body && req.body.score);

  if (!name) return res.status(400).json({ error: "Enter a player name." });
  if (!Number.isSafeInteger(score) || score < 0 || score > 1000000) {
    return res.status(400).json({ error: "Score must be a whole number between 0 and 1000000." });
  }

  const scores = readScores();
  const entry = {
    id: require("crypto").randomUUID(),
    name,
    score,
    createdAt: new Date().toISOString()
  };
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt));
  writeScores(scores.slice(0, 1000));

  res.status(201).json({ ok: true, entry, leaderboard: scores.slice(0, 10) });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pumpkin Catch leaderboard API listening on port ${PORT}`);
});
