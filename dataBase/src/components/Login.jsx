// src/pages/Login.jsx
import { useState } from "react";
import { auth, db } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { ref, get } from "firebase/database";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkIsAdmin(user) {
    const snap = await get(ref(db, `admins/${user.uid}`));
    if (!snap.exists()) {
      await signOut(auth);
      throw new Error("Esta conta não tem acesso de administrador.");
    }
  }

  async function handleGoogle() {
    setErr("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      await checkIsAdmin(user);
      // redirect in your router (or let your app shell do it)
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await checkIsAdmin(user);
      // redirect
    } catch (e) {
      setErr(`Auth error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Entrar</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>Apenas o administrador pode aceder.</p>

      <button
        onClick={handleGoogle}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fff",
          cursor: "pointer",
          marginBottom: 16
        }}
      >
        {loading ? "A entrar..." : "Entrar com Google"}
      </button>

      <div style={{ opacity: 0.6, margin: "8px 0" }}>ou</div>

      <form onSubmit={handleEmail} style={{ display: "grid", gap: 8 }}>
        <input
          type="email"
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <input
          type="password"
          placeholder="Palavra-passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            color: "#fff",
            background: "#111",
            cursor: "pointer"
          }}
        >
          {loading ? "A entrar..." : "Entrar com Email"}
        </button>
      </form>

      {err && <p style={{ color: "#c00", marginTop: 12 }}>{err}</p>}
    </div>
  );
}
