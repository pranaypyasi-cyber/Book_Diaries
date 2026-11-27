import { useEffect, useState } from "react";

function BookModal({ book, onClose }) {
  const [reading, setReading] = useState(false);
  const canRead = book.free && book.archiveId;

  // Close on Escape key and lock page scroll while the popup is open
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {!reading ? (
          <div className="details">
            {book.cover ? (
              <img src={book.cover} alt={book.title} />
            ) : (
              <div className="no-cover">No cover available</div>
            )}

            <div className="info">
              <h2>{book.title}</h2>
              <p>{book.authors.join(", ") || "Unknown author"}</p>
              {book.year && <p>First published: {book.year}</p>}

              <span className={book.free ? "tag free" : "tag"}>
                {book.free ? "Free to read" : "Borrow / Preview"}
              </span>

              <div className="actions">
                {canRead ? (
                  <button onClick={() => setReading(true)}>Read now</button>
                ) : (
                  <a
                    className="btn"
                    href={`https://openlibrary.org${book.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Borrow on Open Library
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="reader">
            <iframe
              title={book.title}
              src={`https://archive.org/embed/${book.archiveId}`}
              allowFullScreen
            />
            <div className="reader-bar">
              <button onClick={() => setReading(false)}>← Back to details</button>
              <a
                href={`https://archive.org/details/${book.archiveId}`}
                target="_blank"
                rel="noreferrer"
              >
                Not loading? Open on Internet Archive
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookModal;