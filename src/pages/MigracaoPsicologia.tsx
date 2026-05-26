import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, addDoc, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

export default function MigracaoPsicologia() {
  const [status, setStatus] = useState("Aguardando...");
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function migrar() {
      setStatus("Buscando curso e turma...");
      // 1. Encontrar curso pelo nome "PSICOLOGIA"
      const cursosSnap = await getDocs(collection(db, "cursos"));
      const cursoPsicologia = cursosSnap.docs.find(doc => doc.data().nome === "PSICOLOGIA");
      if (!cursoPsicologia) {
        setStatus("Erro: curso PSICOLOGIA não encontrado.");
        return;
      }
      const CURSO_ID = cursoPsicologia.id;

      // 2. Encontrar turma pelo nome "ATENDIMENTO PSICOLOGIA"
      const turmasSnap = await getDocs(collection(db, "cursos", CURSO_ID, "turmas"));
      const turmaPsicologia = turmasSnap.docs.find(doc => doc.data().nome === "ATENDIMENTO PSICOLOGIA");
      if (!turmaPsicologia) {
        setStatus("Erro: turma ATENDIMENTO PSICOLOGIA não encontrada.");
        return;
      }
      const TURMA_ID = turmaPsicologia.id;
      setStatus(`Curso: ${CURSO_ID}, Turma: ${TURMA_ID} - Processando...`);

      // 3. Migrar alunos
      const alunosSnap = await getDocs(collection(db, "alunos"));
      let total = 0;

      for (const docAluno of alunosSnap.docs) {
        const data = docAluno.data();
        if (data.cursoAtualId === CURSO_ID && data.turmaAtualId === TURMA_ID) {
          // Adiciona servicosAtivos
          const servicosAtuais = data.servicosAtivos || [];
          if (!servicosAtuais.includes("psicologia")) {
            await updateDoc(docAluno.ref, {
              servicosAtivos: [...servicosAtuais, "psicologia"],
            });
          }
          // Adiciona na fila de espera
          const filaQuery = query(
            collection(db, "filaEspera"),
            where("alunoId", "==", docAluno.id),
            where("tipoId", "==", "psicologia")
          );
          const filaSnap = await getDocs(filaQuery);
          if (filaSnap.empty) {
            await addDoc(collection(db, "filaEspera"), {
              alunoId: docAluno.id,
              tipoId: "psicologia",
              dataSolicitacao: new Date(),
              status: "aguardando",
            });
          }
          total++;
        }
      }
      setStatus(`Migração concluída! ${total} alunos processados.`);
      setCount(total);
    }
    migrar();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Migração de Alunos - Psicologia</h1>
      <p>Status: {status}</p>
      <p>Alunos migrados: {count}</p>
      {count > 0 && <p>Você pode fechar esta página agora.</p>}
    </div>
  );
}