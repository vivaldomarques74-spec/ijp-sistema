import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebase";

interface Aluno {
  id: string;
  nomeCompleto?: string;
  matricula?: string;
  telefone?: string;
  fotoURL?: string;
}

export default function AlunosLista() {
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const carregar = async () => {
      try {
        const snap = await getDocs(collection(db, "alunos"));

        const lista: Aluno[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Aluno, "id">),
        }));

        setAlunos(lista);
      } catch (e) {
        console.error("Erro ao carregar alunos:", e);
      }
    };

    carregar();
  }, []);

  const filtrados = alunos.filter((a) => {
    const texto = `${a.nomeCompleto ?? ""} ${a.matricula ?? ""}`.toLowerCase();
    return texto.includes(busca.toLowerCase());
  });

  return (
    <div style={{ padding: 20 }}>
      <h1>Alunos Cadastrados</h1>

      <input
        placeholder="Buscar por nome ou matrícula"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ marginBottom: 20, width: 300 }}
      />

      <table width="100%" cellPadding={8} border={1}>
        <thead>
          <tr>
            <th>Foto</th>
            <th>Matrícula</th>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {filtrados.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhum aluno encontrado.</td>
            </tr>
          )}

          {filtrados.map((aluno) => (
            <tr key={aluno.id}>
              <td>
                {aluno.fotoURL ? (
                  <img
                    src={aluno.fotoURL}
                    alt={aluno.nomeCompleto || "Aluno"}
                    width={50}
                    height={50}
                    style={{ objectFit: "cover", borderRadius: 4 }}
                  />
                ) : (
                  "—"
                )}
              </td>

              <td>{aluno.matricula || "—"}</td>
              <td>{aluno.nomeCompleto || "—"}</td>
              <td>{aluno.telefone || "—"}</td>

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
