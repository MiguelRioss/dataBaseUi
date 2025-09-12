import React from "react";
import { onUser, logout, db } from "./firebase";
import { onValue, ref } from "firebase/database";
import Orders from "./components/Orders";   // o seu componente de lista
import Login from "./components/Login";
import "./App.css";

export default function App() {
  const [user, setUser] = React.useState(null);
  const [checking, setChecking] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(null);

  React.useEffect(() => {
    const off = onUser((u) => { setUser(u); setChecking(false); });
    return () => off();
  }, []);

  // ler /admins/<uid> (permitido pelas regras, mesmo que ainda não seja admin)
  React.useEffect(() => {
    if (!user) { setIsAdmin(null); return; }
    const r = ref(db, `admins/${user.uid}`);
    const off = onValue(r, (snap) => setIsAdmin(!!snap.val()));
    return () => off();
  }, [user]);

  if (checking) return <div className="page">A carregar…</div>;
  if (!user) return <Login />;

  if (isAdmin === false) {
    return (
      <div className="page">
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <div><div className="muted">Sessão iniciada:</div><strong>{user.email}</strong></div>
          <button className="btn" onClick={logout}>Sair</button>
        </div>
        <h1>Sem autorização</h1>
        <p className="muted">
          Dê-me acesso colocando <code>/admins/{user.uid}</code> = <code>true</code> no Realtime Database.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
        <div><div className="muted">Sessão iniciada:</div><strong>{user.email}</strong></div>
        <button className="btn" onClick={logout}>Sair</button>
      </div>
      <Orders />
    </div>
  );
}
