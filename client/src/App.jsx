import { useState } from "react";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `http://localhost:3000/api/search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBooks(data);
    } catch (err) {
      setError(err.message || "Kuch gadbad ho gayi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1>Book Library</h1>

      <form onSubmit={handleSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kitab ya lekhak ka naam"
        />
        <button type="submit">Search</button>
      </form>

      {loading && <p>Dhundh rahe hain...</p>}
      {error && <p className="error">{error}</p>}

      <div className="grid">
        {books.map((book) => (
          <div className="card" key={book.id}>
            {book.cover ? (
              <img src={book.cover} alt={book.title} />
            ) : (
              <div className="no-cover">Cover nahi hai</div>
            )}
            <h3>{book.title}</h3>
            <p>{book.authors.join(", ")}</p>
            <span className={book.free ? "tag free" : "tag"}>
              {book.free ? "Free padhein" : "Udhaar / Preview"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;