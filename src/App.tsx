import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";

import Dashboard from "./pages/Dashboard";
import Cursos from "./pages/Cursos";
import CursoNovo from "./pages/CursoNovo";
import CursoDetalhe from "./pages/CursoDetalhe";
import Presenca from "./pages/Presenca";
import AlunosLista from "./pages/AlunosLista";
import AlunosCadastrar from "./pages/AlunosCadastrar";
import AlunosEditar from "./pages/AlunosEditar";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
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
    </BrowserRouter>
  );
}
