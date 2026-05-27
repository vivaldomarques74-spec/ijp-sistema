import { useEffect, useState, useCallback, useMemo } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebase";

type Aluno = {
  id: string;
  nomeCompleto?: string;
  matricula?: string;
  nascimento?: any;
  fotoURL?: string;
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
          fotoURL: data.fotoURL || "",
        };
      });
      lista.sort((a, b) => (a.nomeCompleto || "").localeCompare(b.nomeCompleto || ""));
      setAlunos(lista);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarAlunos();
  }, [carregarAlunos]);

  const excluirAluno = async (id: string, nome: string) => {
    if (window.confirm(`Excluir aluno ${nome}? Esta ação é irreversível.`)) {
      try {
        await deleteDoc(doc(db, "alunos", id));
        alert("Aluno excluído com sucesso");
        carregarAlunos(); // recarregar lista
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir aluno");
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
    return alunos.filter(
      (aluno) =>
        aluno.nomeCompleto?.toLowerCase().includes(termo) ||
        aluno.matricula?.toLowerCase().includes(termo)
    );
  }, [alunos, busca]);

  if (loading) {
    return <div style={{ padding: 20 }}>Carregando alunos...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Lista de Alunos</h2>
      <input
        type="text"
        placeholder="Buscar por nome ou matrícula"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{
          marginBottom: 20,
          padding: 8,
          width: "100%",
          maxWidth: 400,
          border: "1px solid #ccc",
          borderRadius: 4,
        }}
      />
      {alunosFiltrados.length === 0 && <p>Nenhum aluno encontrado.</p>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Foto</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Nome</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Matrícula</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Idade</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {alunosFiltrados.map((aluno) => (
              <tr key={aluno.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {aluno.fotoURL ? (
                    <img
                      src={aluno.fotoURL}
                      alt={aluno.nomeCompleto}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        objectFit: "cover",
                        backgroundColor: "#f0f0f0",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/50?text=Erro";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        backgroundColor: "#ccc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        color: "#fff",
                      }}
                    >
                      📷
                    </div>
                  )}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{aluno.nomeCompleto || "-"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{aluno.matricula || "-"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{calcularIdade(aluno.nascimento)}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  <button
                    onClick={() => navigate(`/alunos/editar/${aluno.id}`)}
                    style={{
                      padding: "4px 12px",
                      cursor: "pointer",
                      background: "#0070f3",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      marginRight: 8,
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => excluirAluno(aluno.id, aluno.nomeCompleto || "")}
                    style={{
                      padding: "4px 12px",
                      cursor: "pointer",
                      background: "#dc3545",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                    }}
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