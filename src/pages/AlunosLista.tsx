import { useEffect, useState, useCallback, useMemo } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebase";

type Aluno = {
  id: string;
  nomeCompleto?: string;
  matricula?: string;
  nascimento?: any;
};

export default function AlunosLista() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const carregarAlunos = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "alunos"));
      const lista: Aluno[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          nomeCompleto: data.nomeCompleto || "",
          matricula: data.matricula || "",
          nascimento: data.nascimento || null,
        };
      });
      lista.sort((a, b) => (a.nomeCompleto || "").localeCompare(b.nomeCompleto || ""));
      setAlunos(lista);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarAlunos();
  }, [carregarAlunos]);

  const excluirAluno = async (id: string, nome: string) => {
    if (window.confirm(`Excluir aluno ${nome}?`)) {
      try {
        await deleteDoc(doc(db, "alunos", id));
        alert("Aluno excluído");
        carregarAlunos();
      } catch (error) {
        alert("Erro ao excluir");
      }
    }
  };

  function calcularIdade(data: any): string {
    if (!data) return "-";
    try {
      const nascimento = data.toDate ? data.toDate() : new Date(data);
      if (isNaN(nascimento.getTime())) return "-";
      const hoje = new Date();
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const m = hoje.getMonth() - nascimento.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
      return `${idade} anos`;
    } catch {
      return "-";
    }
  }

  const alunosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return alunos;
    return alunos.filter((a) => a.nomeCompleto?.toLowerCase().includes(termo) || a.matricula?.toLowerCase().includes(termo));
  }, [alunos, busca]);

  if (loading) return <div style={{ padding: 20 }}>Carregando...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: "#1a2a4f" }}>Lista de Alunos</h2>
        <button
          onClick={() => navigate("/alunos/cadastrar")}
          style={{ background: "#0070f3", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
        >
          + Novo Aluno
        </button>
      </div>
      <input
        type="text"
        placeholder="Buscar por nome ou matrícula"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8, width: "100%", maxWidth: 400, marginBottom: 16 }}
      />
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e0e4e8" }}>
              <th style={{ textAlign: "left", padding: 12, fontSize: 13, color: "#6b7a8f" }}>Nome</th>
              <th style={{ textAlign: "left", padding: 12, fontSize: 13, color: "#6b7a8f" }}>Matrícula</th>
              <th style={{ textAlign: "left", padding: 12, fontSize: 13, color: "#6b7a8f" }}>Idade</th>
              <th style={{ textAlign: "left", padding: 12, fontSize: 13, color: "#6b7a8f" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {alunosFiltrados.map((aluno) => (
              <tr key={aluno.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                <td style={{ padding: 12 }}>{aluno.nomeCompleto || "-"}</td>
                <td style={{ padding: 12 }}>{aluno.matricula || "-"}</td>
                <td style={{ padding: 12 }}>{calcularIdade(aluno.nascimento)}</td>
                <td style={{ padding: 12 }}>
                  <button
                    onClick={() => navigate(`/alunos/editar/${aluno.id}`)}
                    style={{ background: "#0070f3", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, marginRight: 8, cursor: "pointer" }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => excluirAluno(aluno.id, aluno.nomeCompleto || "")}
                    style={{ background: "#dc3545", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}