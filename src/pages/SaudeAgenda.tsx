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
          groupId: groupId,
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
      <h2>Criar horário</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
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
        <label>
          <input type="checkbox" checked={recorrente} onChange={e => setRecorrente(e.target.checked)} />
          Repetir semanalmente (10 semanas)
        </label>
        {recorrente && (
          <select value={tipoRecorrencia} onChange={e => setTipoRecorrencia(e.target.value as any)}>
            <option value="livre">Slot livre (pacientes diferentes)</option>
            <option value="fixo">Vínculo fixo (mesmo paciente todas as semanas)</option>
          </select>
        )}
        <button onClick={adicionarHorario}>Adicionar horários</button>
      </div>

      <hr />
      <h2>Filtros</h2>
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)}>
          <option value="">Todos os profissionais</option>
          {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} />
        <button onClick={() => { setFiltroProfissional(""); setFiltroTipo(""); setFiltroData(""); }}>Limpar filtros</button>
      </div>

      <h2>Horários cadastrados</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Data</th><th>Horário</th><th>Profissional</th><th>Tipo</th><th>Status</th><th>Paciente</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {horariosFiltrados.map(h => {
              const prof = profissionais.find(p => p.id === h.profissionalId);
              const tipo = tipos.find(t => t.id === h.tipoId);
              const isLivre = (h.status === "livre" || h.status === "aguardandoVinculo") && !h.alunoId && !h.pacienteInfo;
              return (
                <tr key={h.id}>
                  <td style={{ padding: 8 }}>{h.data}</td>
                  <td style={{ padding: 8 }}>{h.horario}</td>
                  <td style={{ padding: 8 }}>{prof?.nome || h.profissionalId}</td>
                  <td style={{ padding: 8 }}>{tipo?.nome || h.tipoId}</td>
                  <td style={{ padding: 8 }}>{h.status}</td>
                  <td style={{ padding: 8 }}>
                    {h.tipoPaciente === "particular" ? h.pacienteInfo?.nome : (h.alunoId ? "Paciente social" : "Livre")}
                  </td>
                  <td style={{ padding: 8 }}>
                    {isLivre && (
                      <button onClick={() => agendarParticular(h.id, h.profissionalId, h.data, h.horario, h.tipoId)}>Particular</button>
                    )}
                    <button onClick={() => excluirHorario(h.id)}>Excluir</button>
                  </td>
                </tr>
              );
            })}
            {horariosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhum horário cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}