import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, getDocs, addDoc, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";

type Evolucao = {
  id: string;
  texto: string;
  data: any;
};

export default function ProfissionalProntuario() {
  const { alunoId } = useParams();
  const [aluno, setAluno] = useState<any>({});
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [novaEvolucao, setNovaEvolucao] = useState("");

  useEffect(() => {
    const carregar = async () => {
      const alunoSnap = await getDoc(doc(db, "alunos", alunoId!));
      if (alunoSnap.exists()) setAluno(alunoSnap.data());

      const q = query(collection(db, "prontuarios"), orderBy("data", "desc"));
      const snap = await getDocs(q);
      const lista = snap.docs
        .filter(d => d.data().alunoId === alunoId)
        .map(d => ({ id: d.id, texto: d.data().texto, data: d.data().data }));
      setEvolucoes(lista);
    };
    carregar();
  }, [alunoId]);

  const salvarEvolucao = async () => {
    if (!novaEvolucao.trim()) return alert("Digite a evolução");
    await addDoc(collection(db, "prontuarios"), {
      alunoId,
      texto: novaEvolucao,
      data: new Date(),
    });
    alert("Evolução salva");
    setNovaEvolucao("");
    // recarregar evoluções
    const q = query(collection(db, "prontuarios"), orderBy("data", "desc"));
    const snap = await getDocs(q);
    const lista = snap.docs
      .filter(d => d.data().alunoId === alunoId)
      .map(d => ({ id: d.id, texto: d.data().texto, data: d.data().data }));
    setEvolucoes(lista);
  };

  return (
    <div>
      <h2>Prontuário de {aluno.nomeCompleto}</h2>
      <div>
        <textarea
          rows={5}
          style={{ width: "100%", marginBottom: 8 }}
          value={novaEvolucao}
          onChange={e => setNovaEvolucao(e.target.value)}
          placeholder="Digite a evolução do atendimento..."
        />
        <button onClick={salvarEvolucao}>Salvar Evolução</button>
      </div>

      <h3>Histórico de evoluções</h3>
      {evolucoes.length === 0 && <p>Nenhuma evolução registrada.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {evolucoes.map(ev => (
          <li key={ev.id} style={{ borderBottom: "1px solid #eee", marginBottom: 12, paddingBottom: 8 }}>
            <small>{ev.data?.toDate().toLocaleString()}</small>
            <p>{ev.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}