import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, updateDoc, getDoc, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

interface Agendamento {
  id: string;
  profissionalId: string;
  tipoId: string;
  data: string;
  horario: string;
  status: string;
  tipoPaciente: string;
  alunoId?: string;
  pacienteInfo?: { nome: string; telefone: string };
  nomeAluno?: string;
  telefoneAluno?: string;
  idadeAluno?: number;
  groupId?: string;
  nomeProfissional?: string;
  recorrenteTipo?: string;
}

interface Profissional {
  id: string;
  nome: string;
  codigo: string;
  tipo: string;
  especialidade?: string;
  supervisorId?: string;
  [key: string]: any;
}

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  if (isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

export default function ProfissionalAgenda() {
  const { codigo } = useParams();
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [agenda, setAgenda] = useState<Agendamento[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState(getLocalDate());
  const [profissionalId, setProfissionalId] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [supervisionadosIds, setSupervisionadosIds] = useState<string[]>([]);
  const [todosProfissionais, setTodosProfissionais] = useState<any[]>([]);
  const [modalTrocarProf, setModalTrocarProf] = useState<Agendamento | null>(null);
  const [novoProfId, setNovoProfId] = useState("");

  // 🔥 Remover paciente
  const [modalRemover, setModalRemover] = useState<Agendamento | null>(null);
  const [escopo, setEscopo] = useState<"soSemana" | "todasSemanas">("soSemana");

  // 🔥 Filtro do diretor
  const [filtroVisualizarProfissionalId, setFiltroVisualizarProfissionalId] = useState("");
  const [buscaPaciente, setBuscaPaciente] = useState("");

  const tipoLogado = localStorage.getItem("profissionalTipo") || "";
  const podeMudarProfissional = tipoLogado === "supervisor" || tipoLogado === "diretor";
  const ehDiretor = tipoLogado === "diretor";

  useEffect(() => {
    if (localStorage.getItem("profissionalAutenticado") !== "true") {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/acesso-profissional";
    }
  }, []);

  useEffect(() => {
    const carregarProfissional = async () => {
      const q = query(collection(db, "profissionais"), where("codigo", "==", codigo));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docProf = snap.docs[0];
        const profData = { id: docProf.id, ...docProf.data() } as Profissional;
        setProfissional(profData);
        setProfissionalId(docProf.id);

        if (profData.tipo === "supervisor") {
          // Supervisor filtra por mesma especialidade
          const todosSnap = await getDocs(collection(db, "profissionais"));
          const ids: string[] = [];
          todosSnap.forEach(est => {
            const estData = est.data();
            if (
              estData.supervisorId === docProf.id &&
              (!profData.especialidade || estData.especialidade === profData.especialidade)
            ) {
              ids.push(est.id);
            }
          });
          setSupervisionadosIds(ids);
        } else if (profData.tipo === "diretor") {
          const todosSnap = await getDocs(collection(db, "profissionais"));
          setSupervisionadosIds(todosSnap.docs.map(d => d.id));
        } else {
          setSupervisionadosIds([]);
        }
      }
    };
    carregarProfissional();

    const carregarTodosProf = async () => {
      const snap = await getDocs(collection(db, "profissionais"));
      setTodosProfissionais(snap.docs.map(d => ({ id: d.id, nome: d.data().nome, tipo: d.data().tipo, codigo: d.data().codigo, especialidade: d.data().especialidade })));
    };
    carregarTodosProf();
  }, [codigo]);

  const carregarAgenda = async () => {
    if (!profissionalId) return;
    setCarregando(true);
    try {
      let idsParaFiltrar: string[] = [];
      if (ehDiretor) {
        idsParaFiltrar = todosProfissionais.map(p => p.id);
      } else {
        idsParaFiltrar = [profissionalId];
        if (supervisionadosIds.length > 0) {
          idsParaFiltrar = [...idsParaFiltrar, ...supervisionadosIds];
        }
      }

      const snap = await getDocs(collection(db, "agendamentos"));
      const horarios: Agendamento[] = snap.docs
        .filter(d => {
          const data = d.data();
          return idsParaFiltrar.includes(data.profissionalId) && data.data === dataSelecionada;
        })
        .map(d => {
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
            nomeProfissional: "",
          } as Agendamento;
        });

      const todosProfSnap = await getDocs(collection(db, "profissionais"));
      const profMap: Record<string, string> = {};
      todosProfSnap.docs.forEach(d => { profMap[d.id] = d.data().nome; });

      for (const h of horarios) {
        h.nomeProfissional = profMap[h.profissionalId] || "Desconhecido";
        if (h.alunoId) {
          const alunoSnap = await getDoc(doc(db, "alunos", h.alunoId));
          if (alunoSnap.exists()) {
            const aluno = alunoSnap.data();
            h.nomeAluno = aluno.nomeCompleto;
            h.telefoneAluno = aluno.telefone || "";
            h.idadeAluno = calcularIdade(aluno.nascimento) ?? undefined;
          }
        }
      }
      horarios.sort((a, b) => a.horario.localeCompare(b.horario));
      setAgenda(horarios);
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
      alert("Erro ao carregar agenda.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAgenda();
  }, [profissionalId, dataSelecionada, supervisionadosIds, todosProfissionais]);

  const registrarPresenca = async (ag: Agendamento, tipo: string) => {
    if (!ag.alunoId) return alert("Este horário não tem paciente vinculado.");
    let novoStatus = "";
    if (tipo === "presente") novoStatus = "realizado";
    else if (tipo === "faltaJustificada") novoStatus = "faltaJustificada";
    else novoStatus = "faltaInjustificada";

    try {
      await updateDoc(doc(db, "agendamentos", ag.id), { status: novoStatus });
      alert(`Registrado como ${tipo === "presente" ? "Compareceu" : tipo === "faltaJustificada" ? "Falta justificada" : "Falta injustificada"}`);
      await carregarAgenda();
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const abrirTrocarProfissional = (ag: Agendamento) => {
    setModalTrocarProf(ag);
    setNovoProfId(ag.profissionalId);
  };

  const confirmarTrocarProfissional = async () => {
    if (!modalTrocarProf) return;
    if (novoProfId === modalTrocarProf.profissionalId) return alert("Já está com este profissional.");
    const novoNome = todosProfissionais.find(p => p.id === novoProfId)?.nome || "profissional";
    if (!confirm(`Trocar o profissional deste horário para ${novoNome}?`)) return;

    try {
      if (modalTrocarProf.groupId) {
        const groupQuery = query(collection(db, "agendamentos"), where("groupId", "==", modalTrocarProf.groupId));
        const groupSnap = await getDocs(groupQuery);
        for (const docHor of groupSnap.docs) {
          await updateDoc(docHor.ref, { profissionalId: novoProfId });
        }
        alert(`Profissional alterado em ${groupSnap.size} horários do grupo.`);
      } else {
        await updateDoc(doc(db, "agendamentos", modalTrocarProf.id), { profissionalId: novoProfId });
        alert("Profissional alterado.");
      }
      setModalTrocarProf(null);
      carregarAgenda();
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  // 🔥 REMOVER PACIENTE
  const abrirRemover = (ag: Agendamento) => {
    setModalRemover(ag);
    setEscopo("soSemana");
  };

  const confirmarRemocao = async () => {
    if (!modalRemover) return;
    try {
      if (escopo === "todasSemanas" && modalRemover.groupId) {
        const gQ = query(collection(db, "agendamentos"), where("groupId", "==", modalRemover.groupId));
        const gS = await getDocs(gQ);
        for (const d of gS.docs) {
          await updateDoc(d.ref, { alunoId: null, status: "livre" });
        }
        alert(`Paciente removido de ${gS.size} horários do grupo.`);
      } else {
        await updateDoc(doc(db, "agendamentos", modalRemover.id), { alunoId: null, status: "livre" });
        alert("Paciente removido deste horário.");
      }
      setModalRemover(null);
      carregarAgenda();
    } catch (e: any) { alert(e.message); }
  };

  const enviarWhatsApp = (ag: Agendamento, mensagem: string) => {
    if (!ag.telefoneAluno) return alert("Paciente sem telefone cadastrado.");
    const fone = ag.telefoneAluno.replace(/\D/g, "");
    const url = `https://wa.me/55${fone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  let agendaFiltrada = agenda;
  if (ehDiretor && filtroVisualizarProfissionalId) {
    agendaFiltrada = agendaFiltrada.filter(a => a.profissionalId === filtroVisualizarProfissionalId);
  }
  if (buscaPaciente.trim()) {
    const b = buscaPaciente.toLowerCase().trim();
    agendaFiltrada = agendaFiltrada.filter(a =>
      (a.nomeAluno || "").toLowerCase().includes(b) ||
      (a.pacienteInfo?.nome || "").toLowerCase().includes(b)
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2>Agenda do Profissional</h2>
        <p>
          <strong>Código:</strong> {codigo} | <strong>Nome:</strong> {profissional?.nome || "Carregando..."}
          {tipoLogado && <span style={{ marginLeft: 8, color: "#6b7a8f" }}>({tipoLogado})</span>}
        </p>
        {ehDiretor && (
          <p style={{ color: "#0070f3", fontWeight: 600 }}>
            👑 Você está vendo a agenda de TODOS os profissionais
          </p>
        )}
        {!ehDiretor && tipoLogado === "supervisor" && supervisionadosIds.length > 0 && (
          <p><strong>Vendo:</strong> {supervisionadosIds.length} profissional(is) da sua especialidade</p>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label>Data: </label>
          <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)} style={{ padding: 4 }} />
          <button onClick={carregarAgenda} style={{ padding: "4px 8px" }}>Recarregar</button>
        </div>
      </div>

      {ehDiretor && (
        <div style={{ background: "#fff", border: "1px solid #e0e4e8", borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontWeight: 600 }}>Filtrar:</label>
            <select
              value={filtroVisualizarProfissionalId}
              onChange={e => setFiltroVisualizarProfissionalId(e.target.value)}
              style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8, minWidth: 250 }}
            >
              <option value="">Todos os profissionais ({agenda.length} horários)</option>
              {todosProfissionais
                .filter(p => p.tipo !== "diretor")
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.codigo}) - {p.tipo}
                  </option>
                ))}
            </select>
            <input
              type="text"
              placeholder="🔍 Buscar paciente..."
              value={buscaPaciente}
              onChange={e => setBuscaPaciente(e.target.value)}
              style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8, flex: "1 1 200px", minWidth: 200 }}
            />
            {(filtroVisualizarProfissionalId || buscaPaciente) && (
              <button
                onClick={() => { setFiltroVisualizarProfissionalId(""); setBuscaPaciente(""); }}
                style={{ padding: "6px 12px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}

      {carregando && <p>Carregando...</p>}
      {!carregando && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Horário</th>
                <th style={{ textAlign: "left", padding: 8 }}>Profissional</th>
                <th style={{ textAlign: "left", padding: 8 }}>Paciente</th>
                <th style={{ textAlign: "left", padding: 8 }}>Telefone</th>
                <th style={{ textAlign: "left", padding: 8 }}>Idade</th>
                <th style={{ textAlign: "left", padding: 8 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {agendaFiltrada.map(ag => (
                <tr key={ag.id} style={{ borderBottom: "1px solid #e0e4e8" }}>
                  <td style={{ padding: 8 }}>{ag.horario}</td>
                  <td style={{ padding: 8, fontWeight: ehDiretor ? 600 : 400 }}>{ag.nomeProfissional}</td>
                  <td style={{ padding: 8 }}>
                    {ag.nomeAluno || (ag.tipoPaciente === "particular" ? ag.pacienteInfo?.nome : "Livre")}
                  </td>
                  <td style={{ padding: 8 }}>{ag.telefoneAluno || "-"}</td>
                  <td style={{ padding: 8 }}>{ag.idadeAluno !== undefined ? `${ag.idadeAluno} anos` : "-"}</td>
                  <td style={{ padding: 8 }}>
                    {ag.alunoId && (ag.status === "agendado" || ag.status === "ocupado") && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        <button onClick={() => registrarPresenca(ag, "presente")} style={{ background: "#28a745", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4 }}>Compareceu</button>
                        <button onClick={() => registrarPresenca(ag, "faltaJustificada")} style={{ background: "#ffc107", color: "#000", border: "none", padding: "6px 10px", borderRadius: 4 }}>F. Just.</button>
                        <button onClick={() => registrarPresenca(ag, "faltaInjustificada")} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4 }}>F. Injust.</button>
                      </div>
                    )}
                    {ag.status === "realizado" && <span style={{ color: "#28a745" }}>Atendido</span>}
                    {ag.status === "faltaJustificada" && <span style={{ color: "#ffc107" }}>Falta justificada</span>}
                    {ag.status === "faltaInjustificada" && <span style={{ color: "#dc3545" }}>Falta injustificada</span>}

                    {ag.alunoId && (
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        {!ehDiretor && (
                          <button
                            onClick={() => window.open(`/profissional/${codigo}/paciente/${ag.alunoId}`, "_blank")}
                            style={{ background: "#0070f3", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4 }}
                          >
                            Ficha
                          </button>
                        )}
                        {ag.telefoneAluno && (
                          <>
                            <button
                              onClick={() => enviarWhatsApp(ag, `Olá ${ag.nomeAluno}, você tem atendimento marcado hoje às ${ag.horario}. Podemos confirmar?`)}
                              style={{ background: "#25D366", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4 }}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => enviarWhatsApp(ag, `Olá ${ag.nomeAluno}, sentimos sua falta hoje. Podemos reagendar?`)}
                              style={{ background: "#25D366", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4 }}
                            >
                              Falta
                            </button>
                          </>
                        )}
                        {podeMudarProfissional && (
                          <button
                            onClick={() => abrirTrocarProfissional(ag)}
                            style={{ background: "#6f42c1", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4 }}
                          >
                            Trocar Prof.
                          </button>
                        )}
                        <button
                          onClick={() => abrirRemover(ag)}
                          style={{ background: "#dc3545", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4 }}
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {agendaFiltrada.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 8, textAlign: "center" }}>Nenhum horário para esta data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL TROCAR PROFISSIONAL */}
      {modalTrocarProf && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 500, width: "90%" }}>
            <h3>Trocar Profissional</h3>
            <p><strong>{modalTrocarProf.nomeAluno}</strong> - {modalTrocarProf.horario}</p>
            <select value={novoProfId} onChange={e => setNovoProfId(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", marginBottom: 12 }}>
              <option value="">Selecione</option>
              {todosProfissionais.map(p => (
                <option key={p.id} value={p.id}>{p.nome} ({p.codigo}) {p.tipo === "supervisor" ? "👑" : p.tipo === "diretor" ? "🎯" : p.tipo === "estagiario" ? "📚" : ""}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={confirmarTrocarProfissional} style={{ padding: "8px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Confirmar</button>
              <button onClick={() => setModalTrocarProf(null)} style={{ padding: "8px 20px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REMOVER PACIENTE */}
      {modalRemover && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 450, width: "90%" }}>
            <h3>Remover paciente</h3>
            <p><strong>{modalRemover.nomeAluno}</strong> - {modalRemover.horario}</p>
            {modalRemover.groupId && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, cursor: "pointer" }}>
                  <input type="radio" checked={escopo === "soSemana"} onChange={() => setEscopo("soSemana")} /> Só esta semana
                </label>
                <label style={{ display: "block", cursor: "pointer" }}>
                  <input type="radio" checked={escopo === "todasSemanas"} onChange={() => setEscopo("todasSemanas")} /> Todas as semanas do grupo
                </label>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={confirmarRemocao} style={{ flex: 1, padding: 10, background: "#dc3545", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Confirmar</button>
              <button onClick={() => setModalRemover(null)} style={{ flex: 1, padding: 10, background: "#6c757d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}