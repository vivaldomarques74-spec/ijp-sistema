import { collection, addDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";

interface SalvarAlunoProps {
  dadosAluno: any;
  foto: File | null;
  onSucesso?: () => void;
}

export async function salvarAluno({
  dadosAluno,
  foto,
  onSucesso,
}: SalvarAlunoProps) {
  if (!auth.currentUser) {
    throw new Error("Usuário não autenticado");
  }

  // cria aluno
  const alunoRef = await addDoc(collection(db, "alunos"), {
    ...dadosAluno,
    criadoEm: new Date(),
  });

  const alunoId = alunoRef.id;

  // upload da foto
  if (foto) {
    const fotoRef = ref(storage, `alunos/${alunoId}/foto.jpg`);
    await uploadBytes(fotoRef, foto);
    const url = await getDownloadURL(fotoRef);

    await updateDoc(alunoRef, {
      fotoURL: url,
    });
  }

  // callback opcional
  if (onSucesso) {
    onSucesso();
  }
}
