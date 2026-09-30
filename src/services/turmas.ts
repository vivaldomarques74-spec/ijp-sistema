import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface InfoTurma {
  capacidadeTotal: number;
  totalAlunos: number;
  vagasDisponiveis: number;
}

/**
 * Calcula as vagas disponíveis de uma turma DINAMICAMENTE.
 * Nunca confia no campo vagasDisponiveis salvo no banco.
 */
export async function calcularVagasTurma(cursoId: string, turmaId: string): Promise<InfoTurma> {
  const turmaSnap = await getDoc(doc(db, "cursos", cursoId, "turmas", turmaId));
  if (!turmaSnap.exists()) throw new Error("Turma não encontrada");

  const data = turmaSnap.data();
  const alunos = data.alunos || [];
  const totalAlunos = alunos.length;

  // Capacidade total: tenta vários nomes possíveis
  const capacidadeTotal =
    data.vagasTotais ||
    data.totalVagas ||
    data.vagas ||
    data.capacidade ||
    0;

  const vagasDisponiveis = Math.max(0, capacidadeTotal - totalAlunos);

  return { capacidadeTotal, totalAlunos, vagasDisponiveis };
}

/**
 * Calcula as vagas de TODAS as turmas de um curso de uma vez.
 * Retorna um mapa { turmaId: InfoTurma }.
 */
export async function calcularVagasMultiplasTurmas(cursoId: string): Promise<Record<string, InfoTurma>> {
  const snap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
  const resultado: Record<string, InfoTurma> = {};

  snap.forEach(d => {
    const data = d.data();
    const alunos = data.alunos || [];
    const capacidadeTotal =
      data.vagasTotais ||
      data.totalVagas ||
      data.vagas ||
      data.capacidade ||
      0;
    resultado[d.id] = {
      capacidadeTotal,
      totalAlunos: alunos.length,
      vagasDisponiveis: Math.max(0, capacidadeTotal - alunos.length),
    };
  });

  return resultado;
}