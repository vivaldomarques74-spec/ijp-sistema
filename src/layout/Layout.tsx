import { Outlet, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

export default function Layout() {
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

  return (
    <>
      <header style={{ padding: "12px 24px", borderBottom: "1px solid #ddd", display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <strong>IJP</strong>
        <Link to="/">Início</Link>
        <Link to="/alunos">Alunos</Link>
        <Link to="/alunos/cadastrar">Cadastrar Aluno</Link>
        <Link to="/cursos">Cursos</Link>
        <Link to="/presenca">Presença</Link>
        <Link to="/saude">Saúde</Link>
        <Link to="/notificacoes" style={{ position: "relative", marginLeft: "auto" }}>
          🔔
          {notificacoesNaoLidas > 0 && (
            <span style={{
              position: "absolute",
              top: -8,
              right: -12,
              backgroundColor: "red",
              color: "white",
              borderRadius: "50%",
              padding: "2px 6px",
              fontSize: 12,
            }}>
              {notificacoesNaoLidas}
            </span>
          )}
        </Link>
        <Link to="/acesso-profissional" style={{ background: "#0070f3", color: "#fff", padding: "4px 12px", borderRadius: 4 }}>
          Área do Profissional
        </Link>
      </header>
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </>
  );
}