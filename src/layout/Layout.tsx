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
        }}
      >
        <strong>IJP</strong>

        <Link to="/">Início</Link>
        <Link to="/alunos">Alunos</Link>
        <Link to="/alunos/cadastrar">Cadastrar Aluno</Link>
        <Link to="/cursos">Cursos</Link>
        <Link to="/presenca">Presença</Link>
      </header>

      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </>
  );
}
