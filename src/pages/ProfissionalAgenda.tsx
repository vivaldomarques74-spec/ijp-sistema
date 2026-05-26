import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, updateDoc, addDoc, query, where } from "firebase/firestore";
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
  recorrenteTipo?: string;
  groupId?: string;
}

export default function ProfissionalAgenda() {
  const { codigo } = useParams();
  const [profissional, setProfissional] = useState<any>(null);
  const [agenda, setAgenda] = useState<Agendamento[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split("T")[0]);
  const [profissionalId, setProfissionalId] = useState("");

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

  useEffect(() => {
    if (!profissionalId) return;
    const carregarAgenda = async () => {
      const snap = await getDocs(collection(db, "agendamentos"));
      const hoje = dataSelecionada;
      const horarios = snap.docs
        .filter(d => d.data().profissionalId === profissionalId && d.data().data === hoje)
        .map(d => ({ id: d.id, ...d.data() } as Agendamento));
      horarios.sort((a, b) => a.horario.localeCompare(b.horario));
      setAgenda(horarios);
    };
    carregarAgenda();
  }, [profissionalId, dataSelecionada]);

  const registrarPresenca = async (agendamento: Agendamento, status: "presente" | "faltaJustificada" | "faltaInjustificada") => {
    const hoje = new Date().toISOString().split("T")[0];
    if (agendamento.data !== hoje) return alert("Só é possível registrar presença no dia do atendimento.");

    let novoStatus = "";
    if (status === "presente") novoStatus = "realizado";
    else if (status === "faltaJustificada") novoStatus = "faltaJustificada";
    else novoStatus = "faltaInjustificada";

    await updateDoc(doc(db, "agendamentos", agendamento.id), { status: novoStatus });

    if (status === "faltaInjustificada") {
      const faltasQuery = query(
        collection(db, "agendamentos"),
        where("alunoId", "==", agendamento.alunoId),
        where("profissionalId", "==", profissionalId),
        where("status", "==", "faltaInjustificada")
      );
      const faltasSnap = await getDocs(faltasQuery);
      const faltasCount = faltasSnap.size + 1;
      if (faltasCount >= 2) {
        await updateDoc(doc(db, "agendamentos", agendamento.id), { alunoId: null, status: "livre" });
        const filaQuery = query(
          collection(db, "filaEspera"),
          where("alunoId", "==", agendamento.alunoId),
          where("tipoId", "==", agendamento.tipoId),
          where("status", "==", "aguardando")
        );
        const filaSnap = await getDocs(filaQuery);
        if (filaSnap.empty) {
          await addDoc(collection(db, "filaEspera"), {
            alunoId: agendamento.alunoId,
            tipoId: agendamento.tipoId,
            dataSolicitacao: new Date(),
            status: "aguardando",
            modalidade: "presencial",
          });
        }
        await addDoc(collection(db, "notificacoes"), {
          mensagem: `Paciente ${agendamento.alunoId} retornou à fila por 2 faltas injustificadas.`,
          lida: false,
          createdAt: new Date(),
          tipo: "falta",
        });
        alert("Paciente removido e voltou à fila de espera.");
      }
    }
    // Recarregar agenda
    const snap = await getDocs(collection(db, "agendamentos"));
    const horarios = snap.docs
      .filter(d => d.data().profissionalId === profissionalId && d.data().data === dataSelecionada)
      .map(d => ({ id: d.id, ...d.data() } as Agendamento));
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
              <td>
                {ag.tipoPaciente === "particular" ? ag.pacienteInfo?.nome : (ag.alunoId ? "Paciente social" : "Livre")}
                {ag.alunoId && ag.status !== "realizado" && ag.status !== "faltaJustificada" && ag.status !== "faltaInjustificada" && " (Pendente)"}
              </td>
              <td>
                {ag.alunoId && (ag.status === "agendado" || ag.status === "ocupado") && (
                  <>
                    <button onClick={() => registrarPresenca(ag, "presente")} style={{ background: "#28a745", marginRight: 4 }}>Compareceu</button>
                    <button onClick={() => registrarPresenca(ag, "faltaJustificada")} style={{ background: "#ffc107", marginRight: 4 }}>Falta justificada</button>
                    <button onClick={() => registrarPresenca(ag, "faltaInjustificada")} style={{ background: "#dc3545" }}>Falta injustificada</button>
                  </>
                )}
                {ag.status === "realizado" && "Atendido"}
                {ag.status === "faltaJustificada" && "Falta justificada"}
                {ag.status === "faltaInjustificada" && "Falta injustificada"}
                {!ag.alunoId && "Livre"}
                {ag.alunoId && <button onClick={() => window.open(`/profissional/${codigo}/paciente/${ag.alunoId}`, "_blank")} style={{ marginLeft: 8 }}>Ficha</button>}
              </td>
            </tr>
          ))}
          {agenda.length === 0 && <tr><td colSpan={3}>Nenhum horário para esta data.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}