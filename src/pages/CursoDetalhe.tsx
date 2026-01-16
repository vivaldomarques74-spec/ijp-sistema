import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";

interface Curso {
  nome: string;
  descricao?: string;
  status?: string;
}

interface Turma {
  id: string;
  nome: string;
  vagas: number;
  dataInicio: Timestamp;
  dataFim: Timestamp;
  status: "ativa" | "inativa" | "encerrada";
}

export default function CursoDetalhe() {
  const { id } = useParams();
  const [curso, setCurso] = useState<Curso | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  // form nova turma
  const [nome, setNome] = useState("");
  const [vagas, setVagas] = useState<number>(0);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [status, setStatus] = useState<"ativa" | "inativa" | "encerrada">(
    "ativa"
  );

  // edição
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const carregarCurso = async () => {
      const ref = doc(db, "cursos", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setCurso(snap.data() as Curso);
      }
    };

    const carregarTurmas = async () => {
      const ref = collection(db, "cursos", id, "turmas");
      const snap = await getDocs(ref);
      const lista: Turma[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Turma, "id">),
      }));
      setTurmas(lista);
    };

    carregarCurso();
    carregarTurmas();
  }, [id]);

  const limparForm = () => {
    setNome("");
    setVagas(0);
    setDataInicio("");
    setDataFim("");
    setStatus("ativa");
    setEditandoId(null);
  };

  const salvarTurma = async () => {
    if (!id) return;

    if (!nome || !vagas || !dataInicio || !dataFim) {
      alert("Preencha todos os campos da turma");
      return;
    }

    const dados = {
      nome,
      vagas,
      dataInicio: Timestamp.fromDate(new Date(dataInicio)),
      dataFim: Timestamp.fromDate(new Date(dataFim)),
      status,
      createdAt: Timestamp.now(),
    };

    const ref = collection(db, "cursos", id, "turmas");

    if (editandoId) {
      await updateDoc(doc(ref, editandoId), dados);
    } else {
      await addDoc(ref, dados);
    }

    limparForm();

    // recarrega lista
    const snap = await getDocs(ref);
    setTurmas(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Turma, "id">),
      }))
    );
  };

  const editarTurma = (turma: Turma) => {
    setEditandoId(turma.id);
    setNome(turma.nome);
    setVagas(turma.vagas);
    setDataInicio(turma.dataInicio.toDate().toISOString().split("T")[0]);
    setDataFim(turma.dataFim.toDate().toISOString().split("T")[0]);
    setStatus(turma.status);
  };

  if (!curso) {
    return <p>Carregando curso...</p>;
  }

  return (
    <div className="container">
      <h1>{curso.nome}</h1>
      {curso.descricao && <p>{curso.descricao}</p>}

      <hr />

      <h2>{editandoId ? "Editar Turma" : "Nova Turma"}</h2>

      <div style={{ display: "grid", gap: 10, maxWidth: 400 }}>
        <input
          placeholder="Nome da turma"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          type="number"
          placeholder="Número de vagas"
          value={vagas}
          onChange={(e) => setVagas(Number(e.target.value))}
        />

        <label>Data início</label>
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
        />

        <label>Data fim</label>
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
        />

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "ativa" | "inativa" | "encerrada")
          }
        >
          <option value="ativa">Ativa</option>
          <option value="inativa">Inativa</option>
          <option value="encerrada">Encerrada</option>
        </select>

        <button onClick={salvarTurma}>
          {editandoId ? "Salvar alterações" : "Cadastrar turma"}
        </button>

        {editandoId && (
          <button onClick={limparForm}>Cancelar edição</button>
        )}
      </div>

      <hr />

      <h2>Turmas do curso</h2>

      {turmas.length === 0 && <p>Nenhuma turma cadastrada.</p>}

      <ul>
        {turmas.map((t) => (
          <li key={t.id} style={{ marginBottom: 10 }}>
            <strong>{t.nome}</strong> — {t.vagas} vagas —{" "}
            {t.status.toUpperCase()}
            <br />
            {t.dataInicio.toDate().toLocaleDateString()} até{" "}
            {t.dataFim.toDate().toLocaleDateString()}
            <br />
            <button onClick={() => editarTurma(t)}>Editar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
