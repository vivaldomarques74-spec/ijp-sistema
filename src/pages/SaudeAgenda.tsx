import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

type Aba = "aberto" | "historico";

export default function SaudeAgenda() {
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [form, setForm] = useState({ profissionalId: "", tipoId: "", data: "", horario: "" });
  const [recorrente, setRecorrente] = useState(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState<"livre" | "fixo">("fixo");
  const [numSemanas, setNumSemanas] = useState(12);

  // Aba ativa
  const [aba, setAba] = useState<Aba>("aberto");

  // Filtros
  const [filtroProfissional, setFiltroProfissional] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroData, setFiltroData] = useState("");

  // Formulário recolhível
  const [mostrarForm, setMostrarForm] = useState(false);

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

  function gerarDatasRecorrentes(dataInicio: string, semanas: number): string[] {
    const datas: string[] = [];
    const [ano, mes, dia] = dataInicio.split("-").map(Number);
    const current = new Date(ano, mes - 1, dia);
    for (let i = 0; i < semanas; i++) {
      const anoStr = current.getFullYear();
      const mesStr = String(current.getMonth() + 1).padStart(2, "0");
      const diaStr = String(current.getDate()).padStart(2, "0");
      datas.push(`${anoStr}-${mesStr}-${diaStr}`);
      current.setDate(current.getDate() + 7);
    }
    return datas;
  }

  const adicionarHorario = async () => {
    if (!form.profissionalId || !form.tipoId || !form.data || !form.horario) {
      return alert("Preencha tudo");
    }

    try {
      if (recorrente) {
        const datas = gerarDatasRecorrentes(form.data, numSemanas);
        const groupId = tipoRecorrencia === "fixo"
          ? `${form.profissionalId}_${form.tipoId}_${form.horario}_${Date.now()}`
          : null;

        let count = 0;
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
          count++;
        }
        alert(`${count} horários ${tipoRecorrencia === "fixo" ? "fixos (agrupados)" : "livres (individuais)"} criados.`);
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
    } catch (error: any) {
      alert(`Erro ao criar horário: ${error.message}`);
    }

    setForm({ profissionalId: "", tipoId: "", data: "", horario: "" });
    setRecorrente(false);
    setMostrarForm(false);
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

  const hoje = new Date().toISOString().split("T")[0];

  // ✅ Aplica filtros comuns
  let lista = horarios.filter(h => {
    if (filtroProfissional && h.profissionalId !== filtroProfissional) return false;
    if (filtroTipo && h.tipoId !== filtroTipo) return false;
    if (filtroData && h.data !== filtroData) return false;
    return true;
  });

  // ✅ Separa em aberto vs histórico
  const listaAberto = lista.filter(h =>
    (h.status === "livre" || h.status === "aguardandoVinculo") && !h.alunoId && !h.pacienteInfo && h.data >= hoje
  );
  const listaHistorico = lista.filter(h =>
    h.alunoId || h.pacienteInfo || h.data < hoje ||
    h.status === "realizado" || h.status === "faltaJustificada" ||
    h.status === "faltaInjustificada" || h.status === "ocupado"
  );

  // ✅ Agrupa por groupId quando for recorrente fixo (aparece 1 linha por grupo)
  const agruparRecorrentes = (arr: any[]) => {
    const grupos = new Map<string, any[]>();
    const semGrupo: any[] = [];
    for (const h of arr) {
      if (h.groupId) {
        if (!grupos.has(h.groupId)) grupos.set(h.groupId, []);
        grupos.get(h.groupId)!.push(h);
      } else {
        semGrupo.push(h);
      }
    }
    const agrupados: any[] = [];
    for (const [groupId, items] of grupos.entries()) {
      items.sort((a, b) => a.data.localeCompare(b.data));
      const primeiro = items[0];
      agrupados.push({
        ...primeiro,
        _isGrupo: true,
        _groupId: groupId,
        _qtdSemanas: items.length,
        _todasDatas: items.map(i => i.data).join(", "),
      });
    }
    return [...agrupados, ...semGrupo];
  };

  const renderTabela = (arr: any[]) => {
    const arrAgrupado = agruparRecorrentes(arr);
    arrAgrupado.sort((a, b) => {
      if (a.data === b.data) return (a.horario || "").localeCompare(b.horario || "");
      return a.data.localeCompare(b.data);
    });

    if (arrAgrupado.length === 0) {
      return <p style={{ color: "#6b7a8f", padding: 16 }}>Nenhum horário {aba === "aberto" ? "em aberto" : "no histórico"}.</p>;
    }

    return (
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa" }}>
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
            {arrAgrupado.map(h => {
              const prof = profissionais.find(p => p.id === h.profissionalId);
              const tipo = tipos.find(t => t.id === h.tipoId);
              const isLivre = (h.status === "livre" || h.status === "aguardandoVinculo") && !h.alunoId && !h.pacienteInfo;

              return (
                <tr key={h.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                  <td style={{ padding: 12 }}>
                    {h.data}
                    {h._isGrupo && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: "#6f42c1", fontWeight: 600 }}>
                        🔗 {h._qtdSemanas} semanas
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>{h.horario}</td>
                  <td style={{ padding: 12 }}>{prof?.nome || h.profissionalId}</td>
                  <td style={{ padding: 12 }}>{tipo?.nome || h.tipoId}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 12,
                      background:
                        h.status === "realizado" ? "#d4edda" :
                        h.status === "faltaJustificada" ? "#fff3cd" :
                        h.status === "faltaInjustificada" ? "#f8d7da" :
                        h.status === "ocupado" ? "#cce5ff" :
                        h.status === "aguardandoVinculo" ? "#e2e3ff" : "#e9ecef",
                      color: "#333",
                    }}>
                      {h.status}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    {h.tipoPaciente === "particular"
                      ? h.pacienteInfo?.nome
                      : (h.alunoId ? "Paciente" : "Livre")}
                  </td>
                  <td style={{ padding: 12 }}>
                    {isLivre && (
                      <button onClick={() => agendarParticular(h.id, h.profissionalId, h.data, h.horario, h.tipoId)} style={{ background: "#28a745", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4, marginRight: 4, cursor: "pointer" }}>
                        Particular
                      </button>
                    )}
                    <button onClick={() => excluirHorario(h.id)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}>
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
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Agenda</h2>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          style={{
            background: mostrarForm ? "#6c757d" : "#0070f3",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {mostrarForm ? "Cancelar" : "+ Criar horário"}
        </button>
      </div>

      {/* Formulário recolhível */}
      {mostrarForm && (
        <div style={{ background: "#fff", border: "1px solid #e0e4e8", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" checked={recorrente} onChange={e => setRecorrente(e.target.checked)} />
              Repetir
            </label>
            {recorrente && (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Semanas:
                  <input type="number" min={1} max={52} value={numSemanas} onChange={e => setNumSemanas(parseInt(e.target.value) || 12)} style={{ width: 60, padding: 4, border: "1px solid #ccc", borderRadius: 4 }} />
                </label>
                <select value={tipoRecorrencia} onChange={e => setTipoRecorrencia(e.target.value as any)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}>
                  <option value="fixo">Vínculo fixo (agrupado)</option>
                  <option value="livre">Slot livre (individual)</option>
                </select>
              </>
            )}
            <button onClick={adicionarHorario} style={{ background: "#0070f3", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, cursor: "pointer", marginLeft: "auto" }}>
              Criar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: "#fff", border: "1px solid #e0e4e8", borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#6b7a8f" }}>Filtros:</span>
        <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)} style={{ padding: 6, border: "1px solid #ccc", borderRadius: 6 }}>
          <option value="">Todos os profissionais</option>
          {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ padding: 6, border: "1px solid #ccc", borderRadius: 6 }}>
          <option value="">Todos os tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} style={{ padding: 6, border: "1px solid #ccc", borderRadius: 6 }} />
        {(filtroProfissional || filtroTipo || filtroData) && (
          <button onClick={() => { setFiltroProfissional(""); setFiltroTipo(""); setFiltroData(""); }} style={{ background: "#6c757d", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: "2px solid #e0e4e8" }}>
        <button
          onClick={() => setAba("aberto")}
          style={{
            background: "transparent",
            border: "none",
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: aba === "aberto" ? 600 : 400,
            color: aba === "aberto" ? "#1a2a4f" : "#6b7a8f",
            borderBottom: aba === "aberto" ? "3px solid #0070f3" : "3px solid transparent",
            cursor: "pointer",
            marginBottom: -2,
          }}
        >
          🟢 Em Aberto ({listaAberto.length})
        </button>
        <button
          onClick={() => setAba("historico")}
          style={{
            background: "transparent",
            border: "none",
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: aba === "historico" ? 600 : 400,
            color: aba === "historico" ? "#1a2a4f" : "#6b7a8f",
            borderBottom: aba === "historico" ? "3px solid #0070f3" : "3px solid transparent",
            cursor: "pointer",
            marginBottom: -2,
          }}
        >
          📜 Histórico ({listaHistorico.length})
        </button>
      </div>

      {/* Conteúdo da aba */}
      {aba === "aberto" && renderTabela(listaAberto)}
      {aba === "historico" && renderTabela(listaHistorico)}
    </div>
  );
}