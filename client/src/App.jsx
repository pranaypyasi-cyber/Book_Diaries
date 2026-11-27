import { useState } from "react";
import BookModal from "./BookModal";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetch(
        `http://localhost:3000/api/search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBooks(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1>Book Library</h1>
      <p className="subtitle">Search millions of books and read free classics online.</p>

      <form onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by book title or author"
        />
        <button type="submit">Search</button>
      </form>

      {loading && <p>Searching...</p>}
      {error && <p className="error">{error}</p>}
      {searched && !loading && !error && books.length === 0 && (
        <p>No books found. Try a different search.</p>
      )}

      <div className="grid">
        {books.map((book) => (
          <div
            className="card"
            key={book.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(book)}
            onKeyDown={(e) => e.key === "Enter" && setSelected(book)}
          >
            {book.cover ? (
              <img src={book.cover} alt={book.title} />
            ) : (
              <div className="no-cover">No cover available</div>
            )}
            <h3>{book.title}</h3>
            <p>{book.authors.join(", ")}</p>
            <span className={book.free ? "tag free" : "tag"}>
              {book.free ? "Free to read" : "Borrow / Preview"}
            </span>
          </div>
        ))}
      </div>

      {selected && (
        <BookModal book={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

export default App;