import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, where, updateDoc, addDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function ProfissionalPacientes() {
  const { codigo } = useParams();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [profissionalId, setProfissionalId] = useState("");
  const [profissionalNome, setProfissionalNome] = useState("");
  const [tipoLogado, setTipoLogado] = useState("");
  const [supervisionadosIds, setSupervisionadosIds] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroProfId, setFiltroProfId] = useState("");
  const [filtroServico, setFiltroServico] = useState("");

  const [modalVincular, setModalVincular] = useState<any>(null);

  const ehDiretor = tipoLogado === "diretor";

  // 1. Carrega quem está logado
  useEffect(() => {
    const carregar = async () => {
      const q = query(collection(db, "profissionais"), where("codigo", "==", codigo));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data: any = d.data();
        setProfissionalId(d.id);
        setProfissionalNome(data.nome || "");
        setTipoLogado(data.tipo || "");

        if (data.tipo === "supervisor") {
          const est = await getDocs(query(collection(db, "profissionais"), where("supervisorId", "==", d.id)));
          setSupervisionadosIds(est.docs.map(x => x.id));
        } else if (data.tipo === "diretor") {
          const todos = await getDocs(collection(db, "profissionais"));
          setSupervisionadosIds(todos.docs.map(x => x.id));
        }
      }
    };
    carregar();
  }, [codigo]);

  // 2. Carrega auxiliares
  useEffect(() => {
    const carregarAux = async () => {
      const p = await getDocs(collection(db, "profissionais"));
      setProfissionais(p.docs.map(d => ({ id: d.id, nome: d.data().nome, tipo: d.data().tipo, codigo: d.data().codigo })));
      const s = await getDocs(collection(db, "tiposAtendimento"));
      setServicos(s.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    carregarAux();
  }, []);

  // 3. Carrega pacientes
  const carregarPacientes = async () => {
    if (!profissionalId) return;
    setCarregando(true);
    try {
      let idsFiltro: string[] = [];
      if (ehDiretor) {
        idsFiltro = profissionais.map(p => p.id);
      } else {
        idsFiltro = [profissionalId, ...supervisionadosIds];
      }

      const profMap: Record<string, string> = {};
      profissionais.forEach(p => { profMap[p.id] = p.nome; });
      const servMap: Record<string, string> = {};
      servicos.forEach(s => { servMap[s.id] = s.nome; });

      const lista: any[] = [];

      // Agendamentos
      const ag = await getDocs(collection(db, "agendamentos"));
      for (const d of ag.docs) {
        const data = d.data();
        if (!data.alunoId) continue;
        if (!ehDiretor && !idsFiltro.includes(data.profissionalId)) continue;
        const alunoSnap = await getDoc(doc(db, "alunos", data.alunoId));
        if (!alunoSnap.exists()) continue;
        const aluno = alunoSnap.data();
        lista.push({
          id: d.id, alunoId: data.alunoId, nome: aluno.nomeCompleto,
          matricula: aluno.matricula || "", telefone: aluno.telefone || "",
          servicoNome: servMap[data.tipoId] || data.tipoId,
          tipoId: data.tipoId, data: data.data || "", horario: data.horario || "",
          profissionalId: data.profissionalId,
          profissionalNome: profMap[data.profissionalId] || "Desconhecido",
          status: data.status || "", origem: "agendamento",
        });
      }

      // Fila
      const fila = await getDocs(collection(db, "filaEspera"));
      for (const d of fila.docs) {
        const data = d.data();
        if (!data.alunoId) continue;
        if (data.status !== "aguardando" && data.status !== "vinculado") continue;
        const profId = data.profissionalId || "";
        if (!ehDiretor && profId && !idsFiltro.includes(profId)) continue;
        const alunoSnap = await getDoc(doc(db, "alunos", data.alunoId));
        if (!alunoSnap.exists()) continue;
        const aluno = alunoSnap.data();
        lista.push({
          id: d.id, alunoId: data.alunoId, nome: aluno.nomeCompleto,
          matricula: aluno.matricula || "", telefone: aluno.telefone || "",
          servicoNome: servMap[data.tipoId] || data.tipoId || "—",
          tipoId: data.tipoId, data: "", horario: "",
          profissionalId: profId,
          profissionalNome: profId ? profMap[profId] || "—" : "Aguardando",
          status: data.status, origem: "fila",
        });
      }

      // Filtros
      let f = lista;
      if (filtroProfId) f = f.filter(p => p.profissionalId === filtroProfId);
      if (filtroServico) {
        const serv = servicos.find(s => s.id === filtroServico);
        const nomeServ = serv?.nome?.toLowerCase().trim() || "";
        f = f.filter(p => {
          const t = (p.tipoId || "").toLowerCase().trim();
          return p.tipoId === filtroServico || t === nomeServ;
        });
      }

      f.sort((a, b) => {
        if (a.origem === "fila" && b.origem !== "fila") return -1;
        if (a.origem !== "fila" && b.origem === "fila") return 1;
        if (a.data && b.data) {
          if (a.data === b.data) return (a.horario || "").localeCompare(b.horario || "");
          return b.data.localeCompare(a.data);
        }
        return 0;
      });

      setPacientes(f);
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar pacientes.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (profissionais.length > 0) carregarPacientes();
  }, [profissionalId, supervisionadosIds, filtroProfId, filtroServico, profissionais, tipoLogado]);

  // Filtro de busca local
  const lista = pacientes.filter(p => {
    if (!busca.trim()) return true;
    const b = busca.toLowerCase();
    return (p.nome || "").toLowerCase().includes(b) || (p.matricula || "").toLowerCase().includes(b);
  });

  // Ação de vincular
  const vincular = async (paciente: any, profId: string) => {
    if (!profId) return alert("Escolha um profissional.");
    const prof = profissionais.find(p => p.id === profId)?.nome || "";
    if (!confirm(`Vincular ${paciente.nome} a ${prof}?`)) return;
    try {
      await updateDoc(doc(db, "filaEspera", paciente.id), {
        profissionalId: profId,
        status: "vinculado",
      });
      alert(`Vinculado a ${prof}!`);
      setModalVincular(null);
      carregarPacientes();
    } catch (e: any) { alert(e.message); }
  };

  const vincularComData = async (paciente: any, profId: string, data: string, horario: string) => {
    if (!profId || !data || !horario) return alert("Preencha tudo.");
    try {
      await addDoc(collection(db, "agendamentos"), {
        alunoId: paciente.alunoId, profissionalId: profId,
        tipoId: paciente.tipoId, data, horario,
        status: "ocupado", tipoPaciente: "social", createdAt: new Date(),
      });
      await updateDoc(doc(db, "filaEspera", paciente.id), { status: "atendido", profissionalId: profId });
      alert("Vinculado com data!");
      setModalVincular(null);
      carregarPacientes();
    } catch (e: any) { alert(e.message); }
  };

  const remover = async (p: any) => {
    if (!confirm(`Remover ${p.nome} da fila?`)) return;
    await updateDoc(doc(db, "filaEspera", p.id), { status: "cancelado" });
    carregarPacientes();
  };

  const sBtn = (bg: string, color = "#fff") => ({ padding: "4px 10px", border: "none", borderRadius: 4, background: bg, color, cursor: "pointer", marginRight: 4 });

  return (
    <div>
      <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>
        Pacientes em atendimento{" "}
        <span style={{ fontSize: 14, fontWeight: 400, color: "#6b7a8f" }}>
          ({profissionalNome} - <strong>{tipoLogado || "..."}</strong>)
        </span>
      </h3>

      {ehDiretor && (
        <p style={{ color: "#0070f3", fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
          👑 Vendo TODOS os profissionais e pacientes
        </p>
      )}

      {/* BUSCA */}
      <input
        type="text"
        placeholder="🔍 Buscar por nome ou matrícula..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ width: "100%", maxWidth: 400, padding: 10, border: "1px solid #ccc", borderRadius: 8, marginBottom: 12 }}
      />

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={filtroProfId} onChange={e => setFiltroProfId(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}>
          <option value="">Todos os profissionais</option>
          {profissionais
            .filter(p => ehDiretor || p.id === profissionalId || supervisionadosIds.includes(p.id))
            .map(p => <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>)}
        </select>
        <select value={filtroServico} onChange={e => setFiltroServico(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}>
          <option value="">Todos os serviços</option>
          {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <button onClick={carregarPacientes} style={sBtn("#0070f3")}>Recarregar</button>
      </div>

      {carregando && <p>Carregando...</p>}
      {!carregando && lista.length === 0 && <p>Nenhum paciente encontrado.</p>}

      {lista.length > 0 && (
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
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
              {lista.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                  <td style={{ padding: 12 }}>{p.nome}</td>
                  <td style={{ padding: 12 }}>{p.matricula}</td>
                  <td style={{ padding: 12 }}>{p.servicoNome}</td>
                  <td style={{ padding: 12 }}>
                    {p.origem === "fila" ? (p.status === "vinculado" ? "Aguardando horário" : "Aguardando") : `${p.data} ${p.horario}`}
                  </td>
                  <td style={{ padding: 12 }}>{p.profissionalNome}</td>
                  <td style={{ padding: 12 }}>{p.status}</td>
                  <td style={{ padding: 12 }}>
                    {p.origem === "fila" && p.status === "aguardando" && (
                      <>
                        <button onClick={() => setModalVincular(p)} style={sBtn("#28a745")}>
                          Vincular
                        </button>
                        <button onClick={() => remover(p)} style={sBtn("#dc3545")}>
                          Remover
                        </button>
                      </>
                    )}
                    {p.origem === "fila" && p.status === "vinculado" && (
                      <span style={{ color: "#28a745", fontSize: 13 }}>✓ Vinculado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL VINCULAR */}
      {modalVincular && (
        <ModalVincular
          paciente={modalVincular}
          profissionais={profissionais.filter(prof => ehDiretor || prof.id === profissionalId || supervisionadosIds.includes(prof.id))}
          onFechar={() => setModalVincular(null)}
          onVincular={(profId: string) => vincular(modalVincular, profId)}
          onVincularComData={(profId: string, data: string, horario: string) => vincularComData(modalVincular, profId, data, horario)}
        />
      )}
    </div>
  );
}

// =========== MODAL ===========
function ModalVincular({
  paciente,
  profissionais,
  onFechar,
  onVincular,
  onVincularComData,
}: {
  paciente: any;
  profissionais: any[];
  onFechar: () => void;
  onVincular: (profId: string) => void;
  onVincularComData: (profId: string, data: string, horario: string) => void;
}) {
  const [profId, setProfId] = useState("");
  const [modo, setModo] = useState<"simples" | "comData">("simples");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 500, width: "90%" }}>
        <h3 style={{ marginTop: 0 }}>Vincular {paciente.nome}</h3>
        <p style={{ color: "#6b7a8f" }}>{paciente.servicoNome}</p>

        <label>Profissional:</label>
        <select value={profId} onChange={e => setProfId(e.target.value)}
          style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, margin: "6px 0 14px" }}>
          <option value="">Selecione um profissional</option>
          {profissionais.map((p: any) => (
            <option key={p.id} value={p.id}>{p.nome} ({p.codigo}) - {p.tipo}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setModo("simples")} style={{ flex: 1, padding: 8, border: modo === "simples" ? "2px solid #0070f3" : "1px solid #ccc", background: modo === "simples" ? "#e6f0ff" : "#fff", borderRadius: 8, cursor: "pointer" }}>Só vincular</button>
          <button onClick={() => setModo("comData")} style={{ flex: 1, padding: 8, border: modo === "comData" ? "2px solid #0070f3" : "1px solid #ccc", background: modo === "comData" ? "#e6f0ff" : "#fff", borderRadius: 8, cursor: "pointer" }}>Vincular com data</button>
        </div>

        {modo === "comData" && (
          <>
            <label>Data:</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, margin: "6px 0 14px" }} />
            <label>Horário:</label>
            <input type="time" value={horario} onChange={e => setHorario(e.target.value)}
              style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, margin: "6px 0 14px" }} />
          </>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => modo === "simples" ? onVincular(profId) : onVincularComData(profId, data, horario)}
            style={{ flex: 1, padding: 10, background: "#28a745", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Confirmar
          </button>
          <button onClick={onFechar} style={{ flex: 1, padding: 10, background: "#6c757d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}