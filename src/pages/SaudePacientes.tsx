import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, addDoc, query, where, deleteDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudePacientes() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [filtroProfissional, setFiltroProfissional] = useState("");
  const [filtroServico, setFiltroServico] = useState("");
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

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
      let agendamentos = snap.docs
        .filter(d => {
          const data = d.data() as any;
          return data.status === "ocupado" && data.alunoId && data.data >= hoje;
        })
        .map(d => ({ id: d.id, ...(d.data() as any) }));

      if (filtroProfissional) agendamentos = agendamentos.filter(a => a.profissionalId === filtroProfissional);
      if (filtroServico) agendamentos = agendamentos.filter(a => a.tipoId === filtroServico);

      agendamentos.sort((a, b) => {
        if (a.data === b.data) return a.horario.localeCompare(b.horario);
        return a.data.localeCompare(b.data);
      });

      const lista = [];
      for (const ag of agendamentos) {
        const alunoSnap = await getDoc(doc(db, "alunos", ag.alunoId));
        if (alunoSnap.exists()) {
          const aluno = alunoSnap.data();
          const prof = profissionais.find(p => p.id === ag.profissionalId);
          const serv = servicos.find(s => s.id === ag.tipoId);
          lista.push({
            id: ag.id,
            alunoId: ag.alunoId,
            nome: aluno.nomeCompleto,
            matricula: aluno.matricula,
            servicoNome: serv?.nome || ag.tipoId,
            data: ag.data,
            horario: ag.horario,
            profissionalNome: prof?.nome || "Desconhecido",
            tipoId: ag.tipoId,
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

  const trocarProfissional = async (paciente: any) => {
    if (!confirm(`Remover ${paciente.nome} do horário e colocar na fila?`)) return;
    await deleteDoc(doc(db, "agendamentos", paciente.id));
    const filaQuery = query(collection(db, "filaEspera"), where("alunoId", "==", paciente.alunoId), where("status", "==", "aguardando"));
    const filaSnap = await getDocs(filaQuery);
    if (filaSnap.empty) {
      await addDoc(collection(db, "filaEspera"), {
        alunoId: paciente.alunoId,
        tipoId: paciente.tipoId,
        dataSolicitacao: new Date(),
        status: "aguardando",
      });
    }
    alert("Paciente retornou à fila.");
    carregarPacientes();
  };

  const selectStyle = { padding: 8, border: "1px solid #ccc", borderRadius: 8, background: "#fff" };
  const buttonStyle = { padding: "4px 12px", border: "none", borderRadius: 4, background: "#0070f3", color: "#fff", cursor: "pointer" };

  return (
    <div>
      <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>Pacientes em atendimento</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)} style={selectStyle}>
          <option value="">Todos os profissionais</option>
          {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroServico} onChange={e => setFiltroServico(e.target.value)} style={selectStyle}>
          <option value="">Todos os serviços</option>
          {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <button onClick={carregarPacientes} style={buttonStyle}>Buscar</button>
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
                    <button onClick={() => trocarProfissional(p)} style={{ ...buttonStyle, background: "#ffc107", color: "#000" }}>Trocar</button>
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