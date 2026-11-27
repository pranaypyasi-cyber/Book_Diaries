const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Book library server is running" });
});

app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Please enter a book or author name" });

  try {
    const fields =
      "key,title,author_name,first_publish_year,cover_i,ia,public_scan_b";
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20&fields=${fields}`;

    const r = await fetch(url, {
      headers: { "User-Agent": "BookLibraryApp (your-email@example.com)" },
    });
    if (!r.ok) throw new Error("Open Library did not respond");

    const data = await r.json();
    const books = data.docs.map((d) => ({
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

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});