import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

interface Agendamento {
  id: string;
  profissionalId: string;
  tipoId: string;
  data: string;
  horario: string;
  status: string;
  groupId?: string;
}

export default function SaudeFila() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [fila, setFila] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [horariosPorProfissional, setHorariosPorProfissional] = useState<Record<string, Agendamento[]>>({});
  const [selecoes, setSelecoes] = useState<Record<string, { profissionalId: string; horarioId: string }>>({});

  useEffect(() => {
    const carregarTipos = async () => {
      const snap = await getDocs(collection(db, "tiposAtendimento"));
      setTipos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    const carregarProfissionais = async () => {
      const snap = await getDocs(collection(db, "profissionais"));
      setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    carregarTipos();
    carregarProfissionais();
  }, []);

  useEffect(() => {
    if (!tipoId) return;
    const carregarFila = async () => {
      const q = query(collection(db, "filaEspera"), where("tipoId", "==", tipoId), where("status", "==", "aguardando"));
      const snap = await getDocs(q);
      const lista = [];
      for (const docFil of snap.docs) {
        const alunoSnap = await getDoc(doc(db, "alunos", docFil.data().alunoId));
        if (alunoSnap.exists()) {
          lista.push({
            id: docFil.id,
            alunoId: docFil.data().alunoId,
            nome: alunoSnap.data().nomeCompleto,
            matricula: alunoSnap.data().matricula,
          });
        }
      }
      // Ordenar por número de matrícula
      lista.sort((a, b) => {
        const numA = parseInt(a.matricula.replace("IJP-", ""));
        const numB = parseInt(b.matricula.replace("IJP-", ""));
        return numA - numB;
      });
      setFila(lista);
      const novasSelecoes: Record<string, any> = {};
      for (const p of lista) {
        novasSelecoes[p.alunoId] = { profissionalId: "", horarioId: "" };
      }
      setSelecoes(novasSelecoes);
    };
    carregarFila();
  }, [tipoId]);

  useEffect(() => {
    const carregarHorarios = async () => {
      const hoje = new Date().toISOString().split("T")[0];
      const snap = await getDocs(collection(db, "agendamentos"));
      const todos = snap.docs
        .filter(d => {
          const data = d.data();
          return (data.status === "livre" || data.status === "aguardandoVinculo") &&
                 !data.alunoId &&
                 !data.pacienteInfo &&
                 data.data >= hoje;
        })
        .map(d => ({
          id: d.id,
          profissionalId: d.data().profissionalId,
          tipoId: d.data().tipoId,
          data: d.data().data,
          horario: d.data().horario,
          status: d.data().status,
          groupId: d.data().groupId,
        } as Agendamento));

      const porProfissional: Record<string, Agendamento[]> = {};
      for (const prof of profissionais) {
        const horariosDoProf = todos.filter(h => h.profissionalId === prof.id);
        const fixos = horariosDoProf.filter(h => h.groupId);
        const avulsos = horariosDoProf.filter(h => !h.groupId);
        const gruposFixos = new Map<string, Agendamento>();
        for (const fixo of fixos) {
          if (!gruposFixos.has(fixo.groupId!) || fixo.data < gruposFixos.get(fixo.groupId!)!.data) {
            gruposFixos.set(fixo.groupId!, fixo);
          }
        }
        const horariosFixos = Array.from(gruposFixos.values());
        let todosHorarios = [...horariosFixos, ...avulsos];
        todosHorarios.sort((a, b) => {
          if (a.data === b.data) return a.horario.localeCompare(b.horario);
          return a.data.localeCompare(b.data);
        });
        porProfissional[prof.id] = todosHorarios;
      }
      setHorariosPorProfissional(porProfissional);
    };
    if (profissionais.length > 0) carregarHorarios();
  }, [profissionais, tipoId]);

  const vincular = async (alunoId: string) => {
    const selecao = selecoes[alunoId];
    if (!selecao.profissionalId) return alert("Selecione um profissional");
    if (!selecao.horarioId) return alert("Selecione um horário");

    const horarioRef = doc(db, "agendamentos", selecao.horarioId);
    const horarioSnap = await getDoc(horarioRef);
    const horarioData = horarioSnap.data();

    if (horarioData?.groupId) {
      const groupQuery = query(collection(db, "agendamentos"), where("groupId", "==", horarioData.groupId));
      const groupSnap = await getDocs(groupQuery);
      for (const docHor of groupSnap.docs) {
        await updateDoc(docHor.ref, { alunoId, status: "ocupado" });
      }
      alert("Paciente vinculado a todas as ocorrências do grupo fixo.");
    } else {
      await updateDoc(horarioRef, { alunoId, status: "ocupado" });
      alert("Paciente vinculado ao horário.");
    }

    const filaDoc = fila.find(f => f.alunoId === alunoId);
    if (filaDoc) await updateDoc(doc(db, "filaEspera", filaDoc.id), { status: "atendido" });

    // Recarregar fila
    const q = query(collection(db, "filaEspera"), where("tipoId", "==", tipoId), where("status", "==", "aguardando"));
    const snap = await getDocs(q);
    const lista = [];
    for (const docFil of snap.docs) {
      const alunoSnap = await getDoc(doc(db, "alunos", docFil.data().alunoId));
      if (alunoSnap.exists()) {
        lista.push({
          id: docFil.id,
          alunoId: docFil.data().alunoId,
          nome: alunoSnap.data().nomeCompleto,
          matricula: alunoSnap.data().matricula,
        });
      }
    }
    lista.sort((a, b) => {
      const numA = parseInt(a.matricula.replace("IJP-", ""));
      const numB = parseInt(b.matricula.replace("IJP-", ""));
      return numA - numB;
    });
    setFila(lista);
    const novasSelecoes: Record<string, any> = {};
    for (const p of lista) {
      novasSelecoes[p.alunoId] = { profissionalId: "", horarioId: "" };
    }
    setSelecoes(novasSelecoes);
  };

  const formatarData = (dataISO: string) => {
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const atualizarSelecao = (alunoId: string, field: string, value: string) => {
    setSelecoes(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], [field]: value }
    }));
  };

  return (
    <div>
      <h2>Fila de Espera (Agendados)</h2>
      <select onChange={e => setTipoId(e.target.value)} value={tipoId}>
        <option value="">Selecione o tipo</option>
        {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>

      {tipoId && (
        <div>
          <h3>Pacientes aguardando:</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Matrícula</th>
                  <th>Profissional</th>
                  <th>Horário livre</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fila.map(paciente => (
                  <tr key={paciente.alunoId}>
                    <td style={{ padding: 8 }}>{paciente.nome}</td>
                    <td style={{ padding: 8 }}>{paciente.matricula}</td>
                    <td style={{ padding: 8 }}>
                      <select
                        value={selecoes[paciente.alunoId]?.profissionalId || ""}
                        onChange={e => atualizarSelecao(paciente.alunoId, "profissionalId", e.target.value)}
                      >
                        <option value="">Selecione</option>
                        {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>)}
                      </select>
                    </td>
                    <td style={{ padding: 8 }}>
                      <select
                        value={selecoes[paciente.alunoId]?.horarioId || ""}
                        onChange={e => atualizarSelecao(paciente.alunoId, "horarioId", e.target.value)}
                        disabled={!selecoes[paciente.alunoId]?.profissionalId}
                      >
                        <option value="">Horário livre</option>
                        {selecoes[paciente.alunoId]?.profissionalId && horariosPorProfissional[selecoes[paciente.alunoId].profissionalId]?.map(h => (
                          <option key={h.id} value={h.id}>
                            {formatarData(h.data)} {h.horario} {h.groupId ? "(fixo)" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => vincular(paciente.alunoId)}>
                        Vincular
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {fila.length === 0 && (
                <tbody>
                  <tr>
                    <td colSpan={5}>Nenhum paciente na fila.</td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}