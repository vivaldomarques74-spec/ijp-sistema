import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
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
      setProfissionais(profSnap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
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

      // 1. Agendamentos
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

      // 2. Fila de espera
      const snapFila = await getDocs(collection(db, "filaEspera"));
      for (const docSnap of snapFila.docs) {
        const data = docSnap.data();
        if (data.alunoId && data.status === "aguardando" && idsParaFiltrar.includes(data.profissionalId)) {
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
              profissionalId: data.profissionalId || "",
              profissionalNome: data.profissionalId ? profMap[data.profissionalId] || "Desconhecido" : "Aguardando",
              agendamentoId: docSnap.id,
              status: "aguardando",
              origem: "fila",
            });
          }
        }
      }

      // Aplicar filtros
      let filtrados = lista;
      if (filtroEstagiarioId) {
        filtrados = filtrados.filter(p => p.profissionalId === filtroEstagiarioId);
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
                    {p.origem === "fila" ? "Aguardando horário" : `${p.data} ${p.horario}`}
                  </td>
                  <td style={{ padding: 12 }}>{p.profissionalNome}</td>
                  <td style={{ padding: 12 }}>
                    {p.status === "realizado" && "Atendido"}
                    {p.status === "faltaJustificada" && "Falta justificada"}
                    {p.status === "faltaInjustificada" && "Falta injustificada"}
                    {p.status === "ocupado" && "Agendado"}
                    {p.status === "aguardando" && "Aguardando"}
                    {!p.status && "-"}
                  </td>
                  <td style={{ padding: 12 }}>
                    <button
                      onClick={() => window.open(`/profissional/${codigo}/paciente/${p.alunoId}`, "_blank")}
                      style={styleButton("#0070f3")}
                    >
                      Ficha
                    </button>
                    {p.origem === "fila" && (
                      <button
                        onClick={() => alert("Vincular a um horário em breve")}
                        style={styleButton("#28a745")}
                      >
                        Vincular
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