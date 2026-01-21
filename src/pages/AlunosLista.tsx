import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";

export default function AlunosLista() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregar() {
      const snap = await getDocs(collection(db, "alunos"));
      setAlunos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    carregar();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Alunos Cadastrados</h1>

      <table width="100%">
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
          {alunos.map(aluno => (
            <tr key={aluno.id}>
              <td>
                {aluno.fotoURL ? (
                  <img
                    src={aluno.fotoURL}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : "—"}
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
    </div>
  );
}
