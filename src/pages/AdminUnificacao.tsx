import { useState } from "react";
import { db } from "../services/firebase";
import { collection, getDocs, query, where, updateDoc, deleteDoc, doc, orderBy } from "firebase/firestore";

// Tipos para os documentos
interface AlunoDoc {
  id: string;
  nomeCompleto?: string;
  cpf?: string;
  [key: string]: any; // outros campos
}

export default function AdminUnificacao() {
  const [carregando, setCarregando] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const adicionarLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleUnificar = async () => {
    if (!confirm("Tem certeza? Isso vai unificar duplicatas e pode afetar muitos dados.")) return;
    setCarregando(true);
    setLogs([]);
    try {
      const alunosRef = collection(db, "alunos");
      const snapshot = await getDocs(alunosRef);
      const cpfMap = new Map<string, AlunoDoc[]>();
      snapshot.forEach(doc => {
        const data = doc.data() as AlunoDoc;
        const cpf = data.cpf;
        if (!cpf) return;
        if (!cpfMap.has(cpf)) cpfMap.set(cpf, []);
        // CORREÇÃO: usar id do documento e manter os dados, sem duplicação
        const alunoData: AlunoDoc = {
          ...data,
          id: doc.id, // garante que o id seja o do documento, sobrescrevendo qualquer id vindo do data
        };
        cpfMap.get(cpf)!.push(alunoData);
      });

      for (const [cpf, docs] of cpfMap.entries()) {
        if (docs.length <= 1) continue;
        adicionarLog(`Processando CPF ${cpf} (${docs.length} registros)`);
        // Escolher o principal: o mais completo
        const principal = docs.reduce((a: AlunoDoc, b: AlunoDoc) => {
          const countA = Object.keys(a).filter(k => a[k] && a[k] !== "").length;
          const countB = Object.keys(b).filter(k => b[k] && b[k] !== "").length;
          return countA >= countB ? a : b;
        });
        const secundarios = docs.filter(d => d.id !== principal.id);

        for (const sec of secundarios) {
          adicionarLog(`  Unificando ${sec.id} (${sec.nomeCompleto})`);
          // Presenças
          const presencasQuery = query(collection(db, "presencas"), where("alunoId", "==", sec.id));
          const presencasSnap = await getDocs(presencasQuery);
          for (const pDoc of presencasSnap.docs) {
            await updateDoc(pDoc.ref, { alunoId: principal.id });
          }
          adicionarLog(`    Presenças: ${presencasSnap.size} atualizadas`);
          // Turmas
          const turmasQuery = query(collection(db, "turmas"), where("alunos", "array-contains", sec.id));
          const turmasSnap = await getDocs(turmasQuery);
          for (const tDoc of turmasSnap.docs) {
            const data = tDoc.data();
            const alunosArray = data.alunos || [];
            const newAlunos = alunosArray.map((id: string) => id === sec.id ? principal.id : id);
            await updateDoc(tDoc.ref, { alunos: newAlunos });
          }
          adicionarLog(`    Turmas: ${turmasSnap.size} atualizadas`);
          // Fila
          const filaQuery = query(collection(db, "filaEspera"), where("alunoId", "==", sec.id));
          const filaSnap = await getDocs(filaQuery);
          for (const fDoc of filaSnap.docs) {
            await updateDoc(fDoc.ref, { alunoId: principal.id });
          }
          adicionarLog(`    Fila: ${filaSnap.size} atualizadas`);
          // Excluir secundário
          await deleteDoc(doc(db, "alunos", sec.id));
          adicionarLog(`    Documento ${sec.id} excluído`);
        }
      }
      adicionarLog("Unificação concluída!");
    } catch (error: any) {
      adicionarLog(`Erro: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const handleReordenar = async () => {
    if (!confirm("Reordenar matrículas?")) return;
    setCarregando(true);
    setLogs([]);
    try {
      const alunosRef = collection(db, "alunos");
      const q = query(alunosRef, orderBy("matriculaNumero", "asc"));
      const snapshot = await getDocs(q);
      let i = 1;
      for (const doc of snapshot.docs) {
        await updateDoc(doc.ref, { matriculaNumero: i, matricula: `IJP-${String(i).padStart(5, "0")}` });
        i++;
      }
      adicionarLog(`Matrículas reordenadas (${snapshot.size} alunos)`);
    } catch (error: any) {
      adicionarLog(`Erro: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ color: "#1a2a4f" }}>Administração – Unificação de CPFs</h1>
      <p style={{ color: "#6b7a8f" }}>Esta ferramenta unifica cadastros duplicados e reorganiza matrículas.</p>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <button onClick={handleUnificar} disabled={carregando} style={{ padding: "10px 20px", background: "#dc3545", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          {carregando ? "Processando..." : "Unificar CPFs Duplicados"}
        </button>
        <button onClick={handleReordenar} disabled={carregando} style={{ padding: "10px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          {carregando ? "Processando..." : "Reordenar Matrículas"}
        </button>
      </div>
      <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8, maxHeight: 400, overflow: "auto", border: "1px solid #dee2e6" }}>
        {logs.length === 0 && <span style={{ color: "#6b7a8f" }}>Nenhum log ainda.</span>}
        {logs.map((log, idx) => <div key={idx} style={{ fontFamily: "monospace", fontSize: 14, padding: "2px 0" }}>{log}</div>)}
      </div>
    </div>
  );
}