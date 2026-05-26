import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

export default function LoginProfissional() {
  const [codigo, setCodigo] = useState("");
  const navigate = useNavigate();

  const entrar = async () => {
    if (!codigo.trim()) return alert("Digite o código");
    const q = query(collection(db, "profissionais"), where("codigo", "==", codigo));
    const snap = await getDocs(q);
    if (snap.empty) return alert("Código inválido");
    const profissionalDoc = snap.docs[0];
    localStorage.setItem("profissionalId", profissionalDoc.id);
    localStorage.setItem("profissionalCodigo", codigo);
    navigate(`/profissional/${codigo}/agenda`);
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", textAlign: "center" }}>
      <h2>Acesso Profissional</h2>
      <input
        placeholder="Digite seu código (ex: PRO001, PSI001)"
        value={codigo}
        onChange={e => setCodigo(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 16 }}
      />
      <button onClick={entrar}>Entrar</button>
    </div>
  );
}