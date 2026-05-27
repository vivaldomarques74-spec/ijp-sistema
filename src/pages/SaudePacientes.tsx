import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, addDoc, query, where, deleteDoc } from "firebase/firestore";
import { db } from "../services/firebase";

interface Agendamento {
  id: string;
  profissionalId: string;
  tipoId: string;
  data: string;
  horario: string;
  alunoId: string;
  status: string;
}

export default function SaudePacientes() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [filtroData, setFiltroData] = useState("");
  const [filtroProfissional, setFiltroProfissional] = useState("");
  const [filtroServico, setFiltroServico] = useState("");
  const [profissionaisMap, setProfissionaisMap] = useState<Map<string, string>>(new Map());
  const [servicosMap, setServicosMap] = useState<Map<string, string>>(new Map());
  const [carregando, setCarregando] = useState(false);

  // Carregar profissionais e serviços uma vez (criar Map para acesso rápido)
  useEffect(() => {
    const carregarMaps = async () => {
      const profSnap = await getDocs(collection(db, "profissionais"));
      const profMap = new Map<string, string>();
      profSnap.docs.forEach(d => profMap.set(d.id, d.data().nome));
      setProfissionaisMap(profMap);

      const servSnap = await getDocs(collection(db, "tiposAtendimento"));
      const servMap = new Map<string, string>();
      servSnap.docs.forEach(d => servMap.set(d.id, d.data().nome));
      setServicosMap(servMap);
    };
    carregarMaps();
  }, []);

  const carregarPacientes = async () => {
    setCarregando(true);
    try {
      const snap = await getDocs(collection(db, "agendamentos"));
      let agendamentos: Agendamento[] = snap.docs
        .filter(d => d.data().status === "ocupado" && d.data().alunoId)
        .map(d => ({
          id: d.id,
          profissionalId: d.data().profissionalId,
          tipoId: d.data().tipoId,
          data: d.data().data,
          horario: d.data().horario,
          alunoId: d.data().alunoId,
          status: d.data().status,
        }));

      // Filtrar
      if (filtroData) agendamentos = agendamentos.filter(a => a.data === filtroData);
      if (filtroProfissional) agendamentos = agendamentos.filter(a => a.profissionalId === filtroProfissional);
      if (filtroServico) agendamentos = agendamentos.filter(a => a.tipoId === filtroServico);

      // Ordenar
      agendamentos.sort((a, b) => {
        if (a.data === b.data) return a.horario.localeCompare(b.horario);
        return a.data.localeCompare(b.data);
      });

      const lista = [];
      for (const ag of agendamentos) {
        const alunoSnap = await getDoc(doc(db, "alunos", ag.alunoId));
        if (alunoSnap.exists()) {
          const aluno = alunoSnap.data();
          const nomeProf = profissionaisMap.get(ag.profissionalId) || "Desconhecido";
          const nomeServ = servicosMap.get(ag.tipoId) || ag.tipoId;
          lista.push({
            id: ag.id,
            alunoId: ag.alunoId,
            nome: aluno.nomeCompleto,
            matricula: aluno.matricula,
            servicoNome: nomeServ,
            data: ag.data,
            horario: ag.horario,
            profissionalNome: nomeProf,
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
    if (profissionaisMap.size > 0 || servicosMap.size > 0) carregarPacientes();
  }, [filtroData, filtroProfissional, filtroServico, profissionaisMap, servicosMap]);

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

  return (
    <div>
      <h2>Pacientes em atendimento</h2>
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div><label>Data: </label><input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} /></div>
        <div><label>Profissional: </label>
          <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)}>
            <option value="">Todos</option>
            {Array.from(profissionaisMap.entries()).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
        <div><label>Serviço: </label>
          <select value={filtroServico} onChange={e => setFiltroServico(e.target.value)}>
            <option value="">Todos</option>
            {Array.from(servicosMap.entries()).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
        <button onClick={carregarPacientes}>Buscar</button>
      </div>
      {carregando && <p>Carregando...</p>}
      {!carregando && pacientes.length === 0 && <p>Nenhum paciente encontrado.</p>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Matrícula</th>
              <th>Serviço</th>
              <th>Data/Horário</th>
              <th>Profissional</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map(p => (
              <tr key={p.id}>
                <td style={{ padding: 8 }}>{p.nome}</td>
                <td style={{ padding: 8 }}>{p.matricula}</td>
                <td style={{ padding: 8 }}>{p.servicoNome}</td>
                <td style={{ padding: 8 }}>{p.data} {p.horario}</td>
                <td style={{ padding: 8 }}>{p.profissionalNome}</td>
                <td style={{ padding: 8 }}><button onClick={() => trocarProfissional(p)}>Trocar profissional</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}