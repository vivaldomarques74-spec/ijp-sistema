import { Outlet, Link } from "react-router-dom";

export default function ProfissionalLayout() {
  const codigo = localStorage.getItem("profissionalCodigo");
  return (
    <div>
      <header style={{ padding: 12, borderBottom: "1px solid #ccc", display: "flex", justifyContent: "space-between" }}>
        <strong>Área do Profissional - {codigo}</strong>
        <Link to="/acesso-profissional" onClick={() => localStorage.clear()}>Sair</Link>
      </header>
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}