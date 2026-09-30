import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, getDocs, addDoc, query, where, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

type Evolucao = {
  id: string;
  texto: string;
  data: any;
  tipoId?: string;
  profissionalId?: string;
  profissionalNome?: string;
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
      if (!alunoId || !profissional) return;
      const alunoSnap = await getDoc(doc(db, "alunos", alunoId));
      if (alunoSnap.exists()) setAluno(alunoSnap.data());

      const snap = await getDocs(collection(db, "prontuarios"));
      const minhaEspecialidade = profissional.especialidade || "";
      const meuId = profissional.id;

      const lista = snap.docs
        .filter(d => {
          const data = d.data();
          if (data.alunoId !== alunoId) return false;
          // 🔥 Mostra se for da mesma especialidade OU se foi o próprio profissional quem escreveu
          if (data.tipoId && data.tipoId === minhaEspecialidade) return true;
          if (data.profissionalId && data.profissionalId === meuId) return true;
          // Se não tem tipoId nem profissionalId (legado), não mostra
          return false;
        })
        .map(d => ({
          id: d.id,
          texto: d.data().texto,
          data: d.data().data,
          tipoId: d.data().tipoId,
          profissionalId: d.data().profissionalId,
          profissionalNome: d.data().profissionalNome,
        }));

      lista.sort((a, b) => {
        const dateA = a.data?.toDate?.() || new Date(0);
        const dateB = b.data?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      setEvolucoes(lista);
    };
    carregar();
  }, [alunoId, profissional]);

  const recarregarEvolucoes = async () => {
    if (!profissional) return;
    const snap = await getDocs(collection(db, "prontuarios"));
    const minhaEspecialidade = profissional.especialidade || "";
    const meuId = profissional.id;

    const lista = snap.docs
      .filter(d => {
        const data = d.data();
        if (data.alunoId !== alunoId) return false;
        if (data.tipoId && data.tipoId === minhaEspecialidade) return true;
        if (data.profissionalId && data.profissionalId === meuId) return true;
        return false;
      })
      .map(d => ({
        id: d.id,
        texto: d.data().texto,
        data: d.data().data,
        tipoId: d.data().tipoId,
        profissionalId: d.data().profissionalId,
        profissionalNome: d.data().profissionalNome,
      }));

    lista.sort((a, b) => {
      const dateA = a.data?.toDate?.() || new Date(0);
      const dateB = b.data?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    setEvolucoes(lista);
  };

  // 🔥 PERMISSÃO: supervisor, diretor, ou o próprio autor da evolução
  const podeEditar = (ev: Evolucao) => {
    if (!profissional) return false;
    if (profissional.tipo === "supervisor" || profissional.tipo === "diretor") return true;
    return ev.profissionalId === profissional.id;
  };

  const salvarEvolucao = async () => {
    if (!novaEvolucao.trim()) return alert("Digite a evolução");
    if (!alunoId) return alert("Aluno não identificado");
    if (!profissional) return alert("Profissional não carregado");
    setCarregando(true);
    try {
      const agora = new Date();
      await addDoc(collection(db, "prontuarios"), {
        alunoId,
        texto: novaEvolucao,
        data: agora,
        createdAt: agora,
        tipoId: profissional.especialidade || "",
        profissionalId: profissional.id,
        profissionalNome: profissional.nome || "",
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

  const excluirEvolucao = async (ev: Evolucao) => {
    if (!window.confirm("Tem certeza que deseja excluir esta evolução?")) return;
    if (!podeEditar(ev)) {
      alert("Você só pode excluir suas próprias evoluções.");
      return;
    }
    try {
      await deleteDoc(doc(db, "prontuarios", ev.id));
      alert("Evolução excluída!");
      recarregarEvolucoes();
    } catch (error: any) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  const iniciarEdicao = (ev: Evolucao) => {
    if (!podeEditar(ev)) {
      alert("Você só pode editar suas próprias evoluções.");
      return;
    }
    setEditandoId(ev.id);
    setTextoEditando(ev.texto);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setTextoEditando("");
  };

  const salvarEdicao = async (ev: Evolucao) => {
    if (!textoEditando.trim()) return alert("Digite o texto");
    if (!podeEditar(ev)) {
      alert("Você só pode editar suas próprias evoluções.");
      return;
    }
    try {
      // 🔥 Atualiza só o texto, preservando o resto
      await updateDoc(doc(db, "prontuarios", ev.id), {
        texto: textoEditando,
        editadoEm: new Date(),
      });
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
      {profissional?.especialidade && (
        <p style={{ color: "#0070f3", fontSize: 14, fontWeight: 600 }}>
          🔒 Visualizando prontuários de: <strong>{profissional.especialidade}</strong>
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
          <li key={ev.id} style={{ borderBottom: "1px solid #eee", marginBottom: 12, background: "#f9f9f9", padding: 12, borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <small style={{ color: "#888" }}>
                {ev.data?.toDate?.()?.toLocaleString() || "Data desconhecida"}
                {ev.profissionalNome && <> • por {ev.profissionalNome}</>}
              </small>
              <div>
                {podeEditar(ev) && (
                  <>
                    {editandoId === ev.id ? (
                      <>
                        <button onClick={() => salvarEdicao(ev)} style={{ background: "#28a745", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer", marginRight: 4 }}>Salvar</button>
                        <button onClick={cancelarEdicao} style={{ background: "#6c757d", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => iniciarEdicao(ev)} style={{ background: "#ffc107", color: "#000", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer", marginRight: 4 }}>Editar</button>
                        <button onClick={() => excluirEvolucao(ev)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>Excluir</button>
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
                style={{ width: "100%", padding: 8, marginTop: 8, borderRadius: 4, border: "1px solid #ccc", minHeight: 120 }}
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