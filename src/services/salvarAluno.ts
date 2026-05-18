import { doc, runTransaction, arrayUnion, collection, addDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase";

export async function salvarAluno({
  dadosAluno,
  foto,
  onSucesso,
}: {
  dadosAluno: any;
  foto?: File | null;
  onSucesso?: (matricula: string) => void;
}) {
  if (!auth.currentUser) throw new Error("Usuário não autenticado");

  // Gera matrícula
  const contadorRef = doc(db, "contadores", "matricula");
  const numeroMatricula = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(contadorRef);
    if (!snap.exists()) throw new Error("Contador de matrícula não encontrado");
    const novo = (snap.data().valor || 0) + 1;
    transaction.update(contadorRef, { valor: novo });
    return novo;
  });
  const matricula = `IJP-${String(numeroMatricula).padStart(5, "0")}`;

  // Cria aluno (INCLUINDO cursoAtualId e turmaAtualId)
  const alunoRef = await addDoc(collection(db, "alunos"), {
    ...dadosAluno,
    matricula,
    matriculaNumero: numeroMatricula,
    cursoAtualId: dadosAluno.cursoAtualId || null,
    turmaAtualId: dadosAluno.turmaAtualId || null,
    criadoEm: new Date(),
  });

  // Upload da foto
  let fotoURL = "";
  if (foto) {
    try {
      const fotoRef = ref(storage, `alunos/${alunoRef.id}/foto.jpg`);
      await uploadBytes(fotoRef, foto);
      fotoURL = await getDownloadURL(fotoRef);
      await updateDoc(alunoRef, { fotoURL });
    } catch (error) {
      console.error("Erro no upload da foto:", error);
    }
  }

  // Vincular à turma e diminuir vagas
  if (dadosAluno.cursoAtualId && dadosAluno.turmaAtualId) {
    const turmaRef = doc(db, "cursos", dadosAluno.cursoAtualId, "turmas", dadosAluno.turmaAtualId);
    await runTransaction(db, async (transaction) => {
      const turmaSnap = await transaction.get(turmaRef);
      if (!turmaSnap.exists()) throw new Error("Turma não encontrada");
      const vagas = turmaSnap.data().vagasDisponiveis ?? 0;
      if (vagas <= 0) throw new Error("Sem vagas disponíveis");
      transaction.update(turmaRef, {
        alunos: arrayUnion(alunoRef.id),
        vagasDisponiveis: vagas - 1,
      });
    });
  }

  if (onSucesso) onSucesso(matricula);
}