import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, updateDoc, arrayRemove, runTransaction } from "firebase/firestore";
import { db } from "../services/firebase";

export default function MatriculasTurma() {
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [cursoId, setCursoId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const carregarCursos = async () => {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    carregarCursos();
  }, []);

  useEffect(() => {
    if (!cursoId) { setTurmas([]); setTurmaId(""); setAlunos([]); return; }
    const carregarTurmas = async () => {
      const snap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
      setTurmas(snap.docs.map(d => ({ id: d.id, nome: d.data().nome, alunos: d.data().alunos || [] })));
    };
    carregarTurmas();
  }, [cursoId]);

  useEffect(() => {
    if (!cursoId || !turmaId) { setAlunos([]); return; }
    const carregarAlunos = async () => {
      setCarregando(true);
      const turma = turmas.find(t => t.id === turmaId);
      if (!turma || !turma.alunos || turma.alunos.length === 0) { setAlunos([]); setCarregando(false); return; }
      const alunosSnap = await getDocs(collection(db, "alunos"));
      const lista = alunosSnap.docs
        .filter(d => turma.alunos.includes(d.id))
        .map(d => ({ id: d.id, nome: d.data().nomeCompleto, matricula: d.data().matricula }));
      lista.sort((a, b) => a.nome.localeCompare(b.nome));
      setAlunos(lista);
      setCarregando(false);
    };
    carregarAlunos();
  }, [cursoId, turmaId]);

  const removerAluno = async (alunoId: string, nome: string) => {
    if (!window.confirm(`Remover ${nome} desta turma?`)) return;
    try {
      const turmaRef = doc(db, "cursos", cursoId, "turmas", turmaId);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(turmaRef);
        if (!snap.exists()) throw new Error("Turma não existe");
        const vagas = snap.data().vagasDisponiveis ?? 0;
        const alunosArr = snap.data().alunos || [];
        if (!alunosArr.includes(alunoId)) throw new Error("Aluno não está na turma");
        transaction.update(turmaRef, {
          alunos: arrayRemove(alunoId),
          vagasDisponiveis: vagas + 1,
        });
      });
      // Remover curso do aluno
      const alunoRef = doc(db, "alunos", alunoId);
      const alunoSnap = await getDoc(alunoRef);
      if (alunoSnap.exists()) {
        const cursosAluno = alunoSnap.data().cursos || [];
        const novosCursos = cursosAluno.filter((c: any) => c.turmaId !== turmaId);
        await updateDoc(alunoRef, { cursos: novosCursos });
      }
      alert("Aluno removido com sucesso!");
      setAlunos(prev => prev.filter(a => a.id !== alunoId));
    } catch (error: any) {
      alert("Erro ao remover: " + error.message);
    }
  };

  const imprimirLista = () => {
    if (alunos.length === 0) return alert("Nenhum aluno para imprimir.");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Permita pop-ups para imprimir.");
    const cursoNome = cursos.find(c => c.id === cursoId)?.nome || "Curso";
    const turmaNome = turmas.find(t => t.id === turmaId)?.nome || "Turma";
    const hoje = new Date().toLocaleDateString("pt-BR");

    printWindow.document.write(`
      <html>
        <head>
          <title>Lista de Alunos - ${cursoNome} - ${turmaNome}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
            h2 { text-align: center; font-size: 14px; font-weight: normal; margin-top: 0; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f0f0f0; font-weight: bold; text-align: left; padding: 8px; border-bottom: 2px solid #333; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .assinatura { width: 200px; text-align: center; }
            .assinatura-linha { border-bottom: 1px solid #000; margin-top: 4px; }
            .footer { text-align: center; font-size: 12px; color: #888; margin-top: 30px; }
            @media print {
              .no-print { display: none; }
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>${cursoNome}</h1>
          <h2>Turma: ${turmaNome} - Emitido em: ${hoje}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">Nº</th>
                <th>Nome do Aluno</th>
                <th class="assinatura">Assinatura</th>
              </tr>
            </thead>
            <tbody>
              ${alunos.map((a, i) => `
                <tr>
                  <td style="text-align: center;">${i + 1}</td>
                  <td>${a.nome}</td>
                  <td class="assinatura"><div class="assinatura-linha"></div></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <p style="margin-top: 30px; font-size: 12px; color: #888;">
            Total de alunos: ${alunos.length}
          </p>
          <div class="footer">
            _________________________________<br>
            Responsável pela turma
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const selectStyle = { padding: 8, border: "1px solid #ccc", borderRadius: 8, background: "#fff", marginRight: 8 };
  const buttonStyle = { padding: "4px 12px", border: "none", borderRadius: 4, cursor: "pointer", marginRight: 4 };
  const buttonDanger = { ...buttonStyle, background: "#dc3545", color: "#fff" };
  const buttonPrint = { ...buttonStyle, background: "#17a2b8", color: "#fff" };

  return (
    <div>
      <h2 style={{ fontSize: 18, margin: "0 0 16px", color: "#1a2a4f" }}>Matrículas por Turma</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <select value={cursoId} onChange={e => setCursoId(e.target.value)} style={selectStyle}>
          <option value="">Curso</option>
          {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)} disabled={!cursoId} style={selectStyle}>
          <option value="">Turma</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      {turmaId && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ margin: 0 }}>Total: <strong>{alunos.length}</strong> alunos</p>
            <div>
              <button onClick={imprimirLista} style={{ ...buttonPrint, marginRight: 8 }}>🖨️ Imprimir lista</button>
            </div>
          </div>
          {carregando && <p>Carregando...</p>}
          {!carregando && alunos.length === 0 && <p>Nenhum aluno matriculado.</p>}
          <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e0e4e8" }}>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Nome</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Matrícula</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map(a => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                    <td style={{ padding: 12 }}>{a.nome}</td>
                    <td style={{ padding: 12 }}>{a.matricula}</td>
                    <td style={{ padding: 12 }}>
                      <button onClick={() => removerAluno(a.id, a.nome)} style={buttonDanger}>Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}