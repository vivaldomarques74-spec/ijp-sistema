import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

interface Agendamento {
  id: string;
  profissionalId: string;
  tipoId: string;
  data: string;
  horario: string;
  status: string;
  alunoId: string;
  pacienteInfo?: any;
  [key: string]: any;
}

interface Paciente {
  id: string;
  alunoId: string;
  nome: string;
  matricula: string;
  servicoNome: string;
  tipoId: string;
  data: string;
  horario: string;
  profissionalId: string;
  profissionalNome: string;
  status: string;
}

export default function SaudePacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [filtroProfissional, setFiltroProfissional] = useState("");
  const [filtroServico, setFiltroServico] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  const [modalReagendar, setModalReagendar] = useState<any>(null);
  const [horariosLivres, setHorariosLivres] = useState<Agendamento[]>([]);
  const [novoProfissionalId, setNovoProfissionalId] = useState("");
  const [novoHorarioId, setNovoHorarioId] = useState("");
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);

  useEffect(() => {
    const carregarAux = async () => {
      const profSnap = await getDocs(collection(db, "profissionais"));
      setProfissionais(profSnap.docs.map(d => ({ id: d.id, nome: d.data().nome, tipo: d.data().tipo })));
      const servSnap = await getDocs(collection(db, "tiposAtendimento"));
      setServicos(servSnap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    carregarAux();
  }, []);

  const carregarPacientes = async () => {
    setCarregando(true);
    try {
      const snap = await getDocs(collection(db, "agendamentos"));
      const agendamentos: Agendamento[] = [];

      const hoje = new Date().toISOString().split("T")[0];
      const semanaAtras = new Date();
      semanaAtras.setDate(semanaAtras.getDate() - 7);
      const semanaAtrasStr = semanaAtras.toISOString().split("T")[0];

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.alunoId) {
          let incluir = true;
          if (filtroPeriodo === "hoje" && data.data !== hoje) incluir = false;
          if (filtroPeriodo === "semana" && data.data < semanaAtrasStr) incluir = false;
          if (incluir) {
            agendamentos.push({
              id: docSnap.id,
              ...data,
            } as Agendamento);
          }
        }
      }

      let filtrados = agendamentos;
      if (filtroProfissional) {
        filtrados = filtrados.filter(a => a.profissionalId === filtroProfissional);
      }
      if (filtroServico) {
        filtrados = filtrados.filter(a => a.tipoId === filtroServico);
      }

      filtrados.sort((a, b) => {
        if (a.data === b.data) return a.horario.localeCompare(b.horario);
        return b.data.localeCompare(a.data);
      });

      const lista: Paciente[] = [];
      for (const ag of filtrados) {
        const alunoSnap = await getDoc(doc(db, "alunos", ag.alunoId));
        if (alunoSnap.exists()) {
          const aluno = alunoSnap.data();
          const prof = profissionais.find(p => p.id === ag.profissionalId);
          const serv = servicos.find(s => s.id === ag.tipoId);
          lista.push({
            id: ag.id,
            alunoId: ag.alunoId,
            nome: aluno.nomeCompleto,
            matricula: aluno.matricula || "",
            servicoNome: serv?.nome || ag.tipoId,
            tipoId: ag.tipoId,
            data: ag.data || "",
            horario: ag.horario || "",
            profissionalId: ag.profissionalId || "",
            profissionalNome: prof?.nome || "Desconhecido",
            status: ag.status || "",
          });
        }
      }
      setPacientes(lista);
    } catch (error) {
      console.error(error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPacientes();
  }, [filtroProfissional, filtroServico, filtroPeriodo]);

  const abrirModalReagendar = async (paciente: Paciente, profissionalLogado: any) => {
    setModalReagendar({ paciente, profissionalLogado });
    setNovoProfissionalId(paciente.profissionalId);
    setNovoHorarioId("");
    setHorariosLivres([]);
  };

  const buscarHorarios = async () => {
    if (!novoProfissionalId) return alert("Selecione um profissional.");
    setBuscandoHorarios(true);
    try {
      const hoje = new Date().toISOString().split("T")[0];
      const snap = await getDocs(collection(db, "agendamentos"));
      const horarios: Agendamento[] = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.profissionalId === novoProfissionalId && data.data >= hoje &&
            (data.status === "livre" || data.status === "aguardandoVinculo") &&
            !data.alunoId && !data.pacienteInfo) {
          horarios.push({
            id: docSnap.id,
            ...data,
          } as Agendamento);
        }
      }
      horarios.sort((a, b) => {
        if (a.data === b.data) return a.horario.localeCompare(b.horario);
        return a.data.localeCompare(b.data);
      });
      setHorariosLivres(horarios);
      if (horarios.length === 0) alert("Nenhum horário disponível para este profissional.");
    } catch (error: any) {
      alert(`Erro ao buscar horários: ${error.message}`);
    } finally {
      setBuscandoHorarios(false);
    }
  };

  const handleReagendar = async () => {
    if (!novoHorarioId) return alert("Selecione um horário.");
    if (!modalReagendar) return;

    const { paciente, profissionalLogado } = modalReagendar;
    if (profissionalLogado?.tipo !== "supervisor" && novoProfissionalId !== paciente.profissionalId) {
      alert("Apenas supervisores podem reagendar para outro profissional.");
      return;
    }

    try {
      await updateDoc(doc(db, "agendamentos", paciente.id), {
        alunoId: null,
        status: "livre",
      });

      await updateDoc(doc(db, "agendamentos", novoHorarioId), {
        alunoId: paciente.alunoId,
        status: "ocupado",
        profissionalId: novoProfissionalId,
        tipoId: paciente.tipoId,
      });

      alert("Paciente reagendado com sucesso!");
      setModalReagendar(null);
      carregarPacientes();
    } catch (error: any) {
      alert(`Erro ao reagendar: ${error.message}`);
    }
  };

  const styleSelect = { padding: 8, border: "1px solid #ccc", borderRadius: 8, background: "#fff" };
  const styleButton = (bg: string, color = "#fff") => ({
    padding: "4px 12px",
    border: "none",
    borderRadius: 4,
    background: bg,
    color,
    cursor: "pointer",
  });

  return (
    <div>
      <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>Pacientes (todos os agendamentos)</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} style={styleSelect}>
          <option value="todos">Todos os períodos</option>
          <option value="hoje">Hoje</option>
          <option value="semana">Última semana</option>
        </select>
        <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)} style={styleSelect}>
          <option value="">Todos os profissionais</option>
          {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroServico} onChange={e => setFiltroServico(e.target.value)} style={styleSelect}>
          <option value="">Todos os serviços</option>
          {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <button onClick={carregarPacientes} style={styleButton("#0070f3")}>Buscar</button>
      </div>

      {carregando && <p>Carregando...</p>}
      {!carregando && pacientes.length === 0 && <p>Nenhum agendamento encontrado.</p>}
      {pacientes.length > 0 && (
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e0e4e8" }}>
                <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Nome</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Matrícula</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Serviço</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Data/Horário</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Profissional</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Status</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                  <td style={{ padding: 12 }}>{p.nome}</td>
                  <td style={{ padding: 12 }}>{p.matricula}</td>
                  <td style={{ padding: 12 }}>{p.servicoNome}</td>
                  <td style={{ padding: 12 }}>{p.data} {p.horario}</td>
                  <td style={{ padding: 12 }}>{p.profissionalNome}</td>
                  <td style={{ padding: 12 }}>{p.status}</td>
                  <td style={{ padding: 12 }}>
                    {/* 🔥 APENAS REAGENDAR - SEM BOTÃO FICHA */}
                    <button
                      onClick={() => {
                        const profLogado = profissionais.find(prof => prof.id === p.profissionalId) || profissionais[0] || { tipo: "profissional" };
                        abrirModalReagendar(p, profLogado);
                      }}
                      style={{ ...styleButton("#ffc107"), color: "#000" }}
                    >
                      Reagendar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de reagendamento */}
      {modalReagendar && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 500, width: "90%" }}>
            <h3>Reagendar Paciente</h3>
            <p><strong>{modalReagendar.paciente.nome}</strong> - {modalReagendar.paciente.servicoNome}</p>
            <div style={{ marginBottom: 12 }}>
              <label>Profissional: </label>
              <select
                value={novoProfissionalId}
                onChange={e => {
                  setNovoProfissionalId(e.target.value);
                  setHorariosLivres([]);
                  setNovoHorarioId("");
                }}
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
              >
                <option value="">Selecione</option>
                {profissionais.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.tipo === "supervisor" ? "👑" : p.tipo === "estagiario" ? "📚" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={buscarHorarios} disabled={buscandoHorarios || !novoProfissionalId} style={{ ...styleButton("#0070f3"), width: "100%" }}>
                {buscandoHorarios ? "Buscando..." : "🔍 Buscar horários disponíveis"}
              </button>
            </div>
            {horariosLivres.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label>Horário: </label>
                <select
                  value={novoHorarioId}
                  onChange={e => setNovoHorarioId(e.target.value)}
                  style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
                >
                  <option value="">Selecione</option>
                  {horariosLivres.map(h => (
                    <option key={h.id} value={h.id}>{h.data} {h.horario}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleReagendar} disabled={!novoHorarioId} style={{ padding: "8px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                Reagendar
              </button>
              <button onClick={() => setModalReagendar(null)} style={{ padding: "8px 20px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}