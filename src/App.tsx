import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Cursos from "./pages/Cursos";
import CursoNovo from "./pages/CursoNovo";
import CursoDetalhe from "./pages/CursoDetalhe";
import AlunosLista from "./pages/AlunosLista";
import AlunosCadastrar from "./pages/AlunosCadastrar";
import AlunosEditar from "./pages/AlunosEditar";
import Presenca from "./pages/Presenca";

import { AuthProvider } from "./auth/AuthContext";
import PrivateRoute from "./auth/PrivateRoute";
import Layout from "./layout/Layout";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* LOGIN */}
          <Route path="/" element={<Login />} />

          {/* ROTAS PROTEGIDAS COM LAYOUT */}
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/cursos" element={<Cursos />} />
            <Route path="/cursos/novo" element={<CursoNovo />} />
            <Route path="/cursos/:id" element={<CursoDetalhe />} />

            <Route path="/alunos" element={<AlunosLista />} />
            <Route path="/alunos/cadastrar" element={<AlunosCadastrar />} />
            <Route path="/alunos/editar/:id" element={<AlunosEditar />} />

            <Route path="/presenca" element={<Presenca />} />
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
