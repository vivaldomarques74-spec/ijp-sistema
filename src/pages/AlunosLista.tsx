import { useEffect, useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
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
    const snap = await getDocs(collection(db, "alunos"));
    let lista: Aluno[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Aluno, "id">),
    }));
    lista.sort((a, b) => (a.nomeCompleto || "").localeCompare(b.nomeCompleto || ""));
    setAlunos(lista);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregarAlunos();
  }, [carregarAlunos]);

  function calcularIdade(data: any) {
    if (!data) return "-";
    const nascimento = data.toDate ? data.toDate() : new Date(data);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return idade;
  }

  const alunosFiltrados = busca
    ? alunos.filter(
        (aluno) =>
          aluno.nomeCompleto?.toLowerCase().includes(busca.toLowerCase()) ||
          aluno.matricula?.toLowerCase().includes(busca.toLowerCase())
      )
    : alunos;

  if (loading) return <div>Carregando alunos...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Lista de Alunos</h2>
      <input
        placeholder="Buscar por nome ou matrícula"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ marginBottom: 20, padding: 8, width: "100%", maxWidth: 400 }}
      />
      {alunosFiltrados.length === 0 && <p>Nenhum aluno encontrado</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8 }}>Foto</th>
            <th style={{ textAlign: "left", padding: 8 }}>Nome</th>
            <th style={{ textAlign: "left", padding: 8 }}>Matrícula</th>
            <th style={{ textAlign: "left", padding: 8 }}>Idade</th>
            <th style={{ textAlign: "left", padding: 8 }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {alunosFiltrados.map((aluno) => (
            <tr key={aluno.id}>
              <td>
                <img
                  src={aluno.fotoURL || "https://via.placeholder.com/50?text=Sem+foto"}
                  alt={aluno.nomeCompleto}
                  style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/50?text=Erro";
                  }}
                />
              </td>
              <td style={{ padding: 8 }}>{aluno.nomeCompleto}</td>
              <td style={{ padding: 8 }}>{aluno.matricula}</td>
              <td style={{ padding: 8 }}>{aluno.nascimento ? `${calcularIdade(aluno.nascimento)} anos` : "-"}</td>
              <td style={{ padding: 8 }}>
                <button onClick={() => navigate(`/alunos/editar/${aluno.id}`)}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}