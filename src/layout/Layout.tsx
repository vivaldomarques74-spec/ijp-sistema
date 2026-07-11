import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

export default function Layout() {
  const location = useLocation();
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);

  useEffect(() => {
    const carregarNotificacoes = async () => {
      const q = query(collection(db, "notificacoes"), where("lida", "==", false));
      const snap = await getDocs(q);
      setNotificacoesNaoLidas(snap.size);
    };
    carregarNotificacoes();
    const interval = setInterval(carregarNotificacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/alunos", label: "Alunos", icon: "👤" },
    { path: "/alunos/cadastrar", label: "Novo Aluno", icon: "➕" },
    { path: "/cursos", label: "Cursos", icon: "📚" },
    { path: "/presenca", label: "Presença", icon: "✅" },
    { path: "/saude", label: "Saúde", icon: "🏥" },
    { path: "/certificados", label: "Certificados", icon: "📜" },
    { path: "/pre-inscricoes", label: "Pré-inscrições", icon: "📝" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6f9" }}>
      {/* Menu lateral */}
      <aside
        style={{
          width: 240,
          background: "#ffffff",
          borderRight: "1px solid #e0e4e8",
          padding: "20px 0",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          overflowY: "auto",
          zIndex: 1000,
          boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #e0e4e8" }}>
          <h2 style={{ margin: 0, fontSize: 20, color: "#1a2a4f" }}>IJP</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7a8f" }}>Instituto Jovens Periféricos</p>
        </div>
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 8,
                color: location.pathname === item.path ? "#1a2a4f" : "#4a5a6f",
                background: location.pathname === item.path ? "#eef2f7" : "transparent",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: location.pathname === item.path ? 600 : 400,
                marginBottom: 4,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== item.path) {
                  e.currentTarget.style.background = "#f0f2f5";
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== item.path) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #e0e4e8", fontSize: 13, color: "#6b7a8f" }}>
          <Link
            to="/notificacoes"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "#4a5a6f",
            }}
          >
            🔔 Notificações
            {notificacoesNaoLidas > 0 && (
              <span
                style={{
                  background: "#dc3545",
                  color: "#fff",
                  borderRadius: "50%",
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  marginLeft: "auto",
                }}
              >
                {notificacoesNaoLidas}
              </span>
            )}
          </Link>
          <Link
            to="/acesso-profissional"
            style={{
              display: "block",
              marginTop: 8,
              textDecoration: "none",
              color: "#0070f3",
              fontSize: 13,
            }}
          >
            👤 Área do Profissional
          </Link>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main style={{ marginLeft: 240, flex: 1, padding: 24 }}>
        {/* Topbar com data/hora */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: "1px solid #e0e4e8",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1a2a4f", margin: 0 }}>
            {menuItems.find((item) => item.path === location.pathname)?.label || "Dashboard"}
          </h1>
          <span style={{ fontSize: 14, color: "#6b7a8f" }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}