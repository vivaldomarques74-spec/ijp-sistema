import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

export default function LoginProfissional() {
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [etapa, setEtapa] = useState<"codigo" | "senha">("codigo");
  const [profissionalDoc, setProfissionalDoc] = useState<any>(null);
  const navigate = useNavigate();

  const verificarCodigo = async () => {
    if (!codigo.trim()) return alert("Digite o código");
    const q = query(collection(db, "profissionais"), where("codigo", "==", codigo));
    const snap = await getDocs(q);
    if (snap.empty) return alert("Código inválido");
    const docProf = snap.docs[0];
    const data = docProf.data();
    if (!data.senha) {
      // Primeiro acesso: cadastrar senha
      navigate("/cadastrar-senha", { state: { profissionalId: docProf.id, codigo } });
    } else {
      setProfissionalDoc({ id: docProf.id, ...data });
      setEtapa("senha");
    }
  };

  const verificarSenha = async () => {
    if (profissionalDoc.senha !== senha) {
      alert("Senha incorreta");
      return;
    }
    localStorage.setItem("profissionalId", profissionalDoc.id);
    localStorage.setItem("profissionalCodigo", codigo);
    localStorage.setItem("profissionalAutenticado", "true");
    navigate(`/profissional/${codigo}/agenda`);
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", textAlign: "center" }}>
      <h2>Acesso Profissional</h2>
      {etapa === "codigo" && (
        <>
          <input
            placeholder="Digite seu código (ex: PRO001)"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 16 }}
          />
          <button onClick={verificarCodigo}>Continuar</button>
        </>
      )}
      {etapa === "senha" && (
        <>
          <input
            type="password"
            placeholder="Digite sua senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 16 }}
          />
          <button onClick={verificarSenha}>Entrar</button>
        </>
      )}
    </div>
  );
}