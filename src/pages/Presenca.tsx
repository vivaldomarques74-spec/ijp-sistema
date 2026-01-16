import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";

interface Curso {
  id: string;
  nome: string;
}

interface Turma {
  id: string;
  nome: string;
}

interface Aluno {
  id: string;
  nomeCompleto: string;
}

export default function Presenca() {
  const [data, setData] = useState("");
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState("");
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});

  // carregar cursos
  useEffect(() => {
    const carregarCursos = async () => {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(
        snap.docs.map((d) => ({
          id: d.id,
          nome: d.data().nome,
        }))
      );
    };

    carregarCursos();
  }, []);

  // carregar turmas do curso
  useEffect(() => {
    if (!cursoId) return;

    const carregarTurmas = async () => {
      const snap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
      setTurmas(
        snap.docs.map((d) => ({
          id: d.id,
          nome: d.data().nome,
        }))
      );
    };

    carregarTurmas();
  }, [cursoId]);

  // carregar alunos da turma
  useEffect(() => {
    if (!turmaId) return;

    const carregarAlunos = async () => {
      const q = query(
        collection(db, "alunos"),
        where("turmaAtualId", "==", turmaId)
      );
      const snap = await getDocs(q);

      const lista: Aluno[] = snap.docs.map((d) => ({
        id: d.id,
        nomeCompleto: d.data().nomeCompleto,
      }));

      setAlunos(lista);

      // inicia todos como presentes
      const inicial: Record<string, boolean> = {};
      lista.forEach((a) => (inicial[a.id] = true));
      setPresencas(inicial);
    };

    carregarAlunos();
  }, [turmaId]);

  const togglePresenca = (alunoId: string) => {
    setPresencas((prev) => ({
      ...prev,
      [alunoId]: !prev[alunoId],
    }));
  };

  const salvarPresenca = async () => {
    if (!data || !cursoId || !turmaId) {
      alert("Selecione data, curso e turma");
      return;
    }

    const ref = doc(db, "presencas", `${turmaId}_${data}`);

    await setDoc(ref, {
      cursoId,
      turmaId,
      data: Timestamp.fromDate(new Date(data)),
      alunos: presencas,
      createdAt: Timestamp.now(),
    });

    alert("Presença salva com sucesso!");
  };

  return (
    <div className="container">
      <h1>Presença</h1>

      <label>Data</label>
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
      />

      <br />
      <br />

      <label>Curso</label>
      <select value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
        <option value="">Selecione o curso</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <br />
      <br />

      <label>Turma</label>
      <select
        value={turmaId}
        onChange={(e) => setTurmaId(e.target.value)}
        disabled={!cursoId}
      >
        <option value="">Selecione a turma</option>
        {turmas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>

      <hr />

      <h3>Alunos</h3>

      {alunos.length === 0 && <p>Nenhum aluno nessa turma.</p>}

      <ul>
        {alunos.map((a) => (
          <li key={a.id} style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={presencas[a.id] || false}
                onChange={() => togglePresenca(a.id)}
              />{" "}
              {a.nomeCompleto}
            </label>
          </li>
        ))}
      </ul>

      {alunos.length > 0 && (
        <button onClick={salvarPresenca}>Salvar Presença</button>
      )}
    </div>
  );
}
