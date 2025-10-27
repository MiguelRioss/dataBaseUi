// src/App.jsx
import React from "react";
import { onUser, logout, db } from "./firebase";
import { onValue, ref } from "firebase/database";
import Orders from "./components/Orders/Orders";
import Login from "./components/Login";
import DataBaseIconsGrid from "./components/DataBaseIconsGrid";
import "./App.css";
import Inventory from "./components/Inventory/Inventory";
import PromotionCodes from "./components/Promotions/PromotionCodes";
import Videos from "./components/Videos/Videos";

export default function App() {
  const [user, setUser] = React.useState(null);
  const [checking, setChecking] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(null);

  // which admin view is open: 'orders' | 'videos' | 'Inventory' | 'promotions'
  const [selectedView, setSelectedView] = React.useState("orders");

  // Listen to auth user
  React.useEffect(() => {
    const off = onUser((u) => { setUser(u); setChecking(false); });
    return () => off();
  }, []);

  // Check admin flag
  React.useEffect(() => {
    if (!user) { setIsAdmin(null); return; }
    const r = ref(db, `admins/${user.uid}`);
    const off = onValue(r, (snap) => setIsAdmin(!!snap.val()));
    return () => off();
  }, [user]);

  if (checking) return <div className="page">A carregar…</div>;
  if (!user)    return <Login />;

  if (isAdmin === false) {
    return (
      <div className="page">
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <div>
            <div className="muted">Sessão iniciada:</div>
            <strong>{user.email}</strong>
          </div>
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
        <div>
          <div className="muted">Sessão iniciada:</div>
          <strong>{user.email}</strong>
        </div>
        <button className="btn" onClick={logout}>Sair</button>
      </div>

      {/* Admin hero — using the new component */}
      <section style={{marginBottom: 24}}>
        <h2 style={{margin: "0 0 10px 0"}}>Admin</h2>
        <p className="muted" style={{marginTop:0}}>Escolha uma secção para gerir.</p>

        <DataBaseIconsGrid selected={selectedView} onSelect={setSelectedView} />
      </section>

      {/* Selected view area */}
      <div>
        {selectedView === "orders" && <Orders />}

        {selectedView === "videos" && <Videos />}
        {selectedView === "Inventory" && <Inventory />}
        {selectedView === "promotions" && <PromotionCodes />}
      </div>
    </div>
  );
}
