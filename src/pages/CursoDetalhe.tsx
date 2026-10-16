import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function CursoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [curso, setCurso] = useState<any>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Edição do curso
  const [editando, setEditando] = useState(false);
  const [nomeEdit, setNomeEdit] = useState("");
  const [descricaoEdit, setDescricaoEdit] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    if (!id) return;
    setCarregando(true);
    try {
      const cursoSnap = await getDoc(doc(db, "cursos", id));
      if (cursoSnap.exists()) {
        const data = cursoSnap.data();
        setCurso({ id: cursoSnap.id, ...data });
        setNomeEdit(data.nome || "");
        setDescricaoEdit(data.descricao || "");
      }

      const turmasSnap = await getDocs(collection(db, "cursos", id, "turmas"));
      setTurmas(turmasSnap.docs.map(d => {
        const data = d.data();
        const alunos = data.alunos || [];
        const alunosUnicos = Array.from(new Set(alunos));
        const capacidade = data.vagasTotais || data.totalVagas || data.vagas || data.capacidade || 0;
        return {
          id: d.id,
          ...data,
          vagasTotais: capacidade,
          vagasDisponiveis: Math.max(0, capacidade - alunosUnicos.length),
          totalAlunos: alunosUnicos.length,
        };
      }));
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const salvarNomeCurso = async () => {
    if (!id) return;
    if (!nomeEdit.trim()) return alert("Informe o nome do curso");
    setSalvando(true);
    try {
      await updateDoc(doc(db, "cursos", id), {
        nome: nomeEdit.trim(),
        descricao: descricaoEdit.trim(),
        updatedAt: new Date(),
      });
      setCurso({ ...curso, nome: nomeEdit.trim(), descricao: descricaoEdit.trim() });
      setEditando(false);
      alert("Curso atualizado!");
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const copiarLinkInscricao = (turmaId: string) => {
    const url = `${window.location.origin}/inscricao?turmaId=${turmaId}`;
    navigator.clipboard.writeText(url);
    alert(`Link copiado:\n${url}`);
  };

  const copiarLinkProfessor = (turmaId: string) => {
    const url = `${window.location.origin}/presenca-professor?turmaId=${turmaId}`;
    navigator.clipboard.writeText(url);
    alert(`Link copiado:\n${url}`);
  };

  const excluirTurma = async (turmaId: string, nome: string) => {
    if (!window.confirm(`Excluir a turma "${nome}"?`)) return;
    try {
      await deleteDoc(doc(db, "cursos", id!, "turmas", turmaId));
      alert("Turma excluída!");
      carregarDados();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    }
  };

  if (carregando) return <div style={{ padding: 20 }}>Carregando...</div>;
  if (!curso) return <div style={{ padding: 20 }}>Curso não encontrado.</div>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        {editando ? (
          <div style={{ flex: 1, marginRight: 16 }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 4, fontSize: 13 }}>
              Nome do curso
            </label>
            <input
              type="text"
              value={nomeEdit}
              onChange={e => setNomeEdit(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                border: "2px solid #0070f3",
                borderRadius: 8,
                fontSize: 20,
                fontWeight: 700,
                color: "#1a2a4f",
              }}
              autoFocus
            />
            <label style={{ fontWeight: 600, display: "block", marginTop: 8, marginBottom: 4, fontSize: 13 }}>
              Descrição
            </label>
            <textarea
              value={descricaoEdit}
              onChange={e => setDescricaoEdit(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 8,
                minHeight: 60,
              }}
            />
          </div>
        ) : (
          <div>
            <h1 style={{ color: "#1a2a4f", margin: 0 }}>{curso.nome}</h1>
            {curso.descricao && (
              <p style={{ color: "#6b7a8f", marginTop: 6, marginBottom: 0 }}>{curso.descricao}</p>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {editando ? (
            <>
              <button
                onClick={salvarNomeCurso}
                disabled={salvando}
                style={{ padding: "8px 16px", background: "#28a745", color: "#fff", border: "none", borderRadius: 8, cursor: salvando ? "wait" : "pointer", fontWeight: 600 }}
              >
                {salvando ? "Salvando..." : "💾 Salvar"}
              </button>
              <button
                onClick={() => { setEditando(false); setNomeEdit(curso.nome); setDescricaoEdit(curso.descricao || ""); }}
                style={{ padding: "8px 16px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditando(true)}
                style={{ padding: "8px 16px", background: "#ffc107", color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
              >
                ✏️ Editar Curso
              </button>
              <button
                onClick={() => navigate("/cursos")}
                style={{ padding: "8px 16px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                ← Voltar
              </button>
            </>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: 18, color: "#1a2a4f", marginBottom: 12 }}>
        Turmas ({turmas.length})
      </h2>

      {turmas.length === 0 && <p>Nenhuma turma cadastrada.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {turmas.map(t => (
          <div
            key={t.id}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#1a2a4f" }}>{t.nome}</h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7a8f" }}>
                <strong>Vagas:</strong> {t.totalAlunos} / {t.vagasTotais} •
                <strong style={{ marginLeft: 8, color: t.vagasDisponiveis > 0 ? "#28a745" : "#dc3545" }}>
                  {t.vagasDisponiveis} disponíveis
                </strong>
                {t.cargaHoraria && <> • <strong>CH:</strong> {t.cargaHoraria}h</>}
                {t.totalAulas && <> • <strong>Aulas:</strong> {t.totalAulas}</>}
                {t.status && <> • {t.status}</>}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate(`/cursos/${id}/turmas/${t.id}`)}
                style={{ padding: "6px 14px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Editar
              </button>
              <button
                onClick={() => copiarLinkProfessor(t.id)}
                style={{ padding: "6px 14px", background: "#28a745", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Link Professor
              </button>
              <button
                onClick={() => copiarLinkInscricao(t.id)}
                style={{ padding: "6px 14px", background: "#17a2b8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Link Inscrição
              </button>
              <button
                onClick={() => excluirTurma(t.id, t.nome)}
                style={{ padding: "6px 14px", background: "#dc3545", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}