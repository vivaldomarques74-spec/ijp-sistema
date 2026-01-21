import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebase";

export default function ListaAlunos() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function carregarAlunos() {
      const q = query(collection(db, "alunos"), orderBy("nome"));
      const snap = await getDocs(q);

      const lista = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAlunos(lista);
    }

    carregarAlunos();
  }, []);

  function calcularIdade(data: any) {
    if (!data) return "-";

    const nascimento = data.toDate
      ? data.toDate()
      : new Date(data);

    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();

    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }

    return idade;
  }

  const alunosFiltrados = useMemo(() => {
    return alunos.filter((aluno) => {
      const termo = busca.toLowerCase();
      return (
        aluno.nome?.toLowerCase().includes(termo) ||
        aluno.matricula?.toLowerCase().includes(termo)
      );
    });
  }, [alunos, busca]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Lista de Alunos</h2>

      <input
        placeholder="Buscar por nome ou matrícula"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{
          marginBottom: 20,
          padding: 8,
          width: "100%",
          maxWidth: 400,
        }}
      />

      {alunosFiltrados.length === 0 && <p>Nenhum aluno encontrado</p>}

      <table width="100%" cellPadding={8}>
        <thead>
          <tr>
            <th>Foto</th>
            <th>Nome</th>
            <th>Matrícula</th>
            <th>Idade</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {alunosFiltrados.map((aluno) => (
            <tr key={aluno.id}>
              <td>
                <img
                  src={aluno.fotoURL || "/avatar-placeholder.png"}
                  alt={aluno.nome}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              </td>

              <td>{aluno.nome}</td>

              <td>{aluno.matricula || "-"}</td>

              <td>
                {aluno.nascimento
                  ? `${calcularIdade(aluno.nascimento)} anos`
                  : "-"}
              </td>

              <td>
                <button
                  onClick={() => navigate(`/alunos/editar/${aluno.id}`)}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
