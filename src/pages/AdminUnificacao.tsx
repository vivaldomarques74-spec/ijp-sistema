import { useState } from "react";
import { collection, getDocs, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function AdminUnificacao() {
  const [carregando, setCarregando] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const adicionarLog = (msg: string) => setLogs(prev => [...prev, msg]);

  // 1. Unificar duplicatas
  const handleUnificar = async () => {
    if (!confirm("Unificar duplicatas?")) return;
    setCarregando(true); setLogs([]);
    try {
      const snapshot = await getDocs(collection(db, "alunos"));
      const cpfMap = new Map<string, any[]>();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.cpf) return;
        if (!cpfMap.has(data.cpf)) cpfMap.set(data.cpf, []);
        cpfMap.get(data.cpf)!.push({ id: doc.id, ...data });
      });
      for (const docs of Array.from(cpfMap.values())) {
        if (docs.length <= 1) continue;
        const principal = docs.reduce((a, b) => {
          const cA = Object.keys(a).filter(k => a[k] && a[k] !== "").length;
          const cB = Object.keys(b).filter(k => b[k] && b[k] !== "").length;
          return cA >= cB ? a : b;
        });
        for (const sec of docs.filter(d => d.id !== principal.id)) {
          const pSnap = await getDocs(collection(db, "presencas"));
          for (const p of pSnap.docs) if (p.data().alunoId === sec.id) await updateDoc(p.ref, { alunoId: principal.id });
          const fSnap = await getDocs(collection(db, "filaEspera"));
          for (const f of fSnap.docs) if (f.data().alunoId === sec.id) await updateDoc(f.ref, { alunoId: principal.id });
          await deleteDoc(doc(db, "alunos", sec.id));
          adicionarLog(`Unificado ${sec.id}`);
        }
      }
      adicionarLog("Unificação concluída!");
    } catch (e: any) { adicionarLog(`Erro: ${e.message}`); }
    finally { setCarregando(false); }
  };

  // 2. Reordenar matrículas
  const handleReordenar = async () => {
    if (!confirm("Reordenar?")) return;
    setCarregando(true); setLogs([]);
    try {
      const snap = await getDocs(collection(db, "alunos"));
      const alunos = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      alunos.sort((a, b) => (a.matriculaNumero || 0) - (b.matriculaNumero || 0));
      let i = 1;
      for (const a of alunos) {
        await updateDoc(doc(db, "alunos", a.id), {
          matriculaNumero: i, matricula: `IJP-${String(i).padStart(5, "0")}`,
        });
        i++;
      }
      adicionarLog(`${alunos.length} matrículas reordenadas`);
    } catch (e: any) { adicionarLog(`Erro: ${e.message}`); }
    finally { setCarregando(false); }
  };

  // 3. Corrigir CPFs
  const handleCorrigirCpfs = async () => {
    if (!confirm("Corrigir CPFs?")) return;
    setCarregando(true); setLogs([]);
    try {
      const snap = await getDocs(collection(db, "alunos"));
      let n = 0;
      for (const a of snap.docs) {
        const cpf = a.data().cpf;
        if (cpf && (cpf.includes('.') || cpf.includes('-'))) {
          const limpo = cpf.replace(/\D/g, '');
          if (limpo.length === 11) { await updateDoc(a.ref, { cpf: limpo }); n++; }
        }
      }
      adicionarLog(`${n} CPFs corrigidos`);
    } catch (e: any) { adicionarLog(`Erro: ${e.message}`); }
    finally { setCarregando(false); }
  };

  // 4. Padronizar tudo
  const handlePadronizarTudo = async () => {
    if (!confirm("Padronizar tipoId textual → ID?")) return;
    setCarregando(true); setLogs([]);
    try {
      const servSnap = await getDocs(collection(db, "tiposAtendimento"));
      const mapa: Record<string, string> = {};
      servSnap.forEach(d => { mapa[d.data().nome.toLowerCase().trim()] = d.id; });
      adicionarLog(`Mapeamento: ${Object.keys(mapa).join(", ")}`);

      let total = 0;
      for (const col of ["filaEspera", "agendamentos"]) {
        const snap = await getDocs(collection(db, col));
        let n = 0;
        for (const d of snap.docs) {
          const t = d.data().tipoId;
          if (typeof t === "string" && mapa[t.toLowerCase().trim()] && t !== mapa[t.toLowerCase().trim()]) {
            await updateDoc(d.ref, { tipoId: mapa[t.toLowerCase().trim()] });
            n++;
          }
        }
        adicionarLog(`${col}: ${n} corrigidos`);
        total += n;
      }
      const profSnap = await getDocs(collection(db, "profissionais"));
      let np = 0;
      for (const d of profSnap.docs) {
        const e = d.data().especialidade;
        if (typeof e === "string" && mapa[e.toLowerCase().trim()] && e !== mapa[e.toLowerCase().trim()]) {
          await updateDoc(d.ref, { especialidade: mapa[e.toLowerCase().trim()] }); np++;
        }
      }
      adicionarLog(`profissionais: ${np} corrigidos`);
      total += np;
      adicionarLog(`TOTAL: ${total}`);
    } catch (e: any) { adicionarLog(`Erro: ${e.message}`); }
    finally { setCarregando(false); }
  };

  // 5. Corrigir grupos
  const handleCorrigirGrupos = async () => {
    if (!confirm("Aplicar aluno em todas as semanas do grupo?")) return;
    setCarregando(true); setLogs([]);
    try {
      const snap = await getDocs(collection(db, "agendamentos"));
      const grupos = new Map<string, any[]>();
      for (const d of snap.docs) {
        const g = d.data().groupId;
        if (!g) continue;
        if (!grupos.has(g)) grupos.set(g, []);
        grupos.get(g)!.push({ id: d.id, ...d.data() });
      }
      let total = 0;
      for (const [gid, regs] of grupos.entries()) {
        const comAluno = regs.filter(r => r.alunoId);
        if (comAluno.length === 0 || comAluno.length === regs.length) continue;
        const { alunoId, status } = comAluno[0];
        const novoStatus = (status === "livre" || status === "aguardandoVinculo") ? "ocupado" : status;
        for (const r of regs) {
          if (!r.alunoId) {
            await updateDoc(doc(db, "agendamentos", r.id), { alunoId, status: novoStatus });
            total++;
          }
        }
        adicionarLog(`Grupo ${gid}: ${comAluno.length}/${regs.length} → corrigido`);
      }
      adicionarLog(`TOTAL: ${total} agendamentos`);
    } catch (e: any) { adicionarLog(`Erro: ${e.message}`); }
    finally { setCarregando(false); }
  };

  // 6. Corrigir Presenças Duplicadas
  const handleCorrigirPresencasDuplicadas = async () => {
    if (!confirm("Remover presenças duplicadas (mesmo aluno, curso, turma e data)?")) return;
    setCarregando(true); setLogs([]);
    try {
      const snap = await getDocs(collection(db, "presencas"));
      adicionarLog(`Total de presenças: ${snap.size}`);

      const vistos = new Set<string>();
      const paraRemover: any[] = [];

      for (const d of snap.docs) {
        const data = d.data();
        const alunoId = data.alunoId || "";
        const cursoId = data.cursoId || "";
        const turmaId = data.turmaId || "";
        const dataTs = data.data;
        const dataStr = dataTs?.toDate?.()?.toISOString?.() || String(dataTs || "");
        const chave = `${alunoId}_${cursoId}_${turmaId}_${dataStr}`;

        if (vistos.has(chave)) {
          paraRemover.push(d);
        } else {
          vistos.add(chave);
        }
      }

      for (const d of paraRemover) {
        await deleteDoc(d.ref);
      }

      adicionarLog(`🎉 ${paraRemover.length} presenças duplicadas removidas.`);
      adicionarLog(`Presenças restantes: ${snap.size - paraRemover.length}`);
    } catch (e: any) { adicionarLog(`❌ Erro: ${e.message}`); }
    finally { setCarregando(false); }
  };

  // 7. Ajustar presenças de um aluno
  const handleAjustarPresencasAluno = async () => {
    const matricula = prompt("Matrícula do aluno (ex: IJP-00275):");
    if (!matricula) return;
    const qtdDesejada = prompt("Quantas presenças manter? (números mais recentes)");
    if (!qtdDesejada) return;
    const qtd = parseInt(qtdDesejada);
    if (isNaN(qtd) || qtd < 0) return alert("Quantidade inválida");

    setCarregando(true); setLogs([]);
    try {
      const alunosSnap = await getDocs(collection(db, "alunos"));
      const alunoDoc = alunosSnap.docs.find(d => d.data().matricula === matricula);
      if (!alunoDoc) { adicionarLog(`❌ Aluno ${matricula} não encontrado.`); return; }

      adicionarLog(`Aluno: ${alunoDoc.data().nomeCompleto}`);

      const presSnap = await getDocs(collection(db, "presencas"));
      const presencas = presSnap.docs
        .filter(d => d.data().alunoId === alunoDoc.id)
        .map(d => ({
          ref: d.ref,
          data: d.data().data?.toDate?.() || new Date(0),
        }));

      presencas.sort((a, b) => b.data.getTime() - a.data.getTime());

      adicionarLog(`Presenças atuais: ${presencas.length}`);
      adicionarLog(`Vou manter as ${qtd} mais recentes`);

      const paraRemover = presencas.slice(qtd);
      for (const p of paraRemover) {
        await deleteDoc(p.ref);
      }
      adicionarLog(`🎉 ${paraRemover.length} presenças removidas.`);
      adicionarLog(`Presenças restantes: ${qtd}`);
    } catch (e: any) { adicionarLog(`❌ Erro: ${e.message}`); }
    finally { setCarregando(false); }
  };

  // 8. Listar prontuários antigos (sem tipoId)
  const handleListarProntuariosAntigos = async () => {
    if (!confirm("Listar prontuários SEM tipoId para revisar e migrar?")) return;
    setCarregando(true); setLogs([]);
    try {
      const snap = await getDocs(collection(db, "prontuarios"));
      const antigos: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (!data.tipoId) antigos.push({ id: d.id, ...data });
      });

      adicionarLog(`📋 ${antigos.length} prontuários SEM tipoId (antigos)`);
      adicionarLog(`---`);

      // Agrupar por aluno
      const porAluno: Record<string, any[]> = {};
      antigos.forEach(p => {
        if (!porAluno[p.alunoId]) porAluno[p.alunoId] = [];
        porAluno[p.alunoId].push(p);
      });

      for (const [alunoId, pronts] of Object.entries(porAluno)) {
        const alunoSnap = await getDoc(doc(db, "alunos", alunoId));
        const nomeAluno = alunoSnap.exists() ? alunoSnap.data().nomeCompleto : "(aluno não encontrado)";
        adicionarLog(`👤 ${nomeAluno} (${alunoId}): ${pronts.length} evoluções`);
        for (const p of pronts) {
          const dataStr = p.data?.toDate?.()?.toLocaleDateString?.() || "?";
          const preview = (p.texto || "").substring(0, 60).replace(/\n/g, " ");
          adicionarLog(`   [${p.id}] ${dataStr} — ${preview}...`);
        }
      }
      adicionarLog(`---`);
      adicionarLog(`⚠️ Para migrar, copie os IDs acima e use os botões "Migrar para PSI" ou "Migrar para NUTRI".`);
    } catch (e: any) { adicionarLog(`Erro: ${e.message}`); }
    finally { setCarregando(false); }
  };

  // 9. Migrar prontuário específico para PSI ou NUTRI
  const handleMigrarProntuario = async (tipo: "psicologia" | "nutrição") => {
    const idsStr = prompt(`Cole os IDs dos prontuários (separados por vírgula) para migrar para ${tipo.toUpperCase()}:`);
    if (!idsStr) return;

    const servSnap = await getDocs(collection(db, "tiposAtendimento"));
    const servDoc = servSnap.docs.find(d => d.data().nome.toLowerCase().trim() === tipo.toLowerCase());
    if (!servDoc) return alert(`Tipo "${tipo}" não encontrado em tiposAtendimento`);

    const ids = idsStr.split(",").map(s => s.trim()).filter(Boolean);
    setCarregando(true); setLogs([]);
    try {
      let n = 0;
      for (const id of ids) {
        const ref = doc(db, "prontuarios", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) { adicionarLog(`⚠️ ${id} não existe`); continue; }
        await updateDoc(ref, { tipoId: servDoc.id, migradoEm: new Date() });
        adicionarLog(`✅ ${id} → ${tipo}`);
        n++;
      }
      adicionarLog(`🎉 ${n} prontuários migrados para ${tipo}`);
    } catch (e: any) { adicionarLog(`Erro: ${e.message}`); }
    finally { setCarregando(false); }
  };

  // 10. Deletar prontuários sem tipoId
  const handleDeletarAntigos = async () => {
    if (!confirm("⚠️ DELETAR todos os prontuários SEM tipoId? Isso apaga de vez!")) return;
    if (!confirm("TEM CERTEZA? Não tem como voltar!")) return;
    setCarregando(true); setLogs([]);
    try {
      const snap = await getDocs(collection(db, "prontuarios"));
      let n = 0;
      for (const d of snap.docs) {
        if (!d.data().tipoId) {
          await deleteDoc(d.ref);
          n++;
        }
      }
      adicionarLog(`🗑️ ${n} prontuários antigos deletados.`);
    } catch (e: any) { adicionarLog(`Erro: ${e.message}`); }
    finally { setCarregando(false); }
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ color: "#1a2a4f" }}>Administração</h1>
      <p style={{ color: "#6b7a8f" }}>Ferramentas de manutenção.</p>

      <h3 style={{ fontSize: 14, color: "#6b7a8f", marginTop: 20 }}>Geral</h3>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={handleUnificar} disabled={carregando} style={{ padding: "10px 16px", background: "#dc3545", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Unificar CPFs
        </button>
        <button onClick={handleReordenar} disabled={carregando} style={{ padding: "10px 16px", background: "#28a745", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Reordenar Matrículas
        </button>
        <button onClick={handleCorrigirCpfs} disabled={carregando} style={{ padding: "10px 16px", background: "#ffc107", color: "#000", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Corrigir CPFs
        </button>
        <button onClick={handlePadronizarTudo} disabled={carregando} style={{ padding: "10px 16px", background: "#17a2b8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Padronizar Tudo
        </button>
        <button onClick={handleCorrigirGrupos} disabled={carregando} style={{ padding: "10px 16px", background: "#6f42c1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Corrigir Grupos
        </button>
      </div>

      <h3 style={{ fontSize: 14, color: "#6b7a8f", marginTop: 20 }}>Presenças</h3>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={handleCorrigirPresencasDuplicadas} disabled={carregando} style={{ padding: "10px 16px", background: "#fd7e14", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          🗑️ Corrigir Presenças Duplicadas
        </button>
        <button onClick={handleAjustarPresencasAluno} disabled={carregando} style={{ padding: "10px 16px", background: "#e83e8c", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          🎯 Ajustar Presenças de um Aluno
        </button>
      </div>

      <h3 style={{ fontSize: 14, color: "#6b7a8f", marginTop: 20 }}>Prontuários Antigos (Migração)</h3>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={handleListarProntuariosAntigos} disabled={carregando} style={{ padding: "10px 16px", background: "#20c997", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          📋 Listar Antigos
        </button>
        <button onClick={() => handleMigrarProntuario("psicologia")} disabled={carregando} style={{ padding: "10px 16px", background: "#6610f2", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          🧠 Migrar para PSI
        </button>
        <button onClick={() => handleMigrarProntuario("nutrição")} disabled={carregando} style={{ padding: "10px 16px", background: "#fd7e14", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          🍎 Migrar para NUTRI
        </button>
        <button onClick={handleDeletarAntigos} disabled={carregando} style={{ padding: "10px 16px", background: "#000", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          🗑️ Deletar Antigos
        </button>
      </div>

      <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8, maxHeight: 500, overflow: "auto", border: "1px solid #dee2e6" }}>
        {logs.length === 0 && <span style={{ color: "#6b7a8f" }}>Nenhum log ainda.</span>}
        {logs.map((log, i) => (
          <div key={i} style={{ fontFamily: "monospace", fontSize: 12, padding: 2, wordBreak: "break-all" }}>{log}</div>
        ))}
      </div>
    </div>
  );
}