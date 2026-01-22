import { Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import PrivateRoute from "./auth/PrivateRoute";

// Páginas
import Dashboard from "./pages/Dashboard";
import Cursos from "./pages/Cursos";
import CursoNovo from "./pages/CursoNovo";
import CursoDetalhe from "./pages/CursoDetalhe";
import Presenca from "./pages/Presenca";
import AlunosLista from "./pages/AlunosLista";
import AlunosCadastrar from "./pages/AlunosCadastrar";
import AlunosEditar from "./pages/AlunosEditar";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      {/* 🔓 ROTA PÚBLICA */}
      <Route path="/login" element={<Login />} />

      {/* 🔒 ROTAS PROTEGIDAS */}
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />

        <Route path="/alunos" element={<AlunosLista />} />
        <Route path="/alunos/cadastrar" element={<AlunosCadastrar />} />
        <Route path="/alunos/editar/:id" element={<AlunosEditar />} />

        <Route path="/cursos" element={<Cursos />} />
        <Route path="/cursos/novo" element={<CursoNovo />} />
        <Route path="/cursos/:id" element={<CursoDetalhe />} />

        <Route path="/presenca" element={<Presenca />} />
      </Route>
    </Routes>
  );
}
