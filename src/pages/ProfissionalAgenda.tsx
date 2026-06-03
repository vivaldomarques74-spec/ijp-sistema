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

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ProfissionalAgenda() {
  const { codigo } = useParams();
  const [profissional, setProfissional] = useState<any>(null);
  const [agenda, setAgenda] = useState<Agendamento[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState(getLocalDate());
  const [profissionalId, setProfissionalId] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Verificar autenticação ao carregar a página
  useEffect(() => {
    if (localStorage.getItem("profissionalAutenticado") !== "true") {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/acesso-profissional";
    }
  }, []);

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

  const carregarAgenda = async () => {
    if (!profissionalId) return;
    setCarregando(true);
    try {
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
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
      alert("Erro ao carregar agenda. Tente recarregar a página.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAgenda();
  }, [profissionalId, dataSelecionada]);

  const registrarPresenca = async (ag: Agendamento, tipo: string) => {
    // Verificar autenticação
    if (localStorage.getItem("profissionalAutenticado") !== "true") {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "/acesso-profissional";
      return;
    }

    if (!ag.alunoId) return alert("Este horário não tem paciente vinculado.");

    let novoStatus = "";
    if (tipo === "presente") novoStatus = "realizado";
    else if (tipo === "faltaJustificada") novoStatus = "faltaJustificada";
    else novoStatus = "faltaInjustificada";

    try {
      await updateDoc(doc(db, "agendamentos", ag.id), { status: novoStatus });
      alert(`Registrado como ${tipo === "presente" ? "Compareceu" : tipo === "faltaJustificada" ? "Falta justificada" : "Falta injustificada"}`);
      
      if (tipo === "faltaInjustificada") {
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
      await carregarAgenda();
    } catch (error: any) {
      console.error("Erro ao registrar presença:", error);
      alert(`Erro: ${error.message}`);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2>Agenda do Profissional</h2>
        <p><strong>Código:</strong> {codigo} | <strong>Nome:</strong> {profissional?.nome || "Carregando..."}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label>Data: </label>
          <input
            type="date"
            value={dataSelecionada}
            onChange={e => setDataSelecionada(e.target.value)}
            style={{ padding: 4 }}
          />
          <button onClick={carregarAgenda} style={{ padding: "4px 8px" }}>Recarregar</button>
        </div>
      </div>
      {carregando && <p>Carregando horários...</p>}
      {!carregando && (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Horário</th>
                <th style={{ textAlign: "left", padding: 8 }}>Paciente</th>
                <th style={{ textAlign: "left", padding: 8 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {agenda.map(ag => (
                <tr key={ag.id}>
                  <td style={{ padding: 8 }}>{ag.horario}</td>
                  <td style={{ padding: 8 }}>{ag.nomeAluno || (ag.tipoPaciente === "particular" ? ag.pacienteInfo?.nome : "Livre")}</td>
                  <td style={{ padding: 8 }}>
                    {ag.alunoId && (ag.status === "agendado" || ag.status === "ocupado") && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        <button onClick={() => registrarPresenca(ag, "presente")} style={{ background: "#28a745", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4 }}>Compareceu</button>
                        <button onClick={() => registrarPresenca(ag, "faltaJustificada")} style={{ background: "#ffc107", color: "#000", border: "none", padding: "6px 10px", borderRadius: 4 }}>Falta justificada</button>
                        <button onClick={() => registrarPresenca(ag, "faltaInjustificada")} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4 }}>Falta injustificada</button>
                      </div>
                    )}
                    {ag.status === "realizado" && "Atendido"}
                    {ag.status === "faltaJustificada" && "Falta justificada"}
                    {ag.status === "faltaInjustificada" && "Falta injustificada"}
                    {!ag.alunoId && "Livre"}
                    {ag.alunoId && (
                      <button onClick={() => window.open(`/profissional/${codigo}/paciente/${ag.alunoId}`, "_blank")} style={{ marginLeft: 8, background: "#0070f3", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4 }}>
                        Ficha
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {agenda.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 8, textAlign: "center" }}>
                    Nenhum horário para esta data.
                  </td>
                </tr>
              )}
            </tbody>
        </table>
      </div>
      )}
    </div>
  );
}