import { doc, runTransaction, arrayUnion, collection, addDoc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase";

export async function salvarAluno({
  dadosAluno,
  foto,
  onSucesso,
}: {
  dadosAluno: any;
  foto?: File | null;
  onSucesso?: (matricula: string, alunoId: string) => void;
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

  // Cria aluno
  const alunoRef = await addDoc(collection(db, "alunos"), {
    ...dadosAluno,
    matricula,
    matriculaNumero: numeroMatricula,
    cursoAtualId: dadosAluno.cursoAtualId || null,
    turmaAtualId: dadosAluno.turmaAtualId || null,
    servicosAtivos: dadosAluno.servicosAtivos || [],
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

  // Vincular à turma do curso (se houver)
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

  // *** Adicionar aluno à fila de espera para cada serviço marcado ***
  if (dadosAluno.servicosAtivos && dadosAluno.servicosAtivos.length > 0) {
    for (const servico of dadosAluno.servicosAtivos) {
      // Verifica se já existe na fila
      const filaQuery = query(
        collection(db, "filaEspera"),
        where("alunoId", "==", alunoRef.id),
        where("tipoId", "==", servico.tipoId),
        where("status", "==", "aguardando")
      );
      const filaSnap = await getDocs(filaQuery);
      if (filaSnap.empty) {
        // Se for serviço do tipo fila e tiver senha, marca a senha como usada
        if (servico.senhaId && servico.tipoId) {
          const senhaRef = doc(db, "tiposAtendimento", servico.tipoId, "senhas", servico.senhaId);
          await updateDoc(senhaRef, { usado: true, alunoId: alunoRef.id, dataUso: new Date() });
        }
        await addDoc(collection(db, "filaEspera"), {
          alunoId: alunoRef.id,
          tipoId: servico.tipoId,
          dataSolicitacao: new Date(),
          status: "aguardando",
          modalidade: servico.modalidade || "presencial",
          prioridade: servico.prioridade || false,
          senhaNumero: servico.senhaNumero || "",
        });
      }
    }
  }

  if (onSucesso) onSucesso(matricula, alunoRef.id);
}