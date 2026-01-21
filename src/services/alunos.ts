import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

interface SalvarAlunoParams {
  dadosAluno: any;
  foto: File | null;
  onSucesso?: () => void;
}

export async function salvarAluno({
  dadosAluno,
  foto,
  onSucesso,
}: SalvarAlunoParams) {
  try {
    // 1️⃣ cria aluno SEM matrícula primeiro
    const alunoRef = await addDoc(collection(db, "alunos"), {
      ...dadosAluno,
      criadoEm: serverTimestamp(),
    });

    const alunoId = alunoRef.id;

    // 2️⃣ gera matrícula com TRANSACTION (funciona no Vercel)
    const contadorRef = doc(db, "contadores", "matricula");

    let matriculaGerada = "";

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(contadorRef);

      const atual = snap.exists() ? snap.data().valor : 0;
      const proximo = atual + 1;

      matriculaGerada = `IJP-${String(proximo).padStart(5, "0")}`;

      transaction.set(
        contadorRef,
        { valor: proximo },
        { merge: true }
      );

      transaction.update(alunoRef, {
        matricula: matriculaGerada,
      });
    });

    // 3️⃣ upload da foto (se existir)
    let fotoURL = "";

    if (foto) {
      const fotoRef = ref(storage, `alunos/${alunoId}/foto.jpg`);
      await uploadBytes(fotoRef, foto);
      fotoURL = await getDownloadURL(fotoRef);

      await updateDoc(alunoRef, {
        fotoURL,
      });
    }

    // 4️⃣ feedback visual
    alert(`Aluno cadastrado com sucesso!\nMatrícula: ${matriculaGerada}`);

    // 5️⃣ callback
    if (onSucesso) onSucesso();
  } catch (error) {
    console.error("Erro ao salvar aluno:", error);
    alert("Erro ao cadastrar aluno. Verifique os dados.");
  }
}
