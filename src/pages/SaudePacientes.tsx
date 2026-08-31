import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

interface AgendamentoData {
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
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [modalReagendar, setModalReagendar] = useState<Paciente | null>(null);
  const [horariosLivres, setHorariosLivres] = useState<AgendamentoData[]>([]);
  const [novoProfissionalId, setNovoProfissionalId] = useState("");
  const [novoHorarioId, setNovoHorarioId] = useState("");

  useEffect(() => {
    const carregarAux = async () => {
      const profSnap = await getDocs(collection(db, "profissionais"));
      setProfissionais(profSnap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
      const servSnap = await getDocs(collection(db, "tiposAtendimento"));
      setServicos(servSnap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    carregarAux();
  }, []);

  const carregarPacientes = async () => {
    setCarregando(true);
    try {
      const snap = await getDocs(collection(db, "agendamentos"));
      const hoje = new Date().toISOString().split("T")[0];
      const agendamentos: (AgendamentoData & { id: string })[] = [];

      for (const docSnap of snap.docs) {
        const data = docSnap.data() as AgendamentoData;
        if (data.status === "ocupado" && data.alunoId && data.data >= hoje) {
          agendamentos.push({ id: docSnap.id, ...data });
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
        return a.data.localeCompare(b.data);
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
            nome: aluno.nomeCompleto || "",
            matricula: aluno.matricula || "",
            servicoNome: serv?.nome || ag.tipoId,
            tipoId: ag.tipoId,
            data: ag.data,
            horario: ag.horario,
            profissionalId: ag.profissionalId,
            profissionalNome: prof?.nome || "Desconhecido",
            status: ag.status,
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
  }, [filtroProfissional, filtroServico]);

  const abrirModalReagendar = async (paciente: Paciente) => {
    setModalReagendar(paciente);
    setNovoProfissionalId(paciente.profissionalId);
    setNovoHorarioId("");
    await buscarHorariosLivres(paciente.profissionalId);
  };

  const buscarHorariosLivres = async (profissionalId: string) => {
    if (!profissionalId) return;
    const hoje = new Date().toISOString().split("T")[0];
    const snap = await getDocs(collection(db, "agendamentos"));
    const horarios: (AgendamentoData & { id: string })[] = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data() as AgendamentoData;
      if (data.profissionalId === profissionalId && data.data >= hoje && 
          (data.status === "livre" || data.status === "aguardandoVinculo") && 
          !data.alunoId && !data.pacienteInfo) {
        horarios.push({ id: docSnap.id, ...data });
      }
    }
    horarios.sort((a, b) => {
      if (a.data === b.data) return a.horario.localeCompare(b.horario);
      return a.data.localeCompare(b.data);
    });
    setHorariosLivres(horarios);
  };

  const handleReagendar = async () => {
    if (!novoHorarioId) return alert("Selecione um horário.");
    if (!modalReagendar) return;

    try {
      // Remover paciente do agendamento antigo
      await updateDoc(doc(db, "agendamentos", modalReagendar.id), {
        alunoId: null,
        status: "livre",
      });

      // Adicionar ao novo agendamento
      await updateDoc(doc(db, "agendamentos", novoHorarioId), {
        alunoId: modalReagendar.alunoId,
        status: "ocupado",
        profissionalId: novoProfissionalId,
        tipoId: modalReagendar.tipoId,
      });

      alert("Paciente reagendado com sucesso!");
      setModalReagendar(null);
      carregarPacientes();
    } catch (error: any) {
      alert(`Erro ao reagendar: ${error.message}`);
    }
  };

  const styleSelect = { padding: 8, border: "1px solid #ccc", borderRadius: 8, background: "#fff" };
  const styleButton = { padding: "4px 12px", border: "none", borderRadius: 4, background: "#0070f3", color: "#fff", cursor: "pointer" };

  return (
    <div>
      <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>Pacientes em atendimento</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)} style={styleSelect}>
          <option value="">Todos os profissionais</option>
          {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroServico} onChange={e => setFiltroServico(e.target.value)} style={styleSelect}>
          <option value="">Todos os serviços</option>
          {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <button onClick={carregarPacientes} style={styleButton}>Buscar</button>
      </div>

      {carregando && <p>Carregando...</p>}
      {!carregando && pacientes.length === 0 && <p>Nenhum paciente encontrado.</p>}
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
                  <td style={{ padding: 12 }}>
                    <button
                      onClick={() => window.open(`/profissional/${p.profissionalId}/paciente/${p.alunoId}`, "_blank")}
                      style={{ ...styleButton, marginRight: 4 }}
                    >
                      Ficha
                    </button>
                    <button
                      onClick={() => abrirModalReagendar(p)}
                      style={{ ...styleButton, background: "#ffc107", color: "#000" }}
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

      {modalReagendar && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 500, width: "90%" }}>
            <h3>Reagendar Paciente</h3>
            <p><strong>{modalReagendar.nome}</strong> - {modalReagendar.servicoNome}</p>
            <div style={{ marginBottom: 12 }}>
              <label>Profissional: </label>
              <select
                value={novoProfissionalId}
                onChange={e => { setNovoProfissionalId(e.target.value); buscarHorariosLivres(e.target.value); }}
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
              >
                <option value="">Selecione</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Horário: </label>
              <select
                value={novoHorarioId}
                onChange={e => setNovoHorarioId(e.target.value)}
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
              >
                <option value="">Selecione</option>
                {horariosLivres.map(h => <option key={h.id} value={h.id}>{h.data} {h.horario}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleReagendar} style={{ padding: "8px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
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