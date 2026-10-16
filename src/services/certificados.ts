// src/services/certificados.ts
import { db } from "./firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export interface ProfessorCertificado {
  nome: string;
  profissao?: string;
  tipoRegistro?: string;
  numeroRegistro?: string;
}

/**
 * Gera um código único, imprevisível e legível.
 * Formato: IJP-XXXX-XXXX-XXXX (sem caracteres ambíguos: 0/O, 1/I/L)
 */
export function gerarCodigoValidacao(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n: number) =>
    Array.from(
      { length: n },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `IJP-${seg(4)}-${seg(4)}-${seg(4)}`;
}

/**
 * Busca os professores vinculados a uma turma (via professoresIds).
 */
export async function getProfessoresDaTurma(
  cursoId: string,
  turmaId: string
): Promise<ProfessorCertificado[]> {
  try {
    const turmaSnap = await getDoc(
      doc(db, "cursos", cursoId, "turmas", turmaId)
    );
    if (!turmaSnap.exists()) return [];
    const data = turmaSnap.data();
    const ids: string[] = data.professoresIds || [];
    if (ids.length === 0) return [];

    const professores: ProfessorCertificado[] = [];
    for (const id of ids) {
      const pSnap = await getDoc(doc(db, "professores", id));
      if (pSnap.exists()) {
        const p = pSnap.data();
        professores.push({
          nome: p.nome || "",
          profissao: p.profissao || "",
          tipoRegistro: p.tipoRegistro || "",
          numeroRegistro: p.numeroRegistro || "",
        });
      }
    }
    return professores;
  } catch (e) {
    console.error("Erro ao buscar professores da turma:", e);
    return [];
  }
}

/**
 * Retorna o certificado existente OU cria um novo, garantindo código único persistente.
 * Evita códigos diferentes a cada download/reemissão.
 */
export async function obterOuCriarCertificado(dados: {
  alunoId: string;
  alunoNome: string;
  alunoCpf?: string;
  cursoId: string;
  cursoNome: string;
  turmaId: string;
  cargaHoraria: number;
  dataInicio: Date | string | null;
  dataFim: Date | string | null;
  frequencia: number;
}): Promise<{ id: string; codigo: string; professores: ProfessorCertificado[] }> {
  // 1) Verifica se já existe
  const q = query(
    collection(db, "certificados"),
    where("alunoId", "==", dados.alunoId),
    where("cursoId", "==", dados.cursoId),
    where("turmaId", "==", dados.turmaId)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    const docExist = snap.docs[0];
    const exist = docExist.data();
    return {
      id: docExist.id,
      codigo: exist.codigo,
      professores: exist.professores || [],
    };
  }

  // 2) Cria novo
  const professores = await getProfessoresDaTurma(dados.cursoId, dados.turmaId);
  const codigo = gerarCodigoValidacao();

  const docRef = await addDoc(collection(db, "certificados"), {
    ...dados,
    codigo,
    professores,
    status: "valido",
    emitidoEm: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, codigo, professores };
}

/**
 * Busca um certificado pelo código (página pública de validação).
 */
export async function buscarCertificadoPorCodigo(codigo: string) {
  const q = query(
    collection(db, "certificados"),
    where("codigo", "==", codigo)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) };
}

/**
 * Atualiza o status de um certificado (cancelado / revogado).
 */
export async function alterarStatusCertificado(
  id: string,
  status: "valido" | "cancelado" | "revogado"
) {
  await updateDoc(doc(db, "certificados", id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * URL pública de validação a partir do código.
 */
export function urlValidacao(codigo: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/certificado/${codigo}`;
}