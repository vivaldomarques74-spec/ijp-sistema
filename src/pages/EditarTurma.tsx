import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function EditarTurma() {
  const { id: cursoId, turmaId } = useParams<{ id: string; turmaId: string }>();
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alunos, setAlunos] = useState<string[]>([]);
  const [camposExtras, setCamposExtras] = useState<Record<string, any>>({});

  const [form, setForm] = useState({
    nome: "",
    vagasTotais: 0,
    cargaHoraria: 0,
    totalAulas: 0,
    status: "ativa",
    dataInicio: "",
    dataFim: "",
    modalidade: "presencial",
    diasSemana: [] as string[],
    horario: "",
    descricao: "",
  });

  useEffect(() => {
    carregar();
  }, [cursoId, turmaId]);

  const carregar = async () => {
    if (!cursoId || !turmaId) return;
    setCarregando(true);
    try {
      const snap = await getDoc(doc(db, "cursos", cursoId, "turmas", turmaId));
      if (!snap.exists()) {
        alert("Turma não encontrada");
        navigate(`/cursos/${cursoId}`);
        return;
      }
      const data = snap.data();
      const alunosArr = data.alunos || [];
      setAlunos(alunosArr);

      const capacidade =
        data.vagasTotais ||
        data.totalVagas ||
        data.vagas ||
        data.capacidade ||
        (data.vagasDisponiveis || 0) + alunosArr.length;

      // Identifica campos "extras" que existem no banco mas não são conhecidos do form
      const camposConhecidos = [
        "nome", "vagasTotais", "totalVagas", "vagas", "capacidade", "vagasDisponiveis",
        "cargaHoraria", "totalAulas", "status", "dataInicio", "dataFim", "alunos",
        "modalidade", "diasSemana", "horario", "descricao",
        "createdAt", "updatedAt",
      ];
      const extras: Record<string, any> = {};
      Object.keys(data).forEach(k => {
        if (!camposConhecidos.includes(k)) extras[k] = data[k];
      });
      setCamposExtras(extras);

      setForm({
        nome: data.nome || "",
        vagasTotais: capacidade,
        cargaHoraria: data.cargaHoraria || 0,
        totalAulas: data.totalAulas || 0,
        status: data.status || "ativa",
        dataInicio: data.dataInicio?.toDate?.()?.toISOString?.().split("T")[0] || "",
        dataFim: data.dataFim?.toDate?.()?.toISOString?.().split("T")[0] || "",
        modalidade: data.modalidade || "presencial",
        diasSemana: data.diasSemana || [],
        horario: data.horario || "",
        descricao: data.descricao || "",
      });
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const salvar = async () => {
    if (!cursoId || !turmaId) return;
    if (!form.nome.trim()) return alert("Informe o nome da turma");
    if (form.vagasTotais < alunos.length) {
      return alert(`Capacidade (${form.vagasTotais}) não pode ser menor que alunos matriculados (${alunos.length})`);
    }

    setSalvando(true);
    try {
      // Preserva todos os campos extras que existiam
      const updateData: any = {
        ...camposExtras,
        nome: form.nome,
        vagasTotais: form.vagasTotais,
        cargaHoraria: form.cargaHoraria,
        totalAulas: form.totalAulas,
        status: form.status,
        modalidade: form.modalidade,
        diasSemana: form.diasSemana,
        horario: form.horario,
        descricao: form.descricao,
        updatedAt: new Date(),
      };

      if (form.dataInicio) updateData.dataInicio = new Date(form.dataInicio);
      if (form.dataFim) updateData.dataFim = new Date(form.dataFim);

      await updateDoc(doc(db, "cursos", cursoId, "turmas", turmaId), updateData);
      alert("Turma atualizada!");
      navigate(`/cursos/${cursoId}`);
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleChange = (campo: string, valor: any) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
  };

  const toggleDia = (dia: string) => {
    setForm(prev => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter(d => d !== dia)
        : [...prev.diasSemana, dia],
    }));
  };

  const sInput = { width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginBottom: 12 };
  const dias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  if (carregando) return <div style={{ padding: 20 }}>Carregando...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ color: "#1a2a4f", margin: 0 }}>Editar Turma</h1>
        <button onClick={() => navigate(`/cursos/${cursoId}`)} style={{ padding: "8px 16px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          ← Voltar
        </button>
      </div>

      <div style={{ background: "#e8f0ff", border: "1px solid #0070f3", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <p style={{ margin: 0, color: "#1a2a4f", fontSize: 14 }}>
          <strong>Alunos matriculados:</strong> {alunos.length} &nbsp;•&nbsp;
          <strong>Capacidade:</strong> {form.vagasTotais} &nbsp;•&nbsp;
          <strong style={{ color: (form.vagasTotais - alunos.length) > 0 ? "#28a745" : "#dc3545" }}>
            {Math.max(0, form.vagasTotais - alunos.length)} vagas disponíveis
          </strong>
        </p>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Nome da turma *</label>
          <input type="text" value={form.nome} onChange={e => handleChange("nome", e.target.value)} style={sInput} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Capacidade total (vagas) *</label>
            <input
              type="number"
              min={alunos.length}
              value={form.vagasTotais}
              onChange={e => handleChange("vagasTotais", parseInt(e.target.value) || 0)}
              style={sInput}
            />
            <p style={{ fontSize: 12, color: "#6b7a8f", margin: 0 }}>Mínimo: {alunos.length}</p>
          </div>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Total de aulas</label>
            <input
              type="number"
              min={0}
              value={form.totalAulas}
              onChange={e => handleChange("totalAulas", parseInt(e.target.value) || 0)}
              style={sInput}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Carga horária (horas)</label>
            <input
              type="number"
              min={0}
              value={form.cargaHoraria}
              onChange={e => handleChange("cargaHoraria", parseInt(e.target.value) || 0)}
              style={sInput}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Status</label>
            <select value={form.status} onChange={e => handleChange("status", e.target.value)} style={sInput}>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
              <option value="encerrada">Encerrada</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Modalidade</label>
            <select value={form.modalidade} onChange={e => handleChange("modalidade", e.target.value)} style={sInput}>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Horário</label>
            <input
              type="text"
              value={form.horario}
              onChange={e => handleChange("horario", e.target.value)}
              placeholder="Ex: 14:00 - 16:00"
              style={sInput}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Dias da semana</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dias.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDia(d)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: form.diasSemana.includes(d) ? "2px solid #0070f3" : "1px solid #ccc",
                  background: form.diasSemana.includes(d) ? "#e6f0ff" : "#fff",
                  color: "#1a2a4f",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Data de início</label>
            <input type="date" value={form.dataInicio} onChange={e => handleChange("dataInicio", e.target.value)} style={sInput} />
          </div>
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Data de fim</label>
            <input type="date" value={form.dataFim} onChange={e => handleChange("dataFim", e.target.value)} style={sInput} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Descrição / Observações</label>
          <textarea
            value={form.descricao}
            onChange={e => handleChange("descricao", e.target.value)}
            style={{ ...sInput, minHeight: 80 }}
            placeholder="Informações adicionais sobre a turma..."
          />
        </div>

        {Object.keys(camposExtras).length > 0 && (
          <div style={{ background: "#fff8e1", border: "1px solid #ffc107", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#856404" }}>
              ℹ️ Esta turma tem {Object.keys(camposExtras).length} campo(s) extra(s) que serão preservados: {Object.keys(camposExtras).join(", ")}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button
            onClick={salvar}
            disabled={salvando}
            style={{
              flex: 1,
              padding: "12px 20px",
              background: salvando ? "#999" : "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: salvando ? "wait" : "pointer",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {salvando ? "Salvando..." : "💾 Salvar Alterações"}
          </button>
          <button
            onClick={() => navigate(`/cursos/${cursoId}`)}
            style={{
              padding: "12px 20px",
              background: "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}