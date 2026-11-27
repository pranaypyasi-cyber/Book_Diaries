import { useState } from "react";
import { api } from "./api";

function AuthForm({ onSuccess, onClose }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path = mode === "login" ? "/api/login" : "/api/signup";
      const data = await api(path, {
        method: "POST",
        body: { name, email, password },
      });
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{mode === "login" ? "Log in" : "Create account"}</h2>

          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 characters)"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
          </button>

          <p className="muted">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default AuthForm;