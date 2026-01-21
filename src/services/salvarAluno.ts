import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";

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
    console.log("AUTH USER:", auth.currentUser);
    console.log("FOTO RECEBIDA:", foto);

    if (!auth.currentUser) {
      throw new Error("Usuário não autenticado no momento do upload");
    }

    // 1️⃣ cria aluno no Firestore
    const alunoRef = await addDoc(collection(db, "alunos"), {
      ...dadosAluno,
      criadoEm: new Date(),
    });

    const alunoId = alunoRef.id;
    console.log("ALUNO ID:", alunoId);

    // 2️⃣ upload da foto + salvar URL
    if (foto) {
      const fotoRef = ref(storage, `alunos/${alunoId}/foto.jpg`);
      console.log("STORAGE PATH:", `alunos/${alunoId}/foto.jpg`);
      console.log("BUCKET:", storage.app.options.storageBucket);

      await uploadBytes(fotoRef, foto);

      const url = await getDownloadURL(fotoRef);
      console.log("URL DA FOTO:", url);

      await updateDoc(doc(db, "alunos", alunoId), {
        fotoURL: url,
      });
    }

    // 3️⃣ sucesso
    if (onSucesso) onSucesso();
  } catch (error) {
    console.error("Erro ao salvar aluno:", error);
    alert("Erro ao salvar aluno. Veja o console.");
  }
}
