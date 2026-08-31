import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, getDocs, addDoc, query, where, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

type Evolucao = {
  id: string;
  texto: string;
  data: any;
  createdAt: any;
};

export default function ProfissionalProntuario() {
  const { alunoId, codigo } = useParams();
  const [aluno, setAluno] = useState<any>({});
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [novaEvolucao, setNovaEvolucao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [profissional, setProfissional] = useState<any>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEditando, setTextoEditando] = useState("");

  useEffect(() => {
    if (localStorage.getItem("profissionalAutenticado") !== "true") {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/acesso-profissional";
    }
  }, []);

  useEffect(() => {
    const carregarProfissional = async () => {
      if (!codigo) return;
      const q = query(collection(db, "profissionais"), where("codigo", "==", codigo));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setProfissional({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    };
    carregarProfissional();
  }, [codigo]);

  useEffect(() => {
    const carregar = async () => {
      if (!alunoId) return;
      const alunoSnap = await getDoc(doc(db, "alunos", alunoId));
      if (alunoSnap.exists()) setAluno(alunoSnap.data());

      const snap = await getDocs(collection(db, "prontuarios"));
      const lista = snap.docs
        .filter(d => d.data().alunoId === alunoId)
        .map(d => ({
          id: d.id,
          texto: d.data().texto,
          data: d.data().data,
          createdAt: d.data().createdAt || d.data().data,
        }));
      lista.sort((a, b) => {
        const dateA = a.data?.toDate?.() || new Date(0);
        const dateB = b.data?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      setEvolucoes(lista);
    };
    carregar();
  }, [alunoId]);

  const recarregarEvolucoes = async () => {
    const snap = await getDocs(collection(db, "prontuarios"));
    const lista = snap.docs
      .filter(d => d.data().alunoId === alunoId)
      .map(d => ({
        id: d.id,
        texto: d.data().texto,
        data: d.data().data,
        createdAt: d.data().createdAt || d.data().data,
      }));
    lista.sort((a, b) => {
      const dateA = a.data?.toDate?.() || new Date(0);
      const dateB = b.data?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    setEvolucoes(lista);
  };

  const salvarEvolucao = async () => {
    if (localStorage.getItem("profissionalAutenticado") !== "true") {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/acesso-profissional";
      return;
    }

    if (!novaEvolucao.trim()) return alert("Digite a evolução");
    if (!alunoId) return alert("Aluno não identificado");
    setCarregando(true);
    try {
      const agora = new Date();
      await addDoc(collection(db, "prontuarios"), {
        alunoId,
        texto: novaEvolucao,
        data: agora,
        createdAt: agora,
      });
      alert("Evolução salva com sucesso");
      setNovaEvolucao("");
      recarregarEvolucoes();
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const excluirEvolucao = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta evolução?")) return;
    if (profissional?.tipo !== "supervisor") {
      alert("Apenas supervisores podem excluir evoluções.");
      return;
    }
    try {
      await deleteDoc(doc(db, "prontuarios", id));
      alert("Evolução excluída com sucesso!");
      recarregarEvolucoes();
    } catch (error: any) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  const iniciarEdicao = (ev: Evolucao) => {
    setEditandoId(ev.id);
    setTextoEditando(ev.texto);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setTextoEditando("");
  };

  const salvarEdicao = async (id: string) => {
    if (!textoEditando.trim()) return alert("Digite o texto");
    try {
      await updateDoc(doc(db, "prontuarios", id), { texto: textoEditando });
      alert("Evolução atualizada!");
      setEditandoId(null);
      setTextoEditando("");
      recarregarEvolucoes();
    } catch (error: any) {
      alert(`Erro ao editar: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Prontuário de {aluno.nomeCompleto || "Carregando..."}</h2>
      {profissional?.tipo === "supervisor" && (
        <p style={{ color: "#6b7a8f", fontSize: 14 }}>
          🔑 Modo supervisor - você pode editar e excluir evoluções
        </p>
      )}
      <div style={{ marginBottom: 20 }}>
        <textarea
          rows={5}
          style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 8, border: "1px solid #ccc" }}
          value={novaEvolucao}
          onChange={e => setNovaEvolucao(e.target.value)}
          placeholder="Digite a evolução do atendimento..."
        />
        <button
          onClick={salvarEvolucao}
          disabled={carregando}
          style={{ padding: "8px 20px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          {carregando ? "Salvando..." : "Salvar Evolução"}
        </button>
      </div>

      <h3>Histórico de evoluções ({evolucoes.length})</h3>
      {evolucoes.length === 0 && <p>Nenhuma evolução registrada.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {evolucoes.map(ev => (
          <li key={ev.id} style={{ borderBottom: "1px solid #eee", marginBottom: 12, paddingBottom: 8, background: "#f9f9f9", padding: 12, borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <small style={{ color: "#888" }}>
                {ev.data?.toDate?.()?.toLocaleString() || "Data desconhecida"}
              </small>
              <div>
                {profissional?.tipo === "supervisor" && (
                  <>
                    {editandoId === ev.id ? (
                      <>
                        <button onClick={() => salvarEdicao(ev.id)} style={{ background: "#28a745", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer", marginRight: 4 }}>Salvar</button>
                        <button onClick={cancelarEdicao} style={{ background: "#6c757d", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => iniciarEdicao(ev)} style={{ background: "#ffc107", color: "#000", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer", marginRight: 4 }}>Editar</button>
                        <button onClick={() => excluirEvolucao(ev.id)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>Excluir</button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            {editandoId === ev.id ? (
              <textarea
                value={textoEditando}
                onChange={e => setTextoEditando(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 8, borderRadius: 4, border: "1px solid #ccc", minHeight: 80 }}
              />
            ) : (
              <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{ev.texto}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}