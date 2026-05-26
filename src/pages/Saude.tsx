import { Outlet, NavLink } from "react-router-dom";

export default function Saude() {
  return (
    <div>
      <h1>Saúde e Serviços</h1>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, borderBottom: "1px solid #ccc", paddingBottom: 8, flexWrap: "wrap" }}>
        <NavLink to="/saude/fila" style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal" })}>Fila de Espera (Agendados)</NavLink>
        <NavLink to="/saude/fila-ordem" style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal" })}>Atendimento por Ordem</NavLink>
        <NavLink to="/saude/agenda" style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal" })}>Agenda</NavLink>
        <NavLink to="/saude/profissionais" style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal" })}>Profissionais</NavLink>
        <NavLink to="/saude/pacientes" style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal" })}>Pacientes</NavLink>
        <NavLink to="/saude/configuracoes" style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal" })}>Tipos de Atendimento</NavLink>
      </div>
      <Outlet />
    </div>
  );
}