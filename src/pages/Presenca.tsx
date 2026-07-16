import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Presencas() {
  const [aba, setAba] = useState<"registrar" | "historico">("registrar");
  const [data, setData] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [presencasMarcadas, setPresencasMarcadas] = useState<string[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);

  useEffect(() => {
    const carregarCursos = async () => {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(snap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
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
    if (!cursoId || !turmaId) { setAlunos([]); setPresencasMarcadas([]); return; }
    const carregarAlunosDaTurma = async () => {
      setCarregandoAlunos(true);
      const turmaRef = doc(db, "cursos", cursoId, "turmas", turmaId);
      const turmaSnap = await getDoc(turmaRef);
      if (!turmaSnap.exists()) { setAlunos([]); setCarregandoAlunos(false); return; }
      const alunosIds = turmaSnap.data().alunos || [];
      if (alunosIds.length === 0) { setAlunos([]); setCarregandoAlunos(false); return; }
      const alunosSnap = await getDocs(collection(db, "alunos"));
      const lista = alunosSnap.docs
        .filter(d => alunosIds.includes(d.id))
        .map(d => ({ id: d.id, nomeCompleto: d.data().nomeCompleto }));
      lista.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
      setAlunos(lista);
      setCarregandoAlunos(false);
    };
    carregarAlunosDaTurma();
  }, [cursoId, turmaId]);

  const salvarPresencas = async () => {
    if (!data || !cursoId || !turmaId) return alert("Preencha data, curso e turma");
    const dataPresenca = Timestamp.fromDate(new Date(data));
    for (const alunoId of presencasMarcadas) {
      await addDoc(collection(db, "presencas"), { alunoId, cursoId, turmaId, data: dataPresenca, presente: true });
      await updateDoc(doc(db, "alunos", alunoId), { historicoPresenca: arrayUnion({ cursoId, turmaId, data: dataPresenca, presente: true }) });
    }
    alert("Presença registrada");
    setPresencasMarcadas([]);
    // recarregar para atualizar contagem
    const turmaRef = doc(db, "cursos", cursoId, "turmas", turmaId);
    const turmaSnap = await getDoc(turmaRef);
    if (turmaSnap.exists()) {
      const alunosIds = turmaSnap.data().alunos || [];
      if (alunosIds.length > 0) {
        const alunosSnap = await getDocs(collection(db, "alunos"));
        const lista = alunosSnap.docs
          .filter(d => alunosIds.includes(d.id))
          .map(d => ({ id: d.id, nomeCompleto: d.data().nomeCompleto }));
        lista.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
        setAlunos(lista);
      }
    }
  };

  const gerarHistorico = async () => {
    const snap = await getDocs(collection(db, "presencas"));
    const lista = [];
    for (const docSnap of snap.docs) {
      const p = docSnap.data();
      if (p.cursoId === cursoId && p.turmaId === turmaId && (!data || p.data.toDate().toISOString().slice(0, 10) === data)) {
        const alunoSnap = await getDoc(doc(db, "alunos", p.alunoId));
        const nome = alunoSnap.exists() ? alunoSnap.data().nomeCompleto : "Desconhecido";
        lista.push({ nome, data: p.data.toDate().toLocaleDateString(), presente: p.presente ? "Presente" : "Ausente" });
      }
    }
    setHistorico(lista);
  };

  const gerarPdfPresenca = () => {
    const pdf = new jsPDF();
    pdf.text("Lista de Presença", 14, 15);
    autoTable(pdf, { startY: 20, head: [["Aluno", "Presente"]], body: alunos.map(a => [a.nomeCompleto, presencasMarcadas.includes(a.id) ? "Sim" : "Não"]) });
    pdf.save("presenca.pdf");
  };

  const gerarPdfAluno = () => {
    const pdf = new jsPDF();
    pdf.text("Relatório de Presença", 14, 15);
    autoTable(pdf, { startY: 20, head: [["Aluno", "Data", "Status"]], body: historico.map(h => [h.nome, h.data, h.presente]) });
    pdf.save("relatorio-presenca.pdf");
  };

  const selectStyle = { padding: 8, border: "1px solid #ccc", borderRadius: 8, background: "#fff", marginRight: 8 };
  const buttonStyle = { padding: "4px 12px", border: "none", borderRadius: 4, background: "#0070f3", color: "#fff", cursor: "pointer", marginRight: 4 };

  return (
    <div>
      <h2 style={{ fontSize: 20, margin: "0 0 16px", color: "#1a2a4f" }}>Presenças</h2>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setAba("registrar")} style={{ ...buttonStyle, background: aba === "registrar" ? "#1a2a4f" : "#6c757d" }}>Registrar</button>
        <button onClick={() => setAba("historico")} style={{ ...buttonStyle, background: aba === "historico" ? "#1a2a4f" : "#6c757d" }}>Histórico</button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        <select value={cursoId} onChange={e => setCursoId(e.target.value)} style={selectStyle}>
          <option value="">Curso</option>
          {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)} style={selectStyle} disabled={!cursoId}>
          <option value="">Turma</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      {aba === "registrar" && turmaId && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {carregandoAlunos && <p>Carregando alunos...</p>}
          {!carregandoAlunos && alunos.length === 0 && <p>Nenhum aluno matriculado.</p>}
          {alunos.map(a => (
            <label key={a.id} style={{ display: "block", marginBottom: 4 }}>
              <input type="checkbox" checked={presencasMarcadas.includes(a.id)} onChange={e => setPresencasMarcadas(prev => e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id))} />
              {a.nomeCompleto}
            </label>
          ))}
          {alunos.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <button onClick={salvarPresencas} style={{ ...buttonStyle, background: "#28a745" }}>Salvar Presença</button>
              <button onClick={gerarPdfPresenca} style={{ ...buttonStyle, background: "#6c757d" }}>Gerar PDF</button>
            </div>
          )}
        </div>
      )}

      {aba === "historico" && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <button onClick={gerarHistorico} style={buttonStyle}>Buscar Histórico</button>
          <button onClick={gerarPdfAluno} style={{ ...buttonStyle, background: "#6c757d" }}>Gerar PDF</button>
          {historico.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
              <thead><tr><th>Aluno</th><th>Data</th><th>Status</th></tr></thead>
              <tbody>{historico.map((h, idx) => <tr key={idx}><td>{h.nome}</td><td>{h.data}</td><td>{h.presente}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}