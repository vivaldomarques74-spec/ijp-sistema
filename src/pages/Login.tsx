import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import logo from "../assets/logo-ijp.png";

export default function Login() {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!codigo.trim()) return setErro("Digite o código de acesso");
    setCarregando(true);
    try {
      const docRef = doc(db, "config", "acesso");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const codigoCorreto = docSnap.data().codigo;
        if (codigo === codigoCorreto) {
          localStorage.setItem("authCodigo", codigo);
          navigate("/");
          return;
        }
      }
      setErro("Código inválido");
    } catch (error) {
      console.error(error);
      setErro("Erro ao verificar código");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f6f9" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 400, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={logo} alt="IJP" style={{ height: 80 }} />
          <h1 style={{ fontSize: 24, margin: "16px 0 4px", color: "#1a2a4f" }}>Instituto Jovens Periféricos</h1>
          <p style={{ fontSize: 14, color: "#6b7a8f" }}>Digite o código de acesso da equipe</p>
        </div>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Código de acesso"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16, marginBottom: 16 }}
            autoFocus
          />
          {erro && <p style={{ color: "#dc3545", fontSize: 14, margin: "-8px 0 12px" }}>{erro}</p>}
          <button
            type="submit"
            disabled={carregando}
            style={{ width: "100%", padding: 12, background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" }}
          >
            {carregando ? "Verificando..." : "Acessar"}
          </button>
        </form>
      </div>
    </div>
  );
}