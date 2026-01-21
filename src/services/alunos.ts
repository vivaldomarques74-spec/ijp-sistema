import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

export async function salvarAluno({
  dadosAluno,
  foto,
  onSucesso,
}: {
  dadosAluno: any;
  foto: File | null;
  onSucesso?: () => void;
}) {
  try {
    // cria aluno
    const alunoRef = await addDoc(collection(db, "alunos"), {
      ...dadosAluno,
      criadoEm: serverTimestamp(),
    });

    const alunoId = alunoRef.id;

    // upload foto
    if (foto) {
      const fotoRef = ref(storage, `alunos/${alunoId}/foto.jpg`);
      await uploadBytes(fotoRef, foto);
      const fotoURL = await getDownloadURL(fotoRef);

      // ATUALIZA SEM APAGAR O RESTO
      await updateDoc(doc(db, "alunos", alunoId), {
        fotoURL,
      });
    }

    alert("Aluno cadastrado com sucesso!");
    onSucesso && onSucesso();
  } catch (e) {
    console.error(e);
    alert("Erro ao cadastrar aluno");
  }
}
