import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from "firebase/firestore";
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
  origem: "agendamento" | "fila";
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

  // Estado para vincular (apenas profissional, sem horário)
  const [vinculando, setVinculando] = useState<{ paciente: Paciente; profissionalId: string } | null>(null);

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
    if (!profissionalId) return;
    setCarregando(true);
    try {
      let idsParaFiltrar = [profissionalId];
      if (supervisionadosIds.length > 0) {
        idsParaFiltrar = [...idsParaFiltrar, ...supervisionadosIds];
      }

      const profMap: Record<string, string> = {};
      profissionais.forEach(p => { profMap[p.id] = p.nome; });
      const servMap: Record<string, string> = {};
      servicos.forEach(s => { servMap[s.id] = s.nome; });

      const lista: Paciente[] = [];

      // 1. Agendamentos (pacientes já com horário marcado)
      const snapAgend = await getDocs(collection(db, "agendamentos"));
      for (const docSnap of snapAgend.docs) {
        const data = docSnap.data();
        if (data.alunoId && idsParaFiltrar.includes(data.profissionalId)) {
          const alunoSnap = await getDoc(doc(db, "alunos", data.alunoId));
          if (alunoSnap.exists()) {
            const aluno = alunoSnap.data();
            lista.push({
              id: docSnap.id,
              alunoId: data.alunoId,
              nome: aluno.nomeCompleto,
              matricula: aluno.matricula || "",
              telefone: aluno.telefone || "",
              servicoNome: servMap[data.tipoId] || data.tipoId,
              tipoId: data.tipoId,
              data: data.data || "",
              horario: data.horario || "",
              profissionalId: data.profissionalId,
              profissionalNome: profMap[data.profissionalId] || "Desconhecido",
              agendamentoId: docSnap.id,
              status: data.status || "",
              origem: "agendamento",
            });
          }
        }
      }

      // 2. Fila de espera - mostra todos os pacientes da fila (aguardando ou vinculados)
      const snapFila = await getDocs(collection(db, "filaEspera"));
      for (const docSnap of snapFila.docs) {
        const data = docSnap.data();
        if (data.alunoId) {
          // Mostra apenas pacientes com status "aguardando" ou "vinculado"
          if (data.status === "aguardando" || data.status === "vinculado") {
            const profId = data.profissionalId || "";
            // Se for "vinculado" e tiver profissionalId, deve estar na lista de supervisionados ou ser o próprio
            if (data.status === "vinculado" && profId && !idsParaFiltrar.includes(profId)) {
              continue; // Não é deste supervisor
            }
            // Se for "aguardando", mostra independente de ter profissionalId (desde que não tenha ou seja da supervisora)
            if (data.status === "aguardando" && profId && !idsParaFiltrar.includes(profId)) {
              continue;
            }
            const alunoSnap = await getDoc(doc(db, "alunos", data.alunoId));
            if (alunoSnap.exists()) {
              const aluno = alunoSnap.data();
              lista.push({
                id: docSnap.id,
                alunoId: data.alunoId,
                nome: aluno.nomeCompleto,
                matricula: aluno.matricula || "",
                telefone: aluno.telefone || "",
                servicoNome: servMap[data.tipoId] || data.tipoId,
                tipoId: data.tipoId,
                data: "",
                horario: "",
                profissionalId: profId,
                profissionalNome: profId ? profMap[profId] || "Desconhecido" : "Aguardando",
                agendamentoId: docSnap.id,
                status: data.status,
                origem: "fila",
              });
            }
          }
        }
      }

      // Aplicar filtros
      let filtrados = lista;
      if (filtroEstagiarioId) {
        filtrados = filtrados.filter(p => {
          // Se o filtro for por estagiário, mostrar pacientes que têm profissionalId igual ao estagiário
          // ou que estão na fila (aguardando) e pertencem à supervisora (não têm profissionalId ou têm o da supervisora)
          // Mas para simplificar, vamos mostrar apenas os que têm profissionalId igual ao estagiário
          // ou se for "aguardando" e não tiver profissionalId, não mostrar (pois não está vinculado a ninguém)
          if (p.profissionalId === filtroEstagiarioId) {
            return true;
          }
          // Se o paciente está "aguardando" e não tem profissionalId, não pertence a nenhum estagiário
          return false;
        });
      }
      if (filtroServico) {
        filtrados = filtrados.filter(p => p.tipoId === filtroServico);
      }

      filtrados.sort((a, b) => {
        if (a.origem === "fila" && b.origem !== "fila") return -1;
        if (a.origem !== "fila" && b.origem === "fila") return 1;
        if (a.data && b.data) {
          if (a.data === b.data) return (a.horario || "").localeCompare(b.horario || "");
          return b.data.localeCompare(a.data);
        }
        return 0;
      });

      setPacientes(filtrados);
      setTodosPacientes(filtrados);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
      alert("Erro ao carregar pacientes.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPacientes();
  }, [profissionalId, supervisionadosIds, filtroEstagiarioId, filtroServico]);

  // VINCULAR PACIENTE DA FILA A UM PROFISSIONAL (sem horário)
  const vincularPaciente = async (paciente: Paciente, profissionalId: string) => {
    if (!profissionalId) return alert("Selecione um profissional.");
    const profissionalNome = profissionais.find(p => p.id === profissionalId)?.nome || "profissional";
    if (!confirm(`Vincular ${paciente.nome} ao profissional ${profissionalNome}? O paciente sairá da fila e ficará aguardando agendamento de horário.`)) return;

    try {
      // Atualizar a fila: marcar como "vinculado" e guardar o profissionalId
      await updateDoc(doc(db, "filaEspera", paciente.id), {
        profissionalId: profissionalId,
        status: "vinculado"
      });
      
      alert(`Paciente vinculado a ${profissionalNome}! Ele saiu da fila e aguarda agendamento de horário.`);
      setVinculando(null);
      carregarPacientes();
    } catch (error: any) {
      alert(`Erro ao vincular: ${error.message}`);
    }
  };

  // REAGENDAR: trocar paciente de profissional (para pacientes já com horário)
  const reagendarPaciente = async (paciente: Paciente, novoProfissionalId: string) => {
    if (!novoProfissionalId) return alert("Selecione um profissional.");
    if (novoProfissionalId === paciente.profissionalId) return alert("O paciente já está com este profissional.");
    const profissionalNome = profissionais.find(p => p.id === novoProfissionalId)?.nome || "profissional";
    if (!confirm(`Reagendar ${paciente.nome} para ${profissionalNome}?`)) return;

    try {
      await updateDoc(doc(db, "agendamentos", paciente.id), {
        profissionalId: novoProfissionalId
      });
      alert(`Paciente reagendado para ${profissionalNome}!`);
      carregarPacientes();
    } catch (error: any) {
      alert(`Erro ao reagendar: ${error.message}`);
    }
  };

  // REMOVER DA FILA (caso queira cancelar)
  const removerDaFila = async (paciente: Paciente) => {
    if (!confirm(`Remover ${paciente.nome} da fila de espera?`)) return;
    try {
      await updateDoc(doc(db, "filaEspera", paciente.id), { status: "cancelado" });
      alert("Paciente removido da fila.");
      carregarPacientes();
    } catch (error: any) {
      alert(`Erro ao remover: ${error.message}`);
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
    marginRight: 4,
  });

  const contarPacientesPorEstagiario = (estagiarioId: string) => {
    return todosPacientes.filter(p => p.profissionalId === estagiarioId).length;
  };

  return (
    <div>
      <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>
        Pacientes em atendimento
        {profissionalNome && <span style={{ fontSize: 14, fontWeight: "normal", color: "#6b7a8f", marginLeft: 8 }}>({profissionalNome})</span>}
      </h3>

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

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={filtroServico} onChange={e => setFiltroServico(e.target.value)} style={styleSelect}>
          <option value="">Todos os serviços</option>
          {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
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
                  <td style={{ padding: 12 }}>
                    {p.origem === "fila" 
                      ? (p.status === "vinculado" ? "Aguardando horário" : "Aguardando") 
                      : `${p.data} ${p.horario}`}
                  </td>
                  <td style={{ padding: 12 }}>{p.profissionalNome}</td>
                  <td style={{ padding: 12 }}>
                    {p.status === "realizado" && "Atendido"}
                    {p.status === "faltaJustificada" && "Falta justificada"}
                    {p.status === "faltaInjustificada" && "Falta injustificada"}
                    {p.status === "ocupado" && "Agendado"}
                    {p.status === "aguardando" && "Aguardando"}
                    {p.status === "vinculado" && "Aguardando horário"}
                    {!p.status && "-"}
                  </td>
                  <td style={{ padding: 12 }}>
                    <button
                      onClick={() => window.open(`/profissional/${codigo}/paciente/${p.alunoId}`, "_blank")}
                      style={styleButton("#0070f3")}
                    >
                      Ficha
                    </button>

                    {/* Se for da fila e ainda não vinculado */}
                    {p.origem === "fila" && p.status === "aguardando" && (
                      <>
                        <select
                          onChange={(e) => {
                            const profId = e.target.value;
                            if (profId) {
                              setVinculando({ paciente: p, profissionalId: profId });
                            }
                          }}
                          style={{ ...styleSelect, width: "auto", marginRight: 4 }}
                        >
                          <option value="">Vincular a</option>
                          {profissionais
                            .filter(prof => supervisionadosIds.includes(prof.id) || prof.id === profissionalId)
                            .map(prof => (
                              <option key={prof.id} value={prof.id}>{prof.nome}</option>
                            ))}
                        </select>
                        {vinculando?.paciente.id === p.id && vinculando?.profissionalId && (
                          <button
                            onClick={() => vincularPaciente(p, vinculando.profissionalId)}
                            style={styleButton("#28a745")}
                          >
                            Confirmar
                          </button>
                        )}
                      </>
                    )}

                    {/* Se for da fila mas já vinculado (aguardando horário), mostrar que já foi vinculado */}
                    {p.origem === "fila" && p.status === "vinculado" && (
                      <span style={{ color: "#28a745", fontSize: 13 }}>✓ Vinculado</span>
                    )}

                    {/* Se for agendamento, mostrar opção de reagendar (trocar profissional) */}
                    {p.origem === "agendamento" && (
                      <select
                        onChange={async (e) => {
                          const novoProfId = e.target.value;
                          if (novoProfId) {
                            await reagendarPaciente(p, novoProfId);
                            e.target.value = "";
                          }
                        }}
                        style={{ ...styleSelect, width: "auto", marginRight: 4 }}
                      >
                        <option value="">Reagendar</option>
                        {profissionais
                          .filter(prof => supervisionadosIds.includes(prof.id) || prof.id === profissionalId)
                          .filter(prof => prof.id !== p.profissionalId)
                          .map(prof => (
                            <option key={prof.id} value={prof.id}>{prof.nome}</option>
                          ))}
                      </select>
                    )}

                    {/* Remover da fila (para pacientes em fila) */}
                    {p.origem === "fila" && (
                      <button
                        onClick={() => removerDaFila(p)}
                        style={styleButton("#dc3545")}
                      >
                        Remover
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