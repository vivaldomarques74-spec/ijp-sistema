import {
  collection,
  addDoc,
  doc,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "../services/firebase";

export async function salvarAluno({
  dadosAluno,
  onSucesso,
}: {
  dadosAluno: any;
  onSucesso?: () => void;
}) {
  if (!auth.currentUser) {
    throw new Error("Usuário não autenticado");
  }

  // 🔢 gera matrícula com transação (seguro)
  const matriculaRef = doc(db, "config", "matricula");

  const numeroMatricula = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(matriculaRef);

    if (!snap.exists()) {
      throw new Error("Config de matrícula não encontrada");
    }

    const ultimoNumero = snap.data().ultimoNumero || 0;
    const novoNumero = ultimoNumero + 1;

    transaction.update(matriculaRef, {
      ultimoNumero: novoNumero,
    });

    return novoNumero;
  });

  const matriculaFormatada = `IJP-${String(numeroMatricula).padStart(6, "0")}`;

  // 🧾 cria aluno SEM foto
  await addDoc(collection(db, "alunos"), {
    ...dadosAluno,
    matricula: matriculaFormatada,
    fotoURL: null,
    criadoEm: new Date(),
  });

  onSucesso?.();
}
