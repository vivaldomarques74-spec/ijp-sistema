import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function CadastrarSenhaProfissional() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profissionalId, codigo } = location.state || {};
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const cadastrar = async () => {
    if (!senha || senha !== confirmarSenha) {
      alert("As senhas não coincidem ou estão vazias.");
      return;
    }
    try {
      await updateDoc(doc(db, "profissionais", profissionalId), { senha });
      alert("Senha cadastrada com sucesso!");
      navigate("/acesso-profissional");
    } catch (error) {
      console.error("Erro ao cadastrar senha:", error);
      alert("Erro ao cadastrar senha.");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", textAlign: "center" }}>
      <h2>Cadastrar senha de acesso</h2>
      <p>Profissional: {codigo}</p>
      <input
        type="password"
        placeholder="Digite sua senha"
        value={senha}
        onChange={e => setSenha(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 8 }}
      />
      <input
        type="password"
        placeholder="Confirme a senha"
        value={confirmarSenha}
        onChange={e => setConfirmarSenha(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 16 }}
      />
      <button onClick={cadastrar}>Cadastrar</button>
    </div>
  );
}