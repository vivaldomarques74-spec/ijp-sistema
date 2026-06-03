import { Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import PrivateRoute from "./auth/PrivateRoute";

import Dashboard from "./pages/Dashboard";
import Cursos from "./pages/Cursos";
import CursoNovo from "./pages/CursoNovo";
import CursoDetalhe from "./pages/CursoDetalhe";
import Presenca from "./pages/Presenca";
import AlunosLista from "./pages/AlunosLista";
import AlunosCadastrar from "./pages/AlunosCadastrar";
import AlunosEditar from "./pages/AlunosEditar";
import Login from "./pages/Login";

import Saude from "./pages/Saude";
import SaudeFila from "./pages/SaudeFila";
import SaudeAgenda from "./pages/SaudeAgenda";
import SaudeProfissionais from "./pages/SaudeProfissionais";
import SaudePacientes from "./pages/SaudePacientes";
import SaudeConfiguracoes from "./pages/SaudeConfiguracoes";
import SaudeFilaOrdemChegada from "./pages/SaudeFilaOrdemChegada";

import LoginProfissional from "./pages/LoginProfissional";
import CadastrarSenhaProfissional from "./pages/CadastrarSenhaProfissional";
import ProfissionalLayout from "./layout/ProfissionalLayout";
import ProfissionalAgenda from "./pages/ProfissionalAgenda";
import ProfissionalProntuario from "./pages/ProfissionalProntuario";

import MigracaoPsicologia from "./pages/MigracaoPsicologia";
import Notificacoes from "./pages/Notificacoes";
import RelatorioAlunosTurma from "./pages/RelatorioAlunosTurma";
import MigracaoCorrigirHorarios from "./pages/MigracaoCorrigirHorarios";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/acesso-profissional" element={<LoginProfissional />} />
      <Route path="/cadastrar-senha" element={<CadastrarSenhaProfissional />} />

      <Route path="/profissional/:codigo" element={<ProfissionalLayout />}>
        <Route path="agenda" element={<ProfissionalAgenda />} />
        <Route path="paciente/:alunoId" element={<ProfissionalProntuario />} />
      </Route>

      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<Dashboard />} />

        <Route path="/alunos" element={<AlunosLista />} />
        <Route path="/alunos/cadastrar" element={<AlunosCadastrar />} />
        <Route path="/alunos/editar/:id" element={<AlunosEditar />} />

        <Route path="/cursos" element={<Cursos />} />
        <Route path="/cursos/novo" element={<CursoNovo />} />
        <Route path="/cursos/:id" element={<CursoDetalhe />} />

        <Route path="/presenca" element={<Presenca />} />

        <Route path="/saude" element={<Saude />}>
          <Route index element={<SaudeFila />} />
          <Route path="fila" element={<SaudeFila />} />
          <Route path="fila-ordem" element={<SaudeFilaOrdemChegada />} />
          <Route path="agenda" element={<SaudeAgenda />} />
          <Route path="profissionais" element={<SaudeProfissionais />} />
          <Route path="pacientes" element={<SaudePacientes />} />
          <Route path="configuracoes" element={<SaudeConfiguracoes />} />
        </Route>

        <Route path="/migracao-psicologia" element={<MigracaoPsicologia />} />
        <Route path="/notificacoes" element={<Notificacoes />} />
        <Route path="/relatorio-alunos" element={<RelatorioAlunosTurma />} />
        <Route path="/migracao-corrigir-horarios" element={<MigracaoCorrigirHorarios />} />
      </Route>
    </Routes>
  );
}