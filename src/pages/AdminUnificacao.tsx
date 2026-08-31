import { useState } from "react";
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function AdminUnificacao() {
  const [carregando, setCarregando] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const adicionarLog = (msg: string) => setLogs(prev => [...prev, msg]);

  // Unificar duplicatas
  const handleUnificar = async () => {
    if (!confirm("Tem certeza? Isso vai unificar duplicatas.")) return;
    setCarregando(true);
    setLogs([]);
    try {
      const alunosRef = collection(db, "alunos");
      const snapshot = await getDocs(alunosRef);
      const cpfMap = new Map<string, any[]>();
      snapshot.forEach(doc => {
        const data = doc.data();
        const cpf = data.cpf;
        if (!cpf) return;
        if (!cpfMap.has(cpf)) cpfMap.set(cpf, []);
        cpfMap.get(cpf)!.push({ id: doc.id, ...data });
      });

      for (const [cpf, docs] of cpfMap.entries()) {
        if (docs.length <= 1) continue;
        adicionarLog(`Processando CPF ${cpf} (${docs.length} registros)`);
        const principal = docs.reduce((a: any, b: any) => {
          const countA = Object.keys(a).filter(k => a[k] && a[k] !== "").length;
          const countB = Object.keys(b).filter(k => b[k] && b[k] !== "").length;
          return countA >= countB ? a : b;
        });
        const secundarios = docs.filter(d => d.id !== principal.id);

        for (const sec of secundarios) {
          adicionarLog(`  Unificando ${sec.id} (${sec.nomeCompleto})`);
          // Presenças
          const presencasSnap = await getDocs(collection(db, "presencas"));
          for (const pDoc of presencasSnap.docs) {
            if (pDoc.data().alunoId === sec.id) {
              await updateDoc(pDoc.ref, { alunoId: principal.id });
            }
          }
          // Turmas
          const turmasSnap = await getDocs(collection(db, "turmas"));
          for (const tDoc of turmasSnap.docs) {
            const data = tDoc.data();
            const alunosArray = data.alunos || [];
            if (alunosArray.includes(sec.id)) {
              const newAlunos = alunosArray.map((id: string) => id === sec.id ? principal.id : id);
              await updateDoc(tDoc.ref, { alunos: newAlunos });
            }
          }
          // Fila
          const filaSnap = await getDocs(collection(db, "filaEspera"));
          for (const fDoc of filaSnap.docs) {
            if (fDoc.data().alunoId === sec.id) {
              await updateDoc(fDoc.ref, { alunoId: principal.id });
            }
          }
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

  // Reordenar matrículas
  const handleReordenar = async () => {
    if (!confirm("Reordenar matrículas?")) return;
    setCarregando(true);
    setLogs([]);
    try {
      const alunosRef = collection(db, "alunos");
      const snapshot = await getDocs(alunosRef);
      const alunos = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      alunos.sort((a, b) => (a.matriculaNumero || 0) - (b.matriculaNumero || 0));
      let i = 1;
      for (const aluno of alunos) {
        await updateDoc(doc(db, "alunos", aluno.id), {
          matriculaNumero: i,
          matricula: `IJP-${String(i).padStart(5, "0")}`,
        });
        i++;
      }
      adicionarLog(`Matrículas reordenadas (${alunos.length} alunos)`);
    } catch (error: any) {
      adicionarLog(`Erro: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  // Corrigir CPFs
  const handleCorrigirCpfs = async () => {
    if (!confirm("Remover pontos e traços de todos os CPFs?")) return;
    setCarregando(true);
    setLogs([]);
    try {
      const alunosSnap = await getDocs(collection(db, "alunos"));
      let count = 0;
      for (const alunoDoc of alunosSnap.docs) {
        const data = alunoDoc.data();
        const cpf = data.cpf;
        if (cpf && (cpf.includes('.') || cpf.includes('-'))) {
          const cpfLimpo = cpf.replace(/\D/g, '');
          if (cpfLimpo.length === 11) {
            await updateDoc(doc(db, "alunos", alunoDoc.id), { cpf: cpfLimpo });
            count++;
            adicionarLog(`✅ Atualizado: ${cpf} -> ${cpfLimpo}`);
          }
        }
      }
      adicionarLog(`🎉 ${count} CPFs corrigidos.`);
    } catch (error: any) {
      adicionarLog(`❌ Erro: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  // Padronizar tipos de serviço
  const handlePadronizarTudo = async () => {
    if (!confirm("Padronizar tipos de serviço?")) return;
    setCarregando(true);
    setLogs([]);
    try {
      const servSnap = await getDocs(collection(db, "tiposAtendimento"));
      const mapa: Record<string, string> = {};
      servSnap.forEach(d => {
        const nome = d.data().nome.toLowerCase().trim();
        mapa[nome] = d.id;
      });
      adicionarLog(`📌 Mapeamento: ${Object.keys(mapa).join(", ")}`);

      // Fila
      const filaSnap = await getDocs(collection(db, "filaEspera"));
      let countFila = 0;
      for (const docSnap of filaSnap.docs) {
        const data = docSnap.data();
        const tipoId = data.tipoId;
        if (typeof tipoId === "string" && mapa[tipoId.toLowerCase()]) {
          const novoId = mapa[tipoId.toLowerCase()];
          if (tipoId !== novoId) {
            await updateDoc(docSnap.ref, { tipoId: novoId });
            countFila++;
            adicionarLog(`✅ Fila ${docSnap.id}: "${tipoId}" -> "${novoId}"`);
          }
        }
      }
      adicionarLog(`🎉 Fila: ${countFila} corrigidos.`);

      // Agendamentos
      const agendSnap = await getDocs(collection(db, "agendamentos"));
      let countAgend = 0;
      for (const docSnap of agendSnap.docs) {
        const data = docSnap.data();
        const tipoId = data.tipoId;
        if (typeof tipoId === "string" && mapa[tipoId.toLowerCase()]) {
          const novoId = mapa[tipoId.toLowerCase()];
          if (tipoId !== novoId) {
            await updateDoc(docSnap.ref, { tipoId: novoId });
            countAgend++;
            adicionarLog(`✅ Agendamento ${docSnap.id}: "${tipoId}" -> "${novoId}"`);
          }
        }
      }
      adicionarLog(`🎉 Agendamentos: ${countAgend} corrigidos.`);

      // Profissionais
      const profSnap = await getDocs(collection(db, "profissionais"));
      let countProf = 0;
      for (const docSnap of profSnap.docs) {
        const data = docSnap.data();
        const especialidade = data.especialidade;
        if (typeof especialidade === "string" && mapa[especialidade.toLowerCase()]) {
          const novoId = mapa[especialidade.toLowerCase()];
          if (especialidade !== novoId) {
            await updateDoc(docSnap.ref, { especialidade: novoId });
            countProf++;
            adicionarLog(`✅ Profissional ${docSnap.id}: "${especialidade}" -> "${novoId}"`);
          }
        }
      }
      adicionarLog(`🎉 Profissionais: ${countProf} corrigidos.`);

      adicionarLog(`🎉 Padronização concluída!`);
    } catch (error: any) {
      adicionarLog(`❌ Erro: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ color: "#1a2a4f" }}>Administração – Correção e Unificação</h1>
      <p style={{ color: "#6b7a8f" }}>Ferramentas para manutenção de dados.</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={handleUnificar} disabled={carregando} style={{ padding: "10px 20px", background: "#dc3545", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Unificar CPFs Duplicados</button>
        <button onClick={handleReordenar} disabled={carregando} style={{ padding: "10px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Reordenar Matrículas</button>
        <button onClick={handleCorrigirCpfs} disabled={carregando} style={{ padding: "10px 20px", background: "#ffc107", color: "#000", border: "none", borderRadius: 8, cursor: "pointer" }}>Corrigir CPFs</button>
        <button onClick={handlePadronizarTudo} disabled={carregando} style={{ padding: "10px 20px", background: "#17a2b8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>PADRONIZAR TUDO</button>
      </div>
      <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8, maxHeight: 400, overflow: "auto", border: "1px solid #dee2e6" }}>
        {logs.length === 0 && <span style={{ color: "#6b7a8f" }}>Nenhum log ainda.</span>}
        {logs.map((log, idx) => <div key={idx} style={{ fontFamily: "monospace", fontSize: 14, padding: "2px 0" }}>{log}</div>)}
      </div>
    </div>
  );
}