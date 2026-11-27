require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET. Add it to server/.env and restart.");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Helpers ----------

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

async function searchOpenLibrary(q) {
  const fields =
    "key,title,author_name,first_publish_year,cover_i,ia,public_scan_b";
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20&fields=${fields}`;

  const r = await fetch(url, {
    headers: { "User-Agent": "BookLibraryApp (your-email@example.com)" },
  });
  if (!r.ok) throw new Error("Open Library did not respond");

  const data = await r.json();
  return data.docs;
}

function makeToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please log in" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

const STATUSES = ["want", "reading", "finished"];

// ---------- Basic + search ----------

app.get("/", (req, res) => {
  res.json({ message: "Book library server is running" });
});

app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Please enter a book or author name" });

  try {
    let docs = await searchOpenLibrary(q);

    // If nothing came back, retry with Title Case
    if (docs.length === 0) {
      docs = await searchOpenLibrary(toTitleCase(q));
    }

    const books = docs.map((d) => ({
      id: d.key,
      title: d.title,
      authors: d.author_name || [],
      year: d.first_publish_year || null,
      cover: d.cover_i
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
        : null,
      free: d.public_scan_b === true,
      archiveId: d.ia ? d.ia[0] : null,
    }));

    res.json(books);
  } catch (err) {
    res.status(502).json({ error: "Search failed. Please try again." });
  }
});

// ---------- Auth ----------

app.post("/api/signup", (req, res) => {
  const { name = "", email = "", password = "" } = req.body || {};
  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const pw = String(password);

  if (!cleanName || !cleanEmail || !pw) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Please enter a valid email" });
  }
  if (pw.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
  if (exists) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const hash = bcrypt.hashSync(pw, 10);
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(cleanName, cleanEmail, hash);

  const user = { id: Number(info.lastInsertRowid), name: cleanName, email: cleanEmail };
  res.status(201).json({ token: makeToken(user), user });
});

app.post("/api/login", (req, res) => {
  const { email = "", password = "" } = req.body || {};
  const cleanEmail = String(email).trim().toLowerCase();

  const row = db
    .prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?")
    .get(cleanEmail);

  if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ error: "Wrong email or password" });
  }

  const user = { id: row.id, name: row.name, email: row.email };
  res.json({ token: makeToken(user), user });
});

app.get("/api/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, name, email FROM users WHERE id = ?")
    .get(req.userId);
  if (!user) return res.status(401).json({ error: "Please log in again" });
  res.json({ user });
});

// ---------- Personal library ----------

app.get("/api/library", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT book_id, title, authors, year, cover, free, archive_id, status
       FROM library WHERE user_id = ? ORDER BY added_at DESC`
    )
    .all(req.userId);

  res.json(
    rows.map((r) => ({
      id: r.book_id,
      title: r.title,
      authors: JSON.parse(r.authors),
      year: r.year,
      cover: r.cover,
      free: r.free === 1,
      archiveId: r.archive_id,
      status: r.status,
    }))
  );
});

// Adds a book, or changes its status if it is already saved
app.post("/api/library", requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.id || !b.title) {
    return res.status(400).json({ error: "Book id and title are required" });
  }
  const status = STATUSES.includes(b.status) ? b.status : "want";

  db.prepare(
    `INSERT INTO library (user_id, book_id, title, authors, year, cover, free, archive_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, book_id) DO UPDATE SET status = excluded.status`
  ).run(
    req.userId,
    String(b.id),
    String(b.title),
    JSON.stringify(Array.isArray(b.authors) ? b.authors : []),
    b.year || null,
    b.cover || null,
    b.free ? 1 : 0,
    b.archiveId || null,
    status
  );

  res.json({ ok: true });
});

app.delete("/api/library", requireAuth, (req, res) => {
  const bookId = String(req.query.bookId || "");
  if (!bookId) return res.status(400).json({ error: "bookId is required" });

  db.prepare("DELETE FROM library WHERE user_id = ? AND book_id = ?").run(
    req.userId,
    bookId
  );
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});