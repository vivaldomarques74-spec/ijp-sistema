import { getDocs, collection, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./src/services/firebase";

async function migrarAlunos() {
  const alunosSnap = await getDocs(collection(db, "alunos"));
  for (const alunoDoc of alunosSnap.docs) {
    const data = alunoDoc.data();
    const cursoId = data.cursoAtualId;
    const turmaId = data.turmaAtualId;
    if (cursoId && turmaId) {
      const turmaRef = doc(db, "cursos", cursoId, "turmas", turmaId);
      await updateDoc(turmaRef, {
        alunos: arrayUnion(alunoDoc.id)
      });
      console.log(`Aluno ${alunoDoc.id} vinculado à turma ${turmaId}`);
    }
  }
}
migrarAlunos();