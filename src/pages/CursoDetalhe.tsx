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

type StatusTurma = "ativa" | "inativa" | "encerrada";

interface Turma {
  id: string;
  nome: string;
  vagasTotales: number;
  vagasDisponiveis: number;
  totalAulas: number;
  cargaHoraria: number;
  dataInicio: Timestamp;
  dataFim: Timestamp;
  status: StatusTurma;
}

export default function CursoDetalhe() {
  const { id: cursoIdParam } = useParams<{ id: string }>();
  const cursoId = cursoIdParam!;
  if (!cursoId) throw new Error("ID do curso não informado");

  const [curso, setCurso] = useState<any>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [form, setForm] = useState({
    nome: "",
    vagasTotais: 0,
    totalAulas: 0,
    cargaHoraria: 0,
    dataInicio: "",
    dataFim: "",
    status: "ativa" as StatusTurma,
  });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [vagasOcupadas, setVagasOcupadas] = useState(0);

  useEffect(() => {
    carregarDados();
  }, [cursoId]);

  async function carregarDados() {
    const cursoSnap = await getDoc(doc(db, "cursos", cursoId));
    if (cursoSnap.exists()) setCurso(cursoSnap.data());
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
  }

  const limparFormulario = () => {
    setForm({ nome: "", vagasTotais: 0, totalAulas: 0, cargaHoraria: 0, dataInicio: "", dataFim: "", status: "ativa" });
    setEditandoId(null);
    setVagasOcupadas(0);
  };

  const salvarTurma = async () => {
    if (!form.nome.trim() || !form.vagasTotais || !form.dataInicio || !form.dataFim) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }
    const ref = collection(db, "cursos", cursoId, "turmas");
    const dados = {
      nome: form.nome.trim(),
      vagasTotales: Number(form.vagasTotais),
      vagasDisponiveis: Number(form.vagasTotais) - vagasOcupadas,
      totalAulas: Number(form.totalAulas) || 0,
      cargaHoraria: Number(form.cargaHoraria) || 0,
      dataInicio: Timestamp.fromDate(new Date(form.dataInicio)),
      dataFim: Timestamp.fromDate(new Date(form.dataFim)),
      status: form.status,
    };
    try {
      if (editandoId) {
        await updateDoc(doc(ref, editandoId), dados);
      } else {
        await addDoc(ref, { ...dados, createdAt: Timestamp.now() });
      }
      limparFormulario();
      await carregarDados();
      alert("Turma salva com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar turma.");
    }
  };

  const editarTurma = (t: Turma) => {
    setEditandoId(t.id);
    setForm({
      nome: t.nome,
      vagasTotais: t.vagasTotales,
      totalAulas: t.totalAulas,
      cargaHoraria: t.cargaHoraria,
      dataInicio: t.dataInicio.toDate().toISOString().split("T")[0],
      dataFim: t.dataFim.toDate().toISOString().split("T")[0],
      status: t.status,
    });
    setVagasOcupadas(t.vagasTotales - t.vagasDisponiveis);
  };

  const copiarLink = (turmaId: string, tipo: "professor" | "inscricao") => {
    const base = window.location.origin;
    const path = tipo === "professor" ? "presenca-professor" : "inscricao";
    const link = `${base}/${path}?turmaId=${turmaId}`;
    navigator.clipboard.writeText(link);
    alert(`Link de ${tipo === "professor" ? "presença" : "inscrição"} copiado!`);
  };

  if (!curso) return <p>Carregando curso...</p>;

  const inputStyle = { padding: 8, border: "1px solid #ccc", borderRadius: 8, width: "100%" };

  return (
    <div>
      <h2 style={{ fontSize: 20, margin: "0 0 4px", color: "#1a2a4f" }}>{curso.nome}</h2>
      <hr style={{ border: "none", borderTop: "1px solid #e0e4e8", margin: "16px 0" }} />

      <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#1a2a4f" }}>
          {editandoId ? "Editar Turma" : "Nova Turma"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input placeholder="Nome da turma" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
          <input type="number" placeholder="Vagas totais" value={form.vagasTotais || ""} onChange={(e) => setForm({ ...form, vagasTotais: Number(e.target.value) })} style={inputStyle} min="1" />
          <input type="number" placeholder="Total de aulas" value={form.totalAulas || ""} onChange={(e) => setForm({ ...form, totalAulas: Number(e.target.value) })} style={inputStyle} min="0" />
          <input type="number" placeholder="Carga horária (horas)" value={form.cargaHoraria || ""} onChange={(e) => setForm({ ...form, cargaHoraria: Number(e.target.value) })} style={inputStyle} min="0" />
          <input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} style={inputStyle} />
          <input type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} style={inputStyle} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusTurma })} style={inputStyle}>
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
            <option value="encerrada">Encerrada</option>
          </select>
          {editandoId && (
            <div style={{ fontSize: 13, color: "#6b7a8f", display: "flex", alignItems: "center", gap: 12 }}>
              <span>Ocupadas: {vagasOcupadas}</span>
              <span>Disponíveis: {form.vagasTotais - vagasOcupadas}</span>
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