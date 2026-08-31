import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, where, deleteDoc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

interface Paciente {
  id: string;
  alunoId: string;
  nome: string;
  matricula: string;
  telefone: string;
  servicoNome: string;
  tipoId: string;
  data: string;
  horario: string;
  profissionalId: string;
  profissionalNome: string;
  agendamentoId: string;
  status: string;
}

interface Estagiario {
  id: string;
  nome: string;
  codigo: string;
}

export default function ProfissionalPacientes() {
  const { codigo } = useParams();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [todosPacientes, setTodosPacientes] = useState<Paciente[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [profissionalId, setProfissionalId] = useState("");
  const [supervisionadosIds, setSupervisionadosIds] = useState<string[]>([]);
  const [estagiarios, setEstagiarios] = useState<Estagiario[]>([]);
  const [filtroEstagiarioId, setFiltroEstagiarioId] = useState("");
  const [filtroServico, setFiltroServico] = useState("");
  const [profissionalNome, setProfissionalNome] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  // Carregar profissional e estagiários supervisionados
  useEffect(() => {
    const carregarProfissional = async () => {
      const q = query(collection(db, "profissionais"), where("codigo", "==", codigo));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docProf = snap.docs[0];
        const profData = { id: docProf.id, ...docProf.data() } as any;
        setProfissionalId(docProf.id);
        setProfissionalNome(profData.nome || "");

        if (profData.tipo === "supervisor") {
          const estQuery = query(collection(db, "profissionais"), where("supervisorId", "==", docProf.id));
          const estSnap = await getDocs(estQuery);
          const ids = estSnap.docs.map(d => d.id);
          setSupervisionadosIds(ids);
          setEstagiarios(estSnap.docs.map(d => ({ id: d.id, nome: d.data().nome, codigo: d.data().codigo })));
        }
      }
    };
    carregarProfissional();
  }, [codigo]);

  // Carregar profissionais e serviços para os selects
  useEffect(() => {
    const carregarAux = async () => {
      const profSnap = await getDocs(collection(db, "profissionais"));
      setProfissionais(profSnap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
      const servSnap = await getDocs(collection(db, "tiposAtendimento"));
      setServicos(servSnap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    carregarAux();
  }, []);

  // Carregar pacientes (TODOS, independente de status ou data)
  const carregarPacientes = async () => {
    if (!profissionalId) return;
    setCarregando(true);
    try {
      // IDs para filtrar: próprio + supervisionados
      let idsParaFiltrar = [profissionalId];
      if (supervisionadosIds.length > 0) {
        idsParaFiltrar = [...idsParaFiltrar, ...supervisionadosIds];
      }

      const snap = await getDocs(collection(db, "agendamentos"));
      
      let agendamentos = snap.docs
        .filter(d => {
          const data = d.data() as any;
          return (
            data.alunoId &&
            idsParaFiltrar.includes(data.profissionalId)
          );
        })
        .map(d => ({ id: d.id, ...(d.data() as any) }));

      // Aplicar filtro de estagiário
      if (filtroEstagiarioId) {
        agendamentos = agendamentos.filter(a => a.profissionalId === filtroEstagiarioId);
      }
      if (filtroServico) {
        agendamentos = agendamentos.filter(a => a.tipoId === filtroServico);
      }
      if (filtroStatus) {
        agendamentos = agendamentos.filter(a => a.status === filtroStatus);
      }

      // Ordenar por data (mais recentes primeiro) e depois horário
      agendamentos.sort((a, b) => {
        if (a.data === b.data) return a.horario.localeCompare(b.horario);
        return b.data.localeCompare(a.data);
      });

      const profMap: Record<string, string> = {};
      profissionais.forEach(p => { profMap[p.id] = p.nome; });

      const servMap: Record<string, string> = {};
      servicos.forEach(s => { servMap[s.id] = s.nome; });

      const lista: Paciente[] = [];
      for (const ag of agendamentos) {
        const alunoSnap = await getDoc(doc(db, "alunos", ag.alunoId));
        if (alunoSnap.exists()) {
          const aluno = alunoSnap.data();
          lista.push({
            id: ag.id,
            alunoId: ag.alunoId,
            nome: aluno.nomeCompleto,
            matricula: aluno.matricula || "",
            telefone: aluno.telefone || "",
            servicoNome: servMap[ag.tipoId] || ag.tipoId,
            tipoId: ag.tipoId,
            data: ag.data,
            horario: ag.horario,
            profissionalId: ag.profissionalId,
            profissionalNome: profMap[ag.profissionalId] || "Desconhecido",
            agendamentoId: ag.id,
            status: ag.status || "",
          });
        }
      }
      setPacientes(lista);
      setTodosPacientes(lista);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPacientes();
  }, [profissionalId, supervisionadosIds, filtroEstagiarioId, filtroServico, filtroStatus]);

  // Transferir paciente para estagiário
  const transferirParaEstagiario = async (paciente: Paciente, estagiarioId: string) => {
    if (!estagiarioId) return alert("Selecione um estagiário.");
    const estagiarioNome = estagiarios.find(e => e.id === estagiarioId)?.nome || "estagiário";
    if (!confirm(`Transferir ${paciente.nome} para ${estagiarioNome}?`)) return;

    try {
      await updateDoc(doc(db, "agendamentos", paciente.id), { profissionalId: estagiarioId });
      alert(`Paciente transferido para ${estagiarioNome}!`);
      carregarPacientes();
    } catch (error) {
      console.error("Erro ao transferir:", error);
      alert("Erro ao transferir paciente.");
    }
  };

  // Transferir para fila (remover do agendamento)
  const transferirParaFila = async (paciente: Paciente) => {
    if (!confirm(`Remover ${paciente.nome} do horário e colocar na fila de espera?`)) return;
    try {
      await deleteDoc(doc(db, "agendamentos", paciente.id));
      const filaQuery = query(collection(db, "filaEspera"), where("alunoId", "==", paciente.alunoId), where("status", "==", "aguardando"));
      const filaSnap = await getDocs(filaQuery);
      if (filaSnap.empty) {
        await addDoc(collection(db, "filaEspera"), {
          alunoId: paciente.alunoId,
          tipoId: paciente.tipoId,
          dataSolicitacao: new Date(),
          status: "aguardando",
          modalidade: "presencial",
        });
      }
      alert("Paciente retornou à fila.");
      carregarPacientes();
    } catch (error) {
      console.error("Erro ao transferir para fila:", error);
      alert("Erro ao transferir para fila.");
    }
  };

  // Estilos
  const styleSelect = { padding: 8, border: "1px solid #ccc", borderRadius: 8, background: "#fff" };
  const styleButton = (bg: string, color = "#fff") => ({
    padding: "4px 12px",
    border: "none",
    borderRadius: 4,
    background: bg,
    color,
    cursor: "pointer",
    marginRight: 4,
  });

  // Contar pacientes por estagiário
  const contarPacientesPorEstagiario = (estagiarioId: string) => {
    return todosPacientes.filter(p => p.profissionalId === estagiarioId).length;
  };

  return (
    <div>
      <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>
        Pacientes em atendimento
        {profissionalNome && <span style={{ fontSize: 14, fontWeight: "normal", color: "#6b7a8f", marginLeft: 8 }}>({profissionalNome})</span>}
      </h3>

      {/* Lista de estagiários */}
      {estagiarios.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setFiltroEstagiarioId("")}
              style={{
                ...styleButton(filtroEstagiarioId === "" ? "#0070f3" : "#e9ecef", filtroEstagiarioId === "" ? "#fff" : "#000"),
                fontWeight: filtroEstagiarioId === "" ? 600 : 400,
              }}
            >
              Todos ({todosPacientes.length})
            </button>
            {estagiarios.map(est => (
              <button
                key={est.id}
                onClick={() => setFiltroEstagiarioId(est.id)}
                style={{
                  ...styleButton(filtroEstagiarioId === est.id ? "#0070f3" : "#e9ecef", filtroEstagiarioId === est.id ? "#fff" : "#000"),
                  fontWeight: filtroEstagiarioId === est.id ? 600 : 400,
                }}
              >
                {est.nome} ({contarPacientesPorEstagiario(est.id)})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={filtroServico} onChange={e => setFiltroServico(e.target.value)} style={styleSelect}>
          <option value="">Todos os serviços</option>
          {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={styleSelect}>
          <option value="">Todos os status</option>
          <option value="ocupado">Agendado</option>
          <option value="realizado">Atendido</option>
          <option value="faltaJustificada">Falta justificada</option>
          <option value="faltaInjustificada">Falta injustificada</option>
        </select>
        <button onClick={carregarPacientes} style={styleButton("#0070f3")}>Buscar</button>
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
                <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Telefone</th>
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
                  <td style={{ padding: 12 }}>{p.telefone}</td>
                  <td style={{ padding: 12 }}>{p.servicoNome}</td>
                  <td style={{ padding: 12 }}>{p.data} {p.horario}</td>
                  <td style={{ padding: 12 }}>{p.profissionalNome}</td>
                  <td style={{ padding: 12 }}>
                    {p.status === "realizado" && "Atendido"}
                    {p.status === "faltaJustificada" && "Falta justificada"}
                    {p.status === "faltaInjustificada" && "Falta injustificada"}
                    {p.status === "ocupado" && "Agendado"}
                    {!p.status && "-"}
                  </td>
                  <td style={{ padding: 12 }}>
                    {/* Botão Ficha */}
                    <button
                      onClick={() => window.open(`/profissional/${codigo}/paciente/${p.alunoId}`, "_blank")}
                      style={styleButton("#0070f3")}
                    >
                      Ficha
                    </button>

                    {/* Vincular a estagiário (supervisor) */}
                    {supervisionadosIds.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            transferirParaEstagiario(p, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        style={{ padding: "4px 8px", marginLeft: 4, borderRadius: 4, border: "1px solid #ccc" }}
                      >
                        <option value="">Vincular</option>
                        {estagiarios
                          .filter(est => est.id !== p.profissionalId)
                          .map(est => (
                            <option key={est.id} value={est.id}>
                              {est.nome}
                            </option>
                          ))}
                        {p.profissionalId !== profissionalId && (
                          <option value={profissionalId}>Para mim</option>
                        )}
                      </select>
                    )}

                    {/* Fila (apenas se estiver ocupado) */}
                    {p.status === "ocupado" && (
                      <button
                        onClick={() => transferirParaFila(p)}
                        style={styleButton("#dc3545")}
                      >
                        Fila
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}