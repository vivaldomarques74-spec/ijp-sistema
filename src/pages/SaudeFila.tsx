import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

interface AgendamentoData {
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

export default function SaudeFila() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [fila, setFila] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [profissionalId, setProfissionalId] = useState("");
  const [horarios, setHorarios] = useState<AgendamentoData[]>([]);
  const [horarioId, setHorarioId] = useState("");
  const [pacienteId, setPacienteId] = useState("");

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
        lista.push({ id: docFil.id, alunoId: docFil.data().alunoId, nome: alunoSnap.data()?.nomeCompleto });
      }
      setFila(lista);
      setPacienteId("");
    };
    carregarFila();
  }, [tipoId]);

  useEffect(() => {
    if (!profissionalId) return;
    const carregarHorarios = async () => {
      const hoje = new Date().toISOString().split("T")[0];
      const snap = await getDocs(collection(db, "agendamentos"));
      let todos: AgendamentoData[] = snap.docs
        .filter(d => {
          const data = d.data();
          return data.profissionalId === profissionalId &&
                 (data.status === "livre" || data.status === "aguardandoVinculo") &&
                 !data.alunoId &&
                 !data.pacienteInfo &&
                 data.data >= hoje;
        })
        .map(d => ({ id: d.id, ...d.data() } as AgendamentoData));

      // Agrupar fixos
      const fixos = todos.filter(a => a.groupId);
      const avulsos = todos.filter(a => !a.groupId);
      const gruposFixos = new Map<string, AgendamentoData>();
      for (const fixo of fixos) {
        const existing = gruposFixos.get(fixo.groupId!);
        if (!existing || fixo.data < existing.data) {
          gruposFixos.set(fixo.groupId!, fixo);
        }
      }
      const horariosFixos = Array.from(gruposFixos.values());
      let todosHorarios = [...horariosFixos, ...avulsos];
      todosHorarios.sort((a, b) => {
        if (a.data === b.data) return a.horario.localeCompare(b.horario);
        return a.data.localeCompare(b.data);
      });
      setHorarios(todosHorarios);
    };
    carregarHorarios();
  }, [profissionalId]);

  const vincular = async () => {
    if (!pacienteId) return alert("Selecione um paciente");
    if (!horarioId) return alert("Selecione um horário");
    const horarioRef = doc(db, "agendamentos", horarioId);
    const horarioSnap = await getDoc(horarioRef);
    const horarioData = horarioSnap.data() as AgendamentoData;
    if (horarioData?.groupId) {
      const groupQuery = query(collection(db, "agendamentos"), where("groupId", "==", horarioData.groupId));
      const groupSnap = await getDocs(groupQuery);
      for (const docHor of groupSnap.docs) {
        await updateDoc(docHor.ref, { alunoId: pacienteId, status: "ocupado" });
      }
      alert("Vinculado a todas as ocorrências do grupo fixo.");
    } else {
      await updateDoc(horarioRef, { alunoId: pacienteId, status: "ocupado" });
      alert("Vinculado ao horário.");
    }
    const filaDoc = fila.find(f => f.alunoId === pacienteId);
    if (filaDoc) await updateDoc(doc(db, "filaEspera", filaDoc.id), { status: "atendido" });
    setProfissionalId("");
    setHorarioId("");
    setPacienteId("");
    // recarregar fila
    const q = query(collection(db, "filaEspera"), where("tipoId", "==", tipoId), where("status", "==", "aguardando"));
    const snap = await getDocs(q);
    const lista = [];
    for (const docFil of snap.docs) {
      const alunoSnap = await getDoc(doc(db, "alunos", docFil.data().alunoId));
      lista.push({ id: docFil.id, alunoId: docFil.data().alunoId, nome: alunoSnap.data()?.nomeCompleto });
    }
    setFila(lista);
  };

  const formatarData = (dataISO: string) => {
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
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
          <select value={pacienteId} onChange={e => setPacienteId(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">Selecione um paciente</option>
            {fila.map(f => <option key={f.alunoId} value={f.alunoId}>{f.nome}</option>)}
          </select>
          <h3>Vincular a horário:</h3>
          <select value={profissionalId} onChange={e => setProfissionalId(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">Profissional</option>
            {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select value={horarioId} onChange={e => setHorarioId(e.target.value)} disabled={!profissionalId} style={{ width: "100%", padding: 8, marginTop: 8 }}>
            <option value="">Horário livre</option>
            {horarios.map(h => (
              <option key={h.id} value={h.id}>{formatarData(h.data)} {h.horario} {h.groupId ? "(fixo)" : ""}</option>
            ))}
          </select>
          <button onClick={vincular} disabled={!pacienteId || !horarioId} style={{ marginTop: 16 }}>Vincular</button>
        </div>
      )}
    </div>
  );
}