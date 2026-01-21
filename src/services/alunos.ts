import { collection, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
  // 1️⃣ cria aluno
  const alunoRef = await addDoc(collection(db, "alunos"), {
    ...dadosAluno,
    createdAt: serverTimestamp(),
  });

  const alunoId = alunoRef.id;

  // 2️⃣ upload da foto
  let fotoURL = "";

  if (foto) {
    const fotoRef = ref(storage, `alunos/${alunoId}/foto.jpg`);
    await uploadBytes(fotoRef, foto);
    fotoURL = await getDownloadURL(fotoRef);
  }

  // 3️⃣ atualiza aluno com a foto
  await updateDoc(alunoRef, {
    fotoURL,
  });

  if (onSucesso) onSucesso();
}
