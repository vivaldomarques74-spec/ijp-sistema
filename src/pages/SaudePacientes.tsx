import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudePacientes() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("");
  const [tipos, setTipos] = useState<Record<string, string>>({});

  useEffect(() => {
    const carregarTipos = async () => {
      const snap = await getDocs(collection(db, "tiposAtendimento"));
      const map: Record<string, string> = {};
      snap.docs.forEach(d => { map[d.id] = d.data().nome; });
      setTipos(map);
    };
    carregarTipos();
  }, []);

  const carregarPacientes = async () => {
    const agendamentosSnap = await getDocs(collection(db, "agendamentos"));
    const ocupados = agendamentosSnap.docs.filter(doc => 
      doc.data().status === "ocupado" && doc.data().alunoId
    );
    const lista = [];
    for (const ag of ocupados) {
      const agData = ag.data();
      const alunoSnap = await getDocs(query(collection(db, "alunos"), where("__name__", "==", agData.alunoId)));
      if (!alunoSnap.empty) {
        const aluno = alunoSnap.docs[0].data();
        lista.push({
          id: ag.id,
          alunoId: agData.alunoId,
          nome: aluno.nomeCompleto,
          matricula: aluno.matricula,
          servicoId: agData.tipoId,
          data: agData.data,
          horario: agData.horario,
          profissionalId: agData.profissionalId,
        });
      }
    }
    setPacientes(lista);
  };

  useEffect(() => {
    carregarPacientes();
  }, []);

  const trocarProfissional = async (paciente: any) => {
    if (!window.confirm(`Deseja remover ${paciente.nome} do horário atual e colocá-lo novamente na fila de espera?`)) return;
    
    // 1. Remover o agendamento atual
    const agendamentoRef = doc(db, "agendamentos", paciente.id);
    await deleteDoc(agendamentoRef);
    
    // 2. Adicionar na fila de espera se já não estiver
    const filaQuery = query(
      collection(db, "filaEspera"),
      where("alunoId", "==", paciente.alunoId),
      where("tipoId", "==", paciente.servicoId),
      where("status", "==", "aguardando")
    );
    const filaSnap = await getDocs(filaQuery);
    if (filaSnap.empty) {
      await addDoc(collection(db, "filaEspera"), {
        alunoId: paciente.alunoId,
        tipoId: paciente.servicoId,
        dataSolicitacao: new Date(),
        status: "aguardando",
        modalidade: "presencial",
      });
    }
    
    alert(`${paciente.nome} foi removido e retornou à fila de espera.`);
    carregarPacientes();
  };

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.matricula?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div>
      <h2>Pacientes em atendimento</h2>
      <input
        placeholder="Buscar por nome ou matrícula"
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
        style={{ marginBottom: 20, padding: 8, width: "100%", maxWidth: 400 }}
      />
      {pacientesFiltrados.length === 0 && <p>Nenhum paciente vinculado a horário.</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Nome</th>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Matrícula</th>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Serviço</th>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Data/Horário</th>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {pacientesFiltrados.map(p => (
            <tr key={p.id}>
              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{p.nome}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{p.matricula}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{tipos[p.servicoId] || p.servicoId}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{p.data} {p.horario}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                <button onClick={() => trocarProfissional(p)} style={{ background: "#ffc107", color: "#000" }}>
                  Trocar profissional
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}