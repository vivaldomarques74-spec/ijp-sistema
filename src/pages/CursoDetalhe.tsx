import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function CursoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [curso, setCurso] = useState<any>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    if (!id) return;
    setCarregando(true);
    try {
      const cursoSnap = await getDoc(doc(db, "cursos", id));
      if (cursoSnap.exists()) setCurso({ id: cursoSnap.id, ...cursoSnap.data() });

      const turmasSnap = await getDocs(collection(db, "cursos", id, "turmas"));
      setTurmas(turmasSnap.docs.map(d => {
        const data = d.data();
        const alunos = data.alunos || [];
        const capacidadeTotal =
          data.vagasTotais || data.totalVagas || data.vagas || data.capacidade || 0;
        return {
          id: d.id,
          ...data,
          vagasTotais: capacidadeTotal,
          vagasDisponiveis: Math.max(0, capacidadeTotal - alunos.length),
          totalAlunos: alunos.length,
        };
      }));
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setCarregando(false);
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
        <h1 style={{ color: "#1a2a4f", margin: 0 }}>{curso.nome}</h1>
        <button onClick={() => navigate("/cursos")} style={{ padding: "8px 16px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          ← Voltar
        </button>
      </div>

      {curso.descricao && (
        <p style={{ color: "#6b7a8f", marginBottom: 20 }}>{curso.descricao}</p>
      )}

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