import { Outlet, NavLink, useParams } from "react-router-dom";

export default function ProfissionalLayout() {
  const { codigo } = useParams();

  return (
    <div>
      <div style={{ marginBottom: 24, borderBottom: "1px solid #e0e4e8", paddingBottom: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <NavLink
          to={`/profissional/${codigo}/agenda`}
          style={({ isActive }) => ({ fontWeight: isActive ? 600 : 400, color: isActive ? "#1a2a4f" : "#6b7a8f", textDecoration: "none" })}
        >
          Agenda
        </NavLink>
        <NavLink
          to={`/profissional/${codigo}/pacientes`}
          style={({ isActive }) => ({ fontWeight: isActive ? 600 : 400, color: isActive ? "#1a2a4f" : "#6b7a8f", textDecoration: "none" })}
        >
          Pacientes
        </NavLink>
      </div>
      <Outlet />
    </div>
  );
}