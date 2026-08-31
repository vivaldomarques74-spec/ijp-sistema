import { useState } from "react";
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function AdminUnificacao() {
  const [carregando, setCarregando] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const adicionarLog = (msg: string) => setLogs(prev => [...prev, msg]);

  // 1. Unificar duplicatas
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

  // 2. Reordenar matrículas
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

  // 3. Corrigir CPFs
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

  // 4. PADRONIZAR TUDO (FORÇADO)
  const handlePadronizarTudo = async () => {
    if (!confirm("Isso vai FORÇAR a correção de todos os tipoId textuais para IDs. Continuar?")) return;
    setCarregando(true);
    setLogs([]);

    try {
      // 1. Mapear todos os serviços (nome -> ID)
      const servSnap = await getDocs(collection(db, "tiposAtendimento"));
      const mapa: Record<string, string> = {};
      servSnap.forEach(d => {
        const nome = d.data().nome.toLowerCase().trim();
        mapa[nome] = d.id;
      });
      adicionarLog(`📌 Mapeamento: ${Object.keys(mapa).join(", ")}`);

      let total = 0;

      // 2. Corrigir FILA DE ESPERA (FORÇADAMENTE)
      const filaSnap = await getDocs(collection(db, "filaEspera"));
      let countFila = 0;
      for (const docSnap of filaSnap.docs) {
        const data = docSnap.data();
        const tipoId = data.tipoId;
        if (typeof tipoId === "string") {
          const chave = tipoId.toLowerCase().trim();
          if (mapa[chave] && tipoId !== mapa[chave]) {
            await updateDoc(docSnap.ref, { tipoId: mapa[chave] });
            countFila++;
            adicionarLog(`✅ Fila ${docSnap.id}: "${tipoId}" -> "${mapa[chave]}"`);
          } else if (!mapa[chave]) {
            adicionarLog(`⚠️ Fila ${docSnap.id}: tipoId "${tipoId}" não encontrado no mapeamento.`);
          }
        }
      }
      adicionarLog(`🎉 Fila: ${countFila} corrigidos.`);
      total += countFila;

      // 3. Corrigir AGENDAMENTOS
      const agendSnap = await getDocs(collection(db, "agendamentos"));
      let countAgend = 0;
      for (const docSnap of agendSnap.docs) {
        const data = docSnap.data();
        const tipoId = data.tipoId;
        if (typeof tipoId === "string") {
          const chave = tipoId.toLowerCase().trim();
          if (mapa[chave] && tipoId !== mapa[chave]) {
            await updateDoc(docSnap.ref, { tipoId: mapa[chave] });
            countAgend++;
            adicionarLog(`✅ Agendamento ${docSnap.id}: "${tipoId}" -> "${mapa[chave]}"`);
          }
        }
      }
      adicionarLog(`🎉 Agendamentos: ${countAgend} corrigidos.`);
      total += countAgend;

      // 4. Corrigir PROFISSIONAIS (especialidade)
      const profSnap = await getDocs(collection(db, "profissionais"));
      let countProf = 0;
      for (const docSnap of profSnap.docs) {
        const data = docSnap.data();
        const especialidade = data.especialidade;
        if (typeof especialidade === "string") {
          const chave = especialidade.toLowerCase().trim();
          if (mapa[chave] && especialidade !== mapa[chave]) {
            await updateDoc(docSnap.ref, { especialidade: mapa[chave] });
            countProf++;
            adicionarLog(`✅ Profissional ${docSnap.id}: "${especialidade}" -> "${mapa[chave]}"`);
          }
        }
      }
      adicionarLog(`🎉 Profissionais: ${countProf} corrigidos.`);
      total += countProf;

      // 5. Corrigir ALUNOS (servicosAtivos)
      const alunosSnap = await getDocs(collection(db, "alunos"));
      let countAlunos = 0;
      for (const docSnap of alunosSnap.docs) {
        const data = docSnap.data();
        const servicosAtivos = data.servicosAtivos || [];
        if (servicosAtivos.length > 0) {
          let modificado = false;
          const novosServicos = servicosAtivos.map((servico: any) => {
            const tipoId = servico.tipoId;
            if (typeof tipoId === "string") {
              const chave = tipoId.toLowerCase().trim();
              if (mapa[chave] && tipoId !== mapa[chave]) {
                modificado = true;
                return { ...servico, tipoId: mapa[chave] };
              }
            }
            return servico;
          });
          if (modificado) {
            await updateDoc(docSnap.ref, { servicosAtivos: novosServicos });
            countAlunos++;
            adicionarLog(`✅ Aluno ${docSnap.id}: servicosAtivos corrigidos`);
          }
        }
      }
      adicionarLog(`🎉 Alunos: ${countAlunos} corrigidos.`);
      total += countAlunos;

      adicionarLog(`🎯 TOTAL: ${total} registros corrigidos.`);
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
        <button onClick={handleUnificar} disabled={carregando} style={{ padding: "10px 20px", background: "#dc3545", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          {carregando ? "Processando..." : "Unificar CPFs Duplicados"}
        </button>
        <button onClick={handleReordenar} disabled={carregando} style={{ padding: "10px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          {carregando ? "Processando..." : "Reordenar Matrículas"}
        </button>
        <button onClick={handleCorrigirCpfs} disabled={carregando} style={{ padding: "10px 20px", background: "#ffc107", color: "#000", border: "none", borderRadius: 8, cursor: "pointer" }}>
          {carregando ? "Processando..." : "Corrigir CPFs"}
        </button>
        <button onClick={handlePadronizarTudo} disabled={carregando} style={{ padding: "10px 20px", background: "#17a2b8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>
          {carregando ? "Padronizando..." : "🔧 PADRONIZAR TUDO"}
        </button>
      </div>
      <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8, maxHeight: 400, overflow: "auto", border: "1px solid #dee2e6" }}>
        {logs.length === 0 && <span style={{ color: "#6b7a8f" }}>Nenhum log ainda.</span>}
        {logs.map((log, idx) => <div key={idx} style={{ fontFamily: "monospace", fontSize: 14, padding: "2px 0" }}>{log}</div>)}
      </div>
    </div>
  );
}