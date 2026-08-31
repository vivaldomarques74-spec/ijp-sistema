import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";

type Evolucao = {
  id: string;
  texto: string;
  data: any;
  createdAt: any;
  profissionalId?: string;
  profissionalNome?: string;
};

export default function ProfissionalProntuario() {
  const { codigo, alunoId } = useParams();
  const [aluno, setAluno] = useState<any>({});
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [novaEvolucao, setNovaEvolucao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [profissional, setProfissional] = useState<any>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEditando, setTextoEditando] = useState("");

  // Verificar autenticação
  useEffect(() => {
    if (localStorage.getItem("profissionalAutenticado") !== "true") {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/acesso-profissional";
    }
  }, []);

  // Carregar profissional logado
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

      // Carregar evoluções existentes
      const q = query(collection(db, "prontuarios"), where("alunoId", "==", alunoId), orderBy("data", "desc"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({
        id: d.id,
        texto: d.data().texto,
        data: d.data().data,
        createdAt: d.data().createdAt || d.data().data,
        profissionalId: d.data().profissionalId,
        profissionalNome: d.data().profissionalNome,
      }));
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
    if (!profissional) return alert("Profissional não identificado");

    setCarregando(true);
    try {
      const agora = new Date();
      await addDoc(collection(db, "prontuarios"), {
        alunoId,
        texto: novaEvolucao,
        data: agora,
        createdAt: agora,
        profissionalId: profissional.id,
        profissionalNome: profissional.nome,
      });
      alert("Evolução salva com sucesso");
      setNovaEvolucao("");
      // Recarregar evoluções
      const q = query(collection(db, "prontuarios"), where("alunoId", "==", alunoId), orderBy("data", "desc"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({
        id: d.id,
        texto: d.data().texto,
        data: d.data().data,
        createdAt: d.data().createdAt || d.data().data,
        profissionalId: d.data().profissionalId,
        profissionalNome: d.data().profissionalNome,
      }));
      setEvolucoes(lista);
    } catch (error: any) {
      console.error("Erro ao salvar evolução:", error);
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const editarEvolucao = async (id: string, textoAtual: string) => {
    setEditandoId(id);
    setTextoEditando(textoAtual);
  };

  const salvarEdicao = async (id: string) => {
    if (localStorage.getItem("profissionalAutenticado") !== "true") {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/acesso-profissional";
      return;
    }

    if (!textoEditando.trim()) return alert("Digite o texto da evolução");

    try {
      await updateDoc(doc(db, "prontuarios", id), {
        texto: textoEditando,
        updatedAt: new Date(),
      });
      alert("Evolução atualizada!");
      setEditandoId(null);
      setTextoEditando("");
      // Recarregar
      const q = query(collection(db, "prontuarios"), where("alunoId", "==", alunoId), orderBy("data", "desc"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({
        id: d.id,
        texto: d.data().texto,
        data: d.data().data,
        createdAt: d.data().createdAt || d.data().data,
        profissionalId: d.data().profissionalId,
        profissionalNome: d.data().profissionalNome,
      }));
      setEvolucoes(lista);
    } catch (error: any) {
      console.error("Erro ao editar evolução:", error);
      alert(`Erro ao editar: ${error.message}`);
    }
  };

  const excluirEvolucao = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta evolução?")) return;

    if (localStorage.getItem("profissionalAutenticado") !== "true") {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/acesso-profissional";
      return;
    }

    try {
      await deleteDoc(doc(db, "prontuarios", id));
      alert("Evolução excluída!");
      // Recarregar
      const q = query(collection(db, "prontuarios"), where("alunoId", "==", alunoId), orderBy("data", "desc"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({
        id: d.id,
        texto: d.data().texto,
        data: d.data().data,
        createdAt: d.data().createdAt || d.data().data,
        profissionalId: d.data().profissionalId,
        profissionalNome: d.data().profissionalNome,
      }));
      setEvolucoes(lista);
    } catch (error: any) {
      console.error("Erro ao excluir evolução:", error);
      alert(`Erro ao excluir: ${error.message}`);
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <small>
                {ev.data?.toDate().toLocaleString() || "Data desconhecida"}
                {ev.profissionalNome && ` - ${ev.profissionalNome}`}
              </small>
              <div>
                <button onClick={() => editarEvolucao(ev.id, ev.texto)} style={{ marginRight: 8 }}>
                  Editar
                </button>
                <button onClick={() => excluirEvolucao(ev.id)} style={{ color: "red" }}>
                  Excluir
                </button>
              </div>
            </div>
            {editandoId === ev.id ? (
              <div>
                <textarea
                  rows={3}
                  style={{ width: "100%", padding: 8, marginTop: 8 }}
                  value={textoEditando}
                  onChange={e => setTextoEditando(e.target.value)}
                />
                <button onClick={() => salvarEdicao(ev.id)} style={{ marginTop: 4 }}>
                  Salvar edição
                </button>
                <button onClick={() => { setEditandoId(null); setTextoEditando(""); }} style={{ marginTop: 4, marginLeft: 8 }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <p style={{ whiteSpace: "pre-wrap" }}>{ev.texto}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}