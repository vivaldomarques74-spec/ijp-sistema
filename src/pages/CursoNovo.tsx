import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";

export default function CursoNovo() {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const navigate = useNavigate();

  async function salvar() {
    if (!nome) {
      alert("Informe o nome do curso");
      return;
    }

    await addDoc(collection(db, "cursos"), {
      nome,
      descricao,
      ativo: true,
      createdAt: serverTimestamp(),
    });

    navigate("/cursos");
  }

  return (
    <div>
      <h1>Novo Curso</h1>

      <input
        placeholder="Nome do curso"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />

      <br /><br />

      <button onClick={salvar}>Salvar</button>
    </div>
  );
}
