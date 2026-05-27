import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, updateDoc, getDoc, query, where, addDoc } from "firebase/firestore";
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
      let horarios = snap.docs
        .filter(d => d.data().profissionalId === profissionalId && d.data().data === dataSelecionada)
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
    carregarAgenda();
  }, [profissionalId, dataSelecionada]);

  const registrarPresenca = async (ag: Agendamento, tipo: string) => {
    if (ag.data !== dataSelecionada) return alert("Só é possível registrar presença no dia do atendimento.");
    let novoStatus = "";
    if (tipo === "presente") novoStatus = "realizado";
    else if (tipo === "faltaJustificada") novoStatus = "faltaJustificada";
    else novoStatus = "faltaInjustificada";

    await updateDoc(doc(db, "agendamentos", ag.id), { status: novoStatus });

    if (tipo === "faltaInjustificada" && ag.alunoId) {
      const faltasQuery = query(
        collection(db, "agendamentos"),
        where("alunoId", "==", ag.alunoId),
        where("profissionalId", "==", profissionalId),
        where("tipoId", "==", ag.tipoId),
        where("status", "==", "faltaInjustificada")
      );
      const faltasSnap = await getDocs(faltasQuery);
      const faltasCount = faltasSnap.size;
      if (faltasCount >= 2) {
        if (ag.groupId) {
          const groupQuery = query(collection(db, "agendamentos"), where("groupId", "==", ag.groupId));
          const groupSnap = await getDocs(groupQuery);
          for (const docHor of groupSnap.docs) {
            await updateDoc(docHor.ref, { alunoId: null, status: "livre" });
          }
        } else {
          await updateDoc(doc(db, "agendamentos", ag.id), { alunoId: null, status: "livre" });
        }
        const filaQuery = query(
          collection(db, "filaEspera"),
          where("alunoId", "==", ag.alunoId),
          where("tipoId", "==", ag.tipoId),
          where("status", "==", "aguardando")
        );
        const filaSnap = await getDocs(filaQuery);
        if (filaSnap.empty) {
          await addDoc(collection(db, "filaEspera"), {
            alunoId: ag.alunoId,
            tipoId: ag.tipoId,
            dataSolicitacao: new Date(),
            status: "aguardando",
            modalidade: "presencial",
          });
        }
        let nomePaciente = "Paciente";
        if (ag.alunoId) {
          const alunoSnap = await getDoc(doc(db, "alunos", ag.alunoId));
          if (alunoSnap.exists()) nomePaciente = alunoSnap.data().nomeCompleto;
        }
        await addDoc(collection(db, "notificacoes"), {
          mensagem: `Paciente ${nomePaciente} retornou à fila por 2 faltas injustificadas. Horário disponível: ${ag.data} ${ag.horario}.`,
          lida: false,
          createdAt: new Date(),
          tipo: "falta",
          alunoId: ag.alunoId,
        });
        alert("Paciente removido do horário (2 faltas injustificadas) e voltou à fila. Notificação enviada.");
      }
    }

    const snap = await getDocs(collection(db, "agendamentos"));
    let horarios = snap.docs
      .filter(d => d.data().profissionalId === profissionalId && d.data().data === dataSelecionada)
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