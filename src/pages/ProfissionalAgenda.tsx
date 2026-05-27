import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, updateDoc, getDoc, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

// Interface para tipar os dados do agendamento
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
}

export default function ProfissionalAgenda() {
  const { codigo } = useParams();
  const [profissional, setProfissional] = useState<any>(null);
  const [agenda, setAgenda] = useState<Agendamento[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split("T")[0]);
  const [profissionalId, setProfissionalId] = useState("");

  // Carregar dados do profissional
  useEffect(() => {
    const carregarProfissional = async () => {
      const q = query(collection(db, "profissionais"), where("codigo", "==", codigo));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docProf = snap.docs[0];
        setProfissional({ id: docProf.id, ...docProf.data() });
        setProfissionalId(docProf.id);
      }
    };
    carregarProfissional();
  }, [codigo]);

  // Carregar agenda do profissional para a data selecionada
  useEffect(() => {
    if (!profissionalId) return;
    const carregarAgenda = async () => {
      const snap = await getDocs(collection(db, "agendamentos"));
      const horarios: Agendamento[] = snap.docs
        .filter(d => {
          const data = d.data();
          return data.profissionalId === profissionalId && data.data === dataSelecionada;
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
          } as Agendamento;
        });

      // Buscar nome do aluno para cada horário
      for (const h of horarios) {
        if (h.alunoId) {
          const alunoSnap = await getDoc(doc(db, "alunos", h.alunoId));
          if (alunoSnap.exists()) {
            h.nomeAluno = alunoSnap.data().nomeCompleto;
          }
        }
      }
      horarios.sort((a, b) => a.horario.localeCompare(b.horario));
      setAgenda(horarios);
    };
    carregarAgenda();
  }, [profissionalId, dataSelecionada]);

  const registrarPresenca = async (ag: Agendamento, tipo: string) => {
    if (ag.data !== dataSelecionada) return alert("Só é possível registrar presença no dia do atendimento.");
    let novoStatus = "";
    if (tipo === "presente") novoStatus = "realizado";
    else if (tipo === "faltaJustificada") novoStatus = "faltaJustificada";
    else novoStatus = "faltaInjustificada";

    await updateDoc(doc(db, "agendamentos", ag.id), { status: novoStatus });
    alert(`Registrado como ${tipo === "presente" ? "Compareceu" : tipo === "faltaJustificada" ? "Falta justificada" : "Falta injustificada"}`);

    // Recarregar agenda
    const snap = await getDocs(collection(db, "agendamentos"));
    const horarios: Agendamento[] = snap.docs
      .filter(d => {
        const data = d.data();
        return data.profissionalId === profissionalId && data.data === dataSelecionada;
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
        } as Agendamento;
      });
    for (const h of horarios) {
      if (h.alunoId) {
        const alunoSnap = await getDoc(doc(db, "alunos", h.alunoId));
        if (alunoSnap.exists()) h.nomeAluno = alunoSnap.data().nomeCompleto;
      }
    }
    horarios.sort((a, b) => a.horario.localeCompare(b.horario));
    setAgenda(horarios);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2>Agenda do Profissional</h2>
        <p><strong>Código:</strong> {codigo} | <strong>Nome:</strong> {profissional?.nome || "Carregando..."}</p>
        <label>Data: </label>
        <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Horário</th>
              <th>Paciente</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {agenda.map(ag => (
              <tr key={ag.id}>
                <td>{ag.horario}</td>
                <td>{ag.nomeAluno || (ag.tipoPaciente === "particular" ? ag.pacienteInfo?.nome : "Livre")}</td>
                <td>
                  {ag.alunoId && (ag.status === "agendado" || ag.status === "ocupado") && (
                    <>
                      <button onClick={() => registrarPresenca(ag, "presente")}>Compareceu</button>
                      <button onClick={() => registrarPresenca(ag, "faltaJustificada")}>Falta justificada</button>
                      <button onClick={() => registrarPresenca(ag, "faltaInjustificada")}>Falta injustificada</button>
                    </>
                  )}
                  {ag.status === "realizado" && "Atendido"}
                  {ag.status === "faltaJustificada" && "Falta justificada"}
                  {ag.status === "faltaInjustificada" && "Falta injustificada"}
                  {!ag.alunoId && "Livre"}
                  {ag.alunoId && <button onClick={() => window.open(`/profissional/${codigo}/paciente/${ag.alunoId}`, "_blank")}>Ficha</button>}
                </td>
              </tr>
            ))}
            {agenda.length === 0 && (
              <tr>
                <td colSpan={3}>Nenhum horário para esta data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}