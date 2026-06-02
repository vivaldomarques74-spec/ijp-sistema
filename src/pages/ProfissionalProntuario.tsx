import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, getDocs, addDoc, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";

type Evolucao = {
  id: string;
  texto: string;
  data: any;
  createdAt: any;
};

export default function ProfissionalProntuario() {
  const { alunoId } = useParams();
  const [aluno, setAluno] = useState<any>({});
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [novaEvolucao, setNovaEvolucao] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      if (!alunoId) return;
      // Carregar dados do aluno
      const alunoSnap = await getDoc(doc(db, "alunos", alunoId));
      if (alunoSnap.exists()) setAluno(alunoSnap.data());

      // Carregar evoluções existentes (ordenadas por data decrescente)
      const q = query(collection(db, "prontuarios"), orderBy("data", "desc"));
      const snap = await getDocs(q);
      const lista = snap.docs
        .filter(d => d.data().alunoId === alunoId)
        .map(d => ({
          id: d.id,
          texto: d.data().texto,
          data: d.data().data,
          createdAt: d.data().createdAt || d.data().data,
        }));
      setEvolucoes(lista);
    };
    carregar();
  }, [alunoId]);

  const salvarEvolucao = async () => {
    if (!novaEvolucao.trim()) return alert("Digite a evolução");
    if (!alunoId) return alert("Aluno não identificado");
    setCarregando(true);
    try {
      // Data atual para registro (quando foi escrito)
      const agora = new Date();
      // Se o profissional quiser associar a uma data específica, pode adicionar um campo "dataAtendimento".
      // Por enquanto, usamos a data atual como referência de criação.
      await addDoc(collection(db, "prontuarios"), {
        alunoId,
        texto: novaEvolucao,
        data: agora, // timestamp da evolução
        createdAt: agora,
      });
      alert("Evolução salva com sucesso");
      setNovaEvolucao("");
      // Recarregar evoluções
      const q = query(collection(db, "prontuarios"), orderBy("data", "desc"));
      const snap = await getDocs(q);
      const lista = snap.docs
        .filter(d => d.data().alunoId === alunoId)
        .map(d => ({
          id: d.id,
          texto: d.data().texto,
          data: d.data().data,
          createdAt: d.data().createdAt || d.data().data,
        }));
      setEvolucoes(lista);
    } catch (error: any) {
      console.error("Erro ao salvar evolução:", error);
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Prontuário de {aluno.nomeCompleto || "Carregando..."}</h2>
      <div style={{ marginBottom: 20 }}>
        <textarea
          rows={5}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
          value={novaEvolucao}
          onChange={e => setNovaEvolucao(e.target.value)}
          placeholder="Digite a evolução do atendimento (pode ser para qualquer data)..."
        />
        <button onClick={salvarEvolucao} disabled={carregando}>
          {carregando ? "Salvando..." : "Salvar Evolução"}
        </button>
      </div>

      <h3>Histórico de evoluções</h3>
      {evolucoes.length === 0 && <p>Nenhuma evolução registrada.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {evolucoes.map(ev => (
          <li key={ev.id} style={{ borderBottom: "1px solid #eee", marginBottom: 12, paddingBottom: 8 }}>
            <small>{ev.data?.toDate().toLocaleString() || "Data desconhecida"}</small>
            <p style={{ whiteSpace: "pre-wrap" }}>{ev.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}