import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeFila() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [fila, setFila] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [profissionalId, setProfissionalId] = useState("");
  const [horarios, setHorarios] = useState<any[]>([]);
  const [horarioId, setHorarioId] = useState("");
  const [pacienteSelecionadoId, setPacienteSelecionadoId] = useState("");

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
        lista.push({
          id: docFil.id,
          alunoId: docFil.data().alunoId,
          nome: alunoSnap.data()?.nomeCompleto,
        });
      }
      setFila(lista);
      setPacienteSelecionadoId("");
    };
    carregarFila();
  }, [tipoId]);

  useEffect(() => {
    if (!profissionalId) return;
    const carregarHorarios = async () => {
      const snap = await getDocs(collection(db, "agendamentos"));
      const livres = snap.docs.filter(d => 
        d.data().profissionalId === profissionalId && 
        (d.data().status === "livre" || d.data().status === "aguardandoVinculo") && 
        !d.data().alunoId && 
        !d.data().pacienteInfo
      );
      setHorarios(livres.map(d => ({ id: d.id, ...d.data() })));
    };
    carregarHorarios();
  }, [profissionalId]);

  const vincular = async () => {
    if (!pacienteSelecionadoId) return alert("Selecione um paciente da fila");
    if (!horarioId) return alert("Selecione um horário");
    
    const horarioRef = doc(db, "agendamentos", horarioId);
    const horarioSnap = await getDoc(horarioRef);
    const horarioData = horarioSnap.data();

    if (horarioData?.recorrenteTipo === "fixo" && horarioData?.groupId) {
      // Vínculo fixo: ocupar todos os horários do grupo
      const q = query(collection(db, "agendamentos"), where("groupId", "==", horarioData.groupId));
      const groupSnap = await getDocs(q);
      for (const docHor of groupSnap.docs) {
        await updateDoc(docHor.ref, {
          alunoId: pacienteSelecionadoId,
          status: "ocupado",
        });
      }
      alert("Paciente vinculado a todas as ocorrências do grupo fixo.");
    } else {
      // Vínculo normal
      await updateDoc(horarioRef, {
        alunoId: pacienteSelecionadoId,
        status: "ocupado",
      });
      alert("Paciente vinculado ao horário.");
    }

    // Remover da fila
    const filaDoc = fila.find(f => f.alunoId === pacienteSelecionadoId);
    if (filaDoc) await updateDoc(doc(db, "filaEspera", filaDoc.id), { status: "atendido" });

    // Recarregar tudo
    setProfissionalId("");
    setHorarioId("");
    setPacienteSelecionadoId("");
    const q = query(collection(db, "filaEspera"), where("tipoId", "==", tipoId), where("status", "==", "aguardando"));
    const snap = await getDocs(q);
    const lista = [];
    for (const docFil of snap.docs) {
      const alunoSnap = await getDoc(doc(db, "alunos", docFil.data().alunoId));
      lista.push({
        id: docFil.id,
        alunoId: docFil.data().alunoId,
        nome: alunoSnap.data()?.nomeCompleto,
      });
    }
    setFila(lista);
  };

  return (
    <div>
      <h2>Fila de Espera (Agendados)</h2>
      <select onChange={e => setTipoId(e.target.value)} value={tipoId}>
        <option value="">Selecione o tipo</option>
        {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>

      {tipoId && (
        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <h3>Pacientes aguardando:</h3>
            <select 
              value={pacienteSelecionadoId} 
              onChange={e => setPacienteSelecionadoId(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            >
              <option value="">Selecione um paciente</option>
              {fila.map(f => <option key={f.alunoId} value={f.alunoId}>{f.nome}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3>Vincular a horário:</h3>
            <select 
              value={profissionalId} 
              onChange={e => setProfissionalId(e.target.value)}
              style={{ width: "100%", padding: 8, marginBottom: 8 }}
            >
              <option value="">Selecione o profissional</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>)}
            </select>

            <select 
              value={horarioId} 
              onChange={e => setHorarioId(e.target.value)}
              disabled={!profissionalId}
              style={{ width: "100%", padding: 8 }}
            >
              <option value="">Horário livre</option>
              {horarios.map(h => <option key={h.id} value={h.id}>{h.data} {h.horario} {h.recorrenteTipo === "fixo" ? "(fixo)" : ""}</option>)}
            </select>
          </div>

          <button onClick={vincular} disabled={!pacienteSelecionadoId || !horarioId}>
            Vincular paciente ao horário
          </button>
        </div>
      )}
    </div>
  );
}