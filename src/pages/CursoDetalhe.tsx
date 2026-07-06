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
}

interface Turma {
  id: string;
  nome: string;
  vagasTotales: number;
  vagasDisponiveis: number;
  totalAulas: number;
  cargaHoraria: number;   // ← novo campo
  dataInicio: Timestamp;
  dataFim: Timestamp;
  status: "ativa" | "inativa" | "encerrada";
}

export default function CursoDetalhe() {
  const params = useParams();
  if (!params.id) throw new Error("ID do curso não informado");
  const cursoId = params.id;

  const [curso, setCurso] = useState<Curso | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [nome, setNome] = useState("");
  const [vagasTotais, setVagasTotais] = useState<number>(0);
  const [totalAulas, setTotalAulas] = useState<number>(0);
  const [cargaHoraria, setCargaHoraria] = useState<number>(720); // ← padrão 720
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [status, setStatus] = useState<"ativa" | "inativa" | "encerrada">("ativa");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [vagasOcupadas, setVagasOcupadas] = useState<number>(0);

  useEffect(() => {
    const carregar = async () => {
      const cursoSnap = await getDoc(doc(db, "cursos", cursoId));
      if (cursoSnap.exists()) setCurso(cursoSnap.data() as Curso);
      const turmasSnap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
      setTurmas(
        turmasSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            nome: data.nome || "",
            vagasTotales: Number(data.vagasTotales) || 0,
            vagasDisponiveis: Number(data.vagasDisponiveis) || 0,
            totalAulas: Number(data.totalAulas) || 0,
            cargaHoraria: Number(data.cargaHoraria) || 720, // ← carrega do Firestore ou fallback
            dataInicio: data.dataInicio,
            dataFim: data.dataFim,
            status: data.status || "ativa",
          };
        })
      );
    };
    carregar();
  }, [cursoId]);

  const limparFormulario = () => {
    setNome("");
    setVagasTotais(0);
    setTotalAulas(0);
    setCargaHoraria(720);
    setDataInicio("");
    setDataFim("");
    setStatus("ativa");
    setEditandoId(null);
    setVagasOcupadas(0);
  };

  const salvarTurma = async () => {
    if (!nome.trim()) return alert("Informe o nome da turma");
    if (!vagasTotais || vagasTotais <= 0) return alert("Informe um número de vagas válido (maior que 0)");
    if (!dataInicio) return alert("Informe a data de início");
    if (!dataFim) return alert("Informe a data de fim");
    if (new Date(dataInicio) > new Date(dataFim)) return alert("Data de início não pode ser depois da data fim");

    const ref = collection(db, "cursos", cursoId, "turmas");
    const dados = {
      nome: nome.trim(),
      vagasTotales: Number(vagasTotais),
      vagasDisponiveis: Number(vagasTotais) - Number(vagasOcupadas),
      totalAulas: Number(totalAulas) || 0,
      cargaHoraria: Number(cargaHoraria) || 720, // ← salva carga horária
      dataInicio: Timestamp.fromDate(new Date(dataInicio)),
      dataFim: Timestamp.fromDate(new Date(dataFim)),
      status,
    };

    try {
      if (editandoId) {
        if (vagasTotais < vagasOcupadas) {
          alert(
            `Essa turma já tem ${vagasOcupadas} alunos. Não é possível reduzir as vagas para ${vagasTotais}.`
          );
          return;
        }
        await updateDoc(doc(ref, editandoId), dados);
      } else {
        await addDoc(ref, { ...dados, createdAt: Timestamp.now() });
      }
      limparFormulario();
      const turmasSnap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
      setTurmas(
        turmasSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            nome: data.nome || "",
            vagasTotales: Number(data.vagasTotales) || 0,
            vagasDisponiveis: Number(data.vagasDisponiveis) || 0,
            totalAulas: Number(data.totalAulas) || 0,
            cargaHoraria: Number(data.cargaHoraria) || 720,
            dataInicio: data.dataInicio,
            dataFim: data.dataFim,
            status: data.status || "ativa",
          };
        })
      );
      alert("Turma salva com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar turma. Verifique o console.");
    }
  };

  const editarTurma = (t: Turma) => {
    setEditandoId(t.id);
    setNome(t.nome);
    setVagasTotais(t.vagasTotales);
    setTotalAulas(t.totalAulas || 0);
    setCargaHoraria(t.cargaHoraria || 720);
    setVagasOcupadas(t.vagasTotales - t.vagasDisponiveis);
    setDataInicio(t.dataInicio.toDate().toISOString().split("T")[0]);
    setDataFim(t.dataFim.toDate().toISOString().split("T")[0]);
    setStatus(t.status);
  };

  const copiarLinkPresenca = (turmaId: string) => {
    const link = `${window.location.origin}/presenca-professor?turmaId=${turmaId}`;
    navigator.clipboard.writeText(link);
    alert("Link copiado! Envie para o professor.");
  };

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
        placeholder="Vagas totais (ex: 30)"
        value={vagasTotais || ""}
        onChange={(e) => setVagasTotais(Number(e.target.value))}
        min="1"
      />

      <input
        type="number"
        placeholder="Total de aulas (ex: 25)"
        value={totalAulas || ""}
        onChange={(e) => setTotalAulas(Number(e.target.value))}
        min="0"
      />

      <input
        type="number"
        placeholder="Carga horária (ex: 720)"
        value={cargaHoraria || ""}
        onChange={(e) => setCargaHoraria(Number(e.target.value))}
        min="0"
      />

      {editandoId && (
        <p>
          <strong>Vagas ocupadas:</strong> {vagasOcupadas} <br />
          <strong>Vagas disponíveis:</strong> {vagasTotais - vagasOcupadas}
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

      <br />
      <br />
      <button onClick={salvarTurma}>
        {editandoId ? "Salvar alterações" : "Cadastrar turma"}
      </button>

      <hr />
      <h2>Turmas</h2>
      <ul>
        {turmas.map((t) => (
          <li key={t.id} style={{ marginBottom: 12 }}>
            <strong>{t.nome}</strong> <br />
            Vagas: {t.vagasDisponiveis} / {t.vagasTotales} <br />
            Aulas: {t.totalAulas} <br />
            Carga horária: {t.cargaHoraria}h <br />
            Status: {t.status}
            <br />
            <button onClick={() => editarTurma(t)}>Editar</button>
            <button
              onClick={() => copiarLinkPresenca(t.id)}
              style={{ marginLeft: 8, background: "#28a745", color: "#fff" }}
            >
              Copiar link para professor
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}