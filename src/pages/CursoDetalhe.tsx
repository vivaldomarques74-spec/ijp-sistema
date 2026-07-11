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
  cargaHoraria: number;
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
  const [cargaHoraria, setCargaHoraria] = useState<number>(0);
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
            cargaHoraria: Number(data.cargaHoraria) || 0,
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
    setCargaHoraria(0);
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
      cargaHoraria: Number(cargaHoraria) || 0,
      dataInicio: Timestamp.fromDate(new Date(dataInicio)),
      dataFim: Timestamp.fromDate(new Date(dataFim)),
      status,
    };

    try {
      if (editandoId) {
        if (vagasTotais < vagasOcupadas) {
          alert(`Essa turma já tem ${vagasOcupadas} alunos. Não é possível reduzir as vagas para ${vagasTotais}.`);
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
            cargaHoraria: Number(data.cargaHoraria) || 0,
            dataInicio: data.dataInicio,
            dataFim: data.dataFim,
            status: data.status || "ativa",
          };
        })
      );
      alert("Turma salva com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar turma.");
    }
  };

  const editarTurma = (t: Turma) => {
    setEditandoId(t.id);
    setNome(t.nome);
    setVagasTotais(t.vagasTotales);
    setTotalAulas(t.totalAulas || 0);
    setCargaHoraria(t.cargaHoraria || 0);
    setVagasOcupadas(t.vagasTotales - t.vagasDisponiveis);
    setDataInicio(t.dataInicio.toDate().toISOString().split("T")[0]);
    setDataFim(t.dataFim.toDate().toISOString().split("T")[0]);
    setStatus(t.status);
  };

  const copiarLink = (turmaId: string, tipo: "professor" | "inscricao") => {
    const base = window.location.origin;
    const path = tipo === "professor" ? "presenca-professor" : "inscricao";
    const link = `${base}/${path}?turmaId=${turmaId}`;
    navigator.clipboard.writeText(link);
    alert(`Link de ${tipo === "professor" ? "presença" : "inscrição"} copiado!`);
  };

  if (!curso) return <p>Carregando curso...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px", color: "#1a2a4f" }}>{curso.nome}</h1>
      <hr style={{ border: "none", borderTop: "1px solid #e0e4e8", margin: "16px 0" }} />

      <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#1a2a4f" }}>
          {editandoId ? "Editar Turma" : "Nova Turma"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input placeholder="Nome da turma" value={nome} onChange={(e) => setNome(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
          <input type="number" placeholder="Vagas totais" value={vagasTotais || ""} onChange={(e) => setVagasTotais(Number(e.target.value))} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }} min="1" />
          <input type="number" placeholder="Total de aulas" value={totalAulas || ""} onChange={(e) => setTotalAulas(Number(e.target.value))} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }} min="0" />
          <input type="number" placeholder="Carga horária (horas)" value={cargaHoraria || ""} onChange={(e) => setCargaHoraria(Number(e.target.value))} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }} min="0" />
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}>
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
            <option value="encerrada">Encerrada</option>
          </select>
          {editandoId && (
            <div style={{ fontSize: 13, color: "#6b7a8f", display: "flex", alignItems: "center", gap: 12 }}>
              <span>Ocupadas: {vagasOcupadas}</span>
              <span>Disponíveis: {vagasTotais - vagasOcupadas}</span>
            </div>
          )}
        </div>
        <button onClick={salvarTurma} style={{ marginTop: 16, background: "#0070f3", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, cursor: "pointer" }}>
          {editandoId ? "Salvar alterações" : "Cadastrar turma"}
        </button>
      </div>

      <h3 style={{ fontSize: 16, margin: "0 0 12px", color: "#1a2a4f" }}>Turmas</h3>
      {turmas.map((t) => (
        <div key={t.id} style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <strong style={{ fontSize: 15, color: "#1a2a4f" }}>{t.nome}</strong>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#6b7a8f", marginTop: 4 }}>
                <span>Vagas: {t.vagasDisponiveis} / {t.vagasTotales}</span>
                <span>Aulas: {t.totalAulas}</span>
                <span>CH: {t.cargaHoraria}h</span>
                <span style={{ textTransform: "capitalize" }}>{t.status}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => editarTurma(t)} style={{ background: "#6c757d", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>Editar</button>
              <button onClick={() => copiarLink(t.id, "professor")} style={{ background: "#28a745", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>Link Professor</button>
              <button onClick={() => copiarLink(t.id, "inscricao")} style={{ background: "#17a2b8", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>Link Inscrição</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}