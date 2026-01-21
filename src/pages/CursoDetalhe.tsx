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

/* =======================
   TIPAGENS
======================= */

interface Curso {
  nome: string;
  descricao?: string;
}

interface Turma {
  id: string;
  nome: string;
  vagasTotais: number;
  vagasDisponiveis: number;
  dataInicio: Timestamp;
  dataFim: Timestamp;
  status: "ativa" | "inativa" | "encerrada";
}

/* =======================
   COMPONENTE
======================= */

export default function CursoDetalhe() {
  const params = useParams();

  if (!params.id) {
    throw new Error("ID do curso não informado");
  }

  const cursoId = params.id;

  const [curso, setCurso] = useState<Curso | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  const [nome, setNome] = useState("");
  const [vagasTotais, setVagasTotais] = useState(0);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [status, setStatus] =
    useState<"ativa" | "inativa" | "encerrada">("ativa");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [vagasOcupadas, setVagasOcupadas] = useState(0);

  /* =======================
     CARREGAR CURSO + TURMAS
  ======================= */

  useEffect(() => {
    const carregar = async () => {
      const cursoSnap = await getDoc(doc(db, "cursos", cursoId));
      if (cursoSnap.exists()) {
        setCurso(cursoSnap.data() as Curso);
      }

      const turmasSnap = await getDocs(
        collection(db, "cursos", cursoId, "turmas")
      );

      setTurmas(
        turmasSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Turma, "id">),
        }))
      );
    };

    carregar();
  }, [cursoId]);

  /* =======================
     FUNÇÕES
  ======================= */

  const limparFormulario = () => {
    setNome("");
    setVagasTotais(0);
    setDataInicio("");
    setDataFim("");
    setStatus("ativa");
    setEditandoId(null);
    setVagasOcupadas(0);
  };

  const salvarTurma = async () => {
    if (!nome || !vagasTotais || !dataInicio || !dataFim) {
      alert("Preencha todos os campos");
      return;
    }

    const ref = collection(db, "cursos", cursoId, "turmas");

    if (editandoId) {
      // 🔒 impede reduzir vagas abaixo das ocupadas
      if (vagasTotais < vagasOcupadas) {
        alert(
          `Essa turma já tem ${vagasOcupadas} alunos. Não é possível reduzir as vagas para ${vagasTotais}.`
        );
        return;
      }

      await updateDoc(doc(ref, editandoId), {
        nome,
        vagasTotais,
        vagasDisponiveis: vagasTotais - vagasOcupadas,
        dataInicio: Timestamp.fromDate(new Date(dataInicio)),
        dataFim: Timestamp.fromDate(new Date(dataFim)),
        status,
      });
    } else {
      await addDoc(ref, {
        nome,
        vagasTotais,
        vagasDisponiveis: vagasTotais,
        dataInicio: Timestamp.fromDate(new Date(dataInicio)),
        dataFim: Timestamp.fromDate(new Date(dataFim)),
        status,
        createdAt: Timestamp.now(),
      });
    }

    limparFormulario();

    const snap = await getDocs(ref);
    setTurmas(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Turma, "id">),
      }))
    );
  };

  const editarTurma = (t: Turma) => {
    setEditandoId(t.id);
    setNome(t.nome);
    setVagasTotais(t.vagasTotais);
    setVagasOcupadas(t.vagasTotais - t.vagasDisponiveis);
    setDataInicio(t.dataInicio.toDate().toISOString().split("T")[0]);
    setDataFim(t.dataFim.toDate().toISOString().split("T")[0]);
    setStatus(t.status);
  };

  /* =======================
     RENDER
  ======================= */

  if (!curso) return <p>Carregando curso...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>{curso.nome}</h1>

      <hr />

      <h2>{editandoId ? "Editar Turma" : "Nova Turma"}</h2>

      <input
        placeholder="Nome da turma"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />

      <input
        type="number"
        placeholder="Vagas totais"
        value={vagasTotais}
        onChange={(e) => setVagasTotais(Number(e.target.value))}
      />

      {editandoId && (
        <p>
          <strong>Vagas ocupadas:</strong> {vagasOcupadas} <br />
          <strong>Vagas disponíveis:</strong>{" "}
          {vagasTotais - vagasOcupadas}
        </p>
      )}

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

      <br /><br />

      <button onClick={salvarTurma}>
        {editandoId ? "Salvar alterações" : "Cadastrar turma"}
      </button>

      <hr />

      <h2>Turmas</h2>

      <ul>
        {turmas.map((t) => (
          <li key={t.id} style={{ marginBottom: 12 }}>
            <strong>{t.nome}</strong> <br />
            Vagas: {t.vagasDisponiveis} / {t.vagasTotais} <br />
            Status: {t.status}
            <br />
            <button onClick={() => editarTurma(t)}>Editar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
