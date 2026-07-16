import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, getDocs, doc, getDoc, updateDoc, arrayRemove, runTransaction } from "firebase/firestore";
import { db } from "../services/firebase";

export default function MatriculasTurma() {
  const [searchParams] = useSearchParams();
  const turmaId = searchParams.get("turmaId");
  const [cursoNome, setCursoNome] = useState("");
  const [turmaNome, setTurmaNome] = useState("");
  const [alunos, setAlunos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!turmaId) {
      setMensagem("Nenhuma turma selecionada.");
      setCarregando(false);
      return;
    }
    const carregar = async () => {
      try {
        // Buscar curso e turma
        const cursosSnap = await getDocs(collection(db, "cursos"));
        let cursoEncontrado: any = null;
        let turmaEncontrada: any = null;
        for (const cursoDoc of cursosSnap.docs) {
          const turmasSnap = await getDocs(collection(db, "cursos", cursoDoc.id, "turmas"));
          const turmaDoc = turmasSnap.docs.find(d => d.id === turmaId);
          if (turmaDoc) {
            cursoEncontrado = { id: cursoDoc.id, ...cursoDoc.data() };
            turmaEncontrada = { id: turmaDoc.id, ...turmaDoc.data() };
            break;
          }
        }
        if (!cursoEncontrado || !turmaEncontrada) {
          setMensagem("Turma não encontrada.");
          setCarregando(false);
          return;
        }
        setCursoNome(cursoEncontrado.nome);
        setTurmaNome(turmaEncontrada.nome);

        const alunosIds = turmaEncontrada.alunos || [];
        if (alunosIds.length === 0) {
          setAlunos([]);
          setCarregando(false);
          return;
        }
        const alunosSnap = await getDocs(collection(db, "alunos"));
        const lista = alunosSnap.docs
          .filter(d => alunosIds.includes(d.id))
          .map(d => ({ id: d.id, nome: d.data().nomeCompleto, matricula: d.data().matricula }));
        lista.sort((a, b) => a.nome.localeCompare(b.nome));
        setAlunos(lista);
      } catch (error) {
        console.error(error);
        setMensagem("Erro ao carregar dados.");
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [turmaId]);

  const removerAluno = async (alunoId: string, nome: string) => {
    if (!window.confirm(`Remover ${nome} desta turma?`)) return;
    try {
      // Encontrar cursoId
      const cursosSnap = await getDocs(collection(db, "cursos"));
      let cursoId = null;
      for (const cursoDoc of cursosSnap.docs) {
        const turmasSnap = await getDocs(collection(db, "cursos", cursoDoc.id, "turmas"));
        const turmaDoc = turmasSnap.docs.find(d => d.id === turmaId);
        if (turmaDoc) {
          cursoId = cursoDoc.id;
          break;
        }
      }
      if (!cursoId) return alert("Curso não encontrado");
      const turmaRef = doc(db, "cursos", cursoId, "turmas", turmaId!);
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
      // Remover do array de cursos do aluno
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

  if (mensagem) return <div style={{ padding: 20 }}>{mensagem}</div>;
  if (carregando) return <div style={{ padding: 20 }}>Carregando...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 18, margin: "0 0 4px", color: "#1a2a4f" }}>Alunos matriculados</h2>
      <p style={{ fontSize: 14, color: "#6b7a8f", marginBottom: 16 }}>
        Curso: <strong>{cursoNome}</strong> | Turma: <strong>{turmaNome}</strong> | Total: <strong>{alunos.length}</strong>
      </p>
      {alunos.length === 0 && <p>Nenhum aluno matriculado nesta turma.</p>}
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e0e4e8" }}>
              <th style={{ textAlign: "left", padding: 12, fontSize: 13, color: "#6b7a8f" }}>Nome</th>
              <th style={{ textAlign: "left", padding: 12, fontSize: 13, color: "#6b7a8f" }}>Matrícula</th>
              <th style={{ textAlign: "left", padding: 12, fontSize: 13, color: "#6b7a8f" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                <td style={{ padding: 12 }}>{a.nome}</td>
                <td style={{ padding: 12 }}>{a.matricula}</td>
                <td style={{ padding: 12 }}>
                  <button
                    onClick={() => removerAluno(a.id, a.nome)}
                    style={{ background: "#dc3545", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}