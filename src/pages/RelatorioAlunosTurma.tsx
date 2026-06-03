import { useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function RelatorioAlunosTurma() {
  const [cursoNome, setCursoNome] = useState("");
  const [turmaNome, setTurmaNome] = useState("");
  const [relatorio, setRelatorio] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  const gerarRelatorio = async () => {
    if (!cursoNome || !turmaNome) return alert("Preencha curso e turma");
    setCarregando(true);
    try {
      // 1. Buscar curso pelo nome
      const cursosSnap = await getDocs(collection(db, "cursos"));
      const cursoDoc = cursosSnap.docs.find(d => d.data().nome === cursoNome);
      if (!cursoDoc) throw new Error("Curso não encontrado");

      // 2. Buscar turma dentro do curso
      const turmasSnap = await getDocs(collection(db, "cursos", cursoDoc.id, "turmas"));
      const turmaDoc = turmasSnap.docs.find(d => d.data().nome === turmaNome);
      if (!turmaDoc) throw new Error("Turma não encontrada");

      const alunosIds = turmaDoc.data().alunos || [];
      if (alunosIds.length === 0) throw new Error("Nenhum aluno na turma");

      // 3. Buscar dados de cada aluno
      const alunosLista = [];
      for (const id of alunosIds) {
        const alunoSnap = await getDoc(doc(db, "alunos", id));
        if (alunoSnap.exists()) {
          const data = alunoSnap.data();
          alunosLista.push({
            nome: data.nomeCompleto || "-",
            matricula: data.matricula || "-",
            telefone: data.telefone || "-",
            email: data.email || "-",
          });
        }
      }
      setRelatorio(alunosLista);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setCarregando(false);
    }
  };

  const exportarCSV = () => {
    if (relatorio.length === 0) return alert("Gere o relatório primeiro");
    const cabecalho = ["Nome", "Matrícula", "Telefone", "Email"];
    const linhas = relatorio.map(a => [a.nome, a.matricula, a.telefone, a.email]);
    const csv = [cabecalho, ...linhas].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `alunos_${cursoNome}_${turmaNome}.csv`;
    link.click();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Relatório de Alunos por Turma</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          placeholder="Nome do curso (ex: INGLÊS)"
          value={cursoNome}
          onChange={e => setCursoNome(e.target.value)}
        />
        <input
          placeholder="Nome da turma (ex: TURMA 002 ON)"
          value={turmaNome}
          onChange={e => setTurmaNome(e.target.value)}
        />
        <button onClick={gerarRelatorio} disabled={carregando}>
          {carregando ? "Buscando..." : "Gerar relatório"}
        </button>
      </div>

      {relatorio.length > 0 && (
        <>
          <button onClick={exportarCSV} style={{ marginBottom: 16 }}>
            Exportar CSV
          </button>
          <table border={1} cellPadding={8} style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Nome</th><th>Matrícula</th><th>Telefone</th><th>Email</th>
              </tr>
            </thead>
            <tbody>
              {relatorio.map((a, idx) => (
                <tr key={idx}>
                  <td>{a.nome}</td>
                  <td>{a.matricula}</td>
                  <td>{a.telefone}</td>
                  <td>{a.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}