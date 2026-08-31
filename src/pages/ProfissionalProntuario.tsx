import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, getDocs, addDoc, query, where, deleteDoc } from "firebase/firestore";
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

  // Verificar autenticação
  useEffect(() => {
    if (localStorage.getItem("profissionalAutenticado") !== "true") {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/acesso-profissional";
    }
  }, []);

  // Carregar dados do profissional para verificar se é supervisor
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
      // Carregar dados do aluno
      const alunoSnap = await getDoc(doc(db, "alunos", alunoId));
      if (alunoSnap.exists()) setAluno(alunoSnap.data());

      // Carregar evoluções existentes (sem where para evitar índice)
      const snap = await getDocs(collection(db, "prontuarios"));
      const lista = snap.docs
        .filter(d => d.data().alunoId === alunoId)
        .map(d => ({
          id: d.id,
          texto: d.data().texto,
          data: d.data().data,
          createdAt: d.data().createdAt || d.data().data,
        }));
      // Ordenar por data (mais recente primeiro)
      lista.sort((a, b) => {
        const dateA = a.data?.toDate?.() || new Date(0);
        const dateB = b.data?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      setEvolucoes(lista);
    };
    carregar();
  }, [alunoId]);

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
      // Recarregar evoluções
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
    } catch (error: any) {
      console.error("Erro ao salvar evolução:", error);
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const excluirEvolucao = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta evolução?")) return;

    // Verificar se o profissional é supervisor
    if (profissional?.tipo !== "supervisor") {
      alert("Apenas supervisores podem excluir evoluções.");
      return;
    }

    try {
      await deleteDoc(doc(db, "prontuarios", id));
      alert("Evolução excluída com sucesso!");
      // Recarregar evoluções
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
    } catch (error: any) {
      console.error("Erro ao excluir evolução:", error);
      alert(`Erro ao excluir: ${error.message}`);
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
          placeholder="Digite a evolução do atendimento (pode ser para qualquer data)..."
        />
        <button
          onClick={salvarEvolucao}
          disabled={carregando}
          style={{
            padding: "8px 20px",
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {carregando ? "Salvando..." : "Salvar Evolução"}
        </button>
      </div>

      <h3>Histórico de evoluções ({evolucoes.length})</h3>
      {evolucoes.length === 0 && <p>Nenhuma evolução registrada.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {evolucoes.map(ev => (
          <li
            key={ev.id}
            style={{
              borderBottom: "1px solid #eee",
              marginBottom: 12,
              paddingBottom: 8,
              background: "#f9f9f9",
              padding: 12,
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <small style={{ color: "#888" }}>
                {ev.data?.toDate?.()?.toLocaleString() || "Data desconhecida"}
              </small>
              {profissional?.tipo === "supervisor" && (
                <button
                  onClick={() => excluirEvolucao(ev.id)}
                  style={{
                    background: "#dc3545",
                    color: "#fff",
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Excluir
                </button>
              )}
            </div>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{ev.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}