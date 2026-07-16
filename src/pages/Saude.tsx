import { Outlet, NavLink } from "react-router-dom";

export default function Saude() {
  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, borderBottom: "1px solid #e0e4e8", paddingBottom: 8, flexWrap: "wrap" }}>
        <NavLink to="/saude/fila" style={({ isActive }) => ({ fontWeight: isActive ? 600 : 400, color: isActive ? "#1a2a4f" : "#6b7a8f", textDecoration: "none" })}>
          Fila (Agendados)
        </NavLink>
        <NavLink to="/saude/fila-ordem" style={({ isActive }) => ({ fontWeight: isActive ? 600 : 400, color: isActive ? "#1a2a4f" : "#6b7a8f", textDecoration: "none" })}>
          Atendimento por Ordem
        </NavLink>
        <NavLink to="/saude/agenda" style={({ isActive }) => ({ fontWeight: isActive ? 600 : 400, color: isActive ? "#1a2a4f" : "#6b7a8f", textDecoration: "none" })}>
          Agenda
        </NavLink>
        <NavLink to="/saude/profissionais" style={({ isActive }) => ({ fontWeight: isActive ? 600 : 400, color: isActive ? "#1a2a4f" : "#6b7a8f", textDecoration: "none" })}>
          Profissionais
        </NavLink>
        <NavLink to="/saude/pacientes" style={({ isActive }) => ({ fontWeight: isActive ? 600 : 400, color: isActive ? "#1a2a4f" : "#6b7a8f", textDecoration: "none" })}>
          Pacientes
        </NavLink>
        <NavLink to="/saude/configuracoes" style={({ isActive }) => ({ fontWeight: isActive ? 600 : 400, color: isActive ? "#1a2a4f" : "#6b7a8f", textDecoration: "none" })}>
          Configurações
        </NavLink>
      </div>
      <Outlet />
    </div>
  );
}