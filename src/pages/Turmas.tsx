import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";

type TurmaView = {
  id: string;
  nome: string;
  horario: string;
  vagasMax: number;
  alunos?: string[];
  ativa: boolean;
  cursoNome?: string;
};

export default function Turmas() {
  const [turmas, setTurmas] = useState<TurmaView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      // Busca todas as turmas
      const turmasSnap = await getDocs(collection(db, "turmas"));

      const lista: TurmaView[] = [];

      for (const d of turmasSnap.docs) {
        const turma = d.data();

        // Busca o curso relacionado
        let cursoNome = "—";
        if (turma.cursoId) {
          const cursoSnap = await getDoc(
            doc(db, "cursos", turma.cursoId)
          );
          cursoNome = cursoSnap.exists()
            ? (cursoSnap.data() as any).nome
            : "Curso não encontrado";
        }

        lista.push({
          id: d.id,
          nome: turma.nome,
          horario: turma.horario,
          vagasMax: turma.vagasMax,
          alunos: turma.alunos || [],
          ativa: turma.ativa,
          cursoNome,
        });
      }

      setTurmas(lista);
      setLoading(false);
    }

    carregar();
  }, []);

  if (loading) return <p style={{ padding: 20 }}>Carregando turmas...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Turmas (Visão Geral)</h2>

      {turmas.length === 0 && <p>Nenhuma turma cadastrada.</p>}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 20,
        }}
      >
        <thead>
          <tr>
            <th style={th}>Curso</th>
            <th style={th}>Turma</th>
            <th style={th}>Horário</th>
            <th style={th}>Vagas</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {turmas.map((t) => (
            <tr key={t.id}>
              <td style={td}>{t.cursoNome}</td>
              <td style={td}>{t.nome}</td>
              <td style={td}>{t.horario}</td>
              <td style={td}>
                {t.alunos?.length || 0}/{t.vagasMax}
              </td>
              <td style={td}>
                {t.ativa ? "Ativa" : "Inativa"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  borderBottom: "1px solid #ccc",
  padding: 8,
  textAlign: "left",
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: 8,
};
