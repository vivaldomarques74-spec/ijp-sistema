import { Outlet, Link } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <header
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid #ddd",
          display: "flex",
          gap: 24,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <strong>IJP</strong>
        <Link to="/">Início</Link>
        <Link to="/alunos">Alunos</Link>
        <Link to="/alunos/cadastrar">Cadastrar Aluno</Link>
        <Link to="/cursos">Cursos</Link>
        <Link to="/presenca">Presença</Link>
        <Link to="/saude">Saúde</Link>
        <span style={{ marginLeft: "auto" }}>
          <Link to="/acesso-profissional" style={{ background: "#0070f3", color: "#fff", padding: "4px 12px", borderRadius: 4 }}>
            Área do Profissional
          </Link>
        </span>
      </header>
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </>
  );
}