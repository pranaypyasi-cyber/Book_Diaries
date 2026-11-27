import { useEffect, useState } from "react";
import BookModal from "./BookModal";
import AuthForm from "./AuthForm";
import { api, getToken, setToken, clearToken } from "./api";
import "./App.css";

const STATUS_LABELS = {
  want: "Want to read",
  reading: "Reading",
  finished: "Finished",
};

function BookCard({ book, savedStatus, onOpen }) {
  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(book)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(book)}
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
      {savedStatus && (
        <span className="tag status">{STATUS_LABELS[savedStatus]}</span>
      )}
    </div>
  );
}

function App() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);

  const [user, setUser] = useState(null);
  const [library, setLibrary] = useState([]);
  const [view, setView] = useState("search");
  const [filter, setFilter] = useState("all");
  const [showAuth, setShowAuth] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadLibrary() {
    try {
      setLibrary(await api("/api/library"));
    } catch {
      /* ignore */
    }
  }

  // On page load, check if a saved login is still valid
  useEffect(() => {
    if (!getToken()) return;
    api("/api/me")
      .then((data) => {
        setUser(data.user);
        loadLibrary();
      })
      .catch(() => clearToken());
  }, []);

  function handleAuth(data) {
    setToken(data.token);
    setUser(data.user);
    setShowAuth(false);
    setNotice("");
    loadLibrary();
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setLibrary([]);
    setView("search");
    setSelected(null);
  }

  function handleApiError(err) {
    if (err.status === 401) {
      handleLogout();
      setShowAuth(true);
    } else {
      setNotice(err.message);
    }
  }

  async function saveBook(book, status) {
    try {
      await api("/api/library", {
        method: "POST",
        body: {
          id: book.id,
          title: book.title,
          authors: book.authors,
          year: book.year,
          cover: book.cover,
          free: book.free,
          archiveId: book.archiveId,
          status,
        },
      });
      await loadLibrary();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function removeBook(book) {
    try {
      await api(`/api/library?bookId=${encodeURIComponent(book.id)}`, {
        method: "DELETE",
      });
      await loadLibrary();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await api(`/api/search?q=${encodeURIComponent(query)}`);
      setBooks(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const savedStatus = (id) => library.find((b) => b.id === id)?.status;
  const shownLibrary =
    filter === "all" ? library : library.filter((b) => b.status === filter);

  return (
    <div className="app">
      <div className="topbar">
        <h1>Book Library</h1>
        <div className="nav">
          {user ? (
            <>
              <span className="hello">Hi, {user.name}</span>
              <button
                className={view === "search" ? "active" : ""}
                onClick={() => setView("search")}
              >
                Search
              </button>
              <button
                className={view === "library" ? "active" : ""}
                onClick={() => setView("library")}
              >
                My Library ({library.length})
              </button>
              <button onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)}>Log in / Sign up</button>
          )}
        </div>
      </div>

      {notice && <p className="error">{notice}</p>}

      {view === "search" ? (
        <>
          <p className="subtitle">
            Search millions of books and read free classics online.
          </p>

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
              <BookCard
                key={book.id}
                book={book}
                savedStatus={savedStatus(book.id)}
                onOpen={setSelected}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="filters">
            {["all", "want", "reading", "finished"].map((f) => (
              <button
                key={f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : STATUS_LABELS[f]}
              </button>
            ))}
          </div>

          {shownLibrary.length === 0 && (
            <p className="muted">
              Nothing here yet. Search for a book and add it to your library.
            </p>
          )}

          <div className="grid">
            {shownLibrary.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                savedStatus={book.status}
                onOpen={setSelected}
              />
            ))}
          </div>
        </>
      )}

      {selected && (
        <BookModal
          book={selected}
          user={user}
          entry={library.find((b) => b.id === selected.id)}
          onSave={saveBook}
          onRemove={removeBook}
          onLogin={() => {
            setSelected(null);
            setShowAuth(true);
          }}
          onClose={() => setSelected(null)}
        />
      )}

      {showAuth && (
        <AuthForm onSuccess={handleAuth} onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}

export default App;