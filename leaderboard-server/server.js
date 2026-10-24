const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// Use a writable local directory by default. For persistent scores on Render,
// attach a disk and explicitly set DATA_DIR to its mount path (for example /var/data).
// Do not assume /var/data exists: without a mounted disk, that can break every score request.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
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
    if (!Array.isArray(parsed)) return [];

    // Correct the two earlier placeholder/typo names shown on the live board.
    // Persist the corrections so they remain fixed after later requests/restarts.
    let changed = false;
    const corrected = parsed.map((entry) => {
      if (!entry || typeof entry.name !== "string") return entry;
      const oldName = entry.name.trim().toLowerCase();
      let name = entry.name;
      if (oldName === "oham" || oldName === "oh am") name = "Rohan";
      if (oldName === "name") name = "Callum";
      if (name !== entry.name) {
        changed = true;
        return { ...entry, name };
      }
      return entry;
    });
    if (changed) writeScores(corrected);
    return corrected;
  } catch (error) {
    console.error("Could not read leaderboard file:", error);
    throw error;
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
  try {
    const scores = readScores()
      .sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 10);
    res.setHeader("Cache-Control", "no-store");
    res.json({ leaderboard: scores });
  } catch (error) {
    console.error("Could not read leaderboard storage:", error);
    res.status(500).json({ error: "Leaderboard storage is unavailable. Check DATA_DIR and Render disk settings." });
  }
});

app.post("/api/leaderboard", (req, res) => {
  try {
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
  } catch (error) {
    console.error("Could not save leaderboard score:", error);
    res.status(500).json({ error: "Could not save score. Check DATA_DIR and Render disk settings." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pumpkin Catch leaderboard API listening on port ${PORT}`);
});
