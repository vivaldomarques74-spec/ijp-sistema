import { doc, runTransaction } from "firebase/firestore";
import { db } from "../services/firebase";

export async function gerarMatricula(): Promise<string> {
  const contadorRef = doc(db, "contadores", "alunos");

  const proximoNumero = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(contadorRef);

    if (!snapshot.exists()) {
      throw new Error("Contador de alunos não encontrado");
    }

    const atual = snapshot.data().atual ?? 0;
    const proximo = atual + 1;

    transaction.update(contadorRef, { atual: proximo });

    return proximo;
  });

  // 🔥 FORMATAÇÃO FINAL DA MATRÍCULA
  const numeroFormatado = String(proximoNumero).padStart(6, "0");

  return `IJP-${numeroFormatado}`;
}
