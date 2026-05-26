import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function ProfissionalProntuario() {
  const { alunoId } = useParams();
  const [aluno, setAluno] = useState<any>({});
  const [evolucao, setEvolucao] = useState("");

  useEffect(() => {
    const carregar = async () => {
      const snap = await getDoc(doc(db, "alunos", alunoId!));
      setAluno(snap.data());
    };
    carregar();
  }, [alunoId]);

  const salvarEvolucao = async () => {
    if (!evolucao) return;
    const prontuarioRef = doc(db, "prontuarios", `${alunoId}_${Date.now()}`);
    await updateDoc(prontuarioRef, { texto: evolucao, data: new Date() });
    alert("Evolução salva");
    setEvolucao("");
  };

  return (
    <div>
      <h2>Prontuário de {aluno.nomeCompleto}</h2>
      <textarea rows={10} style={{ width: "100%" }} value={evolucao} onChange={e => setEvolucao(e.target.value)} placeholder="Registro clínico..." />
      <button onClick={salvarEvolucao}>Salvar Evolução</button>
    </div>
  );
}