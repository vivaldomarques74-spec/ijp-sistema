import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

export default function LoginProfissional() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const entrar = async () => {
    if (!codigo.trim() || !senha.trim()) return alert("Informe código e senha");
    setCarregando(true);
    try {
      const q = query(collection(db, "profissionais"), where("codigo", "==", codigo.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("Código não encontrado");
        return;
      }
      const docProf = snap.docs[0];
      const profData = docProf.data();

      // Verifica senha
      if (profData.senha !== senha) {
        alert("Senha incorreta");
        return;
      }

      // ✅ Armazena dados de sessão (incluindo tipo)
      localStorage.setItem("profissionalAutenticado", "true");
      localStorage.setItem("profissionalId", docProf.id);
      localStorage.setItem("profissionalCodigo", profData.codigo || "");
      localStorage.setItem("profissionalNome", profData.nome || "");
      localStorage.setItem("profissionalTipo", profData.tipo || "profissional");

      navigate(`/profissional/${profData.codigo}/agenda`);
    } catch (error: any) {
      alert(`Erro ao entrar: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 20 }}>
      <h1>Acesso Profissional</h1>
      <input
        placeholder="Código (ex: PRO001)"
        value={codigo}
        onChange={e => setCodigo(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 8, border: "1px solid #ccc", borderRadius: 8 }}
      />
      <input
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={e => setSenha(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 16, border: "1px solid #ccc", borderRadius: 8 }}
      />
      <button
        onClick={entrar}
        disabled={carregando}
        style={{ width: "100%", padding: "10px 20px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
      >
        {carregando ? "Entrando..." : "Entrar"}
      </button>
    </div>
  );
}