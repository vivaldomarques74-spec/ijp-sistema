import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, getDocs, doc, addDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";

export default function PresencaProfessor() {
  const [searchParams] = useSearchParams();
  const turmaId = searchParams.get("turmaId");
  const [cursoNome, setCursoNome] = useState("");
  const [turmaNome, setTurmaNome] = useState("");
  const [alunos, setAlunos] = useState<any[]>([]);
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [presencasMarcadas, setPresencasMarcadas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!turmaId) return;
    const carregar = async () => {
      setCarregando(true);
      try {
        const cursosSnap = await getDocs(collection(db, "cursos"));
        let encontrado = false;
        for (const cursoDoc of cursosSnap.docs) {
          const turmasSnap = await getDocs(collection(db, "cursos", cursoDoc.id, "turmas"));
          const turmaDoc = turmasSnap.docs.find(d => d.id === turmaId);
          if (turmaDoc) {
            setCursoNome(cursoDoc.data().nome);
            setTurmaNome(turmaDoc.data().nome);
            const alunosIds = turmaDoc.data().alunos || [];
            if (alunosIds.length > 0) {
              const alunosSnap = await getDocs(collection(db, "alunos"));
              const lista = alunosSnap.docs
                .filter(d => alunosIds.includes(d.id))
                .map(d => ({ id: d.id, nome: d.data().nomeCompleto }));
              lista.sort((a, b) => a.nome.localeCompare(b.nome));
              setAlunos(lista);
            } else {
              setAlunos([]);
            }
            encontrado = true;
            break;
          }
        }
        if (!encontrado) {
          setMensagem("Turma não encontrada.");
        }
      } catch (error) {
        console.error(error);
        setMensagem("Erro ao carregar dados.");
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [turmaId]);

  const salvarPresencas = async () => {
    if (!data) return alert("Selecione a data");
    if (presencasMarcadas.length === 0) return alert("Marque pelo menos um aluno");
    setCarregando(true);
    const dataPresenca = Timestamp.fromDate(new Date(data));
    try {
      for (const alunoId of presencasMarcadas) {
        await addDoc(collection(db, "presencas"), {
          alunoId,
          cursoId: null,
          turmaId,
          data: dataPresenca,
          presente: true,
        });
        await updateDoc(doc(db, "alunos", alunoId), {
          historicoPresenca: arrayUnion({ cursoId: null, turmaId, data: dataPresenca, presente: true }),
        });
      }
      alert("Presença registrada com sucesso!");
      setPresencasMarcadas([]);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar presença.");
    } finally {
      setCarregando(false);
    }
  };

  if (!turmaId) return <p>Parâmetro turmaId não informado.</p>;
  if (mensagem) return <p>{mensagem}</p>;
  if (carregando && alunos.length === 0) return <p>Carregando...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Registro de Presença</h1>
      <p><strong>Curso:</strong> {cursoNome}</p>
      <p><strong>Turma:</strong> {turmaNome}</p>
      <div style={{ marginBottom: 16 }}>
        <label>Data: </label>
        <input type="date" value={data} onChange={e => setData(e.target.value)} />
      </div>
      <h3>Alunos</h3>
      {alunos.length === 0 && <p>Nenhum aluno matriculado nesta turma.</p>}
      {alunos.map(aluno => (
        <label key={aluno.id} style={{ display: "block", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={presencasMarcadas.includes(aluno.id)}
            onChange={e => {
              if (e.target.checked) {
                setPresencasMarcadas([...presencasMarcadas, aluno.id]);
              } else {
                setPresencasMarcadas(presencasMarcadas.filter(id => id !== aluno.id));
              }
            }}
          />
          {aluno.nome}
        </label>
      ))}
      {alunos.length > 0 && (
        <button onClick={salvarPresencas} disabled={carregando}>
          {carregando ? "Salvando..." : "Salvar Presença"}
        </button>
      )}
    </div>
  );
}