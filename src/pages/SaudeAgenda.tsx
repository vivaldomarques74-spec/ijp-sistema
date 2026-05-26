import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeAgenda() {
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [form, setForm] = useState({ profissionalId: "", tipoId: "", data: "", horario: "" });

  const carregarDados = async () => {
    const p = await getDocs(collection(db, "profissionais"));
    const t = await getDocs(collection(db, "tiposAtendimento"));
    const a = await getDocs(collection(db, "agendamentos"));
    setProfissionais(p.docs.map(d => ({ id: d.id, ...d.data() })));
    setTipos(t.docs.map(d => ({ id: d.id, ...d.data() })));
    setHorarios(a.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { carregarDados(); }, []);

  const adicionarHorario = async () => {
    if (!form.profissionalId || !form.tipoId || !form.data || !form.horario) return alert("Preencha tudo");
    await addDoc(collection(db, "agendamentos"), {
      ...form, status: "agendado", tipoPaciente: "social", createdAt: new Date(),
    });
    alert("Horário livre criado");
    setForm({ profissionalId: "", tipoId: "", data: "", horario: "" });
    carregarDados();
  };

  const excluirHorario = async (id: string) => {
    if (window.confirm("Excluir este horário?")) {
      await deleteDoc(doc(db, "agendamentos", id));
      carregarDados();
    }
  };

  const agendarParticular = async (horarioId: string, profissionalId: string, data: string, horario: string, tipoId: string) => {
    const nome = prompt("Nome do paciente particular:");
    if (!nome) return;
    const telefone = prompt("Telefone (opcional):");
    await addDoc(collection(db, "agendamentos"), {
      profissionalId,
      tipoId,
      data,
      horario,
      status: "ocupado",
      tipoPaciente: "particular",
      pacienteInfo: { nome, telefone: telefone || "" },
      createdAt: new Date(),
    });
    // Remove o horário livre original
    await deleteDoc(doc(db, "agendamentos", horarioId));
    alert("Paciente particular agendado");
    carregarDados();
  };

  return (
    <div>
      <h2>Criar horário livre</h2>
      <select value={form.profissionalId} onChange={e => setForm({ ...form, profissionalId: e.target.value })}>
        <option value="">Profissional</option>
        {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>)}
      </select>
      <select value={form.tipoId} onChange={e => setForm({ ...form, tipoId: e.target.value })}>
        <option value="">Tipo de atendimento</option>
        {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>
      <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
      <input type="time" value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} />
      <button onClick={adicionarHorario}>Adicionar horário livre</button>

      <hr />
      <h2>Horários cadastrados</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Data</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Horário</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Profissional</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Tipo</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Status</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Paciente</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {horarios.map(h => {
            const prof = profissionais.find(p => p.id === h.profissionalId);
            const tipo = tipos.find(t => t.id === h.tipoId);
            const isLivre = h.status === "agendado" && !h.alunoId && !h.pacienteInfo;
            return (
              <tr key={h.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{h.data}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{h.horario}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{prof?.nome || h.profissionalId}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{tipo?.nome || h.tipoId}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{h.status}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {h.tipoPaciente === "particular" ? h.pacienteInfo?.nome : (h.alunoId ? "Paciente social" : "Livre")}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {isLivre && (
                    <button
                      onClick={() => agendarParticular(h.id, h.profissionalId, h.data, h.horario, h.tipoId)}
                      style={{ background: "#28a745", marginRight: 8, color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4 }}
                    >
                      Particular
                    </button>
                  )}
                  <button onClick={() => excluirHorario(h.id)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4 }}>
                    Excluir
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}