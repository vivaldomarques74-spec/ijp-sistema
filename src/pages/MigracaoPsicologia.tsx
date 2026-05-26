import { useState } from "react";
import { collection, getDocs, updateDoc, addDoc, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

// ID do curso "PSICOLOGIA" (copiado do Firebase Console)
const CURSO_ID = "ajbMub7b4F0ArXuHXua2";
// ID da turma "ATENDIMENTO PSICOLOGIA" (dentro do curso)
// Você precisa pegar esse ID no Firestore: dentro do curso, na subcoleção "turmas"
// Vamos primeiro listar as turmas para você escolher.
export default function MigracaoPsicologia() {
  const [status, setStatus] = useState("Clique em 'Carregar turmas'");
  const [turmas, setTurmas] = useState<any[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [count, setCount] = useState(0);

  const carregarTurmas = async () => {
    setStatus("Carregando turmas...");
    const snap = await getDocs(collection(db, "cursos", CURSO_ID, "turmas"));
    const lista = snap.docs.map(d => ({ id: d.id, nome: d.data().nome }));
    setTurmas(lista);
    setStatus(`${lista.length} turmas encontradas. Selecione a correta.`);
  };

  const migrar = async () => {
    if (!turmaSelecionada) return alert("Selecione a turma");
    setStatus("Migrando...");
    const alunosSnap = await getDocs(collection(db, "alunos"));
    let total = 0;
    for (const docAluno of alunosSnap.docs) {
      const data = docAluno.data();
      if (data.cursoAtualId === CURSO_ID && data.turmaAtualId === turmaSelecionada) {
        // Adiciona servicosAtivos
        const servicosAtuais = data.servicosAtivos || [];
        if (!servicosAtuais.some((s: any) => s.tipoId === "psicologia")) {
          await updateDoc(docAluno.ref, {
            servicosAtivos: [...servicosAtuais, { tipoId: "psicologia", modalidade: "presencial" }],
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
            modalidade: "presencial",
          });
        }
        total++;
      }
    }
    setStatus(`Migração concluída! ${total} alunos processados.`);
    setCount(total);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Migração de Alunos - Psicologia</h1>
      <p>ID do curso: {CURSO_ID}</p>
      <button onClick={carregarTurmas}>Carregar turmas</button>
      {turmas.length > 0 && (
        <>
          <select value={turmaSelecionada} onChange={e => setTurmaSelecionada(e.target.value)}>
            <option value="">Selecione a turma</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} (ID: {t.id})</option>)}
          </select>
          <button onClick={migrar}>Migrar</button>
        </>
      )}
      <p>Status: {status}</p>
      <p>Alunos migrados: {count}</p>
    </div>
  );
}