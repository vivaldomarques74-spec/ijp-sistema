import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeAgenda() {
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [form, setForm] = useState({ profissionalId: "", tipoId: "", data: "", horario: "" });
  const [recorrente, setRecorrente] = useState(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState<"livre" | "fixo">("livre");
  const [filtroProfissional, setFiltroProfissional] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroData, setFiltroData] = useState("");

  const carregarDados = async () => {
    const p = await getDocs(collection(db, "profissionais"));
    const t = await getDocs(collection(db, "tiposAtendimento"));
    const a = await getDocs(collection(db, "agendamentos"));
    setProfissionais(p.docs.map(d => ({ id: d.id, ...d.data() })));
    setTipos(t.docs.map(d => ({ id: d.id, ...d.data() })));
    const horariosData = a.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        profissionalId: data.profissionalId,
        tipoId: data.tipoId,
        data: data.data,
        horario: data.horario,
        status: data.status,
        tipoPaciente: data.tipoPaciente,
        alunoId: data.alunoId,
        pacienteInfo: data.pacienteInfo,
        groupId: data.groupId,
        recorrenteTipo: data.recorrenteTipo,
      };
    });
    setHorarios(horariosData);
  };

  useEffect(() => { carregarDados(); }, []);

  function gerarDatasRecorrentes(dataInicio: string, semanas = 10) {
    const datas = [];
    let current = new Date(dataInicio);
    for (let i = 0; i < semanas; i++) {
      datas.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7);
    }
    return datas;
  }

  const adicionarHorario = async () => {
    if (!form.profissionalId || !form.tipoId || !form.data || !form.horario) return alert("Preencha tudo");
    if (recorrente) {
      const datas = gerarDatasRecorrentes(form.data);
      const groupId = tipoRecorrencia === "fixo" ? `${form.profissionalId}_${form.tipoId}_${form.horario}_${Date.now()}` : null;
      for (const data of datas) {
        await addDoc(collection(db, "agendamentos"), {
          profissionalId: form.profissionalId,
          tipoId: form.tipoId,
          data,
          horario: form.horario,
          status: tipoRecorrencia === "fixo" ? "aguardandoVinculo" : "livre",
          tipoPaciente: "social",
          recorrente: true,
          recorrenteTipo: tipoRecorrencia,
          groupId,
          createdAt: new Date(),
        });
      }
      alert(`${datas.length} horários ${tipoRecorrencia === "fixo" ? "fixos (aguardando vínculo)" : "livres recorrentes"} criados.`);
    } else {
      await addDoc(collection(db, "agendamentos"), {
        profissionalId: form.profissionalId,
        tipoId: form.tipoId,
        data: form.data,
        horario: form.horario,
        status: "livre",
        tipoPaciente: "social",
        createdAt: new Date(),
      });
      alert("Horário único criado");
    }
    setForm({ profissionalId: "", tipoId: "", data: "", horario: "" });
    setRecorrente(false);
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
    await deleteDoc(doc(db, "agendamentos", horarioId));
    alert("Paciente particular agendado");
    carregarDados();
  };

  let horariosFiltrados = [...horarios];
  if (filtroProfissional) horariosFiltrados = horariosFiltrados.filter(h => h.profissionalId === filtroProfissional);
  if (filtroTipo) horariosFiltrados = horariosFiltrados.filter(h => h.tipoId === filtroTipo);
  if (filtroData) horariosFiltrados = horariosFiltrados.filter(h => h.data === filtroData);
  horariosFiltrados.sort((a, b) => {
    if (a.data === b.data) return a.horario.localeCompare(b.horario);
    return a.data.localeCompare(b.data);
  });

  return (
    <div>
      <h3 style={{ fontSize: 16, margin: "0 0 16px" }}>Criar horário</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={form.profissionalId} onChange={e => setForm({ ...form, profissionalId: e.target.value })} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}>
          <option value="">Profissional</option>
          {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>)}
        </select>
        <select value={form.tipoId} onChange={e => setForm({ ...form, tipoId: e.target.value })} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}>
          <option value="">Tipo</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        <input type="time" value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={recorrente} onChange={e => setRecorrente(e.target.checked)} />
          Repetir (10 semanas)
        </label>
        {recorrente && (
          <select value={tipoRecorrencia} onChange={e => setTipoRecorrencia(e.target.value as any)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}>
            <option value="livre">Slot livre</option>
            <option value="fixo">Vínculo fixo</option>
          </select>
        )}
        <button onClick={adicionarHorario} style={{ background: "#0070f3", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer" }}>Criar</button>
      </div>

      <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>Filtros</h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}>
          <option value="">Todos os profissionais</option>
          {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}>
          <option value="">Todos os tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        <button onClick={() => { setFiltroProfissional(""); setFiltroTipo(""); setFiltroData(""); }} style={{ background: "#6c757d", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>Limpar</button>
      </div>

      <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>Horários cadastrados</h3>
      {horariosFiltrados.length === 0 && <p>Nenhum horário encontrado.</p>}
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e0e4e8" }}>
              <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Data</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Horário</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Profissional</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Tipo</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Status</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Paciente</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {horariosFiltrados.map(h => {
              const prof = profissionais.find(p => p.id === h.profissionalId);
              const tipo = tipos.find(t => t.id === h.tipoId);
              const isLivre = (h.status === "livre" || h.status === "aguardandoVinculo") && !h.alunoId && !h.pacienteInfo;
              return (
                <tr key={h.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                  <td style={{ padding: 12 }}>{h.data}</td>
                  <td style={{ padding: 12 }}>{h.horario}</td>
                  <td style={{ padding: 12 }}>{prof?.nome || h.profissionalId}</td>
                  <td style={{ padding: 12 }}>{tipo?.nome || h.tipoId}</td>
                  <td style={{ padding: 12 }}>{h.status}</td>
                  <td style={{ padding: 12 }}>
                    {h.tipoPaciente === "particular" ? h.pacienteInfo?.nome : (h.alunoId ? "Paciente" : "Livre")}
                  </td>
                  <td style={{ padding: 12 }}>
                    {isLivre && (
                      <button onClick={() => agendarParticular(h.id, h.profissionalId, h.data, h.horario, h.tipoId)} style={{ background: "#28a745", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4, marginRight: 4, cursor: "pointer" }}>Particular</button>
                    )}
                    <button onClick={() => excluirHorario(h.id)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}>Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}