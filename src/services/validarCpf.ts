import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Verifica se um CPF já está cadastrado no Firestore.
 * @param cpf - CPF (com ou sem formatação)
 * @param excludeId - ID do documento a ser ignorado (para edição)
 * @returns true se o CPF já existir (exceto o documento com excludeId)
 */
export async function verificarCpfDuplicado(cpf: string, excludeId?: string): Promise<boolean> {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return false; // CPF inválido

  const q = query(collection(db, "alunos"), where("cpf", "==", cpfLimpo));
  const snapshot = await getDocs(q);

  if (excludeId) {
    return snapshot.docs.some(doc => doc.id !== excludeId);
  }
  return !snapshot.empty;
}