import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";

type Aluno = {
  id: string;
  matricula: string;
  nome: string;
  telefone: string;
  fotoUrl?: string;
};

export default function AlunosLista() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();

  async function carregarAlunos() {
    const q = query(collection(db, "alunos"), orderBy("nome"));
    const snapshot = await getDocs(q);

    const lista: Aluno[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Aluno, "id">),
    }));

    setAlunos(lista);
  }

  useEffect(() => {
    carregarAlunos();
  }, []);

  const alunosFiltrados = alunos.filter(
    (a) =>
      a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      a.matricula.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Alunos Cadastrados</h2>

      <input
        placeholder="Buscar por nome ou matrícula"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ marginBottom: 20, width: "100%", maxWidth: 400 }}
      />

      <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#eee" }}>
            <th>Foto</th>
            <th>Matrícula</th>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {alunosFiltrados.map((aluno) => (
            <tr key={aluno.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td>
                {aluno.fotoUrl ? (
                  <img
                    src={aluno.fotoUrl}
                    alt={aluno.nome}
                    width={40}
                    height={40}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  "—"
                )}
              </td>
              <td>{aluno.matricula}</td>
              <td>{aluno.nome}</td>
              <td>{aluno.telefone}</td>
              <td>
                <button onClick={() => navigate(`/alunos/editar/${aluno.id}`)}>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {alunosFiltrados.length === 0 && <p>Nenhum aluno encontrado.</p>}
    </div>
  );
}
