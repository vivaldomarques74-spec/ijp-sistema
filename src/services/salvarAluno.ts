import {
  collection,
  addDoc,
  doc,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../services/firebase";

export async function salvarAluno({
  dadosAluno,
  foto,
  onSucesso,
}: {
  dadosAluno: any;
  foto?: File | null;
  onSucesso?: (matricula: string) => void;
}) {
  if (!auth.currentUser) {
    throw new Error("Usuário não autenticado");
  }

  // 🔢 CONTADOR DE MATRÍCULA
  const contadorRef = doc(db, "contadores", "matricula");

  const numeroMatricula = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(contadorRef);

    if (!snap.exists()) {
      throw new Error("Contador de matrícula não encontrado");
    }

    const ultimoNumero = snap.data().valor || 0;
    const novoNumero = ultimoNumero + 1;

    transaction.update(contadorRef, {
      valor: novoNumero,
    });

    return novoNumero;
  });

  const matricula = `IJP-${String(numeroMatricula).padStart(5, "0")}`;

  // 🧾 CRIA ALUNO (SEM FOTO OBRIGATÓRIA)
  const alunoRef = await addDoc(collection(db, "alunos"), {
    ...dadosAluno,
    matricula,
    matriculaNumero: numeroMatricula,
    criadoEm: new Date(),
  });

  // 🖼️ FOTO (SÓ SE EXISTIR)
  if (foto) {
    const fotoRef = ref(storage, `alunos/${alunoRef.id}/foto.jpg`);
    await uploadBytes(fotoRef, foto);
    const fotoURL = await getDownloadURL(fotoRef);

    await updateDoc(alunoRef, {
      fotoURL,
    });
  }

  // 🔁 CALLBACK + RETORNO
  if (onSucesso) onSucesso(matricula);

  return matricula;
}
