import { Outlet, NavLink, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

export default function ProfissionalLayout() {
  const { codigo } = useParams();
  const [profissional, setProfissional] = useState<any>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!codigo) return;
      const q = query(collection(db, "profissionais"), where("codigo", "==", codigo));
      const snap = await getDocs(q);
      if (!snap.empty) setProfissional(snap.docs[0].data());
    };
    carregar();
  }, [codigo]);

  const navLinkStyle = (isActive: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 20px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? "#ffffff" : "#4a5a6f",
    background: isActive
      ? "linear-gradient(135deg, #0070f3 0%, #0056b8 100%)"
      : "transparent",
    boxShadow: isActive ? "0 4px 12px rgba(0, 112, 243, 0.25)" : "none",
    transition: "all 0.2s ease",
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f4f6f9 0%, #eef2f7 100%)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>

        {/* Header com info do profissional */}
        <div style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: "20px 28px",
          marginBottom: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          border: "1px solid #e8ecf1",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0070f3 0%, #0056b8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 20,
              boxShadow: "0 4px 12px rgba(0, 112, 243, 0.3)",
            }}>
              {profissional?.nome ? profissional.nome.charAt(0).toUpperCase() : "?"}
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: 18,
                color: "#1a2a4f",
                fontWeight: 700,
                letterSpacing: "-0.3px",
              }}>
                {profissional?.nome || "Carregando..."}
              </h1>
              <p style={{
                margin: "2px 0 0",
                fontSize: 12,
                color: "#6b7a8f",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{
                  background: "#eef2f7",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontWeight: 600,
                  color: "#0070f3",
                  fontSize: 11,
                }}>
                  {codigo}
                </span>
                <span style={{ textTransform: "capitalize" }}>
                  {profissional?.especialidade || profissional?.tipo || ""}
                </span>
              </p>
            </div>
          </div>

          <div style={{
            fontSize: 12,
            color: "#6b7a8f",
            textAlign: "right",
          }}>
            <div style={{ fontWeight: 600, color: "#1a2a4f", marginBottom: 2 }}>
              {new Date().toLocaleDateString("pt-BR", { weekday: "long" })}
            </div>
            <div>
              {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Navegação em pills */}
        <div style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 8,
          marginBottom: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #e8ecf1",
          display: "inline-flex",
          gap: 4,
        }}>
          <NavLink
            to={`/profissional/${codigo}/agenda`}
            style={({ isActive }) => navLinkStyle(isActive)}
          >
            <span style={{ fontSize: 16 }}>📅</span>
            Agenda
          </NavLink>
          <NavLink
            to={`/profissional/${codigo}/pacientes`}
            style={({ isActive }) => navLinkStyle(isActive)}
          >
            <span style={{ fontSize: 16 }}>👥</span>
            Pacientes
          </NavLink>
        </div>

        {/* Conteúdo */}
        <div style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #e8ecf1",
          minHeight: 400,
        }}>
          <Outlet />
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 12,
          color: "#a0aec0",
        }}>
          Instituto Jovens Periféricos • Área do Profissional
        </div>
      </div>
    </div>
  );
}