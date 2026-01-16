import { Link, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff" }}>
      {/* MENU SUPERIOR */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "16px 24px",
          borderBottom: "1px solid #ddd",
        }}
      >
        <strong>IJP</strong>

        {/* 👇 CADASTRAR ALUNO PRIMEIRO */}
        <Link to="/alunos/cadastrar">Cadastrar Aluno</Link>
        <Link to="/alunos">Alunos</Link>
        <Link to="/cursos">Cursos</Link>
        <Link to="/presenca">Presença</Link>

        <button
          onClick={handleLogout}
          style={{ marginLeft: "auto" }}
        >
          Sair
        </button>
      </header>

      {/* CONTEÚDO */}
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
